import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { BudgetItem, Row } from '../lib/types'
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
            <Field label={t('Paid so far (EUR)')}>
              <Text type="number" value={e.paid || ''} onChange={(v) => set({ paid: num(v) })} />
            </Field>
            <Field label={t('Next payment due')}>
              <Text type="date" value={e.dueDate} onChange={(v) => set({ dueDate: v || undefined })} />
            </Field>
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
