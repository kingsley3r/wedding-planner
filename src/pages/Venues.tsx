import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { Row, Venue } from '../lib/types'
import { num } from '../lib/util'
import { Fab, Field, PageHead, Sheet, Text } from '../components/ui'

const blank = (): Venue => ({ name: '', role: 'Reception' })

export default function Venues() {
  const { t } = useI18n()
  const { list, add, update, remove } = useStore()
  const venues = list('venue')
  const [editing, setEditing] = useState<{ row?: Row<'venue'>; data: Venue } | null>(null)
  const save = async () => {
    if (!editing || !editing.data.name.trim()) return
    if (editing.row) await update(editing.row, editing.data)
    else await add('venue', editing.data)
    setEditing(null)
  }
  const e = editing?.data
  const set = (p: Partial<Venue>) => editing && setEditing({ ...editing, data: { ...editing.data, ...p } })

  return (
    <>
      <PageHead eyebrow={t('Where it happens')} title={t('Venues')}>
        <button className="btn hide-mobile" onClick={() => setEditing({ data: blank() })}>
          {t('Add venue')}
        </button>
      </PageHead>
      <div className="grid2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {venues.map((v) => (
          <div key={v.id} className="card">
            <div className="eyebrow">{t(v.data.role)}</div>
            <h3 className="serif" style={{ fontSize: 30, fontWeight: 400, margin: '6px 0 12px' }}>
              {v.data.name}
            </h3>
            <div className="list">
              {v.data.address && (
                <div className="item">
                  <div className="grow">
                    <div className="meta">{t('Address')}</div>
                    <div>{v.data.address}</div>
                  </div>
                  <a className="btn small" target="_blank" rel="noreferrer" href={`https://maps.apple.com/?q=${encodeURIComponent(v.data.name + ', ' + v.data.address)}`}>
                    {t('Map')}
                  </a>
                </div>
              )}
              {(v.data.startTime || v.data.endTime) && (
                <div className="item">
                  <div className="grow">
                    <div className="meta">{t('Time')}</div>
                    <div>{[v.data.startTime, v.data.endTime].filter(Boolean).join(' – ')}</div>
                  </div>
                </div>
              )}
              {(v.data.contact || v.data.phone) && (
                <div className="item">
                  <div className="grow">
                    <div className="meta">{t('Contact')}</div>
                    <div>{[v.data.contact, v.data.phone].filter(Boolean).join(' · ')}</div>
                  </div>
                  {v.data.phone && (
                    <a className="btn small" href={`tel:${v.data.phone}`}>
                      {t('Call')}
                    </a>
                  )}
                </div>
              )}
              {v.data.capacity ? (
                <div className="item">
                  <div className="grow">
                    <div className="meta">{t('Capacity')}</div>
                    <div>{v.data.capacity}</div>
                  </div>
                </div>
              ) : null}
              {v.data.notes && (
                <div className="item">
                  <div className="grow" style={{ whiteSpace: 'pre-wrap' }}>
                    {v.data.notes}
                  </div>
                </div>
              )}
            </div>
            <button className="btn small" style={{ marginTop: 14 }} onClick={() => setEditing({ row: v, data: { ...v.data } })}>
              {t('Edit')}
            </button>
          </div>
        ))}
      </div>

      <Fab label={t('Add venue')} onClick={() => setEditing({ data: blank() })} />

      {editing && e && (
        <Sheet
          title={editing.row ? e.name : t('Add venue')}
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
              <Text value={e.name} onChange={(v) => set({ name: v })} required />
            </Field>
            <Field label={t('Used for')}>
              <Text value={e.role} onChange={(v) => set({ role: v })} placeholder={t('e.g. Ceremony')} />
            </Field>
            <Field label={t('Capacity')}>
              <Text type="number" value={e.capacity || ''} onChange={(v) => set({ capacity: num(v) || undefined })} />
            </Field>
            <Field label={t('Address')} full>
              <Text value={e.address} onChange={(v) => set({ address: v })} />
            </Field>
            <Field label={t('Starts')}>
              <Text type="time" value={e.startTime} onChange={(v) => set({ startTime: v })} />
            </Field>
            <Field label={t('Ends')}>
              <Text type="time" value={e.endTime} onChange={(v) => set({ endTime: v })} />
            </Field>
            <Field label={t('Contact person')}>
              <Text value={e.contact} onChange={(v) => set({ contact: v })} />
            </Field>
            <Field label={t('Phone')}>
              <Text type="tel" value={e.phone} onChange={(v) => set({ phone: v })} />
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
