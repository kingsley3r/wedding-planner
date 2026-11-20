import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import { fmtDate, money, todayIso } from '../lib/util'
import { Bar } from '../components/ui'
import { Countdown } from '../components/Countdown'
import { ceremonyStart } from './Program'
import { allPayments, duePayments } from '../lib/payments'

export default function Overview() {
  const { t, lang } = useI18n()
  const { settings, list } = useStore()
  const s = settings!.data
  const guests = list('guest')
  const budget = list('budget')
  const tasks = list('task')
  const vendors = list('vendor')
  const venues = list('venue')

  const attending = guests.filter((g) => g.data.rsvp === 'attending').length
  const awaiting = guests.filter((g) => g.data.rsvp === 'invited' || g.data.rsvp === 'pending').length
  const declined = guests.filter((g) => g.data.rsvp === 'declined').length
  const spent = budget.reduce((a, b) => a + (b.data.actual || 0), 0)
  const done = tasks.filter((x) => x.data.done).length
  const today = todayIso()
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const dueSoon = tasks.filter((x) => !x.data.done && x.data.dueDate && x.data.dueDate <= weekAhead).length
  const booked = vendors.filter((v) => v.data.status === 'booked').length
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('Good morning') : hour < 18 ? t('Good afternoon') : t('Good evening')

  type Up = { key: string; title: string; meta: string; date: string; tone: 'warn' | 'bad' | 'ok'; label: string; to: string }
  const upcoming: Up[] = [
    ...tasks
      .filter((x) => !x.data.done && x.data.dueDate)
      .map((x) => ({
        key: x.id,
        title: x.data.title,
        meta: fmtDate(x.data.dueDate, lang),
        date: x.data.dueDate!,
        tone: (x.data.dueDate! < today ? 'bad' : 'warn') as Up['tone'],
        label: x.data.dueDate! < today ? t('Overdue') : t('To do'),
        to: '/checklist'
      })),
    ...allPayments(budget)
      .filter((p) => !p.paid)
      .map((p) => ({
        key: p.key,
        title: `${t('Payment')}: ${p.item === p.row.data.category ? t(p.item) : p.item}${p.label ? ' · ' + t(p.label) : ''}`,
        meta: `${money(p.amount, lang)} · ${fmtDate(p.dueDate, lang)}`,
        date: p.dueDate,
        tone: (p.dueDate < today ? 'bad' : 'warn') as Up['tone'],
        label: p.dueDate < today ? t('Overdue') : t('Due'),
        to: '/budget'
      }))
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)

  const due = duePayments(budget, s.reminderDays ?? 7)
  const dueTotal = due.reduce((a, p) => a + p.amount, 0)

  return (
    <>
      {due.length > 0 && (
        <Link to="/budget" className="banner" style={{ textDecoration: 'none' }}>
          <span>
            {due.length === 1 ? t('1 payment due soon') : t('{n} payments due soon', { n: due.length })} · <b className="money">{money(dueTotal, lang)}</b>
          </span>
          <span>›</span>
        </Link>
      )}
      <div className="page-head">
        <div>
          <div className="eyebrow">{greeting}</div>
          <h1 className="page">
            {t('Everything for')} <em>{t('the day')}</em>,
            <br />
            {t('in one quiet place.')}
          </h1>
        </div>
        <Countdown date={s.date} time={ceremonyStart(venues, list('schedule'))} />
      </div>

      <div className="stats">
        <Link to="/guests" className="card stat tone-sage" style={{ textDecoration: 'none' }}>
          <h2 className="section">{t('Guests')}</h2>
          <div className="big">
            {attending} <span>/ {s.guestTarget}</span>
          </div>
          <div className="sub">
            {t('confirmed')} · {awaiting} {t('awaiting reply')}
          </div>
          <Bar value={attending / (s.guestTarget || 1)} />
        </Link>
        <Link to="/budget" className="card stat tone-gold" style={{ textDecoration: 'none' }}>
          <h2 className="section">{t('Budget')}</h2>
          <div className="big">{money(spent, lang, true)}</div>
          <div className="sub">
            {t('of {total} planned', { total: money(s.budgetTotal, lang, true) })}
          </div>
          <Bar value={spent / (s.budgetTotal || 1)} tone={spent > s.budgetTotal ? 'rose' : 'gold'} />
        </Link>
        <Link to="/checklist" className="card stat tone-sky" style={{ textDecoration: 'none' }}>
          <h2 className="section">{t('Checklist')}</h2>
          <div className="big">
            {done} <span>/ {tasks.length}</span>
          </div>
          <div className="sub">
            {t('tasks done')} · {dueSoon} {t('due this week')}
          </div>
          <Bar value={done / (tasks.length || 1)} tone="sky" />
        </Link>
        <Link to="/vendors" className="card stat tone-rose" style={{ textDecoration: 'none' }}>
          <h2 className="section">{t('Vendors')}</h2>
          <div className="big">
            {booked} <span>/ {vendors.length}</span>
          </div>
          <div className="sub">{t('booked')}</div>
          <Bar value={booked / (vendors.length || 1)} tone="rose" />
        </Link>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-head">
            <h2 className="section">{t('Coming up')}</h2>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted">{t('Nothing due. Enjoy the calm.')}</p>
          ) : (
            <div className="list">
              {upcoming.map((u) => (
                <Link key={u.key} to={u.to} className="item clickable" style={{ textDecoration: 'none' }}>
                  <div className="grow">
                    <div className="title">{u.title}</div>
                    <div className="meta">{u.meta}</div>
                  </div>
                  <span className={'pill ' + u.tone}>{u.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-head">
            <h2 className="section">{t('RSVPs')}</h2>
          </div>
          <div className="list">
            <div className="item">
              <div className="grow title">{t('Attending')}</div>
              <span className="pill ok">{attending}</span>
            </div>
            <div className="item">
              <div className="grow title">{t('Awaiting reply')}</div>
              <span className="pill warn">{awaiting}</span>
            </div>
            <div className="item">
              <div className="grow title">{t('Declined')}</div>
              <span className="pill bad">{declined}</span>
            </div>
          </div>
          <div className="card-head" style={{ marginTop: 22 }}>
            <h2 className="section">{t('Venues')}</h2>
          </div>
          <div className="list">
            {venues.map((v) => (
              <Link key={v.id} to="/venues" className="item clickable" style={{ textDecoration: 'none' }}>
                <div className="grow">
                  <div className="title">{v.data.name}</div>
                  <div className="meta">{t(v.data.role)}</div>
                </div>
                {v.data.startTime && <span className="muted small">{v.data.startTime}</span>}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
