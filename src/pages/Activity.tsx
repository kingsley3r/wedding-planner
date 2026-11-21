import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import { fmtDate, localeOf } from '../lib/util'
import { PageHead } from '../components/ui'

const KIND: Record<string, string> = {
  guest: 'Guest',
  budget: 'Budget',
  vendor: 'Vendor',
  venue: 'Venue',
  task: 'Checklist',
  table: 'Seating',
  schedule: 'Day-of schedule',
  note: 'Notes',
  mood: 'Mood board',
  contact: 'Contacts',
  stay: 'Accommodation',
  program: 'Church program',
  photo: 'Photo',
  pack: 'Packing list',
  rehearsal: 'Rehearsal',
  song: 'Band & songs',
  hmDest: 'Honeymoon',
  hmFlight: 'Honeymoon',
  hmStay: 'Honeymoon',
  hmExpense: 'Honeymoon',
  shot: 'Shot list',
  decision: 'Decision log',
  kidSlot: 'Kids’ corner',
  kidTask: 'Kids’ corner'
}
const VERB = { add: 'added', edit: 'changed', delete: 'deleted' } as const

/** Who changed what, newest first. */
export default function Activity() {
  const { t, lang } = useI18n()
  const { list, settings, saveSettings } = useStore()
  const s = settings!.data
  const logs = list('log').sort((a, b) => b.data.at.localeCompare(a.data.at))
  const people = [...new Set(logs.map((l) => l.data.who).filter(Boolean))]
  const [who, setWho] = useState('')
  const nameOf = (email: string) => s.people?.[email] || (email ? email.split('@')[0] : t('You'))
  const shown = logs.filter((l) => !who || l.data.who === who)
  const days = new Map<string, typeof shown>()
  for (const l of shown) {
    const d = l.data.at.slice(0, 10)
    days.set(d, [...(days.get(d) ?? []), l])
  }
  const time = (iso: string) => new Date(iso).toLocaleTimeString(localeOf(lang), { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <PageHead eyebrow={t('Who changed what')} title={t('Activity')} />

      {people.length > 1 && (
        <div className="chips" style={{ marginBottom: 14 }}>
          <button className={'chip' + (!who ? ' on' : '')} onClick={() => setWho('')}>
            {t('Both')}
          </button>
          {people.map((p) => (
            <button key={p} className={'chip' + (who === p ? ' on' : '')} onClick={() => setWho(p)}>
              {nameOf(p)}
            </button>
          ))}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="card">
          <p className="muted small">{t('Changes you both make show up here, newest first.')}</p>
        </div>
      ) : (
        [...days].map(([d, items]) => (
          <div key={d} className="card">
            <h2 className="section" style={{ marginBottom: 6 }}>
              {fmtDate(d, lang, { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <div className="list">
              {items.map((l) => (
                <div key={l.id} className="item feed-item">
                  <span className={'feed-dot ' + l.data.action} />
                  <div className="grow">
                    <div className="title">
                      <b>{nameOf(l.data.who)}</b> {t(VERB[l.data.action])} {l.data.label ? <>“{t(l.data.label)}”</> : null}
                    </div>
                    <div className="meta">
                      {l.data.kind === 'settings' ? '' : t(KIND[l.data.kind] ?? l.data.kind) + ' · '}
                      {time(l.data.at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {people.length > 0 && (
        <div className="card">
          <h2 className="section" style={{ marginBottom: 8 }}>
            {t('Names in the feed')}
          </h2>
          <div className="form">
            {people.map((p) => (
              <label key={p} className="field full">
                <span className="small muted">{p}</span>
                <select className="input" value={s.people?.[p] ?? ''} onChange={(e) => saveSettings({ people: { ...s.people, [p]: e.target.value || '' } })}>
                  <option value="">{p.split('@')[0]}</option>
                  {[s.partner1, s.partner2].filter(Boolean).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
