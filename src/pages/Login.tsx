import { useState } from 'react'
import { sendMagicLink, signInWithPassword } from '../lib/backend'
import { useI18n, type Lang } from '../lib/i18n'

export default function Login() {
  const { t, lang, setLang } = useI18n()
  const [mode, setMode] = useState<'password' | 'link'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [err, setErr] = useState('')

  const friendly = (msg: string) => {
    if (/failed to fetch|network/i.test(msg)) return t('Cannot reach Supabase. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel, then redeploy.')
    if (/invalid login credentials/i.test(msg)) return t('Wrong email or password.')
    if (/email not confirmed/i.test(msg)) return t('This account is not confirmed yet. In Supabase, create the user with "Auto Confirm User" ticked.')
    if (/rate limit/i.test(msg)) return t('Too many emails sent. Wait an hour or sign in with your password.')
    if (/signups not allowed|user not found/i.test(msg)) return t('No account for this email yet. Create it in Supabase first.')
    return msg
  }

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
                if (mode === 'password') {
                  await signInWithPassword(email.trim(), password)
                  setState('idle')
                } else {
                  await sendMagicLink(email.trim())
                  setState('sent')
                }
              } catch (e) {
                setErr(friendly(e instanceof Error ? e.message : String(e)))
                setState('error')
              }
            }}
          >
            {mode === 'link' && <p className="muted small">{t('Enter your email and we will send you a sign-in link.')}</p>}
            <input
              className="input"
              type="email"
              required
              autoComplete="email"
              placeholder={t('Email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {mode === 'password' && (
              <input
                className="input"
                type="password"
                required
                autoComplete="current-password"
                placeholder={t('Password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
            <button className="btn primary" disabled={state === 'sending'}>
              {state === 'sending' ? t('Signing in…') : mode === 'password' ? t('Sign in') : t('Send sign-in link')}
            </button>
            {state === 'error' && <div className="banner error">{err}</div>}
            <button
              type="button"
              className="btn ghost small"
              onClick={() => {
                setMode(mode === 'password' ? 'link' : 'password')
                setState('idle')
              }}
            >
              {mode === 'password' ? t('Email me a sign-in link instead') : t('Sign in with password instead')}
            </button>
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
