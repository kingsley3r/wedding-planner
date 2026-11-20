import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import { allPayments, downloadFile } from '../lib/payments'
import type { Rsvp } from '../lib/types'
import { fmtDate, money } from '../lib/util'
import { PageHead } from '../components/ui'

const DOCS = [
  { id: 'guests', title: 'Guest list', desc: 'Everyone with side, group, RSVP, table and meal' },
  { id: 'seating', title: 'Table plan', desc: 'Who sits at each table, for the venue' },
  { id: 'escort', title: 'Seating list A–Z', desc: 'Each guest and their table, for the entrance' },
  { id: 'placecards', title: 'Place cards', desc: 'Folded name cards, ready to cut' },
  { id: 'meals', title: 'Meals and dietary needs', desc: 'Counts and special requests for the caterer' },
  { id: 'schedule', title: 'Day-of schedule', desc: 'The run sheet for helpers and vendors' },
  { id: 'vendors', title: 'Vendor contacts', desc: 'Names, phone numbers and status' },
  { id: 'budget', title: 'Budget and payments', desc: 'Every expense and payment date' },
  { id: 'checklist', title: 'Checklist', desc: 'Open and finished tasks' }
]

const RSVP_LABEL: Record<Rsvp, string> = { pending: 'Not invited yet', invited: 'Invited', attending: 'Attending', declined: 'Declined' }

function csv(rows: (string | number | undefined)[][]) {
  // Semicolons open cleanly in Excel set to German or Romanian; the BOM keeps ă, ș, ü intact.
  return '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n')
}

