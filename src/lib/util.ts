export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

const LOCALES: Record<string, string> = { en: 'en-GB', de: 'de-AT', ro: 'ro-RO' }
export const localeOf = (lang: string) => LOCALES[lang] ?? 'en-GB'

export function money(n: number, lang: string, compact = false) {
  return new Intl.NumberFormat(localeOf(lang), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: compact && Math.abs(n) >= 10000 ? 1 : 0,
    notation: compact && Math.abs(n) >= 10000 ? 'compact' : 'standard'
  }).format(n || 0)
}

export function fmtDate(iso: string | undefined, lang: string, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso)
  if (isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(localeOf(lang), opts ?? { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

export function daysUntil(iso: string) {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const d = new Date(iso + 'T12:00:00')
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

export const todayIso = () => new Date().toISOString().slice(0, 10)

export function num(v: string): number {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? 0 : n
}

/** Shrink a photo to at most `max` px on its long side and return a JPEG data URL (keeps the database small). */
export function resizeImage(file: File, max = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}

export function isPinterestUrl(s: string) {
  return /(^|\.)pinterest\.[a-z.]+\/|pin\.it\//i.test(s)
}

/** Load Pinterest's embed script once and (re)build any embeds on the page. */
export function buildPinterestEmbeds() {
  const w = window as unknown as { PinUtils?: { build(): void } }
  if (w.PinUtils) {
    w.PinUtils.build()
    return
  }
  if (document.getElementById('pinterest-js')) return
  const s = document.createElement('script')
  s.id = 'pinterest-js'
  s.async = true
  s.src = 'https://assets.pinterest.com/js/pinit.js'
  document.body.appendChild(s)
}
