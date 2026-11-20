import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { Row, Vendor, VendorStatus } from '../lib/types'
import { money, num } from '../lib/util'
import { Empty, Fab, Field, PageHead, Select, Sheet, Text } from '../components/ui'

const STATUSES: VendorStatus[] = ['researching', 'contacted', 'quoted', 'booked', 'declined']
const STATUS_LABEL: Record<VendorStatus, string> = {
  researching: 'Researching',
  contacted: 'Contacted',
  quoted: 'Quote received',
  booked: 'Booked',
  declined: 'Not chosen'
}
const STATUS_TONE: Record<VendorStatus, string> = { researching: '', contacted: 'warn', quoted: 'warn', booked: 'ok', declined: 'bad' }
const CATEGORIES = ['Photographer', 'Videographer', 'Caterer', 'Music', 'Florist', 'Decor', 'Cake', 'Dress', 'Suit', 'Hair and makeup', 'Transport', 'Invitations', 'Other']
const blank = (): Vendor => ({ name: '', category: 'Photographer', status: 'researching' })

export default function Vendors() {
  const { t, lang } = useI18n()
  const { list, add, update, remove } = useStore()
  const vendors = list('vendor')
  const budget = list('budget')
  const [editing, setEditing] = useState<{ row?: Row<'vendor'>; data: Vendor } | null>(null)

  const save = async () => {
    if (!editing || !editing.data.name.trim()) return
    if (editing.row) await update(editing.row, editing.data)
    else await add('vendor', editing.data)
    setEditing(null)
  }
  const e = editing?.data
  const set = (p: Partial<Vendor>) => editing && setEditing({ ...editing, data: { ...editing.data, ...p } })
  const sorted = vendors.slice().sort((a, b) => STATUSES.indexOf(b.data.status) - STATUSES.indexOf(a.data.status) || a.data.category.localeCompare(b.data.category))

  return (
    <>
      <PageHead eyebrow={t('{n} booked', { n: vendors.filter((v) => v.data.status === 'booked').length })} title={t('Vendors')}>
        <button className="btn primary hide-mobile" onClick={() => setEditing({ data: blank() })}>
          {t('Add vendor')}
        </button>
      </PageHead>
      <div className="card">
        {sorted.length === 0 ? (
          <Empty title={t('No vendors yet')} />
        ) : (
          <div className="list">
            {sorted.map((v) => {
              const paid = budget.filter((b) => b.data.vendorId === v.id).reduce((a, b) => a + (b.data.paid || 0), 0)
              return (
                <div key={v.id} className="item clickable" onClick={() => setEditing({ row: v, data: { ...v.data } })}>
                  <div className="grow">
                    <div className="title">{v.data.name}</div>
                    <div className="meta">
                      {[t(v.data.category), v.data.quote ? money(v.data.quote, lang) : '', paid ? `${t('Paid')} ${money(paid, lang)}` : '', v.data.contact]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                  {v.data.phone && (
                    <a className="btn small ghost" href={`tel:${v.data.phone}`} onClick={(ev) => ev.stopPropagation()}>
                      {t('Call')}
                    </a>
                  )}
                  <span className={'pill ' + STATUS_TONE[v.data.status]}>{t(STATUS_LABEL[v.data.status])}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <p className="small muted" style={{ marginTop: 12 }}>
        {t('Tip: link an expense to a vendor in Budget to track what you have paid them.')}
      </p>

      <Fab label={t('Add vendor')} onClick={() => setEditing({ data: blank() })} />

      {editing && e && (
        <Sheet
          title={editing.row ? e.name || t('Vendor') : t('Add vendor')}
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
            <Field label={t('Name')} full>
              <Text value={e.name} onChange={(v) => set({ name: v })} autoFocus={!editing.row} required />
            </Field>
            <Field label={t('Category')}>
              <Select value={e.category} onChange={(v) => set({ category: v })} options={[...new Set([...CATEGORIES, e.category])].map((c) => ({ value: c, label: t(c) }))} />
            </Field>
            <Field label={t('Status')}>
              <Select value={e.status} onChange={(v) => set({ status: v })} options={STATUSES.map((s) => ({ value: s, label: t(STATUS_LABEL[s]) }))} />
            </Field>
            <Field label={t('Quote (EUR)')}>
              <Text type="number" value={e.quote || ''} onChange={(v) => set({ quote: num(v) || undefined })} />
            </Field>
            <Field label={t('Contact person')}>
              <Text value={e.contact} onChange={(v) => set({ contact: v })} />
            </Field>
            <Field label={t('Phone')}>
              <Text type="tel" value={e.phone} onChange={(v) => set({ phone: v })} />
            </Field>
            <Field label={t('Email')}>
              <Text type="email" value={e.email} onChange={(v) => set({ email: v })} />
            </Field>
            <Field label={t('Website')} full>
              <Text type="url" value={e.website} onChange={(v) => set({ website: v })} />
            </Field>
            <Field label={t('Notes')} full>
              <textarea className="input" value={e.notes ?? ''} onChange={(ev) => set({ notes: ev.target.value })} />
            </Field>
          </div>
        </Sheet>
      )}
    </>
  )
}
