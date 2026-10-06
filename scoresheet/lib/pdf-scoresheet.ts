/**
 * scoresheet/lib/pdf-scoresheet.ts
 *
 * Official-style hockey scoresheet PDF.
 *
 * Single-page A4 landscape, RinkStop branded (navy header band + gold
 * title + grayscale body for printability). Modeled on the USA Hockey
 * + ICE (WIAA) official game sheet structure:
 *
 *   +--------+--------+--------+
 *   | HOME   | CENTER | VISITOR|
 *   | roster | scoring| roster |
 *   |        | + log  |        |
 *   | team   | --------| team   |
 *   | offic. | pens   | offic. |
 *   +--------+--------+--------+
 *
 * Sections (left → right, top → bottom):
 *   1. Header bar: rink + sheet + game info (rink, sheet, date,
 *      time, division, level)
 *   2. Title strip: HOME / AWAY with team names + final score
 *   3. Home team column: roster (up to 20 players) + coach + head
 *      coach signature line
 *   4. Center column: scoring table (period × team) + goal log
 *      (up to ~10 rows visible) + game time/start/end + signatures
 *   5. Visitor team column: mirror of home
 *   6. Bottom strip: home + away penalties (5 rows each) + shots
 *      by period summary + goalie minutes
 *
 * Print: any printer. RinkStop navy header uses 1-2pt of color ink;
 * the body is grayscale.
 */

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

const PAGE_W = 842;   // A4 landscape, points
const PAGE_H = 595;
const MARGIN = 18;

const NAVY = rgb(0.04, 0.12, 0.26);
const NAVY_LIGHT = rgb(0.06, 0.16, 0.32);
const GOLD = rgb(1.0, 0.72, 0.11);
const TEXT = rgb(0.05, 0.07, 0.1);
const DIM = rgb(0.42, 0.46, 0.52);
const GRID = rgb(0.55, 0.6, 0.66);
const HAIRLINE = rgb(0.78, 0.82, 0.86);
const BAND = rgb(0.93, 0.95, 0.97);

interface PlayerLite {
  jersey_number: number;
  name: string;
  position: string;
  is_goalie: boolean;
}

interface CoachLite {
  name: string;
  rinkstopId: string | null;
}

interface RinkLite {
  id: string | null;
  name: string;
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
  rink: RinkLite | null;
  sheet_label: string | null;
  home_coach: CoachLite | null;
  away_coach: CoachLite | null;
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

export async function buildScoresheetPdf(input: PDFBuildInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_W, PAGE_H]);

  const fontReg = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdf.embedFont(StandardFonts.Courier);

  drawHeader(page, fontReg, fontBold, input.game);
  drawTitleStrip(page, fontReg, fontBold, input.game);
  drawThreeColumns(page, fontReg, fontBold, fontMono, input.game, input.events);
  drawBottomStrip(page, fontReg, fontBold, fontMono, input.game, input.events, input.scorekeeperName);

  return pdf.save();
}

// ─── Sections ─────────────────────────────────────────────────────

