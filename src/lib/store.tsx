import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { backend, currentEmail } from './backend'
import { starterRows } from './seed'
import type { Kind, KindMap, LogEntry, Row, Settings } from './types'
import { uid } from './util'
import { kvGet, kvSet } from './local'
import { saveDailySnapshot } from './backup'

type Op = { op: 'upsert'; row: Row } | { op: 'remove'; id: string }
const CACHE = 'rows'
const OUTBOX = 'outbox'

/** True when a write failed because there is no connection, rather than being refused. */
const isNetworkError = (e: unknown) =>
  typeof navigator !== 'undefined' && !navigator.onLine
    ? true
    : /fetch|network|load failed|timeout|offline/i.test(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e))

interface Store {
  ready: boolean
  error: string | null
  rows: Row[]
  list<K extends Kind>(kind: K): Row<K>[]
  add<K extends Kind>(kind: K, data: KindMap[K]): Promise<Row<K>>
  update<K extends Kind>(row: Row<K>, patch: Partial<KindMap[K]>): Promise<void>
  remove(id: string): Promise<void>
  settings: Row<'settings'> | null
  saveSettings(patch: Partial<Settings>): Promise<void>
  /** Showing the copy saved on this phone because the server can't be reached. */
  offline: boolean
  /** Changes made offline, waiting to be sent. */
  pending: number
  /** Replace everything with the rows from a backup. */
  restore(rows: Row[]): Promise<void>
}

const Ctx = createContext<Store | null>(null)

const LOG_MAX = 400
/** A short name for a row in the activity feed. */
function labelOf(row: Row, patch?: object): string {
  if (row.kind === 'settings') {
    const k = Object.keys(patch ?? {})[0] ?? ''
    const area: [RegExp, string][] = [
      [/^civil/, 'Civil wedding'],
      [/^rehearsal/, 'Rehearsal'],
      [/^band/, 'Band & songs'],
      [/^palette/, 'Our colours'],
      [/^(site|people)/, 'Wedding website'],
      [/^photo/, 'Guest photos'],
      [/^kids/, "Kids' corner"],
      [/^(honeymoon|homeAirport)/, 'Honeymoon'],
      [/^pinterest/, 'Mood board']
    ]
    return area.find(([re]) => re.test(k))?.[1] ?? 'Settings'
  }
  const d = row.data as unknown as Record<string, unknown>
  const v = d.name ?? d.title ?? d.hotel ?? d.label ?? d.item ?? d.text ?? d.question ?? d.city ?? d.who ?? d.body ?? d.url
  return typeof v === 'string' ? v.slice(0, 60) : ''
}

// Rows this device wrote recently. Realtime echoes of them are ignored so a slow echo
// cannot overwrite newer typing.
const recentWrites = new Map<string, number>()
let seeding: Promise<void> | null = null
const isRecent = (id: string) => Date.now() - (recentWrites.get(id) ?? 0) < 4000

