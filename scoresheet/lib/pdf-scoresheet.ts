/**
 * scoresheet/lib/pdf-scoresheet.ts
 *
 * PDF scoresheet generator using pdf-lib (pure JS, no native deps,
 * works in Vercel serverless and edge runtimes).
 *
 * Format: a single-page A4 landscape scoresheet inspired by the
 * IIHF / NHL game sheet layout. We don't claim official certification;
 * this is a working printable record of a game scored via the app.
 *
 * Sections:
 *   1. Header (rink name, date, game type, final score)
 *   2. Game info (venue, scheduled/started/ended times, period length)
 *   3. Per-period scoring summary
 *   4. Final score line + total goals per team
 *   5. Goals (jersey + scorer + assists + time + period)
 *   6. Penalties (jersey + infraction + minutes + time + period)
 *   7. Shots on goal per period
 *   8. Goalie summary
 *   9. Scorekeeper signature line
 *
 * Why pdf-lib and not @react-pdf/renderer or puppeteer:
 *   - pdf-lib is the smallest, most reliable option for serverless
 *   - No headless browser required (Vercel Lambda has 50MB function
 *     limit; puppeteer is 200MB+)
 *   - Programmatic API is good enough for a structured sheet
 *   - Output is downloadable as a real PDF (not HTML pretending to be one)
 */

import { PDFDocument, PDFFont, StandardFonts, rgb, PDFPage, RGB } from 'pdf-lib';

interface PlayerLite {
  jersey_number: number;
  name: string;
  position: string;
  is_goalie: boolean;
}

interface GameData {
  id: string;
  mode: 'live' | 'watch';
  status: 'draft' | 'scheduled' | 'in_progress' | 'final';
  home_team_name: string;
  away_team_name: string;
  home_roster: PlayerLite[] | null;
  away_roster: PlayerLite[] | null;
  home_score: number;
  away_score: number;
  current_period: number;
  periods_total: number;
  period_length_seconds: number;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  venue_name: string | null;
  game_type: string;
}

interface EventLite {
  period: number;
  clock_seconds: number;
  team_side: 'home' | 'away';
  event_type: string;
  scorer_jersey: number | null;
  primary_assist_jersey: number | null;
  secondary_assist_jersey: number | null;
  goalie_jersey: number | null;
  strength: string | null;
  penalty_jersey: number | null;
  penalty_type: string | null;
  penalty_minutes: number | null;
  shooter_jersey: number | null;
  sequence_number: number;
}

interface PDFBuildInput {
  game: GameData;
  events: EventLite[];
  scorekeeperName?: string;
}

const PAGE_W = 842;  // A4 landscape, points
const PAGE_H = 595;
const MARGIN = 32;

// Colors
const NAVY = rgb(0.04, 0.12, 0.26);
const GOLD = rgb(1.0, 0.72, 0.11);
const TEXT = rgb(0.97, 0.98, 0.99);
const DIM = rgb(0.5, 0.55, 0.6);
const GRID = rgb(0.78, 0.82, 0.86);
const HAIRLINE = rgb(0.85, 0.88, 0.92);

