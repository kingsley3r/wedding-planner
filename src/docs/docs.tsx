import type { ReactNode } from 'react'
import type { Lang } from '../lib/i18n'
import type { Kind, Row, Rsvp, Settings } from '../lib/types'
import { allPayments, downloadFile } from '../lib/payments'
import { fmtDate, money } from '../lib/util'
import { addMinutes, ceremonyStart } from '../pages/Program'
import { ROLE_LABEL } from '../pages/Contacts'
import { MOMENTS } from '../pages/Shots'

export interface DocMeta {
  id: string
  title: string
  desc: string
  group: 'Guests' | 'The day' | 'Planning'
  wide?: boolean
}

export const DOCS: DocMeta[] = [
  { id: 'guests', group: 'Guests', title: 'Guest list', desc: 'Everyone with side, group, RSVP, table and meal' },
  { id: 'seating', group: 'Guests', title: 'Table plan', desc: 'Who sits at each table, for the venue' },
  { id: 'escort', group: 'Guests', title: 'Seating list A–Z', desc: 'Each guest and their table, for the entrance' },
  { id: 'placecards', group: 'Guests', title: 'Place cards', desc: 'Folded name cards, ready to cut', wide: true },
  { id: 'meals', group: 'Guests', title: 'Meals and dietary needs', desc: 'Counts and special requests for the caterer' },
  { id: 'stays', group: 'Guests', title: 'Accommodation', desc: 'Hotels and who sleeps where' },
  { id: 'schedule', group: 'The day', title: 'Day-of schedule', desc: 'The run sheet for helpers and vendors' },
  { id: 'program', group: 'The day', title: 'Church program', desc: 'Order of service in Romanian and German' },
  { id: 'shots-photo', group: 'The day', title: 'Shot list for the photographer', desc: 'Every photo you want, by moment' },
  { id: 'shots-video', group: 'The day', title: 'Shot list for the videographer', desc: 'Every scene you want filmed, by moment' },
  { id: 'packing', group: 'The day', title: 'Packing list', desc: 'What goes in which bag' },
  { id: 'contacts', group: 'The day', title: 'Contacts sheet', desc: 'Helpers, family, church, vendors and venues' },
  { id: 'vendors', group: 'Planning', title: 'Vendor contacts', desc: 'Names, phone numbers and status' },
  { id: 'budget', group: 'Planning', title: 'Budget and payments', desc: 'Every expense and payment date' },
  { id: 'bva', group: 'Planning', title: 'Budget vs actual', desc: 'Planned and actual per category, and what is still owed' },
  { id: 'checklist', group: 'Planning', title: 'Checklist', desc: 'Open and finished tasks' },
  { id: 'decisions', group: 'Planning', title: 'Decision log', desc: 'What you decided, when and why' },
  { id: 'tasks', group: 'Planning', title: 'Tasks by person', desc: 'Open tasks grouped by who does them' }
]

const RSVP_LABEL: Record<Rsvp, string> = { pending: 'Not invited yet', invited: 'Invited', attending: 'Attending', declined: 'Declined' }

export function csv(rows: (string | number | undefined)[][]) {
  // Semicolons open cleanly in Excel set to German or Romanian; the BOM keeps ă, ș, ü intact.
  return '\ufeff' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n')
}

export interface DocCtx {
  list<K extends Kind>(kind: K): Row<K>[]
  settings: Settings
  t: (s: string, vars?: Record<string, string | number>) => string
  lang: Lang
}

