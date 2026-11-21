import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import { fmtDate, todayIso as today } from '../lib/util'
import type { Guest, Row, Rsvp } from '../lib/types'
import { Bar, Empty, Field, PageHead, Sheet, Text } from '../components/ui'

type Filter = 'all' | 'unsent' | 'waiting' | 'attending' | 'declined'
const HOW: Record<NonNullable<Guest['inviteHow']>, string> = { post: 'By post', hand: 'By hand', digital: 'Digital' }
const ANSWER: Record<Rsvp, string> = { pending: 'Not invited yet', invited: 'No answer yet', attending: 'Accepted', declined: 'Declined' }
const TONE: Record<Rsvp, string> = { pending: '', invited: 'warn', attending: 'ok', declined: 'bad' }

interface Household {
  key: string
  name: string
  guests: Row<'guest'>[]
}

/** One invitation per household: the household name, or the guest's own name when there is none. */
function households(guests: Row<'guest'>[]): Household[] {
  const map = new Map<string, Household>()
  for (const g of guests) {
    const name = g.data.household?.trim() || g.data.name
    const key = name.toLowerCase()
    const h = map.get(key) ?? { key, name, guests: [] }
    h.guests.push(g)
    map.set(key, h)
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

const stateOf = (h: Household): Filter => {
  if (!h.guests.some((g) => g.data.inviteSent || g.data.rsvp !== 'pending')) return 'unsent'
  if (h.guests.some((g) => g.data.rsvp === 'invited' || g.data.rsvp === 'pending')) return 'waiting'
  return h.guests.some((g) => g.data.rsvp === 'attending') ? 'attending' : 'declined'
}

export default function Invitations() {
  const { t, lang } = useI18n()
  const { list, update } = useStore()
  const guests = list('guest')
  const all = households(guests)
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const sent = all.filter((h) => stateOf(h) !== 'unsent').length
  const n = (r: Rsvp) => guests.filter((g) => g.data.rsvp === r).length
  const shown = all.filter((h) => (filter === 'all' || stateOf(h) === filter) && (!q || h.name.toLowerCase().includes(q.toLowerCase()) || h.guests.some((g) => g.data.name.toLowerCase().includes(q.toLowerCase()))))
  const current = all.find((h) => h.key === open)

  const markSent = async (h: Household, date = today()) => {
    for (const g of h.guests) await update(g, { inviteSent: date, rsvp: g.data.rsvp === 'pending' ? 'invited' : g.data.rsvp })
  }
  const answerAll = async (h: Household, rsvp: Rsvp) => {
    for (const g of h.guests) await update(g, { rsvp, inviteSent: g.data.inviteSent ?? today() })
  }

  const counts: [Filter, string, number][] = [
    ['all', 'All', all.length],
    ['unsent', 'Not sent', all.filter((h) => stateOf(h) === 'unsent').length],
    ['waiting', 'Waiting for an answer', all.filter((h) => stateOf(h) === 'waiting').length],
    ['attending', 'Accepted', all.filter((h) => stateOf(h) === 'attending').length],
    ['declined', 'Declined', all.filter((h) => stateOf(h) === 'declined').length]
  ]

  return (
    <>
      <PageHead eyebrow={t('{a} of {b} sent', { a: sent, b: all.length })} title={t('Invitations')}>
        <Link className="btn" to="/print/invitations">
          {t('Print')}
        </Link>
      </PageHead>

      <div className="stats compact">
        <div className="card stat tone-sky">
          <h2 className="section">{t('Sent')}</h2>
          <div className="big">{sent}</div>
          <div className="sub">{t('of {n} households', { n: all.length })}</div>
        </div>
        <div className="card stat tone-sage">
          <h2 className="section">{t('Accepted')}</h2>
          <div className="big">{n('attending')}</div>
          <div className="sub">{t('guests')}</div>
        </div>
        <div className="card stat tone-gold">
          <h2 className="section">{t('Waiting')}</h2>
          <div className="big">{n('invited')}</div>
          <div className="sub">{t('guests')}</div>
        </div>
        <div className="card stat tone-rose">
          <h2 className="section">{t('Declined')}</h2>
          <div className="big">{n('declined')}</div>
          <div className="sub">{t('guests')}</div>
        </div>
      </div>

      <div className="card">
        <Bar value={all.length ? sent / all.length : 0} tone="gold" />
        <input className="input" style={{ marginTop: 14 }} placeholder={t('Search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips" style={{ marginTop: 10 }}>
          {counts.map(([f, label, c]) => (
            <button key={f} className={'chip' + (filter === f ? ' on' : '')} onClick={() => setFilter(f)}>
              {t(label)} · {c}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {guests.length === 0 ? (
          <Empty title={t('No guests yet')}>
            <Link className="btn primary" to="/guests" style={{ marginTop: 12 }}>
              {t('Add guests first')}
            </Link>
          </Empty>
        ) : shown.length === 0 ? (
          <p className="muted small">{t('Nothing here')}</p>
        ) : (
          <div className="list">
            {shown.map((h) => {
              const st = stateOf(h)
              const date = h.guests.find((g) => g.data.inviteSent)?.data.inviteSent
              return (
                <div key={h.key} className="item clickable" onClick={() => setOpen(h.key)}>
                  <div className="grow">
                    <div className="title">{h.name}</div>
                    <div className="meta">
                      {h.guests.length > 1 || h.guests[0].data.name !== h.name ? h.guests.map((g) => g.data.name).join(', ') : ''}
                      {date ? `${h.guests.length > 1 || h.guests[0].data.name !== h.name ? ' · ' : ''}${t('Sent {d}', { d: fmtDate(date, lang, { day: 'numeric', month: 'short' }) })}` : ''}
                    </div>
                  </div>
                  {st === 'unsent' ? (
                    <button
                      className="btn small"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        markSent(h)
                      }}
                    >
                      {t('Mark sent')}
                    </button>
                  ) : (
                    <span className={'pill ' + (st === 'attending' ? 'ok' : st === 'declined' ? 'bad' : 'warn')}>
                      {st === 'waiting' ? t('Waiting') : st === 'attending' ? t('Accepted') : t('Declined')}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {current && (
        <Sheet title={current.name} onClose={() => setOpen(null)}>
          <div className="form">
            <Field label={t('Sent on')}>
              <Text type="date" value={current.guests.find((g) => g.data.inviteSent)?.data.inviteSent} onChange={(v) => (v ? markSent(current, v) : current.guests.forEach((g) => update(g, { inviteSent: undefined })))} />
            </Field>
            <Field label={t('How')}>
              <div className="chips">
                {(Object.keys(HOW) as (keyof typeof HOW)[]).map((k) => (
                  <button
                    type="button"
                    key={k}
                    className={'chip' + (current.guests[0].data.inviteHow === k ? ' on' : '')}
                    onClick={() => current.guests.forEach((g) => update(g, { inviteHow: g.data.inviteHow === k ? undefined : k }))}
                  >
                    {t(HOW[k])}
                  </button>
                ))}
              </div>
            </Field>
            {current.guests.length > 1 && (
              <Field label={t('Answer for everyone')} full>
                <div className="chips">
                  <button type="button" className="chip" onClick={() => answerAll(current, 'attending')}>
                    {t('All accepted')}
                  </button>
                  <button type="button" className="chip" onClick={() => answerAll(current, 'declined')}>
                    {t('All declined')}
                  </button>
                </div>
              </Field>
            )}
            <Field label={t('Answers')} full>
              <div className="list">
                {current.guests.map((g) => (
                  <div key={g.id} className="item invite-guest">
                    <div className="grow">
                      <div className="title">{g.data.name}</div>
                      <span className={'pill ' + TONE[g.data.rsvp]}>{t(ANSWER[g.data.rsvp])}</span>
                    </div>
                    <div className="row-gap">
                      <button type="button" className={'chip' + (g.data.rsvp === 'attending' ? ' on' : '')} onClick={() => update(g, { rsvp: g.data.rsvp === 'attending' ? 'invited' : 'attending' })}>
                        {t('Yes')}
                      </button>
                      <button type="button" className={'chip' + (g.data.rsvp === 'declined' ? ' on' : '')} onClick={() => update(g, { rsvp: g.data.rsvp === 'declined' ? 'invited' : 'declined' })}>
                        {t('No')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Field>
            <p className="small muted full">{t('Households come from the guest list. Give guests the same household name to send them one invitation.')}</p>
          </div>
        </Sheet>
      )}
    </>
  )
}
