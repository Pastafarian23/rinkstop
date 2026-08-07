import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const envText = readFileSync('.env', 'utf8')
const keyLine = envText.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))

if (!keyLine) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const key = keyLine.slice('SUPABASE_SERVICE_ROLE_KEY='.length)
const s = createClient('https://yszheonqyyskkjoxoexk.supabase.co', key)

const { data: tables } = await s.from('information_schema.tables').select('table_name').eq('table_schema', 'public').neq('table_name', 'schema_migrations')

const disabled = []
for (const t of tables || []) {
  const { data } = await s.from('information_schema.tables').select('rowsecurity').eq('table_schema', 'public').eq('table_name', t.table_name)
  if (data && data[0] && !data[0].rowsecurity) {
    disabled.push(t.table_name)
  }
}

console.log('RLS_DISABLED=' + JSON.stringify(disabled))

const { data: policies } = await s.from('pg_policies').select('tablename').eq('schemaname', 'public')
const policyTables = new Set((policies || []).map(p => p.tablename))
const noPolicies = (tables || []).filter(t => !policyTables.has(t.table_name)).map(t => t.table_name)
console.log('NO_POLICIES=' + JSON.stringify(noPolicies))
