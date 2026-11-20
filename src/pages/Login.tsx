import { useState } from 'react'
import { sendMagicLink } from '../lib/backend'
import { useI18n, type Lang } from '../lib/i18n'

export default function Login() {
  const { t, lang, setLang } = useI18n()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [err, setErr] = useState('')

  return (
    <div className="login">
      <div className="card">
        <div className="eyebrow">{t('Wedding planner')}</div>
        <h1>{t('Welcome back')}</h1>
        {state === 'sent' ? (
          <p className="muted" style={{ marginTop: 12 }}>
            {t('Check your email for a sign-in link. You can close this tab.')}
          </p>
        ) : (
          <form
            style={{ marginTop: 22, display: 'grid', gap: 12 }}
            onSubmit={async (e) => {
              e.preventDefault()
              setState('sending')
              try {
                await sendMagicLink(email.trim())
                setState('sent')
              } catch (e) {
                setErr(e instanceof Error ? e.message : String(e))
                setState('error')
              }
            }}
          >
            <p className="muted small">{t('Enter your email and we will send you a sign-in link.')}</p>
            <input
              className="input"
              type="email"
              required
              autoComplete="email"
              placeholder={t('Email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="btn primary" disabled={state === 'sending'}>
              {state === 'sending' ? t('Sending…') : t('Send sign-in link')}
            </button>
            {state === 'error' && <div className="banner error">{err}</div>}
          </form>
        )}
        <div className="chips" style={{ justifyContent: 'center', marginTop: 24 }}>
          {(['en', 'de', 'ro'] as Lang[]).map((l) => (
            <button key={l} type="button" className={'chip' + (l === lang ? ' on' : '')} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
