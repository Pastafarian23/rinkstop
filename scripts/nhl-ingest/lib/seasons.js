/**
 * NHL season classification utilities.
 *
 * NHL seasons span two calendar years:
 *   - Preseason: September (year X) through early October (year X)
 *   - Regular season: October (year X) through mid-April (year X+1)
 *   - Playoffs: mid-April (year X+1) through early/mid-June (year X+1)
 *
 * The NHL.com API identifies seasons as an 8-digit seasonId:
 *   - 20242025 = NHL season starting fall 2024 (called "2024-25 NHL season")
 *   - 20252026 = NHL season starting fall 2025 (called "2025-26 NHL season")
 *   - 20262027 = NHL season starting fall 2026 (called "2026-27 NHL season")
 *
 * Our DB uses the human-readable "YYYY-YY" format (e.g., "2025-26").
 *
 * Source of truth: game_data.season from NHL.com API. If absent (upcoming
 * games not yet ingested with full game_data), derive from scheduled_at.
 */

function seasonIdToLabel(seasonId) {
  if (!Number.isInteger(seasonId)) return null;
  if (seasonId >= 20000000 && seasonId <= 20999999) {
    const startYear = Math.floor(seasonId / 10000);
    if (startYear >= 2000 && startYear <= 2099) {
      return `${startYear}-${(startYear + 1).toString().slice(-2)}`;
    }
  }
  if (seasonId >= 2000 && seasonId <= 2099) {
    return `${seasonId - 1}-${seasonId.toString().slice(-2)}`;
  }
  return null;
}

function dateToSeasonLabel(dateStr) {
  const y = parseInt(dateStr.slice(0, 4));
  const m = parseInt(dateStr.slice(5, 7));
  if (m >= 7) {
    return `${y}-${(y + 1).toString().slice(-2)}`;
  } else {
    return `${y - 1}-${y.toString().slice(-2)}`;
  }
}

function classifySeason(fixture) {
  const gdSeason = fixture.game_data?.season;
  const fromGameData = seasonIdToLabel(gdSeason);
  if (fromGameData) return fromGameData;
  return dateToSeasonLabel(fixture.scheduled_at);
}

function seasonLabelToStartYear(label) {
  if (typeof label !== 'string') return null;
  const m = label.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10);
}

module.exports = { seasonIdToLabel, dateToSeasonLabel, classifySeason, seasonLabelToStartYear };