export async function buildScoresheetPdf(input: PDFBuildInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_W, PAGE_H]);

  const fontReg = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdf.embedFont(StandardFonts.Courier);

  let y = PAGE_H - MARGIN;
  const x = MARGIN;
  const w = PAGE_W - MARGIN * 2;

  // ─── 1. Header ────────────────────────────────────────────────
  page.drawRectangle({
    x: 0, y: PAGE_H - 56, width: PAGE_W, height: 56, color: NAVY,
  });
  page.drawRectangle({
    x: 0, y: PAGE_H - 60, width: PAGE_W, height: 4, color: GOLD,
  });
  page.drawText('RINKSTOP SCORESHEET', {
    x: x, y: PAGE_H - 28, size: 9, font: fontBold, color: GOLD,
  });
  page.drawText('Official Game Record', {
    x: x, y: PAGE_H - 42, size: 7, font: fontReg, color: TEXT,
  });
  // Final score, right side
  const finalScoreText = `Final: ${input.game.home_score} – ${input.game.away_score}`;
  const finalScoreW = fontBold.widthOfTextAtSize(finalScoreText, 16);
  page.drawText(finalScoreText, {
    x: PAGE_W - MARGIN - finalScoreW, y: PAGE_H - 36, size: 16, font: fontBold, color: TEXT,
  });
  y = PAGE_H - 80;

  // ─── 2. Game info ─────────────────────────────────────────────
  const infoRows: [string, string][] = [
    ['Home', input.game.home_team_name],
    ['Away', input.game.away_team_name],
    ['Venue', input.game.venue_name || '—'],
    ['Date', formatDate(input.game.scheduled_at || input.game.started_at)],
    ['Game type', titleCase(input.game.game_type)],
    ['Periods', `${input.game.periods_total} × ${Math.round(input.game.period_length_seconds / 60)} min`],
    ['Started', formatTime(input.game.started_at) || '—'],
    ['Ended', formatTime(input.game.ended_at) || '—'],
  ];
  const colW = w / 4;
  for (let i = 0; i < infoRows.length; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const cx = x + col * colW;
    const cy = y - row * 32;
    page.drawText(infoRows[i][0].toUpperCase(), {
      x: cx, y: cy, size: 6, font: fontBold, color: GOLD,
    });
    page.drawText(truncate(infoRows[i][1], 28, fontReg, 9), {
      x: cx, y: cy - 11, size: 9, font: fontReg, color: TEXT,
    });
  }
  y -= 80;

  // ─── 3. Per-period scoring ───────────────────────────────────
  const periodScores = computePeriodScores(input.events, input.game.periods_total);
  y = drawScoringSummary(page, fontReg, fontBold, fontMono, x, y, w, input.game, periodScores);

  // ─── 4. Goals table ──────────────────────────────────────────
  y = drawSectionHeader(page, fontBold, x, y, w, 'Goals');
  const goalEvents = input.events.filter((e) => e.event_type === 'goal' || e.event_type === 'shootout_goal');
  y = drawGoalsTable(page, fontReg, fontBold, fontMono, x, y, w, input.game, goalEvents);

  // New page if we're running out of vertical space.
  if (y < 200) {
    y = drawPenaltiesOnNewPage(pdf, page, fontReg, fontBold, fontMono, input.game, input.events);
    y = drawShotsOnNewPage(pdf, page, fontReg, fontBold, fontMono, input.game, input.events);
    y = drawSignatures(page, fontReg, fontBold, x, y, w, input);
  } else {
    y = drawPenaltiesSection(page, fontReg, fontBold, fontMono, x, y, w, input.game, input.events);
    if (y < 120) {
      y = drawShotsOnNewPage(pdf, page, fontReg, fontBold, fontMono, input.game, input.events);
    } else {
      y = drawShotsSection(page, fontReg, fontBold, fontMono, x, y, w, input.game, input.events);
    }
    if (y < 80) {
      // signatures on new page
      const sigPage = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
      y = drawSignatures(sigPage, fontReg, fontBold, x, y, w, input);
    } else {
      y = drawSignatures(page, fontReg, fontBold, x, y, w, input);
    }
  }

  return pdf.save();
}

// ─── Section helpers ────────────────────────────────────────────

function drawScoringSummary(
  page: PDFPage,
  fontReg: PDFFont,
  fontBold: PDFFont,
  fontMono: PDFFont,
  x: number,
  y: number,
  w: number,
  game: GameData,
  periodScores: { home: number[]; away: number[] }
): number {
  page.drawText('SCORING BY PERIOD', { x, y, size: 7, font: fontBold, color: GOLD });
  y -= 14;

  const colW = w / 8;
  const headers = ['', '1', '2', '3', 'OT', 'SO', 'T'];
  for (let i = 0; i < headers.length; i++) {
    const cx = x + i * colW;
    page.drawText(headers[i], {
      x: cx + 4, y, size: 8, font: fontBold, color: DIM,
    });
  }
  y -= 6;
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, color: GRID, thickness: 0.5 });
  y -= 10;

  const homeRow = ['Home', ...periodScores.home, periodScores.home.reduce((a, b) => a + b, 0)];
  const awayRow = ['Away', ...periodScores.away, periodScores.away.reduce((a, b) => a + b, 0)];
  for (const row of [homeRow, awayRow]) {
    for (let i = 0; i < row.length; i++) {
      const cx = x + i * colW;
      const text = String(row[i]);
      page.drawText(text, {
        x: cx + 4, y, size: 10, font: i === 0 ? fontBold : fontReg, color: TEXT,
      });
    }
    y -= 14;
    page.drawLine({ start: { x, y: y + 8 }, end: { x: x + w, y: y + 8 }, color: HAIRLINE, thickness: 0.25 });
  }
  return y - 4;
}

function drawSectionHeader(
  page: PDFPage,
  fontBold: PDFFont,
  x: number,
  y: number,
  w: number,
  label: string
): number {
  page.drawText(label.toUpperCase(), { x, y, size: 7, font: fontBold, color: GOLD });
  page.drawLine({ start: { x, y: y - 3 }, end: { x: x + w, y: y - 3 }, color: GRID, thickness: 0.5 });
  return y - 14;
}