function drawHeader(page: PDFPage, fontReg: PDFFont, fontBold: PDFFont, g: GameData) {
  // Navy band across the top, 32pt tall.
  page.drawRectangle({ x: 0, y: PAGE_H - 32, width: PAGE_W, height: 32, color: NAVY });
  page.drawRectangle({ x: 0, y: PAGE_H - 34, width: PAGE_W, height: 2, color: GOLD });

  // Left: RinkStop brand.
  page.drawText('RINKSTOP SCORESHEET', { x: MARGIN, y: PAGE_H - 16, size: 9, font: fontBold, color: GOLD });
  page.drawText('Official Game Record', { x: MARGIN, y: PAGE_H - 27, size: 6, font: fontReg, color: rgb(0.85, 0.88, 0.95) });

  // Center: rink + sheet
  const rinkText = (g.rink?.name || g.venue_name || 'Rink TBD').toUpperCase();
  const sheetText = g.sheet_label ? `·  ${g.sheet_label.toUpperCase()}` : '';
  const centerText = truncate(rinkText + sheetText, 50, fontBold, 11);
  const centerW = fontBold.widthOfTextAtSize(centerText, 11);
  page.drawText(centerText, {
    x: (PAGE_W - centerW) / 2, y: PAGE_H - 18, size: 11, font: fontBold, color: rgb(0.97, 0.98, 0.99),
  });
  const subText = [formatDate(g.scheduled_at || g.started_at), g.game_type.toUpperCase()].filter(Boolean).join(' · ');
  const subW = fontReg.widthOfTextAtSize(subText, 7);
  page.drawText(subText, {
    x: (PAGE_W - subW) / 2, y: PAGE_H - 29, size: 7, font: fontReg, color: rgb(0.85, 0.88, 0.95),
  });

  // Right: game ID (small) + status pill.
  const status = g.status.toUpperCase();
  const statusColor = g.status === 'final' ? GOLD : g.status === 'in_progress' ? rgb(0.13, 0.77, 0.37) : DIM;
  page.drawText(`STATUS: ${status}`, {
    x: PAGE_W - MARGIN - fontBold.widthOfTextAtSize(`STATUS: ${status}`, 9),
    y: PAGE_H - 16, size: 9, font: fontBold, color: statusColor,
  });
  const idText = `ID: ${g.id.slice(0, 8).toUpperCase()}`;
  page.drawText(idText, {
    x: PAGE_W - MARGIN - fontReg.widthOfTextAtSize(idText, 6),
    y: PAGE_H - 27, size: 6, font: fontReg, color: rgb(0.85, 0.88, 0.95),
  });
}

function drawTitleStrip(page: PDFPage, fontReg: PDFFont, fontBold: PDFFont, g: GameData) {
  // Score strip below the header. Light band, with the two team names
  // and final score (large).
  const stripY = PAGE_H - 32 - 48;
  const stripH = 48;
  page.drawRectangle({ x: 0, y: stripY, width: PAGE_W, height: stripH, color: BAND });
  page.drawLine({ start: { x: 0, y: stripY }, end: { x: PAGE_W, y: stripY }, color: GRID, thickness: 0.75 });

  // Center divider.
  const midX = PAGE_W / 2;
  page.drawLine({ start: { x: midX, y: stripY + 6 }, end: { x: midX, y: stripY + stripH - 6 }, color: GRID, thickness: 0.5 });

  // HOME
  const homeName = truncate(g.home_team_name.toUpperCase(), 28, fontBold, 12);
  const homeScore = String(g.home_score);
  const homeScoreSize = 24;
  page.drawText(homeName, { x: MARGIN, y: stripY + stripH - 16, size: 12, font: fontBold, color: TEXT });
  page.drawText('HOME', { x: MARGIN, y: stripY + 8, size: 7, font: fontReg, color: DIM });
  const homeScoreW = fontBold.widthOfTextAtSize(homeScore, homeScoreSize);
  page.drawText(homeScore, {
    x: midX - 12 - homeScoreW, y: stripY + 10, size: homeScoreSize, font: fontBold, color: TEXT,
  });

  // VISITOR
  const awayName = truncate(g.away_team_name.toUpperCase(), 28, fontBold, 12);
  const awayScore = String(g.away_score);
  page.drawText('VISITOR', {
    x: PAGE_W - MARGIN - fontReg.widthOfTextAtSize('VISITOR', 7),
    y: stripY + 8, size: 7, font: fontReg, color: DIM,
  });
  page.drawText(awayName, {
    x: PAGE_W - MARGIN - fontBold.widthOfTextAtSize(awayName, 12),
    y: stripY + stripH - 16, size: 12, font: fontBold, color: TEXT,
  });
  page.drawText(awayScore, {
    x: midX + 12, y: stripY + 10, size: homeScoreSize, font: fontBold, color: TEXT,
  });
}

