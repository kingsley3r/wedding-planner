import { isDemo, resetDemo, signOut, supabase } from '../lib/backend'
import { useI18n, type Lang } from '../lib/i18n'
import { useStore } from '../lib/store'
import { num, uid } from '../lib/util'
import { Field, PageHead, Text } from '../components/ui'
import { useEffect, useState } from 'react'

export default function Settings() {
  const { t, lang, setLang } = useI18n()
  const { settings, saveSettings } = useStore()
  const s = settings?.data
  const [email, setEmail] = useState('')
  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])
  const [copied, setCopied] = useState(false)
  if (!s) return null
  const helperUrl = s.helperToken ? `${location.origin}/helper/${s.helperToken}` : ''
  const newToken = () => saveSettings({ helperToken: (uid() + uid()).replace(/-/g, '').slice(0, 32) })
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: t('Day-of page'), url: helperUrl })
      else {
        await navigator.clipboard.writeText(helperUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      /* cancelled */
    }
  }
  return (
    <>
      <PageHead eyebrow={t('Wedding planner')} title={t('Settings')} />
      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('The wedding')}</h2>
        </div>
        <div className="form">
          <Field label={t('Partner 1')}>
            <Text value={s.partner1} onChange={(v) => saveSettings({ partner1: v })} />
          </Field>
          <Field label={t('Partner 2')}>
            <Text value={s.partner2} onChange={(v) => saveSettings({ partner2: v })} />
          </Field>
          <Field label={t('Wedding date')}>
            <Text type="date" value={s.date} onChange={(v) => v && saveSettings({ date: v })} />
          </Field>
          <Field label={t('Expected guests')}>
            <Text type="number" value={s.guestTarget} onChange={(v) => saveSettings({ guestTarget: num(v) })} />
          </Field>
          <Field label={t('Total budget (EUR)')}>
            <Text type="number" value={s.budgetTotal} onChange={(v) => saveSettings({ budgetTotal: num(v) })} />
          </Field>
          <Field label={t('Payment reminders (days before)')}>
            <Text type="number" value={s.reminderDays ?? 7} onChange={(v) => saveSettings({ reminderDays: Math.max(0, Math.round(num(v))) })} />
          </Field>
          <Field label={t('Pinterest board link')}>
            <Text type="url" value={s.pinterestBoard} onChange={(v) => saveSettings({ pinterestBoard: v.trim() || undefined })} placeholder="https://www.pinterest.com/…" />
          </Field>
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('Day-of helper link')}</h2>
        </div>
        <p className="small muted" style={{ marginBottom: 12 }}>
          {t('A read-only page for your coordinator and ushers: schedule, church program, contacts and seating. No sign-in needed, so only share it with people you trust.')}
        </p>
        {helperUrl ? (
          <>
            <div className="share-link">
              <code>{helperUrl}</code>
              <button className="btn small primary" onClick={share}>
                {copied ? t('Copied') : t('Share')}
              </button>
            </div>
            <div className="row-gap" style={{ marginTop: 10 }}>
              <a className="btn small ghost" href={helperUrl} target="_blank" rel="noreferrer">
                {t('Open')}
              </a>
              <button className="btn small ghost" onClick={() => confirm(t('Make a new link? The old one stops working.')) && newToken()}>
                {t('New link')}
              </button>
              <button className="btn small ghost" onClick={() => confirm(t('Turn the link off? It stops working for everyone.')) && saveSettings({ helperToken: undefined })}>
                {t('Turn off')}
              </button>
            </div>
          </>
        ) : (
          <button className="btn small primary" onClick={newToken}>
            {t('Create link')}
          </button>
        )}
        {!isDemo && (
          <p className="small muted" style={{ marginTop: 10 }}>
            {t('One-time setup: run supabase/day-of.sql in the Supabase SQL Editor.')}
          </p>
        )}
      </div>
      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('Language')}</h2>
        </div>
        <div className="chips">
          {(
            [
              ['en', 'English'],
              ['de', 'Deutsch'],
              ['ro', 'Română']
            ] as [Lang, string][]
          ).map(([l, name]) => (
            <button key={l} className={'chip' + (l === lang ? ' on' : '')} onClick={() => setLang(l)}>
              {name}
            </button>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          {t('Each phone keeps its own language.')}
        </p>
      </div>
      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('Account')}</h2>
        </div>
        {isDemo ? (
          <div className="row-gap">
            <span className="muted small">{t('Demo mode: data stays on this device.')}</span>
            <button
              className="btn small"
              onClick={() => {
                if (confirm(t('Reset the demo data?'))) {
                  resetDemo()
                  location.reload()
                }
              }}
            >
              {t('Reset demo data')}
            </button>
          </div>
        ) : (
          <div className="row-gap">
            <span className="muted small">{email}</span>
            <button className="btn small" onClick={() => signOut()}>
              {t('Sign out')}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
