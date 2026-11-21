import { isDemo, resetDemo, signOut, supabase } from '../lib/backend'
import { useI18n, type Lang } from '../lib/i18n'
import { useStore } from '../lib/store'
import { num, resizeImage, uid } from '../lib/util'
import { Intro } from '../components/Intro'
import { Field, PageHead, Text } from '../components/ui'
import { useEffect, useRef, useState } from 'react'
import { getTheme, setTheme, type Theme } from '../lib/theme'
import { downloadBackup, listSnapshots, parseBackup, type Snapshot } from '../lib/backup'
import { fmtDate } from '../lib/util'

export default function Settings() {
  const { t, lang, setLang } = useI18n()
  const { settings, saveSettings, list, add, remove, rows, restore } = useStore()
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const [snaps, setSnaps] = useState<Snapshot[]>([])
  const restoreRef = useRef<HTMLInputElement>(null)
  const [restoring, setRestoring] = useState(false)
  useEffect(() => {
    listSnapshots().then(setSnaps)
  }, [])
  const photos = list('photo').sort((a, b) => a.data.order - b.data.order)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const s = settings?.data
  const [email, setEmail] = useState('')
  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])
  const [copied, setCopied] = useState(false)
  if (!s) return null
  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      let order = (photos[photos.length - 1]?.data.order ?? 0) + 1
      for (const f of Array.from(files).slice(0, Math.max(0, 5 - photos.length))) {
        await add('photo', { src: await resizeImage(f, 1400, 0.78), order: order++ })
      }
    } catch {
      alert(t('That photo could not be read. Try another one.'))
    } finally {
      setBusy(false)
    }
  }
  const doRestore = async (file?: File) => {
    if (!file) return
    try {
      const b = parseBackup(await file.text())
      const when = fmtDate(b.createdAt.slice(0, 10), lang, { day: 'numeric', month: 'long', year: 'numeric' })
      if (!confirm(t('Replace everything in the app with the backup from {d} ({n} items)? Both phones will see the change.', { d: when, n: b.rows.length }))) return
      setRestoring(true)
      await restore(b.rows)
      alert(t('Backup restored.'))
    } catch {
      alert(t('This file is not a wedding planner backup.'))
    } finally {
      setRestoring(false)
    }
  }
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
          <h2 className="section">{t('Opening animation')}</h2>
          <button className="btn small" onClick={() => setPreview(true)}>
            {t('Preview')}
          </button>
        </div>
        <p className="small muted" style={{ marginBottom: 12 }}>
          {t('When the app opens, your monogram draws itself. Add up to 5 photos of the two of you and they fade in behind it.')}
        </p>
        {photos.length > 0 && (
          <div className="photo-grid">
            {photos.map((p) => (
              <div key={p.id} className="ph" style={{ backgroundImage: `url("${p.data.src}")` }}>
                <button aria-label={t('Remove')} onClick={() => remove(p.id)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="row-gap">
          {photos.length < 5 && (
            <button className="btn small primary" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? t('Adding…') : t('Add photos')}
            </button>
          )}
          <button className={'chip' + (!s.introOff ? ' on' : '')} onClick={() => saveSettings({ introOff: !s.introOff || undefined })}>
            {s.introOff ? t('Animation off') : t('Animation on')}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(ev) => { addPhotos(ev.target.files); ev.target.value = '' }} />
      </div>
      {preview && <Intro preview onDone={() => setPreview(false)} />}
      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('Appearance')}</h2>
        </div>
        <div className="chips">
          {(['auto', 'light', 'dark'] as Theme[]).map((k) => (
            <button
              key={k}
              className={'chip' + (theme === k ? ' on' : '')}
              onClick={() => {
                setTheme(k)
                setThemeState(k)
              }}
            >
              {t(k === 'auto' ? 'Like the phone' : k === 'light' ? 'Light' : 'Dark')}
            </button>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          {t('Each phone keeps its own choice.')}
        </p>
      </div>
      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('Backup')}</h2>
        </div>
        <p className="small muted" style={{ marginBottom: 12 }}>
          {t('Download everything (guests, budget, photos, notes…) as one file. Keep it in iCloud Drive or email it to yourself. You can restore it here at any time.')}
        </p>
        <div className="row-gap">
          <button className="btn small primary" onClick={() => downloadBackup(rows)}>
            {t('Download backup')}
          </button>
          <button className="btn small" disabled={restoring} onClick={() => restoreRef.current?.click()}>
            {restoring ? t('Restoring…') : t('Restore from a file')}
          </button>
        </div>
        <input ref={restoreRef} type="file" accept="application/json,.json" hidden onChange={(ev) => { doRestore(ev.target.files?.[0]); ev.target.value = '' }} />
        {snaps.length > 0 && (
          <>
            <h3 className="small" style={{ margin: '16px 0 6px', fontWeight: 600 }}>
              {t('Daily copies on this phone')}
            </h3>
            <div className="list">
              {snaps.map((sn) => (
                <div key={sn.date} className="item">
                  <div className="grow">
                    <div className="title">{fmtDate(sn.date, lang, { weekday: 'short', day: 'numeric', month: 'long' })}</div>
                    <div className="meta">{t('{n} items', { n: sn.count })}</div>
                  </div>
                  <button className="btn small ghost" onClick={() => downloadBackup(sn.backup.rows)}>
                    {t('Download')}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="small muted" style={{ marginTop: 12 }}>
          {t('The app also keeps a copy of each of the last 7 days on this phone, and can save an encrypted copy every night on GitHub (see the README).')}
        </p>
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
