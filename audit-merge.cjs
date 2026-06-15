#!/usr/bin/env node
/**
 * audit-merge.cjs — 2026-06-15
 *
 * After importing 11 Canada rink xlsx files, the audit identified 8 confirmed
 * name changes (same arena, renamed). For each, the OLD row is kept as the
 * canonical one (more historical data, but with old name). This script:
 *   1. Renames OLD row to NEW name + new slug
 *   2. Appends "Formerly known as: <old name>" to notes (SEO + historical)
 *   3. Pulls the NEW row's capacity/notes into the OLD row
 *   4. Marks the NEW row is_active=false (audit trail preserved)
 *   5. Adds cross-references for Lloydminster AB+SK cross-listed rows
 *
 * Then logs results to memory.
 */

require('./scripts/load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const merges = [
  // 8 confirmed name changes
  { keepId: 'c0dd6ee4-5dde-4014-81f7-73e46f254172', dropId: '974508b5-ea6d-4f97-84b6-af9885f2190a',
    newName: 'TD Civic Centre', newSlug: 'td-civic-centre', oldName: 'Brantford Civic Centre' },
  { keepId: '321fba96-b435-4c22-9d44-6c1b65db813e', dropId: '6ce46c23-0644-454b-ac7c-6b4a7112f945',
    newName: 'TD Place Arena', newSlug: 'td-place-arena', oldName: 'TD Place' },
  { keepId: 'e5ae0d32-33c4-41d8-b536-fabdd3b2d6bd', dropId: 'f03710da-e3ac-4712-905f-6d9de4f8f487',
    newName: "Leon's Centre", newSlug: 'leons-centre', oldName: 'Slush Puppie Place' },
  { keepId: '9db48d2a-9304-421d-92dd-225d10bad0ef', dropId: '545578df-6755-4459-99ef-0221be774c1e',
    newName: 'Vidéotron Centre', newSlug: 'videotron-centre', oldName: 'Centre Videotron' },
  { keepId: '7b2fd73a-a5e3-4216-91ae-ed53fa829d23', dropId: '59fd206f-fef5-4749-8ee7-711d1c169e06',
    newName: 'Slush Puppie Centre', newSlug: 'slush-puppie-centre', oldName: 'Centre Slush Puppie' },
  { keepId: '02fe6c33-4a14-48c6-b3d2-0f4411af3cd5', dropId: '600276c0-c11c-4f8b-976a-e27218ca4f07',
    newName: 'Colisée Financière Sun Life', newSlug: 'colisee-financiere-sun-life', oldName: 'Colee Financiere Sun Life' },
  { keepId: '7feabf0c-db49-47b7-b262-fe0abe940b6c', dropId: 'ab1cab6d-3f42-4a88-970d-2e7b6670886b',
    newName: "Centre d'Excellence Sports Rousseau", newSlug: 'centre-dexcellence-sports-rousseau', oldName: 'Centre Excellence Sports Rousseau' },
  { keepId: 'd102b8af-4ca6-4fef-b22e-3db1006c8dd4', dropId: '98ac8709-913b-4524-91c1-c8e05ee991bd',
    newName: 'Westman Place at Keystone Centre', newSlug: 'westman-place-at-keystone-centre', oldName: 'Westoba Place' },
];

