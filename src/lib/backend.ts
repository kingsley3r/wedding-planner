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

/** A sign-in remembered on this phone, even if it can't be refreshed right now. */
export function hasStoredSession() {
  try {
    return Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k))
  } catch {
    return false
  }
}

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

/** Read-only rows for the day-of helper page. Works without signing in. */
export async function loadDayOf(token: string): Promise<Row[] | null> {
  if (supabase) {
    const { data, error } = await supabase.rpc('day_of', { tok: token })
    if (error) throw error
    const rows = (data ?? []) as Row[]
    return rows.length ? rows : null
  }
  const rows = await demoBackend().load()
  const s = rows.find((r) => r.kind === 'settings')
  return s && (s.data as { helperToken?: string }).helperToken === token ? rows : null
}

/** Rows for the public wedding website: names and date, the site texts, venues, the schedule items marked public, and hotels if chosen. */
export async function loadSite(token: string): Promise<Row[] | null> {
  if (supabase) {
    const { data, error } = await supabase.rpc('wedding_site', { tok: token })
    if (error) throw error
    const rows = (data ?? []) as Row[]
    return rows.length ? rows : null
  }
  const rows = await demoBackend().load()
  const s = rows.find((r) => r.kind === 'settings')?.data as { siteToken?: string; siteStays?: boolean } | undefined
  if (!s || s.siteToken !== token) return null
  return rows.filter((r) => r.kind === 'settings' || r.kind === 'venue' || (r.kind === 'schedule' && (r.data as { public?: boolean }).public) || (r.kind === 'stay' && s.siteStays))
}

/** The sign-in email on this phone, for the activity feed. */
let emailCache: string | undefined
export async function currentEmail(): Promise<string> {
  if (emailCache !== undefined) return emailCache
  if (!supabase) return (emailCache = '')
  const { data } = await supabase.auth.getSession()
  return (emailCache = data.session?.user.email ?? '')
}

// ---------- Guest photos (Supabase Storage bucket "guest-photos") ----------
export const PHOTO_BUCKET = 'guest-photos'

/** Names and date for the photo page, or null if the link is off. */
export async function photoInfo(token: string): Promise<{ partner1?: string; partner2?: string; date?: string } | null> {
  if (!supabase) {
    const rows = await demoBackend().load()
    const s = rows.find((r) => r.kind === 'settings')?.data as { photoToken?: string; partner1?: string; partner2?: string; date?: string } | undefined
    return s && s.photoToken === token ? s : null
  }
  const { data, error } = await supabase.rpc('guest_photo_info', { tok: token })
  if (error) throw error
  return (data as { partner1?: string } | null) ?? null
}

/** Uploads the original file, untouched: full size and quality. */
export async function uploadGuestPhoto(token: string, file: File, name: string) {
  if (!supabase) throw new Error('Demo mode: photos are not uploaded.')
  const slug = name.normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'guest'
  const ext = (file.name.match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? (file.type.split('/')[1] || 'jpg')).toLowerCase()
  const path = `${token}/${Date.now()}-${slug}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
  if (error) throw error
}

export const PRIVATE_BUCKET = 'guest-photos-private'

export interface GuestPhoto {
  path: string
  url: string
  /** Link that saves the file instead of opening it. */
  download: string
  from: string
  at: string
  /** Only the two of you see it. */
  private?: boolean
}

const fileName = (path: string) => path.split('/').pop() ?? 'photo.jpg'
function describe(path: string, created?: string | null) {
  const m = fileName(path).match(/^(\d+)-(.+)-[a-z0-9]+\.[a-z0-9]+$/i)
  return { from: m && m[2] !== 'guest' ? m[2].replace(/-/g, ' ') : '', at: m ? new Date(+m[1]).toISOString() : created ?? '' }
}
function publicPhoto(path: string, created?: string | null): GuestPhoto {
  const { data } = supabase!.storage.from(PHOTO_BUCKET).getPublicUrl(path)
  const { data: dl } = supabase!.storage.from(PHOTO_BUCKET).getPublicUrl(path, { download: fileName(path) })
  return { path, url: data.publicUrl, download: dl.publicUrl, ...describe(path, created) }
}

async function listFolder(bucket: string, folder: string) {
  // Storage lists at most 1000 files at a time, so page through them.
  const files: { name: string; created_at: string | null }[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase!.storage.from(bucket).list(folder, { limit: 1000, offset, sortBy: { column: 'created_at', order: 'desc' } })
    if (error) throw error
    files.push(...(data ?? []).filter((x) => x.id))
    if ((data ?? []).length < 1000) break
  }
  return files.map((x) => ({ path: `${folder}/${x.name}`, created: x.created_at }))
}

/** Every guest photo, shared and private, for the two of you. */
export async function listGuestPhotos(folders: string[]): Promise<GuestPhoto[]> {
  if (!supabase || !folders.length) return []
  const out: GuestPhoto[] = []
  for (const f of folders) {
    for (const x of await listFolder(PHOTO_BUCKET, f)) out.push(publicPhoto(x.path, x.created))
    const priv = await listFolder(PRIVATE_BUCKET, f).catch(() => [])
    if (priv.length) {
      const paths = priv.map((x) => x.path)
      const { data: signed, error } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrls(paths, 60 * 60 * 6)
      if (error) throw error
      const { data: dls } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrls(paths, 60 * 60 * 6, { download: true })
      priv.forEach((x, i) => out.push({ path: x.path, url: signed?.[i]?.signedUrl ?? '', download: dls?.[i]?.signedUrl ?? '', private: true, ...describe(x.path, x.created) }))
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at))
}

/** The shared photos, for guests with the link. */
export async function guestGallery(token: string): Promise<GuestPhoto[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('guest_photo_list', { tok: token })
  if (error) throw error
  return ((data ?? []) as { name: string; created_at: string }[]).map((x) => publicPhoto(x.name, x.created_at))
}

/** Move a photo between shared and "only us". */
export async function setPhotoPrivate(p: GuestPhoto, makePrivate: boolean) {
  if (!supabase || !!p.private === makePrivate) return
  const from = makePrivate ? PHOTO_BUCKET : PRIVATE_BUCKET
  const to = makePrivate ? PRIVATE_BUCKET : PHOTO_BUCKET
  const { error } = await supabase.storage.from(from).move(p.path, p.path, { destinationBucket: to })
  if (error) throw error
}

export async function deleteGuestPhoto(p: GuestPhoto) {
  if (!supabase) return
  const { error } = await supabase.storage.from(p.private ? PRIVATE_BUCKET : PHOTO_BUCKET).remove([p.path])
  if (error) throw error
}

export const backend: Backend = supabase ? supabaseBackend(supabase) : demoBackend()
