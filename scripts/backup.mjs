// Exports every row of the items table to backup.json, in the same format as the app's
// "Download backup" button, so it can be restored from Settings. Used by the nightly workflow.
import { writeFileSync } from 'node:fs'

const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '')
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed')

const rows = []
for (let offset = 0; ; offset += 500) {
  const r = await fetch(`${url}/rest/v1/items?select=id,kind,data,updated_at&order=id&offset=${offset}&limit=500`, {
    headers: { apikey: key, authorization: `Bearer ${key}` }
  })
  if (!r.ok) throw new Error(`Supabase answered ${r.status}: ${await r.text()}`)
  const page = await r.json()
  rows.push(...page)
  if (page.length < 500) break
}
if (!rows.some((r) => r.kind === 'settings')) throw new Error('No settings row found; refusing to save an empty backup')
writeFileSync('backup.json', JSON.stringify({ app: 'wedding-planner', version: 1, createdAt: new Date().toISOString(), rows }))
console.log(`Saved ${rows.length} rows`)
