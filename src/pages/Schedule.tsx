import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { Row, ScheduleItem } from '../lib/types'
import { fmtDate, todayIso } from '../lib/util'
import { Empty, Fab, Field, PageHead, Select, Sheet, Text } from '../components/ui'

const blank = (): ScheduleItem => ({ time: '12:00', title: '' })

export default function Schedule() {
  const { t, lang } = useI18n()
  const { list, add, update, remove, settings } = useStore()
  const items = list('schedule').sort((a, b) => a.data.time.localeCompare(b.data.time))
  const venues = list('venue')
  const [dayOf, setDayOf] = useState(false)
  const [editing, setEditing] = useState<{ row?: Row<'schedule'>; data: ScheduleItem } | null>(null)
  const date = settings!.data.date

  // On the wedding day, highlight the item that is happening now.
  const now = new Date()
  const hhmm = now.toTimeString().slice(0, 5)
  const currentId = todayIso() === date ? [...items].reverse().find((i) => i.data.time <= hhmm)?.id : undefined

  const save = async () => {
    if (!editing || !editing.data.title.trim()) return
    if (editing.row) await update(editing.row, editing.data)
    else await add('schedule', editing.data)
    setEditing(null)
  }
  const e = editing?.data
  const set = (p: Partial<ScheduleItem>) => editing && setEditing({ ...editing, data: { ...editing.data, ...p } })

  return (
    <>
      <PageHead eyebrow={fmtDate(date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} title={t('Day-of schedule')}>
        <button className={'btn' + (dayOf ? ' primary' : '')} onClick={() => setDayOf(!dayOf)}>
          {t('Day-of mode')}
        </button>
        <button className="btn hide-mobile" onClick={() => window.print()}>
          {t('Print')}
        </button>
        <button className="btn primary hide-mobile" onClick={() => setEditing({ data: blank() })}>
          {t('Add item')}
        </button>
      </PageHead>
      <div className="card">
        {items.length === 0 ? (
          <Empty title={t('Nothing planned yet')} />
        ) : (
          <div className={'timeline' + (dayOf ? ' dayof' : '')}>
            {items.map((i) => (
              <div key={i.id} className={'tl-item' + (i.id === currentId ? ' now' : '')} onClick={() => setEditing({ row: i, data: { ...i.data } })}>
                <div className="tl-time">{i.data.time}</div>
                <div className="tl-dot" />
                <div>
                  <div className="title">{t(i.data.title)}</div>
                  <div className="meta muted small">{[i.data.place, i.data.who].filter(Boolean).join(' · ')}</div>
                  {i.data.notes && !dayOf && <div className="small" style={{ marginTop: 4 }}>{i.data.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Fab label={t('Add item')} onClick={() => setEditing({ data: blank() })} />
      {editing && e && (
        <Sheet
          title={editing.row ? t('Edit item') : t('Add item')}
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
            <Field label={t('Time')}>
              <Text type="time" value={e.time} onChange={(v) => set({ time: v })} required />
            </Field>
            <Field label={t('Place')}>
              <Select
                value={e.place ?? ''}
                onChange={(v) => set({ place: v || undefined })}
                options={[{ value: '', label: '—' }, ...[...new Set([...venues.map((v) => v.data.name), ...(e.place ? [e.place] : [])])].map((n) => ({ value: n, label: n }))]}
              />
            </Field>
            <Field label={t('What')} full>
              <Text value={editing.row ? t(e.title) : e.title} onChange={(v) => set({ title: v })} autoFocus={!editing.row} required />
            </Field>
            <Field label={t('Who is responsible')} full>
              <Text value={e.who} onChange={(v) => set({ who: v })} placeholder={t('Name and phone')} />
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
