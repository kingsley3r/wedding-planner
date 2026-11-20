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
