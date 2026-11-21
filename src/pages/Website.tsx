import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import { isDemo } from '../lib/backend'
import { Field, PageHead } from '../components/ui'
import { LinkCard, newToken } from '../components/Qr'

function Area({ value, onChange, placeholder, rows = 3 }: { value?: string; onChange: (v: string | undefined) => void; placeholder?: string; rows?: number }) {
  return <textarea className="input" rows={rows} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value || undefined)} />
}

/** Edit the public wedding website: what guests see, and the link to share. */
export default function Website() {
  const { t } = useI18n()
  const { settings, saveSettings, list, update } = useStore()
  const s = settings!.data
  const url = s.siteToken ? `${location.origin}/w/${s.siteToken}` : ''
  const schedule = list('schedule').sort((a, b) => a.data.time.localeCompare(b.data.time))
  const venues = list('venue')
  const faq = s.siteFaq ?? []
  const setFaq = (f: { q: string; a: string }[]) => saveSettings({ siteFaq: f.length ? f : undefined })

  return (
    <>
      <PageHead eyebrow={url ? t('Online') : t('Not shared yet')} title={t('Wedding website')} />

      <div className="card">
        <p className="small muted" style={{ marginBottom: 12 }}>
          {t('A simple page for your guests: when and where, parking, the day’s plan and answers to common questions. Only people with the link can open it. It shows nothing about your budget, guest list or notes.')}
        </p>
        {url ? (
          <LinkCard url={url} title={t('Wedding website')} qrHint={t('Print this on the invitations.')} onNew={() => saveSettings({ siteToken: newToken() })} onOff={() => saveSettings({ siteToken: undefined })} />
        ) : (
          <button className="btn primary" onClick={() => saveSettings({ siteToken: newToken() })}>
            {t('Create the website')}
          </button>
        )}
        {!isDemo && (
          <p className="small muted" style={{ marginTop: 10 }}>
            {t('One-time setup: run supabase/website-photos.sql in the Supabase SQL Editor.')}
          </p>
        )}
      </div>

      <div className="card">
        <h2 className="section" style={{ marginBottom: 10 }}>
          {t('What guests see')}
        </h2>
        <div className="form">
          <Field label={t('Welcome')} full>
            <Area value={s.siteWelcome} onChange={(v) => saveSettings({ siteWelcome: v })} rows={4} placeholder={t('e.g. We are so happy to celebrate with you. Here is everything you need for the day.')} />
          </Field>
          <Field label={t('Parking and getting there')} full>
            <Area value={s.siteParking} onChange={(v) => saveSettings({ siteParking: v })} placeholder={t('e.g. Free parking next to the church. From the church to the venue it is about 30 minutes by car.')} />
          </Field>
          <Field label={t('Dress code')} full>
            <Area value={s.siteDress} onChange={(v) => saveSettings({ siteDress: v })} rows={2} placeholder={t('e.g. Festive. Please avoid white.')} />
          </Field>
          <Field label={t('Children')} full>
            <Area value={s.siteKids} onChange={(v) => saveSettings({ siteKids: v })} rows={2} placeholder={t('e.g. Children are welcome. There is a kids’ corner with games and helpers.')} />
          </Field>
          <Field label={t('Gifts')} full>
            <Area value={s.siteGifts} onChange={(v) => saveSettings({ siteGifts: v })} rows={2} />
          </Field>
          <Field label={t('Questions? Contact')} full>
            <Area value={s.siteContact} onChange={(v) => saveSettings({ siteContact: v })} rows={2} placeholder={t('Name and phone')} />
          </Field>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('Places and times')}</h2>
          <Link className="btn small ghost" to="/venues">
            {t('Edit venues')}
          </Link>
        </div>
        <div className="list">
          {venues.map((v) => (
            <div key={v.id} className="item">
              <div className="grow">
                <div className="title">{v.data.name}</div>
                <div className="meta">{[t(v.data.role), v.data.startTime, v.data.address].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          {t('Add a start time and the full address to each venue, so guests get the right map.')}
        </p>
      </div>

      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('The day’s plan')}</h2>
          <Link className="btn small ghost" to="/schedule">
            {t('Edit schedule')}
          </Link>
        </div>
        <p className="small muted" style={{ marginBottom: 8 }}>
          {t('Tick what guests should see. Leave out the getting-ready and behind-the-scenes times.')}
        </p>
        <div className="list">
          {schedule.map((x) => (
            <label key={x.id} className="item clickable">
              <input type="checkbox" checked={!!x.data.public} onChange={() => update(x, { public: !x.data.public || undefined })} />
              <div className="grow">
                <div className="title">
                  <span className="money">{x.data.time}</span> · {x.data.title}
                </div>
                {x.data.place && <div className="meta">{x.data.place}</div>}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <label className="item clickable" style={{ border: 0, padding: 0 }}>
          <input type="checkbox" checked={!!s.siteStays} onChange={() => saveSettings({ siteStays: !s.siteStays || undefined })} />
          <div className="grow">
            <div className="title">{t('Show the hotels from Accommodation')}</div>
            <div className="meta">{t('Name, address, phone and website only.')}</div>
          </div>
        </label>
      </div>

      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('Questions and answers')}</h2>
        </div>
        <div className="form">
          {faq.map((f, i) => (
            <div key={i} className="faq-edit full">
              <input className="input" value={f.q} placeholder={t('Question')} onChange={(e) => setFaq(faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
              <textarea className="input" rows={2} value={f.a} placeholder={t('Answer')} onChange={(e) => setFaq(faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
              <button className="btn small ghost danger" onClick={() => setFaq(faq.filter((_, j) => j !== i))}>
                {t('Remove')}
              </button>
            </div>
          ))}
        </div>
        <div className="row-gap" style={{ marginTop: 10 }}>
          <button className="btn small" onClick={() => setFaq([...faq, { q: '', a: '' }])}>
            + {t('Add a question')}
          </button>
          {faq.length === 0 && (
            <button
              className="btn small ghost"
              onClick={() =>
                setFaq([
                  { q: t('Is there alcohol?'), a: t('No. We celebrate without alcohol, with plenty of good drinks for everyone.') },
                  { q: t('How long does the church service take?'), a: t('About 90 minutes.') },
                  { q: t('Can we take photos in the church?'), a: t('Please leave it to our photographer during the service. Afterwards, share your photos with us through the photo link.') }
                ])
              }
            >
              {t('Add suggestions')}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
