import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load .env manually
const env = readFileSync('.env', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', supabaseUrl ? 'set' : 'MISSING');
console.log('SERVICE KEY:', supabaseServiceKey ? 'set' : 'MISSING');

let _admin = null;
function getAdmin() {
  if (_admin) return _admin;
  if (!supabaseUrl) throw new Error('URL MISSING');
  if (!supabaseServiceKey) throw new Error('SERVICE KEY MISSING');
  _admin = createClient(supabaseUrl, supabaseServiceKey);
  return _admin;
}

const supabaseAdmin = new Proxy({}, {
  get(_target, prop) {
    const client = getAdmin();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

// Test: does the chain work?
try {
  const q = supabaseAdmin.from('profiles').select('id').limit(1);
  console.log('Chain query built OK, type:', typeof q);
  // Now actually run it
  const result = await q;
  console.log('Query ran, error:', result.error?.message, 'rows:', result.data?.length);
} catch (e) {
  console.error('Error:', e.message);
}