(async () => {
  console.log('=== AUDIT MERGE: 8 confirmed name changes ===\n');

  // PHASE 1: Inactivate all new rows first to free up the slugs.
  console.log('Phase 1: Mark new rows inactive (frees slugs for the rename)...\n');
  for (const m of merges) {
    const { error: inErr } = await sb.from('rinks').update({ is_active: false }).eq('id', m.dropId);
    if (inErr) {
      console.log(`  !! Inactive flag failed for ${m.dropId.slice(0,8)}: ${inErr.message}`);
    } else {
      console.log(`  ✓ ${m.dropId.slice(0,8)} marked is_active=false`);
    }
  }

  // PHASE 2: Now rename old rows to the new name/slug.
  // Pre-step: free up the new slugs by renaming the new rows to a unique placeholder
  // (so the unique constraint on slug doesn't block).
  console.log('\nPhase 2a: Free up target slugs by renaming new rows to placeholder...\n');
  for (const m of merges) {
    const placeholder = `${m.newSlug}-merged-${m.dropId.slice(0, 8)}`;
    const { error: phErr } = await sb.from('rinks').update({ slug: placeholder, is_active: false }).eq('id', m.dropId);
    if (phErr) {
      console.log(`  !! Placeholder rename failed for ${m.dropId.slice(0,8)}: ${phErr.message}`);
    } else {
      console.log(`  ✓ ${m.dropId.slice(0,8)} slug → ${placeholder}`);
    }
  }

  console.log('\nPhase 2b: Rename old rows + add alias line + pull new row data...\n');
  for (const m of merges) {
    const { data: keepRow } = await sb.from('rinks').select('*').eq('id', m.keepId).maybeSingle();
    const { data: dropRow } = await sb.from('rinks').select('*').eq('id', m.dropId).maybeSingle();
    if (!keepRow || !dropRow) {
      console.log(`!! Missing row for merge: keepId=${m.keepId?.slice(0,8)} dropId=${m.dropId?.slice(0,8)}`);
      continue;
    }

    // Build new notes: keep existing notes + add new row's notes (if any) + alias line
    const aliasLine = `Formerly known as: ${m.oldName}`;
    const newNotesStr = (dropRow.notes || '').trim();
    const existing = (keepRow.notes || '').trim();
    const bits = [];
    if (existing && !existing.includes(aliasLine)) bits.push(existing);
    if (newNotesStr) bits.push(newNotesStr);
    if (!bits.some(b => b.includes(aliasLine))) bits.push(aliasLine);
    const finalNotes = bits.join(' | ');

    // Use new row's capacity if old is null/0
    const finalCapacity = keepRow.capacity || dropRow.capacity;

    const updatePayload = {
      name: m.newName,
      slug: m.newSlug,
      notes: finalNotes,
      capacity: finalCapacity,
      is_active: true,
    };

    const { error: upErr } = await sb.from('rinks').update(updatePayload).eq('id', m.keepId);
    if (upErr) {
      console.log(`  !! Update failed for ${m.keepId.slice(0,8)}: ${upErr.message}`);
      continue;
    }

    console.log(`✓ ${m.oldName} (${keepRow.city}) → ${m.newName}`);
    console.log(`  slug: ${keepRow.slug} → ${m.newSlug}`);
    console.log(`  cap: ${keepRow.capacity} → ${finalCapacity}`);
    console.log(`  alias line: "${aliasLine}"`);
  }

  console.log('\n=== Lloydminster cross-list ===\n');
  const { data: abRow } = await sb.from('rinks').select('*').eq('id', '8bacf788-0df4-4557-ab1b-7530f3f93743').maybeSingle();
  const { data: skRow } = await sb.from('rinks').select('*').eq('id', '662455de-7084-4758-b1de-fdead15705e7').maybeSingle();

  if (abRow) {
    const abNote = 'Cross-listed in SK (Cenovus Energy Hub (Lloydminster AB/SK)). Lloydminster straddles AB/SK border.';
    const abNotes = abRow.notes ? `${abRow.notes} | ${abNote}` : abNote;
    await sb.from('rinks').update({ notes: abNotes, is_active: true }).eq('id', abRow.id);
    console.log('✓ AB row + cross-ref note');
  } else {
    console.log('!! AB Lloydminster row not found');
  }
  if (skRow) {
    const skNote = 'Cross-listed in AB (Cenovus Energy Hub). Lloydminster straddles AB/SK border; primary home is AB for hockey (AJHL).';
    const skNotes = skRow.notes ? `${skRow.notes} | ${skNote}` : skNote;
    await sb.from('rinks').update({ notes: skNotes, is_active: true }).eq('id', skRow.id);
    console.log('✓ SK row + cross-ref note');
  } else {
    console.log('!! SK Lloydminster row not found');
  }

  console.log('\n=== Confirmed-NOT-dupes (left as separate rows) ===');
  console.log('  ON North Bay: Boart Longyear Memorial Gardens ≠ North Bay Memorial Gardens (2 separate arenas in same city)');
  console.log('  ON Owen Sound: J.D. McArthur Arena ≠ Harry Lumley Bayshore Community Centre (2 separate arenas)');
  console.log('  AB Calgary Ken Bracko (Max Bell Centre) ≠ MB Winnipeg Wayne Fleming (Max Bell Centre) (different physical complexes — naming coincidence)');

  // Final summary
  const { count: activeCA } = await sb.from('rinks').select('id', { count: 'exact', head: true }).eq('country', 'Canada').eq('is_active', true);
  const { count: inactiveCA } = await sb.from('rinks').select('id', { count: 'exact', head: true }).eq('country', 'Canada').eq('is_active', false);
  const { count: totalCA } = await sb.from('rinks').select('id', { count: 'exact', head: true }).eq('country', 'Canada');
  console.log('\n=== FINAL ===');
  console.log(`  Total Canada rows: ${totalCA}`);
  console.log(`  Active (public): ${activeCA}`);
  console.log(`  Inactive (audit): ${inactiveCA}`);
})();