function drawThreeColumns(
  page: PDFPage,
  fontReg: PDFFont,
  fontBold: PDFFont,
  fontMono: PDFFont,
  g: GameData,
  events: EventLite[]
) {
  // Title strip ends at y = PAGE_H - 32 - 48 = 515.
  // Bottom strip starts at y = 130 (penalties + goalies).
  // So columns live in y = 130..515 = 385pt of vertical space.
  const colTop = PAGE_H - 32 - 48;
  const colBottom = 130;
  const colW = (PAGE_W - MARGIN * 2 - 8) / 3; // 8pt gap between columns
  const colLeft = MARGIN;
  const colMid = colLeft + colW + 4;
  const colRight = colMid + colW + 4;

  // ── Home column ──
  drawRosterColumn(page, fontReg, fontBold, fontMono, colLeft, colTop, colW, colTop - colBottom,
    g.home_roster || [], g.home_coach, 'HOME', g.home_team_name);

  // ── Center column ──
  drawCenterColumn(page, fontReg, fontBold, fontMono, colMid, colTop, colW, colTop - colBottom, g, events);

  // ── Away column ──
  drawRosterColumn(page, fontReg, fontBold, fontMono, colRight, colTop, colW, colTop - colBottom,
    g.away_roster || [], g.away_coach, 'VISITOR', g.away_team_name);
}

