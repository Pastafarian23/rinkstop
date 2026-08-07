import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const lines = fs.readFileSync('.env', 'utf8').split('\n')
const url = lines.find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=').slice(1).join('=').trim()
const key = lines.find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))?.split('=').slice(1).join('=').trim()

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const s = createClient(url, key)

async function check() {
  // Try querying stamps directly
  const { data, error } = await s.from('stamps').select('*').limit(1)
  console.log('stamps sample:', JSON.stringify(data, null, 2))
  console.log('stamps error:', error?.message)

  // Try rinks qr_identifier
  const { data: rinks, error: rinksErr } = await s.from('rinks').select('id, qr_identifier').limit(1)
  console.log('rinks qr_identifier sample:', JSON.stringify(rinks, null, 2))
  console.log('rinks error:', rinksErr?.message)

  // Try venues public_id
  const { data: venues, error: venuesErr } = await s.from('venues').select('id, public_id').limit(1)
  console.log('venues public_id sample:', JSON.stringify(venues, null, 2))
  console.log('venues error:', venuesErr?.message)
}

check().catch(e => { console.error(e); process.exit(1) })