function drawGoalsTable(
  page: PDFPage,
  fontReg: PDFFont,
  fontBold: PDFFont,
  fontMono: PDFFont,
  x: number,
  y: number,
  w: number,
  game: GameData,
  events: EventLite[]
): number {
  const headers = ['#', 'Per', 'Time', 'Team', 'Jersey', 'Scorer', '1° Asst', '2° Asst', 'Str'];
  const colWs = [22, 22, 42, 40, 36, 100, 90, 90, 26];
  // Layout: total = w
  // Render headers
  let cx = x;
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], { x: cx + 2, y, size: 7, font: fontBold, color: DIM });
    cx += colWs[i];
  }
  y -= 6;
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, color: GRID, thickness: 0.5 });
  y -= 10;

  const homeRoster = game.home_roster || [];
  const awayRoster = game.away_roster || [];

  if (events.length === 0) {
    page.drawText('No goals recorded.', { x: x + 4, y, size: 9, font: fontReg, color: DIM });
    return y - 14;
  }

  let row = 0;
  for (const e of events) {
    cx = x;
    const teamName = e.team_side === 'home' ? game.home_team_name : game.away_team_name;
    const shortTeam = teamName.length > 6 ? teamName.slice(0, 5) + '.' : teamName;
    const roster = e.team_side === 'home' ? homeRoster : awayRoster;
    const cells = [
      String(e.sequence_number),
      String(e.period),
      formatClock(e.clock_seconds),
      shortTeam,
      e.scorer_jersey != null ? String(e.scorer_jersey) : '',
      playerName(roster, e.scorer_jersey),
      playerName(roster, e.primary_assist_jersey),
      playerName(roster, e.secondary_assist_jersey),
      e.strength && e.strength !== 'even' ? e.strength.toUpperCase() : '',
    ];
    for (let i = 0; i < cells.length; i++) {
      const cellText = i === 5 || i === 6 || i === 7 ? truncate(cells[i], 16, fontReg, 8) : cells[i];
      page.drawText(cellText, { x: cx + 2, y, size: 8, font: i === 5 || i === 6 || i === 7 ? fontReg : fontReg, color: TEXT });
      cx += colWs[i];
    }
    y -= 12;
    row++;
    if (row % 5 === 0) {
      page.drawLine({ start: { x, y: y + 4 }, end: { x: x + w, y: y + 4 }, color: HAIRLINE, thickness: 0.25 });
    }
  }
  return y - 4;
}

function drawPenaltiesSection(
  page: PDFPage,
  fontReg: PDFFont,
  fontBold: PDFFont,
  fontMono: PDFFont,
  x: number,
  y: number,
  w: number,
  game: GameData,
  events: EventLite[]
): number {
  y = drawSectionHeader(page, fontBold, x, y, w, 'Penalties');
  const penaltyEvents = events.filter((e) => e.event_type === 'penalty');
  if (penaltyEvents.length === 0) {
    page.drawText('No penalties recorded.', { x: x + 4, y, size: 9, font: fontReg, color: DIM });
    return y - 14;
  }
  const headers = ['#', 'Per', 'Time', 'Team', 'Jersey', 'Player', 'Infraction', 'Min'];
  const colWs = [22, 22, 42, 40, 36, 100, 110, 22];
  let cx = x;
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], { x: cx + 2, y, size: 7, font: fontBold, color: DIM });
    cx += colWs[i];
  }
  y -= 6;
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, color: GRID, thickness: 0.5 });
  y -= 10;
  for (const e of penaltyEvents) {
    cx = x;
    const teamName = e.team_side === 'home' ? game.home_team_name : game.away_team_name;
    const shortTeam = teamName.length > 6 ? teamName.slice(0, 5) + '.' : teamName;
    const roster = e.team_side === 'home' ? game.home_roster || [] : game.away_roster || [];
    const cells = [
      String(e.sequence_number),
      String(e.period),
      formatClock(e.clock_seconds),
      shortTeam,
      e.penalty_jersey != null ? String(e.penalty_jersey) : '',
      truncate(playerName(roster, e.penalty_jersey), 16, fontReg, 8),
      e.penalty_type ? e.penalty_type.replace(/-/g, ' ') : '',
      e.penalty_minutes != null ? String(e.penalty_minutes) : '',
    ];
    for (let i = 0; i < cells.length; i++) {
      page.drawText(cells[i], { x: cx + 2, y, size: 8, font: fontReg, color: TEXT });
      cx += colWs[i];
    }
    y -= 12;
  }
  return y - 4;
}

