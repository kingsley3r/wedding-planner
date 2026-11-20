import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { backend } from './backend'
import { starterRows } from './seed'
import type { Kind, KindMap, Row, Settings } from './types'
import { uid } from './util'

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
}

const Ctx = createContext<Store | null>(null)

// Rows this device wrote recently. Realtime echoes of them are ignored so a slow echo
// cannot overwrite newer typing.
const recentWrites = new Map<string, number>()
let seeding: Promise<void> | null = null
const isRecent = (id: string) => Date.now() - (recentWrites.get(id) ?? 0) < 4000

export function StoreProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<Row[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      let data = await backend.load()
      if (!data.some((r) => r.kind === 'settings')) {
        // First run against an empty database: add the starter checklist, venues and schedule.
        seeding ??= (async () => {
          for (const r of starterRows()) await backend.upsert(r)
        })()
        await seeding
        data = await backend.load()
      }
      setRows(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setReady(true)
    }
  }, [])

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
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      unsub()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  const persist = useCallback(async (row: Row) => {
    recentWrites.set(row.id, Date.now())
    setRows((prev) => {
      const i = prev.findIndex((r) => r.id === row.id)
      if (i === -1) return [...prev, row]
      const next = prev.slice()
      next[i] = row
      return next
    })
    try {
      await backend.upsert(row)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

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
        return row as never
      },
      async update(row, patch) {
        await persist({ ...row, data: { ...row.data, ...patch } } as Row)
      },
      async remove(id) {
        setRows((prev) => prev.filter((r) => r.id !== id))
        try {
          await backend.remove(id)
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e))
        }
      },
      async saveSettings(patch) {
        if (settings) await persist({ ...settings, data: { ...settings.data, ...patch } })
      }
    }
  }, [rows, ready, error, persist])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}
