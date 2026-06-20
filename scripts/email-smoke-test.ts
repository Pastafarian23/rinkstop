/**
 * Smoke test: verify Zoho SMTP works end-to-end.
 *
 * Run with: npx tsx scripts/email-smoke-test.ts
 * (Or: pnpm exec tsx scripts/email-smoke-test.ts)
 *
 * Sends 3 emails to a test recipient (Arnel's email, set in the script).
 * The recipient checks the From: header to confirm support@rinkstop.com
 * is being used.
 */
import { sendEmail, pingEmail } from '../src/lib/email';

const TEST_TO = 'arnellarracas@gmail.com';

async function main() {
  console.log('=== Email smoke test ===\n');

  // 1. Ping
  console.log('1. pingEmail()...');
  const ping = await pingEmail();
  console.log(`   ok=${ping.ok}  latencyMs=${ping.latencyMs}  error=${ping.error || 'none'}`);

  if (!ping.ok) {
    if (ping.error?.includes('535') || ping.error?.includes('Authentication Failed')) {
      console.log('\n🔑  Zoho rejected the password (535 Authentication Failed).');
      console.log('   This means 2FA is enabled and you need an APP-SPECIFIC password,');
      console.log('   not the account password.');
      console.log('');
      console.log('   Steps:');
      console.log('   1. Log into https://accounts.zoho.com as support@rinkstop.com');
      console.log('   2. Go to Security → App Passwords → Generate New Password');
      console.log('   3. Name it "RinkStop Vercel", copy the generated password');
      console.log('   4. Update Vercel env var ZOHOMAIL_APP_PASSWORD with the new value');
      console.log('   5. Re-run this script');
    } else {
      console.log('\nAborting. Either ZOHOMAIL_* env vars are missing or SMTP is down.');
    }
    process.exit(1);
  }

  // 2. Send welcome template
  console.log('\n2. send welcome email...');
  const r1 = await sendEmail({
    to: TEST_TO,
    subject: '[smoke-test] Welcome template',
    template: 'welcome',
    data: { displayName: 'Arnel', username: 'pastafarian' },
    tag: 'smoke-welcome',
  });
  console.log(`   ok=${r1.ok}  messageId=${r1.messageId}  error=${r1.error || 'none'}`);

  // 3. Send team-post template
  console.log('\n3. send team-post email...');
  const r2 = await sendEmail({
    to: TEST_TO,
    subject: '[smoke-test] Team post template',
    template: 'team-post',
    data: {
      teamName: 'Chicago Blackhawks',
      teamSlug: 'chicago-blackhawks',
      postKind: 'result',
      title: 'Win vs Toronto 4–2',
      body: 'Goals by Kane, Toews, Kane, Saad. Three stars: Crawford, Kane, Keith.',
      authorName: 'Coach Q',
    },
    tag: 'smoke-team-post',
  });
  console.log(`   ok=${r2.ok}  messageId=${r2.messageId}  error=${r2.error || 'none'}`);

  // 4. Send connection-request template
  console.log('\n4. send connection-request email...');
  const r3 = await sendEmail({
    to: TEST_TO,
    subject: '[smoke-test] Connection request template',
    template: 'connection-request',
    data: {
      requesterName: 'Test User',
      requesterUsername: 'testuser',
      connectionId: '00000000-0000-0000-0000-000000000000',
    },
    tag: 'smoke-conn',
  });
  console.log(`   ok=${r3.ok}  messageId=${r3.messageId}  error=${r3.error || 'none'}`);

  const allOk = r1.ok && r2.ok && r3.ok;
  console.log(`\n=== Result: ${allOk ? 'ALL PASS' : 'FAILED'} ===`);
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