/** Build one printable document. Shared by the print menu, the bundle and the day-of page. */
export function renderDoc(doc: string, { list, t, lang }: DocCtx): { body: ReactNode; exportCsv: (() => void) | null } {
  const guests = list('guest').sort((a, b) => a.data.name.localeCompare(b.data.name))
  const tables = list('table').sort((a, b) => a.data.name.localeCompare(b.data.name, undefined, { numeric: true }))
  const tableName = (id?: string) => tables.find((x) => x.id === id)?.data.name ?? ''
  // "Table 3", but "Head table" rather than "Table Head table".
  const tableLabel = (name: string) => (/^\d+$/.test(name.trim()) ? `${t('Table')} ${name}` : name)
  const attending = guests.filter((g) => g.data.rsvp === 'attending')
  const seatedGuests = guests.filter((g) => g.data.rsvp !== 'declined' && g.data.tableId && tableName(g.data.tableId))

  let body: ReactNode = null
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
  } else if (doc === 'stays') {
    const stays = list('stay').sort((a, b) => a.data.hotel.localeCompare(b.data.hotel))
    const housed = guests.filter((g) => g.data.rsvp !== 'declined' && stays.some((x) => x.id === g.data.stayId))
    exportCsv = () =>
      downloadFile(
        'accommodation.csv',
        csv([
          ['Hotel', 'Guest', 'Household', 'Check-in', 'Check-out', 'Phone'],
          ...housed.map((g) => {
            const st = stays.find((x) => x.id === g.data.stayId)!.data
            return [st.hotel, g.data.name, g.data.household, st.checkIn, st.checkOut, g.data.phone]
          })
        ]),
        'text/csv'
      )
    body = (
      <div className="doc-tables">
        {stays.map((st) => {
          const here = housed.filter((g) => g.data.stayId === st.id)
          return (
            <div key={st.id} className="doc-tablecard">
              <h3>{st.data.hotel}</h3>
              <div className="doc-sub">
                {[
                  st.data.checkIn && st.data.checkOut
                    ? `${fmtDate(st.data.checkIn, lang, { day: 'numeric', month: 'short' })} – ${fmtDate(st.data.checkOut, lang, { day: 'numeric', month: 'short' })}`
                    : '',
                  st.data.rooms ? t('{n} rooms', { n: st.data.rooms }) : '',
                  st.data.phone
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
              {st.data.address && <div className="doc-sub">{st.data.address}</div>}
              <ol>
                {here.map((g) => (
                  <li key={g.id}>{g.data.name}</li>
                ))}
              </ol>
            </div>
          )
        })}
      </div>
    )
  } else if (doc === 'program') {
    const items = list('program').sort((a, b) => a.data.order - b.data.order)
    let clock = ceremonyStart(list('venue'), list('schedule'))
    body = (
      <table className="doc-table doc-program">
        <thead>
          <tr>
            <th />
            <th>Română</th>
            <th>Deutsch</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const at = clock
            clock = addMinutes(clock, i.data.minutes || 0)
            return (
              <tr key={i.id}>
                <td className="doc-time">{at}</td>
                <td>
                  <b>{i.data.titleRo}</b>
                  {i.data.detail && <div className="muted">{i.data.detail}</div>}
                  {i.data.who && <div className="muted">{i.data.who}</div>}
                </td>
                <td>
                  <b>{i.data.titleDe}</b>
                  {i.data.detail && <div className="muted">{i.data.detail}</div>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  } else if (doc === 'contacts') {
    type C = { id: string; name: string; role: string; phone: string; email: string }
    const rows: C[] = [
      ...list('contact')
        .sort((a, b) => a.data.role.localeCompare(b.data.role) || a.data.name.localeCompare(b.data.name))
        .map((p) => ({ id: p.id, name: p.data.name, role: [t(ROLE_LABEL[p.data.role]), p.data.title].filter(Boolean).join(' · '), phone: p.data.phone ?? '', email: p.data.email ?? '' })),
      ...list('vendor')
        .filter((v) => v.data.status !== 'declined')
        .sort((a, b) => a.data.category.localeCompare(b.data.category))
        .map((v) => ({ id: v.id, name: v.data.name, role: [t(v.data.category), v.data.contact].filter(Boolean).join(' · '), phone: v.data.phone ?? '', email: v.data.email ?? '' })),
      ...list('venue').map((v) => ({ id: v.id, name: v.data.name, role: [t(v.data.role), v.data.contact].filter(Boolean).join(' · '), phone: v.data.phone ?? '', email: '' }))
    ]
    exportCsv = () => downloadFile('contacts.csv', csv([['Name', 'Role', 'Phone', 'Email'], ...rows.map((r) => [r.name, r.role, r.phone, r.email])]), 'text/csv')
    body = (
      <table className="doc-table">
        <thead>
          <tr>
            <th>{t('Name')}</th>
            <th>{t('Role')}</th>
            <th>{t('Phone')}</th>
            <th>{t('Email')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <b>{r.name}</b>
              </td>
              <td>{r.role}</td>
              <td style={{ whiteSpace: 'nowrap' }}>{r.phone}</td>
              <td>{r.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  } else if (doc === 'bva') {
    const cats = new Map<string, { planned: number; actual: number; paid: number }>()
    for (const r of list('budget')) {
      const c = cats.get(r.data.category) ?? { planned: 0, actual: 0, paid: 0 }
      c.planned += r.data.planned || 0
      c.actual += r.data.actual || 0
      c.paid += r.data.paid || 0
      cats.set(r.data.category, c)
    }
    const rows = [...cats.entries()].sort((a, b) => b[1].planned - a[1].planned)
    const tot = rows.reduce((a, [, v]) => ({ planned: a.planned + v.planned, actual: a.actual + v.actual, paid: a.paid + v.paid }), { planned: 0, actual: 0, paid: 0 })
    const open = allPayments(list('budget')).filter((p) => !p.paid)
    const diff = (a: number, p: number) => (a > p ? '+' : '') + money(a - p, lang)
    exportCsv = () =>
      downloadFile(
        'budget-vs-actual.csv',
        csv([
          ['Category', 'Planned (EUR)', 'Actual (EUR)', 'Difference (EUR)', 'Paid (EUR)', 'Still owed (EUR)'],
          ...rows.map(([c, v]) => [c, v.planned, v.actual, v.actual - v.planned, v.paid, Math.max(0, v.actual - v.paid)])
        ]),
        'text/csv'
      )
    body = (
      <>
        <table className="doc-table">
          <thead>
            <tr>
              <th>{t('Category')}</th>
              <th className="right">{t('Planned')}</th>
              <th className="right">{t('Actual')}</th>
              <th className="right">{t('Difference')}</th>
              <th className="right">{t('Still owed')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([c, v]) => (
              <tr key={c}>
                <td>{t(c)}</td>
                <td className="right money">{money(v.planned, lang)}</td>
                <td className="right money">{v.actual ? money(v.actual, lang) : ''}</td>
                <td className={'right money' + (v.actual > v.planned ? ' doc-over' : '')}>{v.actual ? diff(v.actual, v.planned) : ''}</td>
                <td className="right money">{v.actual > v.paid ? money(v.actual - v.paid, lang) : ''}</td>
              </tr>
            ))}
            <tr className="doc-total">
              <td>{t('Total')}</td>
              <td className="right money">{money(tot.planned, lang)}</td>
              <td className="right money">{money(tot.actual, lang)}</td>
              <td className="right money">{diff(tot.actual, tot.planned)}</td>
              <td className="right money">{money(Math.max(0, tot.actual - tot.paid), lang)}</td>
            </tr>
          </tbody>
        </table>
        {open.length > 0 && (
          <>
            <h2 className="doc-h2">{t('Deposits and payments still due')}</h2>
            <table className="doc-table">
              <tbody>
                {open.map((p) => (
                  <tr key={p.key}>
                    <td>{fmtDate(p.dueDate, lang)}</td>
                    <td>
                      {p.item === p.row.data.category ? t(p.item) : p.item}
                      {p.label ? ` · ${t(p.label)}` : ''}
                    </td>
                    <td className="right money">{money(p.amount, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </>
    )
  } else if (doc === 'tasks') {
    const open = list('task')
      .filter((x) => !x.data.done)
      .sort((a, b) => (a.data.dueDate ?? '9').localeCompare(b.data.dueDate ?? '9'))
    const owners = [...new Set(open.map((x) => x.data.owner || ''))].sort((a, b) => (!a ? 1 : !b ? -1 : a.localeCompare(b)))
    exportCsv = () => downloadFile('tasks.csv', csv([['Who', 'Task', 'Due'], ...open.map((x) => [x.data.owner, x.data.title, x.data.dueDate])]), 'text/csv')
    body = (
      <div className="doc-tables">
        {owners.map((o) => {
          const mine = open.filter((x) => (x.data.owner || '') === o)
          return (
            <div key={o || '-'} className="doc-tablecard">
              <h3>{o || t('Not assigned')}</h3>
              <div className="doc-sub">{t('{n} open', { n: mine.length })}</div>
              <ul className="doc-tasks">
                {mine.map((x) => (
                  <li key={x.id}>
                    ☐ {t(x.data.title)}
                    {x.data.dueDate && <span className="muted"> · {fmtDate(x.data.dueDate, lang, { day: 'numeric', month: 'short' })}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    )
  } else if (doc === 'packing') {
    const items = list('pack')
    const groups = [...new Set(items.map((i) => i.data.group))]
    body = (
      <div className="doc-tables">
        {groups.map((g) => (
          <div key={g} className="doc-tablecard">
            <h3>{t(g)}</h3>
            <ul className="doc-tasks">
              {items
                .filter((i) => i.data.group === g)
                .map((i) => (
                  <li key={i.id}>
                    {i.data.packed ? '☑' : '☐'} {t(i.data.item)}
                    {i.data.who && <span className="muted"> · {i.data.who}</span>}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    )
  } else if (doc === 'shots-photo' || doc === 'shots-video') {
    const kind = doc === 'shots-photo' ? 'photo' : 'video'
    const shots = list('shot').filter((s) => s.data.for === kind || s.data.for === 'both')
    const moments = [...new Set([...MOMENTS, ...shots.map((s) => s.data.moment)])]
    exportCsv = () => downloadFile(`shot-list-${kind}.csv`, csv([['Moment', 'Shot', 'Must-have', 'People', 'Notes'], ...shots.map((s) => [s.data.moment, s.data.title, s.data.must ? 'yes' : '', s.data.people, s.data.notes])]), 'text/csv')
    body = (
      <>
        <p className="doc-sub">{t('★ = must-have')}</p>
        {moments.map((m) => {
          const rows = shots.filter((s) => s.data.moment === m)
          if (!rows.length) return null
          return (
            <div key={m}>
              <h2 className="doc-h2">{t(m)}</h2>
              <table className="doc-table">
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id}>
                      <td style={{ width: 28 }}>☐</td>
                      <td>
                        {s.data.must && <b>★ </b>}
                        {t(s.data.title)}
                        {s.data.notes && <div className="muted">{s.data.notes}</div>}
                      </td>
                      <td>{s.data.people}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </>
    )
  } else if (doc === 'decisions') {
    const rows = list('decision').sort((a, b) => b.data.date.localeCompare(a.data.date))
    exportCsv = () => downloadFile('decisions.csv', csv([['Date', 'Topic', 'Decision', 'Why', 'Also considered', 'Decided by'], ...rows.map((r) => [r.data.date, r.data.title, r.data.decision, r.data.why, r.data.options, r.data.by])]), 'text/csv')
    body = (
      <table className="doc-table">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ width: 110 }}>{fmtDate(r.data.date, lang)}</td>
              <td>
                <b>{r.data.title}</b>: {r.data.decision}
                {r.data.why && <div className="muted">{r.data.why}</div>}
              </td>
              <td>{r.data.by}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  return { body, exportCsv }
}
