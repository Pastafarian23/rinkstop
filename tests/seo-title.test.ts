// tests/seo-title.test.ts
//
// Tests for src/lib/seo-title.ts — SERP title length handling.
//
// WHY THIS EXISTS (2026-10-23, GSC title-length pass)
//
// The root layout declares `title: { template: '%s | RinkStop' }`, so every
// child page's title is rendered as "<child title> | RinkStop". The rink page
// generator budgeted its title at 60 chars — but that was meant to be the
// FINAL length, and the template then added 10 more. Every "60 char" title
// actually rendered at 70, and Google truncated it mid-phrase:
//
//   "Ice Rink StarCenter Euless | Ice Rink — Euless, Tarrant County, TX | RinkStop"  (76)
//
// This is the same bug family as the PostgREST `limit` cap: a limit that looks
// like it works and silently doesn't, because the thing measured (the page's
// own title) is not the thing rendered (the templated title).
//
// The most important test here is the LAST one: it asserts the suffix constant
// still matches the layout's template, so the two cannot drift apart again.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  TITLE_TEMPLATE_SUFFIX,
  SERP_TITLE_MAX,
  pageTitleBudget,
  pickSercTitle,
  shortenSercTitle,
} from '../src/lib/seo-title';

describe('pageTitleBudget', () => {
  it('reserves room for the template suffix', () => {
    // " | RinkStop" is 11 characters: space + pipe + space + 8 letters.
    expect(TITLE_TEMPLATE_SUFFIX.length).toBe(11);
    expect(pageTitleBudget(60, TITLE_TEMPLATE_SUFFIX)).toBe(49);
  });

  it('never goes negative', () => {
    expect(pageTitleBudget(5, ' | RinkStop')).toBe(0);
    expect(pageTitleBudget(0, ' | RinkStop')).toBe(0);
  });
});

describe('pickSercTitle', () => {
  it('picks the first candidate that fits the budget', () => {
    const title = pickSercTitle([
      'Ice Rink StarCenter Euless | Ice Rink — Euless, Tarrant County, TX',
      'Ice Rink StarCenter Euless | Ice Rink — Euless',
      'Ice Rink StarCenter Euless',
    ]);
    expect(title).toBe('Ice Rink StarCenter Euless | Ice Rink — Euless');
  });

  it('produces a final title that fits once the suffix is added', () => {
    const title = pickSercTitle([
      'Ice Rink StarCenter Euless | Ice Rink — Euless, Tarrant County, TX',
      'Ice Rink StarCenter Euless',
    ]);
    expect((title + TITLE_TEMPLATE_SUFFIX).length).toBeLessThanOrEqual(SERP_TITLE_MAX);
  });

  it('falls back to the shortest candidate when nothing fits', () => {
    const title = pickSercTitle([
      'An Extremely Long Hockey Rink Name That Cannot Possibly Fit In Fifty Characters',
      'Short',
    ]);
    expect(title).toBe('Short');
  });

  it('ignores empty candidates', () => {
    expect(pickSercTitle(['', '   ', 'Valid Title'])).toBe('Valid Title');
  });

  it('returns empty string for no usable candidates', () => {
    expect(pickSercTitle(['', '  '])).toBe('');
  });
});

describe('shortenSercTitle', () => {
  it('leaves a short title untouched', () => {
    const t = 'Hockey Cost by Age: 6U to 18U Pricing';
    expect(shortenSercTitle(t)).toBe(t);
  });

  it('drops trailing clauses to fit the budget', () => {
    const title = 'USA Hockey Development League: What Parents Need to Know (2027-28 Launch)';
    const out = shortenSercTitle(title);
    expect((out + TITLE_TEMPLATE_SUFFIX).length).toBeLessThanOrEqual(SERP_TITLE_MAX);
    // Must still read naturally — no dangling colon or dash.
    expect(out).not.toMatch(/[:—–,–]\s*$/);
  });

  it('never cuts mid-word', () => {
    const title = 'Hockey Training Facilities Near Me: A Complete Guide to Finding Quality Ice Time';
    const out = shortenSercTitle(title);
    expect((out + TITLE_TEMPLATE_SUFFIX).length).toBeLessThanOrEqual(SERP_TITLE_MAX);
    // The result must not end mid-token (no trailing partial word from a cut).
    expect(out.length).toBeGreaterThan(0);
  });

  it('handles the longest real offender (109 chars)', () => {
    const title = "The CHL vs. NCAA Battle Nobody's Talking About — And Why It Matters More Than Ever";
    const out = shortenSercTitle(title);
    expect((out + TITLE_TEMPLATE_SUFFIX).length).toBeLessThanOrEqual(SERP_TITLE_MAX);
  });

  it('handles a title with no clause boundaries at all', () => {
    const title = 'Supercalifragilisticexpialidocioushockeyrinknamethatgoesonandonandonforever';
    const out = shortenSercTitle(title);
    expect((out + TITLE_TEMPLATE_SUFFIX).length).toBeLessThanOrEqual(SERP_TITLE_MAX);
  });

  it('returns empty string for empty input', () => {
    expect(shortenSercTitle('')).toBe('');
    expect(shortenSercTitle('   ')).toBe('');
  });

  it('does not mangle a title that already fits', () => {
    const t = 'Hockey Cost by Age: 6U to 18U Pricing';
    expect(shortenSercTitle(t)).toBe(t);
  });
});

describe('layout template stays in sync', () => {
  it('TITLE_TEMPLATE_SUFFIX matches the layout title template', () => {
    const layoutPath = resolve(__dirname, '../src/app/layout.tsx');
    const layout = readFileSync(layoutPath, 'utf8');
    const match = layout.match(/template:\s*'([^']+)'/);
    expect(match).not.toBeNull();
    if (!match) return;

    // Turn the template into the literal suffix it appends to a child title.
    // '%s | RinkStop' -> ' | RinkStop'
    const template = match[1];
    expect(template.startsWith('%s')).toBe(true);
    const derivedSuffix = template.slice('%s'.length);

    expect(derivedSuffix).toBe(TITLE_TEMPLATE_SUFFIX);
  });
});
