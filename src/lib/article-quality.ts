// src/lib/article-quality.ts
//
// Quality scoring + slop detection for RinkStop articles.
//
// Used by:
//   - /api/admin/articles/quality-check  (per-article scoring)
//   - /api/admin/articles/regenerate      (bulk score before regen)
//   - scripts/_audit-nightly.cjs          (catches drift on already-published)
//
// Per Arnel 2026-09-22 21:17 CDT: 'reads like AI slop... horrible way
// to frame a professional article'. The slop pattern is defensive
// hedging — phrases that announce 'we don't have the data' instead of
// reporting what's confirmed.
//
// Scoring rubric (0-100, higher = better):
//   - word count (target 300-700 words): -20 if <200, +0 if 200-400, +5 if 400-700, -10 if >1000
//   - banned phrases (each one: -15): see BANNED_PHRASES below
//   - structural checks: -5 per missing required H2, -10 if 0 H2s
//   - SEO checks: -10 if title lacks team name pattern, -5 if meta description missing/short
//   - factual density: +0 base, -20 if zero "Final Score:" pattern (audit-verified content)
//
// Quality bands:
//   80-100 = GOOD (publishable as-is)
//   60-79  = SLOP-LIGHT (manual edit recommended)
//   0-59   = SLOP-HEAVY (regenerate before next cycle)
//
// IMPORTANT: keep this list aligned with the LLM prompt in
// scripts/article-from-highlight/orchestrate.mjs buildLlmPrompt().
// New banned phrases added there should also be added here.

export interface QualityIssue {
  type: 'banned-phrase' | 'low-word-count' | 'missing-h2' | 'generic-section' | 'meta-description' | 'title-missing-team' | 'no-final-score';
  pattern?: string;
  detail?: string;
  penalty: number;
}

export interface QualityResult {
  score: number;
  band: 'good' | 'slop-light' | 'slop-heavy';
  issues: QualityIssue[];
  wordCount: number;
  h2Count: number;
  hasFinalScore: boolean;
  hasEmbed: boolean;
}

// Patterns that announce the article's own data limitations. Each
// pattern is a case-insensitive substring match. The full penalty is
// applied per match (so two slop phrases cost 30 points).
export const BANNED_PHRASES: string[] = [
  'Because no transcript',
  'the safest read',
  'we cannot know',
  'without transcript support',
  'broader recap should stay',
  'the most reliable takeaway',
  'the period-by-period picture available',
  'broader recap should stay focused',
  'meta-commentary',
  'safe to say',
  'it stands to reason',
  'one can only assume',
  'based on what is available',
  'in the absence of',
  'without a transcript',
  'reconstructing specific sequences',
  'winning goal is listed as',
  'winning goalie is listed as',
  'broad one confirmed by',
  'no transcript support',
  'should stay focused on',
  'without transcript support,',
  'in this league',
  'in a comfortable win',
  'comfortable Flyers win',
  'without late drama',
];

// Generic section headings that signal AI boilerplate.
export const GENERIC_SECTIONS = [
  'how the game played out',
  'what the result means',
  'watch the highlights',
];

interface QualityCheckInput {
  title?: string | null;
  subtitle?: string | null;
  metaDescription?: string | null; // seo_description
  body?: string | null;
}

export function checkArticleQuality(input: QualityCheckInput): QualityResult {
  const title = (input.title || '').trim();
  const subtitle = (input.subtitle || '').trim();
  const meta = (input.metaDescription || '').trim();
  const body = (input.body || '').trim();

  const issues: QualityIssue[] = [];
  let score = 100;

  // ---- Word count ----
  const wordCount = body ? body.split(/\s+/).filter(Boolean).length : 0;
  if (wordCount === 0) {
    issues.push({ type: 'low-word-count', detail: 'body is empty', penalty: 50 });
    score -= 50;
  } else if (wordCount < 200) {
    issues.push({ type: 'low-word-count', detail: `${wordCount} words (target: 200+)`, penalty: 20 });
    score -= 20;
  } else if (wordCount > 1000) {
    issues.push({ type: 'low-word-count', detail: `${wordCount} words (over-long; consider trimming to 400-700)`, penalty: 10 });
    score -= 10;
  } else if (wordCount >= 400 && wordCount <= 700) {
    // Sweet spot — no penalty
  }

  // ---- Banned phrases ----
  if (body) {
    const bodyLower = body.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      if (bodyLower.includes(phrase.toLowerCase())) {
        issues.push({ type: 'banned-phrase', pattern: phrase, penalty: 15 });
        score -= 15;
      }
    }
  }

  // ---- Structural checks (H2 sections) ----
  const h2Matches = body ? body.match(/^##\s+.+$/gm) : null;
  const h2Count = h2Matches ? h2Matches.length : 0;
  const hasEmbed = body ? /youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=/i.test(body) : false;

  if (h2Count === 0 && body) {
    issues.push({ type: 'missing-h2', detail: 'no H2 sections — article reads as a wall of text', penalty: 10 });
    score -= 10;
  } else if (h2Count < 2 && body) {
    issues.push({ type: 'missing-h2', detail: `only ${h2Count} H2 section(s); need 2+ for skimmability`, penalty: 5 });
    score -= 5;
  }

  // Generic section names
  if (body) {
    const bodyLower = body.toLowerCase();
    const allGeneric = GENERIC_SECTIONS.every(s => bodyLower.includes(`## ${s}`) || bodyLower.includes(`##${s}`));
    if (allGeneric) {
      issues.push({ type: 'generic-section', detail: 'all section headings are generic boilerplate', penalty: 10 });
      score -= 10;
    }
  }

  // ---- SEO: title should mention at least one team-related token ----
  // Loose check — title must contain a capitalised word that suggests
  // a team/player name. Catches generic titles like "Game Recap".
  if (title) {
    const hasCapitalized = /\b[A-Z][a-z]{2,}/.test(title);
    const looksGeneric = /^(game recap|recap|highlights?|story)$/i.test(title);
    if (!hasCapitalized || looksGeneric) {
      issues.push({ type: 'title-missing-team', detail: 'title may be too generic — should include team name or specific player', penalty: 10 });
      score -= 10;
    }
  }

  // ---- SEO: meta description ----
  if (title && (!meta || meta.length < 100)) {
    issues.push({ type: 'meta-description', detail: 'meta description missing or too short (<100 chars)', penalty: 5 });
    score -= 5;
  }

  // ---- Factual density: has "Final Score:" line ----
  const hasFinalScore = body ? /\*\*Final Score:\*\*/i.test(body) || /^\*?Final Score:/im.test(body) : false;
  if (body && !hasFinalScore) {
    issues.push({ type: 'no-final-score', detail: 'no "Final Score:" line — audit pipeline cannot verify claims', penalty: 20 });
    score -= 20;
  }

  score = Math.max(0, Math.min(100, score));

  const band: QualityResult['band'] =
    score >= 80 ? 'good' : score >= 60 ? 'slop-light' : 'slop-heavy';

  return {
    score,
    band,
    issues,
    wordCount,
    h2Count,
    hasFinalScore,
    hasEmbed,
  };
}

export function summarizeIssues(issues: QualityIssue[]): string {
  const byType: Record<string, number> = {};
  for (const i of issues) byType[i.type] = (byType[i.type] || 0) + 1;
  const parts: string[] = [];
  for (const [type, count] of Object.entries(byType)) {
    parts.push(`${count} ${type}${count > 1 ? 's' : ''}`);
  }
  return parts.length === 0 ? 'clean' : parts.join(', ');
}
