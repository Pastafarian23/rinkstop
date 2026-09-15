/**
 * Multi-source reconciliation engine.
 *
 * This is the core logic that replaces random sampling with exhaustive
 * verification. For every entity, we:
 *
 *   1. Pull from Source 1 (primary) → List A
 *   2. Pull from Source 2 (cross-check) → List B
 *   3. For each canonical key:
 *      - A∩B (both sources have it):
 *          → compare fields
 *          → MATCH if critical fields agree → INSERT
 *          → REJECT if any critical field disagrees → ingest_verify_failed
 *      - A\B (only Source 1 has it):
 *          → FLAG → insert with flag, log for review
 *      - B\A (only Source 2 has it):
 *          → FLAG → insert with flag, log for review
 *   4. Post-insert: re-pull Source 1, diff against DB
 *      → any DB row missing in Source 1 → REVERT
 *
 * CRITICAL: We never insert a row that disagree between sources.
 * CRITICAL: We never leave a flagged row silent — it goes to ingest_verify_failed.
 *
 * @param {object} opts
 * @param {string} opts.entityType       - 'schedule' | 'roster' | 'skater_stats' | ...
 * @param {string} opts.season           - '2025-26'
 * @param {string} opts.source1Name       - 'nhl.com'
 * @param {string} opts.source2Name      - 'wikipedia' | 'hockey-reference' | 'highlightly'
 * @param {Map}    opts.source1Data      - Map<canonicalKey, row>
 * @param {Map}    opts.source2Data      - Map<canonicalKey, row>
 * @param {string[]} opts.criticalFields - fields that MUST match for MATCH
 * @param {string[]} opts.compareFields  - fields to compare (all must match for MATCH)
 * @param {string} opts.canonicalKeyField - field name to use as canonical key
 */
class ReconciliationEngine {
  constructor(opts) {
    this.entityType = opts.entityType;
    this.season = opts.season;
    this.source1Name = opts.source1Name;
    this.source2Name = opts.source2Name;
    this.source1Data = opts.source1Data; // Map<key, row>
    this.source2Data = opts.source2Data; // Map<key, row>
    this.criticalFields = opts.criticalFields || [];
    this.compareFields = opts.compareFields || opts.criticalFields || [];
    this.canonicalKeyField = opts.canonicalKeyField || 'id';
    this.stats = { matched: 0, flagged_s1only: 0, flagged_s2only: 0, rejected: 0, total_s1: 0, total_s2: 0 };
  }

  /**
   * Run reconciliation. Returns { match, flagged, rejected, details }.
   *
   * @param {Function} getCanonicalKey - (row) => string
   * @param {Function} normalizer      - (row, source) => normalizedRow
   * @param {Function} keyExtractor    - (canonicalKey) => { source, key }
   */
  run() {
    this.stats.total_s1 = this.source1Data.size;
    this.stats.total_s2 = this.source2Data.size;

    const allKeys = new Set([...this.source1Data.keys(), ...this.source2Data.keys()]);
    const results = { match: [], flagged_s1only: [], flagged_s2only: [], rejected: [] };

    for (const key of allKeys) {
      const row1 = this.source1Data.get(key);
      const row2 = this.source2Data.get(key);

      if (row1 && row2) {
        // Present in both sources
        const diff = this._compare(row1, row2);
        if (diff === null) {
          // Critical fields match
          results.match.push({ key, row1, row2, diff: null });
          this.stats.matched++;
        } else {
          // Critical fields disagree
          results.rejected.push({ key, row1, row2, diff });
          this.stats.rejected++;
        }
      } else if (row1 && !row2) {
        // Only Source 1 has this row
        results.flagged_s1only.push({ key, row: row1 });
        this.stats.flagged_s1only++;
      } else if (!row1 && row2) {
        // Only Source 2 has this row
        results.flagged_s2only.push({ key, row: row2 });
        this.stats.flagged_s1only++;
      }
    }

    return results;
  }

  /**
   * Compare two rows on all compareFields.
   * Returns null if all compareFields agree.
   * Returns { fieldName: { source1, source2 } } for each differing field.
   */
  _compare(row1, row2) {
    const diffs = {};
    for (const field of this.compareFields) {
      const v1 = this._getVal(row1, field);
      const v2 = this._getVal(row2, field);
      if (!this._valuesEqual(v1, v2)) {
        diffs[field] = { source1: v1, source2: v2 };
      }
    }
    return Object.keys(diffs).length === 0 ? null : diffs;
  }

  _getVal(row, field) {
    // Handle nested fields like 'gameData.nhl_game_id'
    const parts = field.split('.');
    let val = row;
    for (const p of parts) {
      if (val == null) return null;
      val = val[p];
    }
    return val;
  }

  _valuesEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 0.0001;
    return String(a).trim() === String(b).trim();
  }

  getStats() {
    return { ...this.stats };
  }

  /**
   * Print a human-readable summary.
   */
  printSummary() {
    const s = this.stats;
    console.log(`\n[reconcile] ${this.entityType} ${this.season}:`);
    console.log(`  Source 1 (${this.source1Name}): ${s.total_s1} rows`);
    console.log(`  Source 2 (${this.source2Name}): ${s.total_s2} rows`);
    console.log(`  ✅ MATCH (inserted):     ${s.matched}`);
    console.log(`  ⚠️  FLAG (S1 only):       ${s.flagged_s1only}`);
    console.log(`  ⚠️  FLAG (S2 only):       ${s.flagged_s2only}`);
    console.log(`  ❌ REJECTED (disagree):  ${s.rejected}`);
    if (s.rejected > 0) {
      console.log(`\n  REJECTED rows MUST be manually reviewed before insert.`);
    }
    if (s.flagged_s1only > 0 || s.flagged_s2only > 0) {
      console.log(`\n  FLAGGED rows will be inserted with a verification flag for review.`);
    }
  }
}

/**
 * Diff DB contents against a source of truth.
 * Any DB row not present in the source → REVERT candidate.
 *
 * @param {object} opts
 * @param {Array}  opts.dbRows       - rows currently in DB
 * @param {Map}    opts.sourceData    - Map<canonicalKey, row> from source
 * @param {string} opts.canonicalKey - field name for the key
 * @param {string} opts.entityType
 * @param {string} opts.season
 */
function diffDbAgainstSource(opts) {
  const { dbRows, sourceData, canonicalKey, entityType, season } = opts;
  const missing = [];

  for (const dbRow of dbRows) {
    const key = dbRow[canonicalKey];
    if (!sourceData.has(key)) {
      missing.push({ dbRow, key, reason: 'missing_in_source' });
    }
  }

  if (missing.length > 0) {
    console.warn(`[diff] ⚠️  ${missing.length} DB rows for ${entityType}/${season} missing from source:`);
    for (const m of missing.slice(0, 10)) {
      console.warn(`       key=${m.key} reason=${m.reason}`);
    }
    if (missing.length > 10) console.warn(`       ... and ${missing.length - 10} more`);
  } else {
    console.log(`[diff] ✅ All ${dbRows.length} DB rows for ${entityType}/${season} verified against source.`);
  }

  return missing;
}

module.exports = { ReconciliationEngine, diffDbAgainstSource };
