import { createContext, useContext, useState, type ReactNode } from 'react'
import { de } from './i18n-de'
import { ro } from './i18n-ro'

export type Lang = 'en' | 'de' | 'ro'
const dicts: Record<Lang, Record<string, string>> = { en: {}, de, ro }
const KEY = 'wp-lang'

function initial(): Lang {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'en' || v === 'de' || v === 'ro') return v
  } catch {
    /* ignore */
  }
  return 'en'
}

interface I18n {
  lang: Lang
  setLang(l: Lang): void
  /** Translate an English UI string. `{n}`-style placeholders are filled from vars. */
  t(s: string, vars?: Record<string, string | number>): string
}
const Ctx = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial)
  const setLang = (l: Lang) => {
    setLangState(l)
    document.documentElement.lang = l
    try {
      localStorage.setItem(KEY, l)
    } catch {
      /* ignore */
    }
  }
  const t = (s: string, vars?: Record<string, string | number>) => {
    let out = dicts[lang][s] ?? s
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v))
    return out
  }
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export function useI18n() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useI18n outside provider')
  return c
}
