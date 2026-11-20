import { isDemo, resetDemo, signOut, supabase } from '../lib/backend'
import { useI18n, type Lang } from '../lib/i18n'
import { useStore } from '../lib/store'
import { num } from '../lib/util'
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
  if (!s) return null
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
        </div>
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
