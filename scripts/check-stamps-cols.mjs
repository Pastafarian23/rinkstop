import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const lines = fs.readFileSync('.env', 'utf8').split('\n')
const url = lines.find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')).split('=').slice(1).join('=').trim()
const key = lines.find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')).split('=').slice(1).join('=').trim()

const s = createClient(url, key)

async function check() {
  const { data, error } = await s.from('stamps').select('*').limit(1)
  console.log('stamps cols:', Object.keys(data?.[0] || {}))
  console.log('stamps err:', error?.message)
}

check().catch(e => { console.error(e); process.exit(1) })