export function StoreProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<Row[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [pending, setPending] = useState(0)
  const outbox = useRef<Op[]>([])
  const rowsRef = useRef<Row[]>([])
  const lastLog = useRef(new Map<string, Row<'log'>>())
  rowsRef.current = rows
  const flushing = useRef(false)

  const queue = useCallback(async (op: Op) => {
    const id = op.op === 'upsert' ? op.row.id : op.id
    // Only the latest change to a row matters.
    outbox.current = [...outbox.current.filter((o) => (o.op === 'upsert' ? o.row.id : o.id) !== id), op]
    setPending(outbox.current.length)
    setOffline(true)
    await kvSet(OUTBOX, outbox.current)
  }, [])

  /** Send changes made while offline. Stops at the first one that still can't go through. */
  const flush = useCallback(async () => {
    if (flushing.current || !outbox.current.length) return
    flushing.current = true
    try {
      while (outbox.current.length) {
        const op = outbox.current[0]
        try {
          if (op.op === 'upsert') await backend.upsert(op.row)
          else await backend.remove(op.id)
        } catch (e) {
          if (isNetworkError(e)) return
          setError(e instanceof Error ? e.message : String(e))
        }
        outbox.current = outbox.current.slice(1)
        setPending(outbox.current.length)
        await kvSet(OUTBOX, outbox.current)
      }
    } finally {
      flushing.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      outbox.current = (await kvGet<Op[]>(OUTBOX)) ?? outbox.current
      setPending(outbox.current.length)
      await flush()
      let data = await backend.load()
      if (!data.some((r) => r.kind === 'settings')) {
        // First run against an empty database: add the starter checklist, venues and schedule.
        seeding ??= (async () => {
          for (const r of starterRows()) await backend.upsert(r)
        })()
        await seeding
        data = await backend.load()
      }
      // Keep changes that are still waiting to be sent on top of what the server has.
      for (const op of outbox.current) {
        if (op.op === 'remove') data = data.filter((r) => r.id !== op.id)
        else data = [...data.filter((r) => r.id !== op.row.id), op.row]
      }
      setRows(data)
      setError(null)
      setOffline(outbox.current.length > 0)
      kvSet(CACHE, data)
      saveDailySnapshot(data)
    } catch (e) {
      const cached = await kvGet<Row[]>(CACHE)
      if (cached?.length) {
        setRows(cached)
        setOffline(true)
      } else setError(e instanceof Error ? e.message : String(e))
    } finally {
      setReady(true)
    }
  }, [flush])

  useEffect(() => {
    refresh()
    const unsub = backend.subscribe((row, deletedId) => {
      if (row && isRecent(row.id)) return
      setRows((prev) => {
        if (deletedId) return prev.filter((r) => r.id !== deletedId)
        if (!row) return prev
        const i = prev.findIndex((r) => r.id === row.id)
        if (i === -1) return [...prev, row]
        const next = prev.slice()
        next[i] = row
        return next
      })
    })
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    const onOnline = () => refresh()
    const onOffline = () => setOffline(true)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      unsub()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [refresh])

  // Keep the copy on this phone up to date, so the app opens without a connection.
  useEffect(() => {
    if (!ready || !rows.length) return
    const h = setTimeout(() => kvSet(CACHE, rows), 600)
    return () => clearTimeout(h)
  }, [rows, ready])

  const persist = useCallback(
    async (row: Row) => {
      recentWrites.set(row.id, Date.now())
      setRows((prev) => {
        const i = prev.findIndex((r) => r.id === row.id)
        if (i === -1) return [...prev, row]
        const next = prev.slice()
        next[i] = row
        return next
      })
      if (outbox.current.length) return queue({ op: 'upsert', row })
      try {
        await backend.upsert(row)
      } catch (e) {
        if (isNetworkError(e)) await queue({ op: 'upsert', row })
        else setError(e instanceof Error ? e.message : String(e))
      }
    },
    [queue]
  )

  const removeRow = useCallback(
    async (id: string) => {
      setRows((prev) => prev.filter((r) => r.id !== id))
      if (outbox.current.length) return queue({ op: 'remove', id })
      try {
        await backend.remove(id)
      } catch (e) {
        if (isNetworkError(e)) await queue({ op: 'remove', id })
        else setError(e instanceof Error ? e.message : String(e))
      }
    },
    [queue]
  )

  /** Note who changed what. Several edits to the same thing in a few minutes count as one. */
  const log = useCallback(
    async (action: LogEntry['action'], row: Row, patch?: object) => {
      if (row.kind === 'log') return
      try {
        const who = await currentEmail()
        const now = new Date()
        const logs = rowsRef.current.filter((r) => r.kind === 'log') as Row<'log'>[]
        const label = labelOf(row, patch)
        const key = row.kind === 'settings' ? `${row.id}|${who}|${label}` : `${row.id}|${who}`
        const mine = lastLog.current.get(key)
        const same = (mine && mine.data.action !== 'delete' && now.getTime() - Date.parse(mine.data.at) < 5 * 60_000 ? mine : undefined) ?? logs.find(
          (l) => l.data.rowId === row.id && l.data.who === who && (row.kind !== 'settings' || l.data.label === label) && l.data.action !== 'delete' && now.getTime() - Date.parse(l.data.at) < 5 * 60_000
        )
        if (same && action !== 'delete') {
          const upd = { ...same, data: { ...same.data, at: now.toISOString(), label: label || same.data.label } }
          lastLog.current.set(key, upd)
          await persist(upd as Row)
        } else {
          const entry: Row<'log'> = { id: uid(), kind: 'log', data: { at: now.toISOString(), who, action, kind: row.kind, label, rowId: row.id } }
          lastLog.current.set(key, entry)
          await persist(entry as Row)
          if (logs.length >= LOG_MAX) {
            const old = [...logs].sort((a, b) => a.data.at.localeCompare(b.data.at)).slice(0, logs.length - LOG_MAX + 1)
            for (const o of old) await removeRow(o.id)
          }
        }
      } catch {
        /* the feed is a nice-to-have; never block a change because of it */
      }
    },
    [persist, removeRow]
  )

  const store = useMemo<Store>(() => {
    const settings = (rows.find((r) => r.kind === 'settings') as Row<'settings'> | undefined) ?? null
    return {
      ready,
      error,
      rows,
      settings,
      list: <K extends Kind>(kind: K) => rows.filter((r) => r.kind === kind) as Row<K>[],
      async add(kind, data) {
        const row = { id: uid(), kind, data } as Row<typeof kind>
        await persist(row as Row)
        void log('add', row as Row)
        return row as never
      },
      async update(row, patch) {
        const next = { ...row, data: { ...row.data, ...patch } } as Row
        await persist(next)
        void log('edit', next)
      },
      async remove(id) {
        const row = rows.find((r) => r.id === id)
        await removeRow(id)
        if (row) void log('delete', row)
      },
      offline,
      pending,
      async restore(backupRows) {
        const keep = new Set(backupRows.map((r) => r.id))
        for (const r of rows) if (!keep.has(r.id)) await removeRow(r.id)
        for (const r of backupRows) await persist(r)
      },
      async saveSettings(patch) {
        if (!settings) return
        const next = { ...settings, data: { ...settings.data, ...patch } }
        await persist(next)
        void log('edit', next, patch)
      }
    }
  }, [rows, ready, error, persist, removeRow, offline, pending, log])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}
