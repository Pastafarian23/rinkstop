/**
 * Email templates — plain HTML, brand-true (RinkStop colors), mobile-readable.
 *
 * Conventions:
 *   - Each template exports a renderTemplate(name, data) -> { html, text }
 *   - All templates include a header (logo block), a body, and a footer
 *     (unsubscribe + address) — the footer is mandatory (CAN-SPAM).
 *   - Subject lines are short (< 60 chars).
 *   - Preheader text is the first line of the body.
 *   - From name is "RinkStop" (set in email.ts). Reply-To routes to support@.
 *
 * To add a template:
 *   1. Add a name to `TemplateName` union
 *   2. Add a data interface to `TemplateData` map
 *   3. Add a case to renderTemplate
 *   4. Add a sender helper in src/lib/email-senders.ts (or inline in route)
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
const FROM_NAME = 'RinkStop';
const FROM_ADDRESS = 'support@rinkstop.com';

const COLORS = {
  navy: '#041E42',
  red: '#C8102E',
  gold: '#FFB81C',
  text: '#1a1a1a',
  textMuted: '#6b7280',
  bg: '#f7f7f8',
  card: '#ffffff',
  border: '#e5e7eb',
  link: '#041E42',
  ice: '#EEF5FF',
};

// --- Types -----------------------------------------------------------------

export type TemplateName =
  | 'welcome'
  | 'team-invite'
  | 'connection-request'
  | 'dm-notification'
  | 'team-post'
  | 'listing-submission-confirmation'
  | 'payment-pending';

export interface TemplateData {
  welcome: {
    displayName: string | null;
    username: string | null;
  };
  'team-invite': {
    inviterName: string;
    teamName: string;
    teamSlug: string;
    inviteCode: string;
    role: string;
    expiresAt: string;
  };
  'connection-request': {
    requesterName: string;
    requesterUsername: string | null;
    connectionId: string;
  };
  'dm-notification': {
    senderName: string;
    senderUsername: string | null;
    preview: string;
    threadId: string;
  };
  'team-post': {
    teamName: string;
    teamSlug: string;
    postKind: 'news' | 'result' | 'schedule';
    title: string;
    body: string | null;
    authorName: string;
  };
  'listing-submission-confirmation': {
    listingType: string;
    name: string;
    submissionId: string;
  };
  'payment-pending': {
    teamName: string;
    paymentTitle: string;
    playerName: string;
    amount: string;
    currency: string;
    referenceNumber: string | null;
    approveLink: string;
  };
}

// --- Helpers ---------------------------------------------------------------

interface Rendered {
  html: string;
  text: string;
}

function escape(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function footerHtml(): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:32px;border-top:1px solid ${COLORS.border};padding-top:16px;">
      <tr>
        <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:${COLORS.textMuted};line-height:1.6;">
          <div style="margin-bottom:4px;"><strong style="color:${COLORS.navy};">${FROM_NAME}</strong> · The world's hockey directory.</div>
          <div>${FROM_ADDRESS} · <a href="${SITE_URL}" style="color:${COLORS.textMuted};text-decoration:underline;">rinkstop.com</a></div>
          <div style="margin-top:12px;">
            You're getting this because you have an active RinkStop account.
            <a href="${SITE_URL}/dashboard/settings/notifications" style="color:${COLORS.textMuted};text-decoration:underline;">Manage email preferences</a>
            · <a href="${SITE_URL}/dashboard/settings/notifications" style="color:${COLORS.textMuted};text-decoration:underline;">Unsubscribe</a>
          </div>
        </td>
      </tr>
    </table>
  `;
}

function footerText(): string {
  return [
    ``,
    `---`,
    `${FROM_NAME} · The world's hockey directory.`,
    `${FROM_ADDRESS} · ${SITE_URL}`,
    ``,
    `Manage email preferences: ${SITE_URL}/dashboard/settings/notifications`,
    `Unsubscribe: ${SITE_URL}/dashboard/settings/notifications`,
  ].join('\n');
}

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escape(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${COLORS.text};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORS.bg};padding:24px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:${COLORS.navy};padding:20px 24px;">
            <a href="${SITE_URL}" style="display:inline-block;text-decoration:none;">
              <img src="${SITE_URL}/rinkstoplogo.png" alt="${FROM_NAME}" width="160" height="auto" style="display:block;width:160px;height:auto;max-width:100%;border:0;outline:none;text-decoration:none;" />
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            ${body}
            ${footerHtml()}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function button(href: string, label: string, color: 'red' | 'navy' = 'red'): string {
  const bg = color === 'red' ? COLORS.red : COLORS.navy;
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0;">
    <tr>
      <td style="background:${bg};border-radius:6px;">
        <a href="${href}" style="display:inline-block;padding:12px 20px;color:#fff;text-decoration:none;font-weight:700;font-size:14px;">${escape(label)}</a>
      </td>
    </tr>
  </table>`;
}

function listingSubmissionConfirmation(d: TemplateData['listing-submission-confirmation']): Rendered {
  const subject = `We got your ${d.listingType} submission`;
  const bodyHtml = `
    <h1 style="margin:0 0 12px 0;font-size:22px;color:${COLORS.navy};font-weight:800;">Submission received.</h1>
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;">Thanks for submitting <strong>${escape(d.name)}</strong> to RinkStop. We review every submission manually — usually within 1–2 business days.</p>
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;">If we need anything else (a photo, a clarification, a contact), we'll email you back. If everything checks out, your listing goes live and you'll get a confirmation.</p>
    <p style="margin:16px 0 0 0;font-size:13px;color:${COLORS.textMuted};">Submission ID: <code style="background:#f1f5f9;padding:2px 6px;border-radius:3px;">${escape(d.submissionId)}</code></p>
  `;
  const bodyText = [
    `Thanks for submitting ${d.name} to RinkStop.`,
    ``,
    `We review every submission manually — usually within 1-2 business days.`,
    `If we need anything else, we'll email you back. If everything checks out,`,
    `your listing goes live and you'll get a confirmation.`,
    ``,
    `Submission ID: ${d.submissionId}`,
  ].join('\n');
  return {
    html: shell(subject, bodyHtml),
    text: bodyText + footerText(),
  };
}

// --- Dispatcher ------------------------------------------------------------

export function renderTemplate<T extends TemplateName>(name: T, data: TemplateData[T]): Rendered {
  switch (name) {
    case 'welcome': return welcome(data as TemplateData['welcome']);
    case 'team-invite': return teamInvite(data as TemplateData['team-invite']);
    case 'connection-request': return connectionRequest(data as TemplateData['connection-request']);
    case 'dm-notification': return dmNotification(data as TemplateData['dm-notification']);
    case 'team-post': return teamPost(data as TemplateData['team-post']);
    case 'listing-submission-confirmation':
      return listingSubmissionConfirmation(data as TemplateData['listing-submission-confirmation']);
    case 'payment-pending':
      return paymentPending(data as TemplateData['payment-pending']);
  }
}

function welcome(d: TemplateData['welcome']): Rendered {
  const name = d.displayName || d.username || 'there';
  const subject = `Welcome to RinkStop`;
  const bodyHtml = `
    <h1 style="margin:0 0 12px 0;font-size:22px;color:${COLORS.navy};font-weight:800;">Welcome to RinkStop.</h1>
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;">Hey ${escape(name)} — your account is live.</p>
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;">RinkStop is the world's hockey directory: teams, players, leagues, and rinks in 78 countries. You can now:</p>
    <ul style="margin:0 0 12px 20px;font-size:15px;line-height:1.7;">
      <li>Save players and follow teams</li>
      <li>Claim a listing for your rink, team, or league</li>
      <li>Send DMs to other verified hockey people</li>
    </ul>
    <p style="margin:0 0 4px 0;font-size:15px;line-height:1.6;">One quick thing: if you run a rink, team, or league, <strong>claim your listing</strong> to unlock the dashboard and start editing your page.</p>
    ${button(`${SITE_URL}/claim-your-listing`, 'Claim your listing →')}
    <p style="margin:16px 0 0 0;font-size:14px;line-height:1.6;color:${COLORS.textMuted};">See you on the ice.<br />— The RinkStop team</p>
  `;
  const bodyText = [
    `Hey ${name} — your account is live.`,
    ``,
    `RinkStop is the world's hockey directory: teams, players, leagues, and rinks in 78 countries.`,
    ``,
    `If you run a rink, team, or league, claim your listing: ${SITE_URL}/claim-your-listing`,
    ``,
    `See you on the ice.`,
    `— The RinkStop team`,
  ].join('\n');
  return {
    html: shell(subject, bodyHtml),
    text: bodyText + footerText(),
  };
}

function teamInvite(d: TemplateData['team-invite']): Rendered {
  const subject = `${d.inviterName} invited you to ${d.teamName}`;
  const joinUrl = `${SITE_URL}/join/${encodeURIComponent(d.inviteCode)}`;
  const bodyHtml = `
    <h1 style="margin:0 0 12px 0;font-size:22px;color:${COLORS.navy};font-weight:800;">You're invited to ${escape(d.teamName)}.</h1>
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;"><strong>${escape(d.inviterName)}</strong> added you as a <strong>${escape(d.role)}</strong> on the ${escape(d.teamName)} workspace.</p>
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;">Click below to join — the link is single-use and expires ${escape(d.expiresAt)}.</p>
    ${button(joinUrl, 'Accept invite →')}
    <p style="margin:16px 0 0 0;font-size:13px;line-height:1.6;color:${COLORS.textMuted};">Or paste this code at ${SITE_URL}/join: <code style="background:#f1f5f9;padding:2px 6px;border-radius:3px;">${escape(d.inviteCode)}</code></p>
  `;
  const bodyText = [
    `${d.inviterName} invited you to ${d.teamName} as a ${d.role}.`,
    ``,
    `Accept: ${joinUrl}`,
    `Or paste this code at ${SITE_URL}/join: ${d.inviteCode}`,
    `Expires: ${d.expiresAt}`,
  ].join('\n');
  return {
    html: shell(subject, bodyHtml),
    text: bodyText + footerText(),
  };
}

function connectionRequest(d: TemplateData['connection-request']): Rendered {
  const subject = `${d.requesterName} wants to connect on RinkStop`;
  const acceptUrl = `${SITE_URL}/dashboard/connections?accept=${encodeURIComponent(d.connectionId)}`;
  const bodyHtml = `
    <h1 style="margin:0 0 12px 0;font-size:22px;color:${COLORS.navy};font-weight:800;">${escape(d.requesterName)} wants to connect.</h1>
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;">They sent you a connection request on RinkStop. Approve it to start a DM thread.</p>
    ${button(acceptUrl, 'Review request →')}
    <p style="margin:16px 0 0 0;font-size:13px;line-height:1.6;color:${COLORS.textMuted};">Connection requests are visible only to you. Decline from the same page.</p>
  `;
  const bodyText = [
    `${d.requesterName} wants to connect on RinkStop.`,
    ``,
    `Review: ${acceptUrl}`,
  ].join('\n');
  return {
    html: shell(subject, bodyHtml),
    text: bodyText + footerText(),
  };
}

function dmNotification(d: TemplateData['dm-notification']): Rendered {
  const subject = `New message from ${d.senderName}`;
  const threadUrl = `${SITE_URL}/dashboard/messages/${encodeURIComponent(d.threadId)}`;
  const bodyHtml = `
    <h1 style="margin:0 0 12px 0;font-size:22px;color:${COLORS.navy};font-weight:800;">New DM from ${escape(d.senderName)}.</h1>
    <blockquote style="margin:0 0 16px 0;padding:12px 16px;border-left:3px solid ${COLORS.gold};background:#fffbeb;font-size:15px;line-height:1.5;color:${COLORS.text};">${escape(d.preview)}</blockquote>
    ${button(threadUrl, 'Reply →', 'navy')}
  `;
  const bodyText = [
    `${d.senderName} sent you a DM on RinkStop:`,
    ``,
    `> ${d.preview}`,
    ``,
    `Reply: ${threadUrl}`,
  ].join('\n');
  return {
    html: shell(subject, bodyHtml),
    text: bodyText + footerText(),
  };
}

function teamPost(d: TemplateData['team-post']): Rendered {
  const kindLabel = d.postKind === 'news' ? 'News' : d.postKind === 'result' ? 'Game result' : 'Schedule update';
  const subject = `${d.teamName}: ${d.title}`;
  const postUrl = `${SITE_URL}/directory/teams/${encodeURIComponent(d.teamSlug)}`;
  const bodyHtml = `
    <h1 style="margin:0 0 4px 0;font-size:14px;color:${COLORS.gold};font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">${escape(kindLabel)} · ${escape(d.teamName)}</h1>
    <h2 style="margin:0 0 12px 0;font-size:22px;color:${COLORS.navy};font-weight:800;line-height:1.3;">${escape(d.title)}</h2>
    ${d.body ? `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">${escape(d.body)}</p>` : ''}
    <p style="margin:0 0 4px 0;font-size:13px;color:${COLORS.textMuted};">Posted by ${escape(d.authorName)}</p>
    ${button(postUrl, 'View on RinkStop →', 'navy')}
  `;
  const bodyText = [
    `[${kindLabel}] ${d.teamName}: ${d.title}`,
    d.body ? `\n${d.body}\n` : '',
    `Posted by ${d.authorName}`,
    ``,
    `View: ${postUrl}`,
  ].filter(Boolean).join('\n');
  return {
    html: shell(subject, bodyHtml),
    text: bodyText + footerText(),
  };
}

// --- Templates -------------------------------------------------------------

// --- paymentPending --------------------------------------------------------

function paymentPending(d: TemplateData['payment-pending']): Rendered {
  const subject = `${d.playerName} marked "${d.paymentTitle}" as paid`;
  const bodyHtml = `
    <h1 style="margin:0 0 4px 0;font-size:14px;color:${COLORS.gold};font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">${escape(d.teamName)} · Payment pending verification</h1>
    <h2 style="margin:0 0 12px 0;font-size:22px;color:${COLORS.navy};font-weight:800;line-height:1.3;">${escape(d.playerName)} says they paid</h2>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">
      <strong>${escape(d.playerName)}</strong> has marked their payment for
      <strong>${escape(d.paymentTitle)}</strong> as pending verification.
      ${d.referenceNumber ? `<br><br><strong>Reference number they provided:</strong> <code style="background:${COLORS.ice};padding:2px 6px;border-radius:3px;font-family:monospace;">${escape(d.referenceNumber)}</code>` : ''}
    </p>
    <p style="margin:0 0 24px 0;font-size:14px;color:${COLORS.textMuted};">
      Amount: <strong>${escape(d.currency)} ${escape(d.amount)}</strong>
    </p>
    ${button(d.approveLink, 'Open payment record →', 'red')}
    <p style="margin:24px 0 0 0;font-size:13px;color:${COLORS.textMuted};">
      Review the record and flip it to "paid" if the GCash / bank transfer matches the reference number.
    </p>
  `;
  const bodyText = [
    `[${d.teamName}] Payment pending verification`,
    ``,
    `${d.playerName} marked "${d.paymentTitle}" as pending verification.`,
    d.referenceNumber ? `Reference: ${d.referenceNumber}` : '',
    `Amount: ${d.currency} ${d.amount}`,
    ``,
    `Open: ${d.approveLink}`,
  ].filter(Boolean).join('\n');
  return {
    html: shell(subject, bodyHtml),
    text: bodyText + footerText(),
  };
}
