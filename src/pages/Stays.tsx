import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { Row, Stay } from '../lib/types'
import { fmtDate, money, num } from '../lib/util'
import { Empty, Fab, Field, PageHead, Sheet, Text } from '../components/ui'
import { ContactActions } from './Contacts'

const blank = (): Stay => ({ hotel: '', checkIn: '2027-08-13', checkOut: '2027-08-15' })

function nights(a?: string, b?: string) {
  if (!a || !b) return 0
  return Math.max(0, Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000))
}

export default function Stays() {
  const { t, lang } = useI18n()
  const { list, add, update, remove } = useStore()
  const stays = list('stay').sort((a, b) => a.data.hotel.localeCompare(b.data.hotel))
  const guests = list('guest').filter((g) => g.data.rsvp !== 'declined').sort((a, b) => a.data.name.localeCompare(b.data.name))
  const [editing, setEditing] = useState<{ row?: Row<'stay'>; data: Stay } | null>(null)
  const [assigning, setAssigning] = useState<Row<'stay'> | null>(null)
  const [q, setQ] = useState('')

  const housed = guests.filter((g) => g.data.stayId && stays.some((s) => s.id === g.data.stayId))
  const save = async () => {
    if (!editing || !editing.data.hotel.trim()) return
    if (editing.row) await update(editing.row, editing.data)
    else await add('stay', editing.data)
    setEditing(null)
  }
  const e = editing?.data
  const set = (p: Partial<Stay>) => editing && setEditing({ ...editing, data: { ...editing.data, ...p } })

  return (
    <>
      <PageHead eyebrow={t('{n} guests with a room', { n: housed.length })} title={t('Accommodation')}>
        <button className="btn primary hide-mobile" onClick={() => setEditing({ data: blank() })}>
          {t('Add hotel')}
        </button>
      </PageHead>

      {stays.length === 0 && (
        <div className="card">
          <Empty title={t('No hotels yet')}>
            <p className="small">{t('Add the hotels or guesthouses where family from Romania will stay, then add guests to each one.')}</p>
          </Empty>
        </div>
      )}

      {stays.map((s) => {
        const here = guests.filter((g) => g.data.stayId === s.id)
        const n = nights(s.data.checkIn, s.data.checkOut)
        return (
          <div className="card" key={s.id}>
            <div className="card-head">
              <div>
                <h3 className="serif" style={{ fontSize: 28, fontWeight: 400 }}>
                  {s.data.hotel}
                </h3>
                <div className="small muted">
                  {[
                    s.data.checkIn && s.data.checkOut ? `${fmtDate(s.data.checkIn, lang, { day: 'numeric', month: 'short' })} – ${fmtDate(s.data.checkOut, lang, { day: 'numeric', month: 'short' })} · ${t('{n} nights', { n })}` : '',
                    s.data.rooms ? t('{n} rooms', { n: s.data.rooms }) : '',
                    s.data.pricePerNight ? `${money(s.data.pricePerNight, lang)} / ${t('night')}` : '',
                    s.data.address
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <button className="btn small" onClick={() => setEditing({ row: s, data: { ...s.data } })}>
                {t('Edit')}
              </button>
            </div>
            <ContactActions phone={s.data.phone} />
            <div className="list" style={{ marginTop: 10 }}>
              {here.map((g) => (
                <div key={g.id} className="item" style={{ minHeight: 44, padding: '8px 0' }}>
                  <div className="grow">
                    <div className="title">{g.data.name}</div>
                    <div className="meta">{[g.data.household, t(g.data.group)].filter(Boolean).join(' · ')}</div>
                  </div>
                  <button className="btn small ghost" onClick={() => update(g, { stayId: undefined })}>
                    {t('Remove')}
                  </button>
                </div>
              ))}
            </div>
            <button className="btn small" style={{ marginTop: 10 }} onClick={() => setAssigning(s)}>
              + {t('Add guests')}
            </button>
            {s.data.rooms ? (
              <p className="small muted" style={{ marginTop: 8 }}>
                {t('{guests} guests in {rooms} rooms', { guests: here.length, rooms: s.data.rooms })}
                {s.data.pricePerNight ? ` · ${t('about')} ${money(s.data.rooms * s.data.pricePerNight * n, lang)}` : ''}
              </p>
            ) : null}
          </div>
        )
      })}

      <Fab label={t('Add hotel')} onClick={() => setEditing({ data: blank() })} />

      {assigning && (
        <Sheet title={assigning.data.hotel} onClose={() => setAssigning(null)}>
          <input className="input" placeholder={t('Search guests')} value={q} onChange={(ev) => setQ(ev.target.value)} style={{ marginBottom: 12 }} />
          <div className="list">
            {guests
              .filter((g) => !q.trim() || g.data.name.toLowerCase().includes(q.trim().toLowerCase()))
              .map((g) => {
                const on = g.data.stayId === assigning.id
                const elsewhere = g.data.stayId && !on ? stays.find((s) => s.id === g.data.stayId)?.data.hotel : undefined
                return (
                  <div key={g.id} className="item clickable" onClick={() => update(g, { stayId: on ? undefined : assigning.id })}>
                    <span className={'check' + (on ? ' on' : '')} />
                    <div className="grow">
                      <div className="title">{g.data.name}</div>
                      {elsewhere && <div className="meta">{elsewhere}</div>}
                    </div>
                  </div>
                )
              })}
          </div>
        </Sheet>
      )}

      {editing && e && (
        <Sheet
          title={editing.row ? e.hotel : t('Add hotel')}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={
            editing.row
              ? async () => {
                  for (const g of guests.filter((g) => g.data.stayId === editing.row!.id)) await update(g, { stayId: undefined })
                  await remove(editing.row!.id)
                  setEditing(null)
                }
              : undefined
          }
        >
          <div className="form">
            <Field label={t('Hotel or guesthouse')} full>
              <Text value={e.hotel} onChange={(v) => set({ hotel: v })} autoFocus={!editing.row} required />
            </Field>
            <Field label={t('Check-in')}>
              <Text type="date" value={e.checkIn} onChange={(v) => set({ checkIn: v || undefined })} />
            </Field>
            <Field label={t('Check-out')}>
              <Text type="date" value={e.checkOut} onChange={(v) => set({ checkOut: v || undefined })} />
            </Field>
            <Field label={t('Rooms booked')}>
              <Text type="number" value={e.rooms || ''} onChange={(v) => set({ rooms: Math.round(num(v)) || undefined })} />
            </Field>
            <Field label={t('Price per room per night (EUR)')}>
              <Text type="number" value={e.pricePerNight || ''} onChange={(v) => set({ pricePerNight: num(v) || undefined })} />
            </Field>
            <Field label={t('Address')} full>
              <Text value={e.address} onChange={(v) => set({ address: v })} />
            </Field>
            <Field label={t('Phone')}>
              <Text type="tel" value={e.phone} onChange={(v) => set({ phone: v })} />
            </Field>
            <Field label={t('Website')}>
              <Text type="url" value={e.website} onChange={(v) => set({ website: v })} />
            </Field>
            <Field label={t('Notes')} full>
              <Text value={e.notes} onChange={(v) => set({ notes: v })} placeholder={t('e.g. group code, breakfast included')} />
            </Field>
          </div>
        </Sheet>
      )}
    </>
  )
}