function drawRosterColumn(
  page: PDFPage,
  fontReg: PDFFont,
  fontBold: PDFFont,
  fontMono: PDFFont,
  x: number,
  topY: number,
  w: number,
  h: number,
  roster: PlayerLite[],
  coach: CoachLite | null,
  side: 'HOME' | 'VISITOR',
  teamName: string
) {
  let y = topY;
  // Section header band
  page.drawRectangle({ x, y: y - 14, width: w, height: 14, color: NAVY_LIGHT });
  page.drawText(side, { x: x + 4, y: y - 10, size: 8, font: fontBold, color: GOLD });
  page.drawText(truncate(teamName.toUpperCase(), 24, fontReg, 7), {
    x: x + w - 4 - fontReg.widthOfTextAtSize(truncate(teamName.toUpperCase(), 24, fontReg, 7), 7),
    y: y - 10, size: 7, font: fontReg, color: rgb(0.85, 0.88, 0.95),
  });
  y -= 16;

  // Roster header row
  page.drawText('NO.', { x: x + 4, y: y - 8, size: 6, font: fontBold, color: DIM });
  page.drawText('PLAYERS', { x: x + 32, y: y - 8, size: 6, font: fontBold, color: DIM });
  page.drawText('POS', { x: x + w - 32, y: y - 8, size: 6, font: fontBold, color: DIM });
  y -= 12;
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, color: GRID, thickness: 0.5 });
  y -= 8;

  // Roster rows (up to 20)
  const maxRows = 20;
  for (let i = 0; i < maxRows; i++) {
    const p = roster[i];
    if (p) {
      const jersey = String(p.jersey_number).padStart(2, '0');
      page.drawText(jersey, { x: x + 4, y: y - 6, size: 7, font: fontMono, color: TEXT });
      page.drawText(truncate(p.name, 22, fontReg, 7), { x: x + 32, y: y - 6, size: 7, font: fontReg, color: TEXT });
      page.drawText(p.position, { x: x + w - 4 - fontReg.widthOfTextAtSize(p.position, 7), y: y - 6, size: 7, font: fontReg, color: TEXT });
    }
    y -= 11;
    if (i < maxRows - 1) {
      page.drawLine({ start: { x, y: y + 5 }, end: { x: x + w, y: y + 5 }, color: HAIRLINE, thickness: 0.25 });
    }
  }
  y -= 4;

  // Coach block
  page.drawLine({ start: { x, y: y + 4 }, end: { x: x + w, y: y + 4 }, color: GRID, thickness: 0.5 });
  y -= 6;
  page.drawText('COACH', { x: x + 4, y, size: 6, font: fontBold, color: DIM });
  if (coach?.name) {
    page.drawText(truncate(coach.name, 24, fontReg, 7), { x: x + 32, y, size: 7, font: fontReg, color: TEXT });
  } else {
    page.drawLine({ start: { x: x + 32, y: y + 1 }, end: { x: x + w - 4, y: y + 1 }, color: GRID, thickness: 0.5 });
  }
  y -= 12;
  page.drawText('CEP LVL', { x: x + 4, y, size: 6, font: fontBold, color: DIM });
  page.drawLine({ start: { x: x + 32, y: y + 1 }, end: { x: x + (w / 2) - 4, y: y + 1 }, color: GRID, thickness: 0.5 });
  page.drawText('YEAR', { x: x + (w / 2) + 4, y, size: 6, font: fontBold, color: DIM });
  page.drawLine({ start: { x: x + (w / 2) + 32, y: y + 1 }, end: { x: x + w - 4, y: y + 1 }, color: GRID, thickness: 0.5 });
  y -= 14;

  // Signature line.
  page.drawText('SIGNATURE', { x: x + 4, y, size: 6, font: fontBold, color: DIM });
  page.drawLine({ start: { x: x + 48, y: y + 1 }, end: { x: x + w - 4, y: y + 1 }, color: GRID, thickness: 0.5 });
  y -= 14;

  // Bottom: timeouts and goalie
  page.drawLine({ start: { x, y: y + 4 }, end: { x: x + w, y: y + 4 }, color: GRID, thickness: 0.5 });
  y -= 8;
  page.drawText('TIME OUTS', { x: x + 4, y, size: 6, font: fontBold, color: DIM });
  for (let i = 0; i < 3; i++) {
    const tx = x + 4 + i * 18;
    page.drawRectangle({ x: tx, y: y - 8, width: 14, height: 10, color: rgb(1, 1, 1), borderColor: GRID, borderWidth: 0.5 });
  }
  y -= 16;

  // Goalie summary
  const goalies = roster.filter((p) => p.is_goalie);
  page.drawText('GOALTENDING', { x: x + 4, y, size: 6, font: fontBold, color: GOLD });
  y -= 10;
  // mini header
  page.drawText('NO.', { x: x + 4, y, size: 5, font: fontBold, color: DIM });
  page.drawText('NAME', { x: x + 30, y, size: 5, font: fontBold, color: DIM });
  page.drawText('MIN', { x: x + w - 92, y, size: 5, font: fontBold, color: DIM });
  page.drawText('GA', { x: x + w - 64, y, size: 5, font: fontBold, color: DIM });
  page.drawText('SV', { x: x + w - 42, y, size: 5, font: fontBold, color: DIM });
  y -= 6;
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, color: HAIRLINE, thickness: 0.25 });
  y -= 4;
  for (let i = 0; i < 2; i++) {
    const g = goalies[i];
    if (g) {
      page.drawText(String(g.jersey_number).padStart(2, '0'), { x: x + 4, y, size: 6, font: fontMono, color: TEXT });
      page.drawText(truncate(g.name, 18, fontReg, 6), { x: x + 30, y, size: 6, font: fontReg, color: TEXT });
    } else {
      page.drawText('—', { x: x + 4, y, size: 6, font: fontReg, color: DIM });
    }
    page.drawLine({ start: { x: x + w - 92, y: y - 2 }, end: { x: x + w - 70, y: y - 2 }, color: HAIRLINE, thickness: 0.25 });
    page.drawLine({ start: { x: x + w - 64, y: y - 2 }, end: { x: x + w - 46, y: y - 2 }, color: HAIRLINE, thickness: 0.25 });
    page.drawLine({ start: { x: x + w - 42, y: y - 2 }, end: { x: x + w - 4, y: y - 2 }, color: HAIRLINE, thickness: 0.25 });
    y -= 9;
  }
}

