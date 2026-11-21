import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadSite } from '../lib/backend'
import { useI18n, type Lang } from '../lib/i18n'
import type { Kind, Row, Settings } from '../lib/types'
import { daysUntil, fmtDate } from '../lib/util'

const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`

/** A calendar file for the day, starting at the first venue's time. */
function icsFor(s: Settings, start: string | undefined, place: string) {
  const d = s.date.replace(/-/g, '')
  const [h, m] = (start || '12:00').split(':')
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//wedding-planner//EN',
    'BEGIN:VEVENT',
    `UID:${d}-${s.partner1}-${s.partner2}@wedding`.replace(/\s+/g, ''),
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Europe/Vienna:${d}T${h.padStart(2, '0')}${m.padStart(2, '0')}00`,
    `DTEND;TZID=Europe/Vienna:${d}T235900`,
    `SUMMARY:${s.partner1} & ${s.partner2}`,
    `LOCATION:${place.replace(/[,;]/g, (c) => '\\' + c)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')
}

/** The public wedding website, opened from the secret link. No sign-in. */
export default function Site() {
  const { token = '' } = useParams()
  const { t, lang, setLang } = useI18n()
  const [rows, setRows] = useState<Row[] | null | undefined>(undefined)
  const [err, setErr] = useState('')
  useEffect(() => {
    loadSite(token)
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
  }, [token])
  const list = useMemo(() => <K extends Kind>(kind: K) => (rows ?? []).filter((r) => r.kind === kind) as Row<K>[], [rows])
  const s = list('settings')[0]?.data as Settings | undefined
  useEffect(() => {
    if (s) document.title = `${s.partner1} & ${s.partner2}`
  }, [s])

  const langs = (
    <div className="site-langs">
      {(['en', 'de', 'ro'] as Lang[]).map((l) => (
        <button key={l} className={l === lang ? 'on' : ''} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )

  if (err || rows === null || (rows && !s)) {
    return (
      <div className="site">
        {langs}
        <div className="site-card" style={{ textAlign: 'center', marginTop: 80 }}>
          <h2>{t('This link no longer works')}</h2>
          <p className="muted">{err && /wedding_site|function|schema cache/i.test(err) ? t('The website is not set up in Supabase yet.') : t('Ask the couple for the new link.')}</p>
        </div>
      </div>
    )
  }
  if (!rows || !s) return <div className="site" />

  const venues = list('venue').sort((a, b) => (a.data.startTime ?? '99').localeCompare(b.data.startTime ?? '99'))
  const plan = list('schedule').sort((a, b) => a.data.time.localeCompare(b.data.time))
  const stays = list('stay')
  const days = daysUntil(s.date)
  const first = venues[0]?.data
  const ics = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsFor(s, first?.startTime, first ? `${first.name}, ${first.address ?? ''}` : ''))
  const colours = s.palette?.length ? s.palette : ['#f7f4ee', '#dfe5d8', '#a7b59c', '#d9c29a', '#b89b6a']
  const para = (txt?: string) => txt?.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)

  return (
    <div className="site">
      {langs}
      <header className="site-hero">
        <div className="site-eyebrow">{t('We are getting married')}</div>
        <h1>
          {s.partner1} <span>&amp;</span> {s.partner2}
        </h1>
        <div className="site-date">{fmtDate(s.date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        {days > 0 && <div className="site-count">{t('{n} days to go', { n: days })}</div>}
        <div className="site-colours">
          {colours.map((c, i) => (
            <span key={i} style={{ background: c }} />
          ))}
        </div>
        <a className="btn small" href={ics} download="wedding.ics">
          {t('Save the date in your calendar')}
        </a>
      </header>

      {s.siteWelcome && <section className="site-card site-welcome">{para(s.siteWelcome)}</section>}

      {venues.map((v) => {
        const q = [v.data.name, v.data.address].filter(Boolean).join(', ')
        return (
          <section key={v.id} className="site-card">
            <div className="site-eyebrow">{t(v.data.role)}</div>
            <h2>{v.data.name}</h2>
            {(v.data.startTime || v.data.endTime) && <div className="site-time">{[v.data.startTime, v.data.endTime].filter(Boolean).join(' – ')}</div>}
            {v.data.address && <p className="muted">{v.data.address}</p>}
            <iframe className="site-map" title={v.data.name} loading="lazy" referrerPolicy="no-referrer" src={`https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=14&output=embed`} />
            <div className="row-gap" style={{ marginTop: 10 }}>
              <a className="btn small" href={mapsUrl(q)} target="_blank" rel="noreferrer">
                {t('Open in Google Maps')}
              </a>
              <a className="btn small ghost" href={`https://maps.apple.com/?q=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer">
                {t('Apple Maps')}
              </a>
            </div>
          </section>
        )
      })}

      {s.siteParking && (
        <section className="site-card">
          <h2>{t('Parking and getting there')}</h2>
          {para(s.siteParking)}
        </section>
      )}

      {plan.length > 0 && (
        <section className="site-card">
          <h2>{t('The day’s plan')}</h2>
          <div className="site-plan">
            {plan.map((x) => (
              <div key={x.id}>
                <b>{x.data.time}</b>
                <span>
                  {x.data.title}
                  {x.data.place && <small>{x.data.place}</small>}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {s.siteDress && (
        <section className="site-card">
          <h2>{t('Dress code')}</h2>
          {para(s.siteDress)}
        </section>
      )}
      {s.siteKids && (
        <section className="site-card">
          <h2>{t('Children')}</h2>
          {para(s.siteKids)}
        </section>
      )}

      {stays.length > 0 && (
        <section className="site-card">
          <h2>{t('Where to stay')}</h2>
          <div className="site-stays">
            {stays.map((x) => (
              <div key={x.id}>
                <b>{x.data.hotel}</b>
                {x.data.address && (
                  <a href={mapsUrl(`${x.data.hotel}, ${x.data.address}`)} target="_blank" rel="noreferrer">
                    {x.data.address}
                  </a>
                )}
                <span className="row-gap">
                  {x.data.phone && <a href={`tel:${x.data.phone}`}>{x.data.phone}</a>}
                  {x.data.website && (
                    <a href={x.data.website} target="_blank" rel="noreferrer">
                      {t('Website')} ↗
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {s.siteGifts && (
        <section className="site-card">
          <h2>{t('Gifts')}</h2>
          {para(s.siteGifts)}
        </section>
      )}

      {s.siteFaq && s.siteFaq.some((f) => f.q) && (
        <section className="site-card">
          <h2>{t('Questions and answers')}</h2>
          {s.siteFaq
            .filter((f) => f.q)
            .map((f, i) => (
              <details key={i} className="site-faq">
                <summary>{f.q}</summary>
                {para(f.a)}
              </details>
            ))}
        </section>
      )}

      {s.photoToken && (
        <section className="site-card" style={{ textAlign: 'center' }}>
          <h2>{t('Share your photos')}</h2>
          <p className="muted">{t('After the day, send us the photos you took. No app or account needed.')}</p>
          <a className="btn primary" href={`/p/${s.photoToken}`} style={{ marginTop: 12 }}>
            {t('Upload photos')}
          </a>
        </section>
      )}

      {s.siteContact && (
        <section className="site-card">
          <h2>{t('Questions?')}</h2>
          {para(s.siteContact)}
        </section>
      )}

      <footer className="site-foot">
        {s.partner1} &amp; {s.partner2} · {fmtDate(s.date, lang, { day: 'numeric', month: 'long', year: 'numeric' })}
      </footer>
    </div>
  )
}
