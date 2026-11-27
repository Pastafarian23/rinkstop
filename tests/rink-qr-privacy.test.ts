import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const SECRET_QR = '11111111-2222-3333-4444-555555555555';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: 'rink-1', name: 'Test Arena', slug: 'test-arena', qr_identifier: SECRET_QR, qr_revoked_at: null, is_active: true },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));
vi.mock('qrcode', () => ({ default: { toString: async () => '<svg></svg>' } }));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-not-a-secret';

import { GET } from '@/app/api/rinks/[slug]/qr/route';

describe('public rink QR endpoint privacy', () => {
  it('does not echo the raw QR identifier in any response header', async () => {
    const res = await GET(new NextRequest('http://localhost/api/rinks/test-arena/qr'), {
      params: Promise.resolve({ slug: 'test-arena' }),
    });
    expect(res.status).toBe(200);
    for (const [name, value] of res.headers.entries()) {
      expect(name.toLowerCase()).not.toBe('x-qr-identifier');
      expect(String(value)).not.toContain(SECRET_QR);
    }
  });
});
