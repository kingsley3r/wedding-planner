import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadDayOf } from '../lib/backend'
import { useI18n, type Lang } from '../lib/i18n'
import type { Kind, Row, Settings } from '../lib/types'
import { fmtDate } from '../lib/util'
import { renderDoc } from '../docs/docs'
import { ContactActions, ROLE_LABEL } from './Contacts'

type Tab = 'schedule' | 'program' | 'contacts' | 'seating'
const TABS: [Tab, string][] = [
  ['schedule', 'Schedule'],
  ['program', 'Church'],
  ['contacts', 'Contacts'],
  ['seating', 'Seating']
]

/** The read-only page for ushers and the coordinator, opened from a secret link. No sign-in. */
export default function Helper() {
  const { token = '' } = useParams()
  const { t, lang, setLang } = useI18n()
  const [rows, setRows] = useState<Row[] | null | undefined>(undefined)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<Tab>('schedule')
  const [q, setQ] = useState('')

  useEffect(() => {
    const load = () =>
      loadDayOf(token)
        .then((r) => (setRows(r), setErr('')))
        .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
    load()
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [token])

  const list = useMemo(() => <K extends Kind>(kind: K) => (rows ?? []).filter((r) => r.kind === kind) as Row<K>[], [rows])
  const s = list('settings')[0]?.data as Settings | undefined

  const langs = (
    <div className="chips" style={{ justifyContent: 'center' }}>
      {(
        [
          ['en', 'EN'],
          ['de', 'DE'],
          ['ro', 'RO']
        ] as [Lang, string][]
      ).map(([l, n]) => (
        <button key={l} className={'chip' + (l === lang ? ' on' : '')} onClick={() => setLang(l)}>
          {n}
        </button>
      ))}
    </div>
  )

  if (err) {
    return (
      <div className="helper">
        <div className="card">
          <p>{t('Could not load the day-of page.')}</p>
          <p className="small muted">{/day_of/.test(err) ? t('The helper link is not set up in Supabase yet.') : err}</p>
        </div>
      </div>
    )
  }
  if (rows === undefined) return <div className="helper" />
  if (rows === null || !s) {
    return (
      <div className="helper">
        <div className="card" style={{ textAlign: 'center' }}>
          <h1 className="page" style={{ fontSize: 30 }}>
            {t('This link no longer works')}
          </h1>
          <p className="muted" style={{ marginTop: 8 }}>
            {t('Ask the couple for the new day-of link.')}
          </p>
        </div>
      </div>
    )
  }

  const schedule = list('schedule').sort((a, b) => a.data.time.localeCompare(b.data.time))
  const people = list('contact').sort((a, b) => a.data.name.localeCompare(b.data.name))
  const vendors = list('vendor').sort((a, b) => a.data.category.localeCompare(b.data.category))
  const venues = list('venue')
  const tables = list('table').sort((a, b) => a.data.name.localeCompare(b.data.name, undefined, { numeric: true }))
  const tableName = (id?: string) => tables.find((x) => x.id === id)?.data.name ?? ''
  const tableLabel = (name: string) => (/^\d+$/.test(name.trim()) ? `${t('Table')} ${name}` : name)
  const guests = list('guest')
    .filter((g) => g.data.rsvp !== 'declined' && tableName(g.data.tableId))
    .sort((a, b) => a.data.name.localeCompare(b.data.name))
  const needle = q.trim().toLowerCase()

  const item = (key: string, title: string, meta: string, phone?: string, email?: string) => (
    <div key={key} className="item contact-item">
      <div className="grow">
        <div className="title">{title}</div>
        {meta && <div className="meta">{meta}</div>}
      </div>
      <ContactActions phone={phone} email={email} />
    </div>
  )

  return (
    <div className="helper">
      <header className="helper-head">
        <div className="eyebrow">{t('Day-of page')}</div>
        <h1 className="page">
          {s.partner1} <em>&</em> {s.partner2}
        </h1>
        <div className="small muted">{fmtDate(s.date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        {langs}
      </header>

      <div className="seg helper-tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            {t(label)}
          </button>
        ))}
      </div>

      {tab === 'schedule' && (
        <div className="card">
          <div className="list">
            {schedule.map((i) => (
              <div key={i.id} className="item program-item">
                <div className="program-time">{i.data.time}</div>
                <div className="grow">
                  <div className="title">{t(i.data.title)}</div>
                  <div className="meta">{[i.data.place, i.data.who].filter(Boolean).join(' · ')}</div>
                  {i.data.notes && <div className="meta">{i.data.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'program' && (
        <div className="card helper-doc">
          {list('program').length ? renderDoc('program', { list, settings: s, t, lang }).body : <p className="muted">{t('No church program yet.')}</p>}
        </div>
      )}

      {tab === 'contacts' && (
        <>
          {(['helper', 'family', 'church', 'other'] as const).map((role) => {
            const rs = people.filter((p) => p.data.role === role)
            if (!rs.length) return null
            return (
              <div className="card" key={role}>
                <div className="card-head">
                  <h2 className="section">{t(ROLE_LABEL[role])}</h2>
                </div>
                <div className="list">{rs.map((p) => item(p.id, p.data.name, p.data.title ?? '', p.data.phone, p.data.email))}</div>
              </div>
            )
          })}
          {vendors.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h2 className="section">{t('Vendors')}</h2>
              </div>
              <div className="list">{vendors.map((v) => item(v.id, v.data.name, [t(v.data.category), v.data.contact].filter(Boolean).join(' · '), v.data.phone, v.data.email))}</div>
            </div>
          )}
          <div className="card">
            <div className="card-head">
              <h2 className="section">{t('Venues')}</h2>
            </div>
            <div className="list">{venues.map((v) => item(v.id, v.data.name, [t(v.data.role), v.data.address].filter(Boolean).join(' · '), v.data.phone))}</div>
          </div>
        </>
      )}

      {tab === 'seating' && (
        <>
          <input className="input search" placeholder={t('Find a guest')} value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12, width: '100%' }} />
          {needle ? (
            <div className="card">
              <div className="list">
                {guests
                  .filter((g) => g.data.name.toLowerCase().includes(needle))
                  .map((g) => (
                    <div key={g.id} className="item">
                      <div className="grow title">{g.data.name}</div>
                      <span className="pill ok">{tableLabel(tableName(g.data.tableId))}</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            tables.map((tb) => {
              const here = guests.filter((g) => g.data.tableId === tb.id)
              if (!here.length) return null
              return (
                <div className="card" key={tb.id}>
                  <div className="card-head">
                    <h2 className="section">{tableLabel(tb.data.name)}</h2>
                    <span className="small muted">
                      {here.length} / {tb.data.seats}
                    </span>
                  </div>
                  <div className="small" style={{ lineHeight: 1.8 }}>
                    {here.map((g) => g.data.name).join(' · ')}
                  </div>
                </div>
              )
            })
          )}
        </>
      )}
      <p className="small muted" style={{ textAlign: 'center', margin: '18px 0 30px' }}>
        {t('Read only. Pull down or reopen to see the latest changes.')}
      </p>
    </div>
  )
}