function drawCenterColumn(
  page: PDFPage,
  fontReg: PDFFont,
  fontBold: PDFFont,
  fontMono: PDFFont,
  x: number,
  topY: number,
  w: number,
  h: number,
  g: GameData,
  events: EventLite[]
) {
  let y = topY;
  // Header band
  page.drawRectangle({ x, y: y - 14, width: w, height: 14, color: NAVY_LIGHT });
  page.drawText('GAME INFORMATION', { x: x + 4, y: y - 10, size: 8, font: fontBold, color: GOLD });
  y -= 18;

  // Game info grid: Date / Start / End / Time / Division
  const infoRows: [string, string][] = [
    ['Date', formatDate(g.scheduled_at || g.started_at)],
    ['Start', formatTime(g.started_at) || '—'],
    ['End', formatTime(g.ended_at) || '—'],
    ['Division', titleCase(g.game_type)],
    ['Periods', `${g.periods_total} × ${Math.round(g.period_length_seconds / 60)}`],
  ];
  const infoColW = w / 2;
  for (let i = 0; i < infoRows.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = x + col * infoColW;
    const cy = y - row * 12;
    page.drawText(infoRows[i][0].toUpperCase(), { x: cx, y: cy, size: 5, font: fontBold, color: DIM });
    page.drawText(truncate(infoRows[i][1], 16, fontReg, 7), { x: cx, y: cy - 7, size: 7, font: fontReg, color: TEXT });
  }
  y -= 30;

  // Scoring by period table
  page.drawText('SCORING BY PERIOD', { x, y, size: 7, font: fontBold, color: GOLD });
  y -= 12;
  const periodScores = computePeriodScores(events, g.periods_total);
  const colW = w / 6;
  const headers = ['', '1', '2', '3', 'OT', 'T'];
  for (let i = 0; i < headers.length; i++) {
    const cx = x + i * colW;
    page.drawText(headers[i], { x: cx + 3, y, size: 6, font: fontBold, color: DIM });
  }
  y -= 4;
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, color: GRID, thickness: 0.5 });
  y -= 8;
  const homeRow: (string | number)[] = [g.home_team_name, periodScores.home[0] || 0, periodScores.home[1] || 0, periodScores.home[2] || 0, periodScores.home[3] || 0, periodScores.home.reduce((a: number, b: number) => a + b, 0)];
  const awayRow: (string | number)[] = [g.away_team_name, periodScores.away[0] || 0, periodScores.away[1] || 0, periodScores.away[2] || 0, periodScores.away[3] || 0, periodScores.away.reduce((a: number, b: number) => a + b, 0)];
  for (const row of [homeRow, awayRow]) {
    for (let i = 0; i < row.length; i++) {
      const cx = x + i * colW;
      const value = row[i];
      const text = i === 0 ? truncate(String(value), 8, fontReg, 6) : String(value);
      page.drawText(text, { x: cx + 3, y, size: 6, font: i === 0 ? fontReg : fontBold, color: TEXT });
    }
    y -= 9;
    page.drawLine({ start: { x, y: y + 4 }, end: { x: x + w, y: y + 4 }, color: HAIRLINE, thickness: 0.25 });
  }
  y -= 6;

  // Goal log header
  page.drawText('GOALS', { x, y, size: 7, font: fontBold, color: GOLD });
  y -= 10;
  // Sub-header
  const goalHeaders: Array<[string, number]> = [
    ['#', 12], ['P', 10], ['TIME', 26], ['SCORER', 60], ['ASST', 60], ['STR', 14]
  ];
  let cx = x;
  for (const [label, width] of goalHeaders) {
    page.drawText(label, { x: cx + 2, y, size: 5, font: fontBold, color: DIM });
    cx += width;
  }
  y -= 4;
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, color: GRID, thickness: 0.5 });
  y -= 8;
  const goalEvents = events.filter((e) => e.event_type === 'goal' || e.event_type === 'shootout_goal');
  const maxGoalRows = 8;
  if (goalEvents.length === 0) {
    page.drawText('No goals recorded.', { x: x + 4, y, size: 6, font: fontReg, color: DIM });
    y -= 9;
  }
  for (let i = 0; i < Math.min(goalEvents.length, maxGoalRows); i++) {
    const e = goalEvents[i];
    const roster = e.team_side === 'home' ? g.home_roster || [] : g.away_roster || [];
    cx = x;
    const cells: string[] = [
      String(e.sequence_number),
      String(e.period),
      formatClock(e.clock_seconds),
      playerShort(roster, e.scorer_jersey),
      buildAssists(roster, e.primary_assist_jersey, e.secondary_assist_jersey),
      e.strength && e.strength !== 'even' ? e.strength.toUpperCase() : '',
    ];
    for (let j = 0; j < cells.length; j++) {
      const width = goalHeaders[j][1];
      const text = truncate(cells[j], j === 3 || j === 4 ? 12 : 8, fontReg, 6);
      page.drawText(text, { x: cx + 2, y, size: 6, font: fontReg, color: TEXT });
      cx += width;
    }
    y -= 8;
  }
  if (goalEvents.length > maxGoalRows) {
    page.drawText(`+ ${goalEvents.length - maxGoalRows} more on next sheet`, { x, y, size: 5, font: fontReg, color: DIM });
    y -= 7;
  }
  y -= 4;

  // Shots by period (mini summary)
  page.drawText('SHOTS BY PERIOD', { x, y, size: 7, font: fontBold, color: GOLD });
  y -= 12;
  const shots = computeShotsByPeriod(events, g.periods_total);
  const shotHeaders = ['', '1', '2', '3', 'OT', 'T'];
  cx = x;
  for (let i = 0; i < shotHeaders.length; i++) {
    page.drawText(shotHeaders[i], { x: cx + 3, y, size: 6, font: fontBold, color: DIM });
    cx += colW;
  }
  y -= 4;
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, color: GRID, thickness: 0.5 });
  y -= 8;
  for (const [label, arr] of [['Home', shots.home], ['Visitor', shots.away]] as const) {
    cx = x;
    const total = arr.reduce((a: number, b: number) => a + b, 0);
    const cells = [label, ...arr.slice(0, 3), arr[3] || 0, total];
    for (let i = 0; i < cells.length; i++) {
      const text = String(cells[i]);
      page.drawText(text, { x: cx + 3, y, size: 6, font: i === 0 ? fontReg : fontBold, color: TEXT });
      cx += colW;
    }
    y -= 9;
  }
}

