import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js'
import type { Row } from './types'
import { seedRows } from './seed'

export interface Backend {
  mode: 'supabase' | 'demo'
  load(): Promise<Row[]>
  upsert(row: Row): Promise<void>
  remove(id: string): Promise<void>
  /** Called with rows changed elsewhere (the other phone). Returns an unsubscribe function. */
  subscribe(onChange: (row: Row | null, deletedId?: string) => void): () => void
}

/** Accept the URL however it was pasted: quotes, spaces, a trailing slash or an
 *  /rest/v1 or /auth/v1 path all reduce to https://<project>.supabase.co */
export function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  const v = raw?.trim().replace(/^['"]|['"]$/g, '').trim()
  if (!v) return undefined
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
    // A dashboard link (supabase.com/dashboard/project/<ref>) points at the project's API host.
    const ref = /(^|\.)supabase\.com$/i.test(u.hostname) && u.pathname.match(/\/project\/([a-z0-9]+)/i)?.[1]
    return ref ? `https://${ref}.supabase.co` : u.origin
  } catch {
    return v.replace(/\/+$/, '')
  }
}

const url = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim().replace(/^['"]|['"]$/g, '') || undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
export const isDemo = !supabase

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthChange(cb: (s: Session | null) => void) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(s))
  return () => data.subscription.unsubscribe()
}

export async function sendMagicLink(email: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin, shouldCreateUser: false }
  })
  if (error) throw error
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  await supabase?.auth.signOut()
}

function supabaseBackend(client: SupabaseClient): Backend {
  return {
    mode: 'supabase',
    async load() {
      const { data, error } = await client.from('items').select('id, kind, data, updated_at')
      if (error) throw error
      return (data ?? []) as Row[]
    },
    async upsert(row) {
      const { error } = await client
        .from('items')
        .upsert({ id: row.id, kind: row.kind, data: row.data, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    async remove(id) {
      const { error } = await client.from('items').delete().eq('id', id)
      if (error) throw error
    },
    subscribe(onChange) {
      const channel = client
        .channel('items-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (payload) => {
          if (payload.eventType === 'DELETE') onChange(null, (payload.old as { id: string }).id)
          else onChange(payload.new as Row)
        })
        .subscribe()
      return () => {
        client.removeChannel(channel)
      }
    }
  }
}

const DEMO_KEY = 'wp-demo-rows-v1'
function demoBackend(): Backend {
  const read = (): Row[] => {
    try {
      const raw = localStorage.getItem(DEMO_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* ignore */
    }
    const rows = seedRows()
    write(rows)
    return rows
  }
  const write = (rows: Row[]) => {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(rows))
    } catch {
      /* ignore */
    }
  }
  return {
    mode: 'demo',
    async load() {
      return read()
    },
    async upsert(row) {
      const rows = read()
      const i = rows.findIndex((r) => r.id === row.id)
      if (i === -1) rows.push(row)
      else rows[i] = row
      write(rows)
    },
    async remove(id) {
      write(read().filter((r) => r.id !== id))
    },
    subscribe() {
      return () => {}
    }
  }
}

export function resetDemo() {
  try {
    localStorage.removeItem(DEMO_KEY)
  } catch {
    /* ignore */
  }
}

export const backend: Backend = supabase ? supabaseBackend(supabase) : demoBackend()