export default function Print() {
  const { doc } = useParams()
  const { t, lang } = useI18n()
  const { list, settings } = useStore()
  const s = settings!.data

  if (!doc) {
    return (
      <>
        <PageHead eyebrow={t('Print or save as PDF')} title={t('Print & export')} />
        <div className="card">
          <div className="list">
            {DOCS.map((d) => (
              <Link key={d.id} to={'/print/' + d.id} className="item clickable" style={{ textDecoration: 'none' }}>
                <div className="grow">
                  <div className="title">{t(d.title)}</div>
                  <div className="meta">{t(d.desc)}</div>
                </div>
                <span className="muted">›</span>
              </Link>
            ))}
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          {t('On iPhone: tap Print, then pinch out on the preview or use Share to save it as a PDF.')}
        </p>
      </>
    )
  }

  const meta = DOCS.find((d) => d.id === doc)
  const guests = list('guest').sort((a, b) => a.data.name.localeCompare(b.data.name))
  const tables = list('table').sort((a, b) => a.data.name.localeCompare(b.data.name, undefined, { numeric: true }))
  const tableName = (id?: string) => tables.find((x) => x.id === id)?.data.name ?? ''
  // "Table 3", but "Head table" rather than "Table Head table".
  const tableLabel = (name: string) => (/^\d+$/.test(name.trim()) ? `${t('Table')} ${name}` : name)
  const attending = guests.filter((g) => g.data.rsvp === 'attending')
  const seatedGuests = guests.filter((g) => g.data.rsvp !== 'declined' && g.data.tableId && tableName(g.data.tableId))
  const couple = `${s.partner1} & ${s.partner2}`
  const dateStr = fmtDate(s.date, lang, { day: 'numeric', month: 'long', year: 'numeric' })

  let body: JSX.Element | null = null
  let exportCsv: (() => void) | null = null

  if (doc === 'guests') {
    exportCsv = () =>
      downloadFile(
        'guests.csv',
        csv([
          ['Name', 'Side', 'Group', 'RSVP', 'Table', 'Meal', 'Dietary needs', 'Phone', 'Email', 'Notes'],
          ...guests.map((g) => [g.data.name, g.data.side, g.data.group, g.data.rsvp, tableName(g.data.tableId), g.data.meal, g.data.diet, g.data.phone, g.data.email, g.data.notes])
        ]),
        'text/csv'
      )
    body = (
      <>
        <p className="doc-sub">
          {t('{n} guests', { n: guests.length })} · {t('{n} attending', { n: attending.length })}
        </p>
        <table className="doc-table">
          <thead>
            <tr>
              <th>{t('Name')}</th>
              <th>{t('Side')}</th>
              <th>{t('Group')}</th>
              <th>{t('RSVP')}</th>
              <th>{t('Table')}</th>
              <th>{t('Meal')}</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((g) => (
              <tr key={g.id}>
                <td>{g.data.name}</td>
                <td>{t(g.data.side === 'bride' ? 'Bride' : g.data.side === 'groom' ? 'Groom' : 'Both')}</td>
                <td>{t(g.data.group)}</td>
                <td>{t(RSVP_LABEL[g.data.rsvp])}</td>
                <td>{tableName(g.data.tableId)}</td>
                <td>{[g.data.meal, g.data.diet].filter(Boolean).join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )
  } else if (doc === 'seating') {
    body = (
      <div className="doc-tables">
        {tables.map((tb) => {
          const people = seatedGuests.filter((g) => g.data.tableId === tb.id)
          return (
            <div key={tb.id} className="doc-tablecard">
              <h3>{tableLabel(tb.data.name)}</h3>
              <div className="doc-sub">
                {people.length} / {tb.data.seats}
              </div>
              <ol>
                {people.map((g) => (
                  <li key={g.id}>
                    {g.data.name}
                    {g.data.diet ? <span className="muted"> · {g.data.diet}</span> : null}
                  </li>
                ))}
              </ol>
            </div>
          )
        })}
      </div>
    )
  } else if (doc === 'escort') {
    body = (
      <div className="doc-escort">
        {seatedGuests.map((g) => (
          <div key={g.id} className="doc-escort-row">
            <span>{g.data.name}</span>
            <span className="dots" />
            <b>{tableLabel(tableName(g.data.tableId))}</b>
          </div>
        ))}
      </div>
    )
  } else if (doc === 'placecards') {
    body = (
      <div className="doc-cards">
        {seatedGuests.map((g) => (
          <div key={g.id} className="doc-card">
            <div className="doc-card-fold" />
            <div className="doc-card-name">{g.data.name}</div>
            <div className="doc-card-table">{tableLabel(tableName(g.data.tableId))}</div>
          </div>
        ))}
      </div>
    )
  } else if (doc === 'meals') {
    const meals = new Map<string, number>()
    attending.forEach((g) => meals.set(g.data.meal || t('Not chosen yet'), (meals.get(g.data.meal || t('Not chosen yet')) ?? 0) + 1))
    const special = attending.filter((g) => g.data.diet || g.data.child)
    body = (
      <>
        <p className="doc-sub">{t('{n} attending', { n: attending.length })}</p>
        <table className="doc-table" style={{ maxWidth: 420 }}>
          <tbody>
            {[...meals.entries()].map(([m, n]) => (
              <tr key={m}>
                <td>{m}</td>
                <td className="right">{n}</td>
              </tr>
            ))}
            <tr>
              <td>{t('Children')}</td>
              <td className="right">{attending.filter((g) => g.data.child).length}</td>
            </tr>
          </tbody>
        </table>
        <h2 className="doc-h2">{t('Dietary needs')}</h2>
        <table className="doc-table">
          <tbody>
            {special.map((g) => (
              <tr key={g.id}>
                <td>{g.data.name}</td>
                <td>{[g.data.child ? t('Child') : '', g.data.diet].filter(Boolean).join(' · ')}</td>
                <td>{tableName(g.data.tableId) ? tableLabel(tableName(g.data.tableId)) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )
  } else if (doc === 'schedule') {
    const items = list('schedule').sort((a, b) => a.data.time.localeCompare(b.data.time))
    body = (
      <table className="doc-table doc-schedule">
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td className="doc-time">{i.data.time}</td>
              <td>
                <b>{t(i.data.title)}</b>
                {i.data.notes && <div className="muted">{i.data.notes}</div>}
              </td>
              <td>{i.data.place}</td>
              <td>{i.data.who}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  } else if (doc === 'vendors') {
    const vendors = list('vendor').sort((a, b) => a.data.category.localeCompare(b.data.category))
    exportCsv = () =>
      downloadFile(
        'vendors.csv',
        csv([['Name', 'Category', 'Status', 'Contact', 'Phone', 'Email', 'Website', 'Quote (EUR)'], ...vendors.map((v) => [v.data.name, v.data.category, v.data.status, v.data.contact, v.data.phone, v.data.email, v.data.website, v.data.quote])]),
        'text/csv'
      )
    body = (
      <table className="doc-table">
        <thead>
          <tr>
            <th>{t('Category')}</th>
            <th>{t('Name')}</th>
            <th>{t('Contact')}</th>
            <th>{t('Phone')}</th>
            <th>{t('Email')}</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((v) => (
            <tr key={v.id}>
              <td>{t(v.data.category)}</td>
              <td>{v.data.name}</td>
              <td>{v.data.contact}</td>
              <td>{v.data.phone}</td>
              <td>{v.data.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  } else if (doc === 'budget') {
    const items = list('budget').sort((a, b) => a.data.category.localeCompare(b.data.category))
    const pays = allPayments(items)
    exportCsv = () =>
      downloadFile(
        'budget.csv',
        csv([
          ['Category', 'Item', 'Planned (EUR)', 'Actual (EUR)', 'Paid (EUR)', 'Next due', 'Who pays'],
          ...items.map((b) => [b.data.category, b.data.label, b.data.planned, b.data.actual, b.data.paid, b.data.dueDate, b.data.payer])
        ]),
        'text/csv'
      )
    const sum = (k: 'planned' | 'actual' | 'paid') => items.reduce((a, b) => a + (b.data[k] || 0), 0)
    body = (
      <>
        <table className="doc-table">
          <thead>
            <tr>
              <th>{t('Category')}</th>
              <th>{t('Description')}</th>
              <th className="right">{t('Planned')}</th>
              <th className="right">{t('Actual')}</th>
              <th className="right">{t('Paid')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id}>
                <td>{t(b.data.category)}</td>
                <td>{b.data.label === b.data.category ? '' : b.data.label}</td>
                <td className="right money">{money(b.data.planned, lang)}</td>
                <td className="right money">{b.data.actual ? money(b.data.actual, lang) : ''}</td>
                <td className="right money">{b.data.paid ? money(b.data.paid, lang) : ''}</td>
              </tr>
            ))}
            <tr className="doc-total">
              <td colSpan={2}>{t('Total')}</td>
              <td className="right money">{money(sum('planned'), lang)}</td>
              <td className="right money">{money(sum('actual'), lang)}</td>
              <td className="right money">{money(sum('paid'), lang)}</td>
            </tr>
          </tbody>
        </table>
        {pays.length > 0 && (
          <>
            <h2 className="doc-h2">{t('Payment dates')}</h2>
            <table className="doc-table">
              <tbody>
                {pays.map((p) => (
                  <tr key={p.key}>
                    <td>{fmtDate(p.dueDate, lang)}</td>
                    <td>
                      {p.item === p.row.data.category ? t(p.item) : p.item}
                      {p.label ? ` · ${t(p.label)}` : ''}
                    </td>
                    <td className="right money">{money(p.amount, lang)}</td>
                    <td>{p.paid ? t('Paid') : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </>
    )
  } else if (doc === 'checklist') {
    const tasks = list('task').sort((a, b) => (a.data.dueDate ?? '9').localeCompare(b.data.dueDate ?? '9'))
    body = (
      <table className="doc-table">
        <tbody>
          {tasks.map((x) => (
            <tr key={x.id}>
              <td style={{ width: 28 }}>{x.data.done ? '☑' : '☐'}</td>
              <td style={{ textDecoration: x.data.done ? 'line-through' : undefined }}>{t(x.data.title)}</td>
              <td>{fmtDate(x.data.dueDate, lang)}</td>
              <td>{x.data.owner}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <>
      <div className="doc-toolbar no-print">
        <Link to="/print" className="btn small ghost">
          ‹ {t('Print & export')}
        </Link>
        <div className="row-gap">
          {exportCsv && (
            <button className="btn small" onClick={exportCsv}>
              {t('Download Excel (CSV)')}
            </button>
          )}
          <button className="btn small primary" onClick={() => window.print()}>
            {t('Print / Save PDF')}
          </button>
        </div>
      </div>
      <article className={'doc' + (doc === 'placecards' ? ' doc-wide' : '')}>
        <header className="doc-head">
          <div className="eyebrow">
            {couple} · {dateStr}
          </div>
          <h1>{meta ? t(meta.title) : ''}</h1>
        </header>
        {body ?? <p>{t('Not found')}</p>}
      </article>
    </>
  )
}