function drawBottomStrip(
  page: PDFPage,
  fontReg: PDFFont,
  fontBold: PDFFont,
  fontMono: PDFFont,
  g: GameData,
  events: EventLite[],
  scorekeeperName?: string
) {
  // Bottom strip is split:
  //   Left third:   home team penalties (5 rows)
  //   Middle third: away team penalties (5 rows) + signature block
  //   Right third:  coach / game officials signatures

  const stripTop = 122;
  const stripH = 102;

  // Headers
  page.drawRectangle({ x: MARGIN, y: stripTop, width: PAGE_W - MARGIN * 2, height: 14, color: NAVY_LIGHT });
  page.drawText('PENALTIES & OFFICIALS', { x: MARGIN + 4, y: stripTop + 4, size: 8, font: fontBold, color: GOLD });

  // 3 sub-columns
  const w = (PAGE_W - MARGIN * 2) / 3;
  const homePenaltyX = MARGIN;
  const awayPenaltyX = homePenaltyX + w + 4;
  const officialsX = awayPenaltyX + w + 4;

  let y = stripTop - 6;
  // Penalty header row
  page.drawText(g.home_team_name.toUpperCase() + ' PENALTIES', { x: homePenaltyX + 4, y, size: 6, font: fontBold, color: DIM });
  page.drawText(g.away_team_name.toUpperCase() + ' PENALTIES', { x: awayPenaltyX + 4, y, size: 6, font: fontBold, color: DIM });
  page.drawText('GAME OFFICIALS', { x: officialsX + 4, y, size: 6, font: fontBold, color: DIM });
  y -= 10;
  page.drawLine({ start: { x: homePenaltyX, y }, end: { x: homePenaltyX + w, y }, color: GRID, thickness: 0.5 });
  page.drawLine({ start: { x: awayPenaltyX, y }, end: { x: awayPenaltyX + w, y }, color: GRID, thickness: 0.5 });
  page.drawLine({ start: { x: officialsX, y }, end: { x: officialsX + w, y }, color: GRID, thickness: 0.5 });
  y -= 8;

  // Sub-headers
  const ph = ['', 'NO.', 'TIME', 'OFFENSE', 'MIN', 'START', 'ON'];
  let cx = homePenaltyX;
  for (let i = 0; i < ph.length; i++) {
    page.drawText(ph[i], { x: cx + 2, y, size: 5, font: fontBold, color: DIM });
    cx += i === 0 ? 8 : i === 1 ? 12 : i === 2 ? 22 : i === 3 ? 30 : i === 4 ? 14 : (w - 8 - 12 - 22 - 30 - 14) / 2;
  }
  cx = awayPenaltyX;
  for (let i = 0; i < ph.length; i++) {
    page.drawText(ph[i], { x: cx + 2, y, size: 5, font: fontBold, color: DIM });
    cx += i === 0 ? 8 : i === 1 ? 12 : i === 2 ? 22 : i === 3 ? 30 : i === 4 ? 14 : (w - 8 - 12 - 22 - 30 - 14) / 2;
  }
  y -= 4;
  page.drawLine({ start: { x: homePenaltyX, y }, end: { x: homePenaltyX + w, y }, color: HAIRLINE, thickness: 0.25 });
  page.drawLine({ start: { x: awayPenaltyX, y }, end: { x: awayPenaltyX + w, y }, color: HAIRLINE, thickness: 0.25 });
  y -= 8;

  // Penalty rows: 5 per side
  const homePenalties = events.filter((e) => e.event_type === 'penalty' && e.team_side === 'home');
  const awayPenalties = events.filter((e) => e.event_type === 'penalty' && e.team_side === 'away');
  for (let i = 0; i < 5; i++) {
    drawPenaltyRow(page, fontReg, fontMono, homePenaltyX, w, y, homePenalties[i]);
    drawPenaltyRow(page, fontReg, fontMono, awayPenaltyX, w, y, awayPenalties[i]);
    y -= 11;
  }

  // Officials column: signature lines.
  y = stripTop - 6;
  const officialsLabels: [string, number][] = [
    ['REFEREE', 0],
    ['LINESMAN', 22],
    ['SCORER', 44],
  ];
  for (const [role, dy] of officialsLabels) {
    page.drawText(role, { x: officialsX + 4, y: y - dy, size: 5, font: fontBold, color: DIM });
    page.drawLine({ start: { x: officialsX + 50, y: y - dy + 1 }, end: { x: officialsX + w - 4, y: y - dy + 1 }, color: GRID, thickness: 0.5 });
  }
  // Scorekeeper signature (use input.scorekeeperName if provided)
  y = stripTop - 6 - 70;
  page.drawText('SCOREKEEPER', { x: officialsX + 4, y, size: 5, font: fontBold, color: DIM });
  if (scorekeeperName) {
    page.drawText(truncate(scorekeeperName, 26, fontReg, 7), { x: officialsX + 50, y, size: 7, font: fontReg, color: TEXT });
  }
  page.drawLine({ start: { x: officialsX + 50, y: y + 1 }, end: { x: officialsX + w - 4, y: y + 1 }, color: GRID, thickness: 0.5 });

  // Footer: timestamp + generator line
  const footer = `Generated by RinkStop Scoresheet · ${formatDateTime(new Date().toISOString())} · rinkstop.com/scoresheet`;
  page.drawText(footer, { x: MARGIN, y: 8, size: 5, font: fontReg, color: DIM });
}

