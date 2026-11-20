import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { BudgetItem, Installment, Row } from '../lib/types'
import { allPayments, downloadFile, markPaidPatch, newInstallment, paymentsIcs, withInstallments, addDaysIso, type Payment } from '../lib/payments'
import { fmtDate, money, num, todayIso } from '../lib/util'
import { Bar, Empty, Fab, Field, PageHead, Select, Sheet, Text } from '../components/ui'

const CATEGORIES = [
  'Venue',
  'Catering',
  'Photo and video',
  'Music',
  'Flowers and decor',
  'Attire',
  'Rings',
  'Invitations and print',
  'Transport',
  'Cake',
  'Accommodation',
  'Other'
]
const blank = (): BudgetItem => ({ category: 'Other', label: '', planned: 0, actual: 0, paid: 0 })

export default function Budget() {
  const { t, lang } = useI18n()
  const { list, add, update, remove, settings } = useStore()
  const items = list('budget')
  const vendors = list('vendor')
  const total = settings!.data.budgetTotal
  const [editing, setEditing] = useState<{ row?: Row<'budget'>; data: BudgetItem } | null>(null)

  const planned = items.reduce((a, b) => a + (b.data.planned || 0), 0)
  const actual = items.reduce((a, b) => a + (b.data.actual || 0), 0)
  const paid = items.reduce((a, b) => a + (b.data.paid || 0), 0)
  // What we expect to spend: the actual cost where known, otherwise the plan.
  const expected = items.reduce((a, b) => a + (b.data.actual || b.data.planned || 0), 0)
  const left = total - expected
  const today = todayIso()

  const byCat = CATEGORIES.concat(items.map((i) => i.data.category).filter((c) => !CATEGORIES.includes(c)))
    .map((c) => ({ c, rows: items.filter((i) => i.data.category === c) }))
    .filter((g) => g.rows.length)

  const save = async () => {
    if (!editing) return
    const data = { ...editing.data, label: editing.data.label.trim() || t(editing.data.category) }
    if (editing.row) await update(editing.row, data)
    else await add('budget', data)
    setEditing(null)
  }
  const e = editing?.data
  const set = (p: Partial<BudgetItem>) => editing && setEditing({ ...editing, data: { ...editing.data, ...p } })
  const setInstallments = (list: Installment[]) => editing && setEditing({ ...editing, data: withInstallments(editing.data, list) })
  const setInst = (id: string, p: Partial<Installment>) => e && setInstallments((e.installments ?? []).map((i) => (i.id === id ? { ...i, ...p } : i)))

  // Payments: overdue, and everything coming up in the next 90 days.
  const reminderDays = settings!.data.reminderDays ?? 7
  const payments = allPayments(items)
  const openPayments = payments.filter((p) => !p.paid && p.dueDate <= addDaysIso(today, 90))
  const toCalendar = (list: Payment[]) =>
    downloadFile('wedding-payments.ics', paymentsIcs(list.map((p) => ({ ...p, item: p.item === p.row.data.category ? t(p.item) : p.item, label: p.label ? t(p.label) : '' })), reminderDays, (n) => money(n, lang), t('Payment')), 'text/calendar')

  return (
    <>
      <PageHead eyebrow={t('In euros')} title={t('Budget')}>
        <button className="btn primary hide-mobile" onClick={() => setEditing({ data: blank() })}>
          {t('Add expense')}
        </button>
      </PageHead>

      <div className="stats">
        <div className="card stat">
          <h2 className="section">{t('Total budget')}</h2>
          <div className="big">{money(total, lang, true)}</div>
          <div className="sub">{t('planned in items')}: {money(planned, lang, true)}</div>
        </div>
        <div className="card stat">
          <h2 className="section">{t('Expected cost')}</h2>
          <div className="big">{money(expected, lang, true)}</div>
          <Bar value={expected / (total || 1)} tone={expected > total ? 'rose' : 'gold'} />
        </div>
        <div className="card stat">
          <h2 className="section">{t('Paid so far')}</h2>
          <div className="big">{money(paid, lang, true)}</div>
          <div className="sub">{t('still to pay')}: {money(Math.max(0, (actual || 0) - paid), lang, true)}</div>
        </div>
        <div className="card stat">
          <h2 className="section">{left >= 0 ? t('Left to plan') : t('Over budget')}</h2>
          <div className="big" style={{ color: left < 0 ? 'var(--rose-ink)' : undefined }}>
            {money(Math.abs(left), lang, true)}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('Payments due')}</h2>
          {payments.some((p) => !p.paid) && (
            <button className="btn small" onClick={() => toCalendar(payments.filter((p) => !p.paid))}>
              {t('Add all to calendar')}
            </button>
          )}
        </div>
        {openPayments.length === 0 ? (
          <p className="muted small">{t('No payments due in the next 90 days.')}</p>
        ) : (
          <div className="list">
            {openPayments.map((p) => {
              const overdue = p.dueDate < today
              const soon = !overdue && p.dueDate <= addDaysIso(today, reminderDays)
              return (
                <div key={p.key} className="item">
                  <div className="grow clickable" style={{ cursor: 'pointer' }} onClick={() => setEditing({ row: p.row, data: { ...p.row.data } })}>
                    <div className="title">
                      {p.item === p.row.data.category ? t(p.item) : p.item}
                      {p.label ? ` · ${t(p.label)}` : ''}
                    </div>
                    <div className="meta">
                      <span className="money">{money(p.amount, lang)}</span> · {fmtDate(p.dueDate, lang)}
                    </div>
                  </div>
                  <span className={'pill ' + (overdue ? 'bad' : soon ? 'warn' : '')}>{overdue ? t('Overdue') : soon ? t('Due soon') : t('Upcoming')}</span>
                  <button className="btn small" onClick={() => update(p.row, markPaidPatch(p))}>
                    {t('Mark paid')}
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <p className="small muted" style={{ marginTop: 12 }}>
          {t('Calendar alerts arrive {n} days before and on the day itself.', { n: reminderDays })}{' '}
          {t('Change this in Settings.')}
        </p>
      </div>

      {byCat.length === 0 && (
        <div className="card">
          <Empty title={t('No expenses yet')} />
        </div>
      )}
      {byCat.map(({ c, rows }) => {
        const cPlanned = rows.reduce((a, b) => a + (b.data.planned || 0), 0)
        const cActual = rows.reduce((a, b) => a + (b.data.actual || 0), 0)
        return (
          <div className="card" key={c}>
            <div className="card-head">
              <h2 className="section">{t(c)}</h2>
              <span className="small muted money">
                {money(cActual, lang)} / {money(cPlanned, lang)}
              </span>
            </div>
            <div className="list">
              {rows.map((r) => {
                const owed = (r.data.actual || 0) - (r.data.paid || 0)
                const status =
                  r.data.actual && owed <= 0
                    ? { tone: 'ok', label: t('Paid') }
                    : r.data.dueDate && r.data.dueDate < today && owed > 0
                      ? { tone: 'bad', label: t('Overdue') }
                      : r.data.paid
                        ? { tone: 'warn', label: t('Deposit paid') }
                        : r.data.actual
                          ? { tone: 'warn', label: t('Unpaid') }
                          : { tone: '', label: t('Estimate') }
                return (
                  <div key={r.id} className="item clickable" onClick={() => setEditing({ row: r, data: { ...r.data } })}>
                    <div className="grow">
                      <div className="title">{r.data.label === r.data.category ? t(r.data.label) : r.data.label}</div>
                      <div className="meta">
                        {[
                          `${t('Planned')} ${money(r.data.planned, lang)}`,
                          r.data.actual ? `${t('Actual')} ${money(r.data.actual, lang)}` : '',
                          r.data.dueDate ? `${t('Due')} ${fmtDate(r.data.dueDate, lang)}` : ''
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <span className={'pill ' + status.tone}>{status.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <Fab label={t('Add expense')} onClick={() => setEditing({ data: blank() })} />

      {editing && e && (
        <Sheet
          title={editing.row ? t('Edit expense') : t('Add expense')}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={
            editing.row
              ? async () => {
                  await remove(editing.row!.id)
                  setEditing(null)
                }
              : undefined
          }
        >
          <div className="form">
            <Field label={t('Category')}>
              <Select value={e.category} onChange={(v) => set({ category: v })} options={[...new Set([...CATEGORIES, e.category])].map((c) => ({ value: c, label: t(c) }))} />
            </Field>
            <Field label={t('Description')}>
              <Text value={e.label === e.category ? t(e.label) : e.label} onChange={(v) => set({ label: v })} placeholder={t(e.category)} />
            </Field>
            <Field label={t('Planned (EUR)')}>
              <Text type="number" value={e.planned || ''} onChange={(v) => set({ planned: num(v) })} />
            </Field>
            <Field label={t('Actual cost (EUR)')}>
              <Text type="number" value={e.actual || ''} onChange={(v) => set({ actual: num(v) })} />
            </Field>
            {!e.installments?.length && (
              <>
                <Field label={t('Paid so far (EUR)')}>
                  <Text type="number" value={e.paid || ''} onChange={(v) => set({ paid: num(v) })} />
                </Field>
                <Field label={t('Next payment due')}>
                  <Text type="date" value={e.dueDate} onChange={(v) => set({ dueDate: v || undefined })} />
                </Field>
              </>
            )}
            <div className="field full">
              <label>{t('Payment schedule')}</label>
              {(e.installments ?? []).map((i) => (
                <div key={i.id} className="inst-row">
                  <button
                    type="button"
                    className={'check' + (i.paid ? ' on' : '')}
                    aria-label={t('Paid')}
                    onClick={() => setInst(i.id, { paid: !i.paid })}
                  />
                  <input className="input" value={t(i.label)} placeholder={t('e.g. Deposit')} onChange={(ev) => setInst(i.id, { label: ev.target.value })} />
                  <input className="input" type="number" inputMode="decimal" placeholder="€" value={i.amount || ''} onChange={(ev) => setInst(i.id, { amount: num(ev.target.value) })} />
                  <input className="input" type="date" value={i.dueDate ?? ''} onChange={(ev) => setInst(i.id, { dueDate: ev.target.value || undefined })} />
                  <button type="button" className="btn ghost small" aria-label={t('Remove')} onClick={() => setInstallments((e.installments ?? []).filter((x) => x.id !== i.id))}>
                    ✕
                  </button>
                </div>
              ))}
              <div className="row-gap">
                <button type="button" className="btn small" onClick={() => setInstallments([...(e.installments ?? []), newInstallment(e.installments?.length ? 'Balance' : 'Deposit')])}>
                  + {t('Add payment')}
                </button>
                {!!e.installments?.length && (
                  <span className="small muted">
                    {t('Paid')}: {money(e.paid, lang)} / {money(e.installments.reduce((a, i) => a + (i.amount || 0), 0), lang)}
                  </span>
                )}
              </div>
            </div>
            <Field label={t('Who pays')}>
              <Text value={e.payer} onChange={(v) => set({ payer: v })} placeholder={t('e.g. us, parents')} />
            </Field>
            <Field label={t('Vendor')}>
              <Select
                value={e.vendorId ?? ''}
                onChange={(v) => set({ vendorId: v || undefined })}
                options={[{ value: '', label: '—' }, ...vendors.map((v) => ({ value: v.id, label: v.data.name }))]}
              />
            </Field>
            <Field label={t('Notes')} full>
              <Text value={e.notes} onChange={(v) => set({ notes: v })} />
            </Field>
          </div>
        </Sheet>
      )}
    </>
  )
}
