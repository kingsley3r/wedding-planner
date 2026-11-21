import type { Row } from './types'
import { kvGet, kvSet } from './local'

export interface Backup {
  app: 'wedding-planner'
  version: 1
  createdAt: string
  rows: Row[]
}

export const makeBackup = (rows: Row[]): Backup => ({ app: 'wedding-planner', version: 1, createdAt: new Date().toISOString(), rows })

export function parseBackup(text: string): Backup {
  const j = JSON.parse(text)
  // Also accept a plain array of rows, e.g. from the nightly copy or a Supabase export.
  const rows: unknown = Array.isArray(j) ? j : j?.rows
  if (!Array.isArray(rows) || !rows.every((r) => r && typeof r.id === 'string' && typeof r.kind === 'string' && typeof r.data === 'object')) {
    throw new Error('not a backup')
  }
  if (!rows.some((r) => r.kind === 'settings')) throw new Error('not a backup')
  return { app: 'wedding-planner', version: 1, createdAt: Array.isArray(j) ? new Date().toISOString() : j.createdAt, rows: rows as Row[] }
}

export function downloadBackup(rows: Row[]) {
  const b = makeBackup(rows)
  const blob = new Blob([JSON.stringify(b)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `wedding-backup-${b.createdAt.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

const SNAP_KEY = 'snapshots'
const KEEP = 7

export interface Snapshot {
  date: string
  count: number
  backup: Backup
}

/** One copy per day on this phone, the last seven days kept. */
export async function saveDailySnapshot(rows: Row[]) {
  if (!rows.length) return
  const day = new Date().toISOString().slice(0, 10)
  const snaps = (await kvGet<Snapshot[]>(SNAP_KEY)) ?? []
  const rest = snaps.filter((s) => s.date !== day)
  await kvSet(SNAP_KEY, [{ date: day, count: rows.length, backup: makeBackup(rows) }, ...rest].slice(0, KEEP))
}

export const listSnapshots = async () => (await kvGet<Snapshot[]>(SNAP_KEY)) ?? []