function drawPenaltyRow(
  page: PDFPage,
  fontReg: PDFFont,
  fontMono: PDFFont,
  x: number,
  w: number,
  y: number,
  ev: EventLite | undefined
) {
  if (ev) {
    page.drawText(String(ev.period), { x: x + 2, y, size: 6, font: fontMono, color: TEXT });
    page.drawText(ev.penalty_jersey != null ? String(ev.penalty_jersey) : '', { x: x + 10, y, size: 6, font: fontMono, color: TEXT });
    page.drawText(formatClock(ev.clock_seconds), { x: x + 22, y, size: 6, font: fontMono, color: TEXT });
    page.drawText(truncate(ev.penalty_type?.replace(/-/g, ' ') || '', 14, fontReg, 6), { x: x + 44, y, size: 6, font: fontReg, color: TEXT });
    page.drawText(ev.penalty_minutes != null ? String(ev.penalty_minutes) : '', { x: x + 74, y, size: 6, font: fontMono, color: TEXT });
    // START and ON columns are fillable (time of penalty start, on-ice time)
    page.drawLine({ start: { x: x + 88, y: y + 1 }, end: { x: x + 110, y: y + 1 }, color: HAIRLINE, thickness: 0.25 });
    page.drawLine({ start: { x: x + 112, y: y + 1 }, end: { x: x + w - 4, y: y + 1 }, color: HAIRLINE, thickness: 0.25 });
  } else {
    // Empty row
    page.drawLine({ start: { x: x + 1, y: y + 1 }, end: { x: x + w - 4, y: y + 1 }, color: HAIRLINE, thickness: 0.25 });
  }
}