function drawShotsSection(
  page: PDFPage,
  fontReg: PDFFont,
  fontBold: PDFFont,
  fontMono: PDFFont,
  x: number,
  y: number,
  w: number,
  game: GameData,
  events: EventLite[]
): number {
  y = drawSectionHeader(page, fontBold, x, y, w, 'Shots on Goal');
  const shots = computeShotsByPeriod(events, game.periods_total);
  const colW = w / 8;
  const headers = ['', '1', '2', '3', 'OT', 'SO', 'T'];
  let cx = x;
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], { x: cx + 4, y, size: 8, font: fontBold, color: DIM });
    cx += colW;
  }
  y -= 6;
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, color: GRID, thickness: 0.5 });
  y -= 10;
  for (const team of ['Home', 'Away'] as const) {
    cx = x;
    const side = team.toLowerCase() as 'home' | 'away';
    const row = [team, ...shots[side], shots[side].reduce((a: number, b: number) => a + b, 0)];
    for (let i = 0; i < row.length; i++) {
      page.drawText(String(row[i]), { x: cx + 4, y, size: 10, font: i === 0 ? fontBold : fontReg, color: TEXT });
      cx += colW;
    }
    y -= 14;
  }
  return y - 4;
}

function drawPenaltiesOnNewPage(
  pdf: PDFDocument,
  page: PDFPage,
  fontReg: PDFFont,
  fontBold: PDFFont,
  fontMono: PDFFont,
  game: GameData,
  events: EventLite[]
): number {
  const newPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  const x = MARGIN;
  const w = PAGE_W - MARGIN * 2;
  y = drawSectionHeader(newPage, fontBold, x, y, w, 'Penalties (continued)');
  return drawPenaltiesSection(newPage, fontReg, fontBold, fontMono, x, y, w, game, events);
}

function drawShotsOnNewPage(
  pdf: PDFDocument,
  page: PDFPage,
  fontReg: PDFFont,
  fontBold: PDFFont,
  fontMono: PDFFont,
  game: GameData,
  events: EventLite[]
): number {
  const newPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  const x = MARGIN;
  const w = PAGE_W - MARGIN * 2;
  y = drawSectionHeader(newPage, fontBold, x, y, w, 'Shots on Goal');
  return drawShotsSection(newPage, fontReg, fontBold, fontMono, x, y, w, game, events);
}

function drawSignatures(
  page: PDFPage,
  fontReg: PDFFont,
  fontBold: PDFFont,
  x: number,
  y: number,
  w: number,
  input: PDFBuildInput
): number {
  y = drawSectionHeader(page, fontBold, x, y, w, 'Signatures');
  const labels: [string, string][] = [
    ['Scorekeeper', input.scorekeeperName || ''],
    ['Home team captain', ''],
    ['Away team captain', ''],
  ];
  for (const [role, name] of labels) {
    page.drawText(role.toUpperCase(), { x, y, size: 6, font: fontBold, color: DIM });
    page.drawText(name, { x, y: y - 11, size: 9, font: fontReg, color: TEXT });
    // Signature line
    page.drawLine({ start: { x: x + 180, y: y - 14 }, end: { x: x + w, y: y - 14 }, color: GRID, thickness: 0.5 });
    y -= 36;
  }
  // Footer
  page.drawText(`Generated by RinkStop Scoresheet · ${formatDateTime(new Date().toISOString())}`, {
    x, y: y - 4, size: 7, font: fontReg, color: DIM,
  });
  return y - 8;
}

// ─── Pure helpers ──────────────────────────────────────────────

function computePeriodScores(events: EventLite[], periodsTotal: number): { home: number[]; away: number[] } {
  const cols = periodsTotal + 2; // regulation + OT + SO
  const home: number[] = new Array(cols).fill(0);
  const away: number[] = new Array(cols).fill(0);
  for (const e of events) {
    if (e.event_type !== 'goal' && e.event_type !== 'shootout_goal') continue;
    const idx = e.period - 1;
    if (idx < 0 || idx >= cols) continue;
    if (e.team_side === 'home') home[idx]++;
    else away[idx]++;
  }
  return { home, away };
}

function computeShotsByPeriod(events: EventLite[], periodsTotal: number): { home: number[]; away: number[] } {
  const cols = periodsTotal + 2;
  const home: number[] = new Array(cols).fill(0);
  const away: number[] = new Array(cols).fill(0);
  for (const e of events) {
    if (e.event_type !== 'shot_on_goal' && e.event_type !== 'goal' && e.event_type !== 'shootout_goal') continue;
    const idx = e.period - 1;
    if (idx < 0 || idx >= cols) continue;
    if (e.team_side === 'home') home[idx]++;
    else away[idx]++;
  }
  return { home, away };
}

function playerName(roster: PlayerLite[], jersey: number | null): string {
  if (jersey == null) return '';
  const p = roster.find((r) => r.jersey_number === jersey);
  return p ? p.name : `#${jersey}`;
}

function formatClock(s: number): string {
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function truncate(text: string, maxChars: number, font: PDFFont, fontSize: number): string {
  if (!text) return '';
  // Rough chars-per-pt at typical font width.
  const max = Math.floor(maxChars);
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}
