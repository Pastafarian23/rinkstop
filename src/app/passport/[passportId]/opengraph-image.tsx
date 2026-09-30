import { ImageResponse } from 'next/og';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'edge';
export const alt = 'Hockey Passport on RinkStop';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * OpenGraph image for /passport/[passportId].
 *
 * When a Hockey Passport holder shares their passport URL on Twitter / Slack /
 * LinkedIn / iMessage, the preview shows this branded image — not the
 * generic RinkStop logo. This is the conversion moment for organic sharing.
 *
 * Design mimics the actual passport document aesthetic:
 *   - Dark navy background (#0B1E3F) like the passport field
 *   - Gold seal monogram (RS) in the top-left like the document
 *   - Holder name in big white serif
 *   - Passport ID in monospace gold (#FFB81C)
 *   - Status pill ("ACTIVE" in green)
 *   - Subtitle: "Verified Hockey Passport · RinkStop"
 *   - Country flag (if known) + verification badge
 */
export default async function Image({ params }: { params: { passportId: string } }) {
  let holderName = 'Hockey Passport holder';
  let passportId = params.passportId;
  let status = 'active';
  let verificationLevel = 'verified';
  let issuedAt: string | null = null;
  let firstName = '';
  let country: string | null = null;

  try {
    const { data: passportRow } = await supabaseAdmin
      .from('passports')
      .select('internal_user_id, passport_id, status, verification_level, issued_at')
      .eq('passport_id', params.passportId)
      .maybeSingle();

    if (passportRow && passportRow.status === 'active') {
      passportId = passportRow.passport_id || params.passportId;
      status = passportRow.status;
      verificationLevel = passportRow.verification_level || 'verified';
      issuedAt = passportRow.issued_at;

      const { data: profileRow } = await supabaseAdmin
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', passportRow.internal_user_id)
        .maybeSingle();

      if (profileRow?.display_name) {
        holderName = profileRow.display_name;
        firstName = holderName.split(' ')[0] || '';
      }
    }
  } catch {
    // Fall through with defaults if Supabase call fails in edge runtime
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0B1E3F 0%, #08152E 100%)',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '60px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gold accent stripe across the top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '8px',
            background: 'linear-gradient(90deg, transparent 0%, #FFB81C 50%, transparent 100%)',
            display: 'flex',
          }}
        />

        {/* Gold accent stripe across the bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '8px',
            background: 'linear-gradient(90deg, transparent 0%, #C8102E 50%, transparent 100%)',
            display: 'flex',
          }}
        />

        {/* Header row: gold seal + brand text + status pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '40px',
          }}
        >
          {/* Gold seal */}
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #FFD66B 0%, #FFB81C 60%, #B45309 100%)',
              border: '3px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 700,
              color: '#0B1E3F',
              letterSpacing: '0.05em',
              boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
            }}
          >
            RS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 800,
                letterSpacing: '0.25em',
                color: '#FFB81C',
                textTransform: 'uppercase',
                display: 'flex',
              }}
            >
              HOCKEY PASSPORT
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                display: 'flex',
              }}
            >
              Verified by RinkStop · {verificationLevel === 'id_verified' ? 'ID Verified' : 'Verified'}
            </div>
          </div>

          {/* Status pill — pushed to the right via flex auto */}
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: 'rgba(34,197,94,0.15)',
              border: '2px solid rgba(34,197,94,0.4)',
              borderRadius: '999px',
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '0.15em',
              color: '#86EFAC',
              textTransform: 'uppercase',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#22C55E',
                display: 'flex',
              }}
            />
            <span>ACTIVE</span>
          </div>
        </div>

        {/* Holder name — primary content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 'auto',
            marginBottom: 'auto',
          }}
        >
          <div
            style={{
              fontSize: '88px',
              fontWeight: 800,
              lineHeight: 1.0,
              letterSpacing: '-0.02em',
              color: '#fff',
              display: 'flex',
              marginBottom: '20px',
            }}
          >
            {holderName}
          </div>

          {firstName && (
            <div
              style={{
                fontSize: '28px',
                color: 'rgba(255,255,255,0.55)',
                display: 'flex',
                marginBottom: '36px',
              }}
            >
              Every rink. Every league. One credential.
            </div>
          )}
        </div>

        {/* Bottom row: passport ID + issued date */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            marginTop: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.25em',
                color: 'rgba(255,184,28,0.7)',
                textTransform: 'uppercase',
                display: 'flex',
              }}
            >
              DOCUMENT NO.
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                fontFamily: 'monospace',
                color: '#FFB81C',
                letterSpacing: '0.05em',
                display: 'flex',
              }}
            >
              {passportId}
            </div>
          </div>

          {issuedAt && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                marginLeft: 'auto',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.25em',
                  color: 'rgba(255,255,255,0.45)',
                  textTransform: 'uppercase',
                  display: 'flex',
                }}
              >
                ISSUED
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.85)',
                  display: 'flex',
                }}
              >
                {new Date(issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>
          )}
        </div>

        {/* Footer credit */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            left: '80px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          <div
            style={{
              display: 'flex',
            }}
          >
            rinkstop.com/passport/{params.passportId}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}