// ─── Pure helpers ──────────────────────────────────────────────

function computePeriodScores(events: EventLite[], periodsTotal: number): { home: number[]; away: number[] } {
  const cols = periodsTotal + 1; // regulation (3) + OT
  const home: number[] = new Array(cols).fill(0);
  const away: number[] = new Array(cols).fill(0);
  for (const e of events) {
    if (e.event_type !== 'goal' && e.event_type !== 'shootout_goal') continue;
    const period = e.period;
    if (period >= 1 && period <= 3) {
      if (e.team_side === 'home') home[period - 1]++;
      else away[period - 1]++;
    } else if (period === 4) {
      if (e.team_side === 'home') home[3]++;
      else away[3]++;
    }
  }
  return { home, away };
}

function computeShotsByPeriod(events: EventLite[], periodsTotal: number): { home: number[]; away: number[] } {
  const cols = periodsTotal + 1;
  const home: number[] = new Array(cols).fill(0);
  const away: number[] = new Array(cols).fill(0);
  for (const e of events) {
    if (e.event_type !== 'shot_on_goal' && e.event_type !== 'goal' && e.event_type !== 'shootout_goal') continue;
    const period = e.period;
    if (period >= 1 && period <= 3) {
      if (e.team_side === 'home') home[period - 1]++;
      else away[period - 1]++;
    } else if (period === 4) {
      if (e.team_side === 'home') home[3]++;
      else away[3]++;
    }
  }
  return { home, away };
}

function playerName(roster: PlayerLite[], jersey: number | null): string {
  if (jersey == null) return '';
  const p = roster.find((r) => r.jersey_number === jersey);
  return p ? p.name : `#${jersey}`;
}
function playerShort(roster: PlayerLite[], jersey: number | null): string {
  const name = playerName(roster, jersey);
  if (!name) return '';
  // Split on space, take last word for compact display.
  const parts = name.split(/\s+/);
  if (parts.length === 1) return `${parts[0]} #${jersey}`;
  return `${parts[parts.length - 1]} #${jersey}`;
}
function buildAssists(roster: PlayerLite[], a1: number | null, a2: number | null): string {
  const parts: string[] = [];
  if (a1 != null) {
    const p = roster.find((r) => r.jersey_number === a1);
    parts.push(p ? `#${a1} ${p.name.split(' ').pop()}` : `#${a1}`);
  }
  if (a2 != null) {
    const p = roster.find((r) => r.jersey_number === a2);
    parts.push(p ? `#${a2} ${p.name.split(' ').pop()}` : `#${a2}`);
  }
  return parts.join(', ');
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

function truncate(text: string, maxChars: number, _font: PDFFont, _fontSize: number): string {
  if (!text) return '';
  const max = Math.floor(maxChars);
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}
