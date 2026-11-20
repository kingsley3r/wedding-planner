import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { ProgramItem, ProgramKind, Row } from '../lib/types'
import { num } from '../lib/util'
import { Field, PageHead, Select, Sheet, Text } from '../components/ui'

export const KIND_LABEL: Record<ProgramKind, string> = {
  entrance: 'Entrance',
  song: 'Song',
  prayer: 'Prayer',
  reading: 'Bible reading',
  sermon: 'Sermon',
  vows: 'Vows',
  blessing: 'Blessing',
  music: 'Music',
  other: 'Other'
}

/** A typical order of service for a Romanian Pentecostal wedding, in Romanian and German. */
export const SUGGESTED: Omit<ProgramItem, 'order'>[] = [
  { kind: 'music', titleRo: 'Muzică de întâmpinare', titleDe: 'Musik zum Ankommen', minutes: 10 },
  { kind: 'entrance', titleRo: 'Intrarea mirilor', titleDe: 'Einzug des Brautpaares', minutes: 5 },
  { kind: 'prayer', titleRo: 'Rugăciune de deschidere', titleDe: 'Eröffnungsgebet', minutes: 5 },
  { kind: 'song', titleRo: 'Cântare comună', titleDe: 'Gemeinsames Lied', minutes: 5 },
  { kind: 'reading', titleRo: 'Citire din Biblie', titleDe: 'Bibellesung', detail: 'Geneza 2:18–24', minutes: 5 },
  { kind: 'song', titleRo: 'Cântare (cor / grup)', titleDe: 'Lied (Chor / Gruppe)', minutes: 5 },
  { kind: 'sermon', titleRo: 'Predică', titleDe: 'Predigt', detail: 'Efeseni 5:22–33', minutes: 25 },
  { kind: 'vows', titleRo: 'Legământul căsătoriei', titleDe: 'Eheversprechen', minutes: 10 },
  { kind: 'blessing', titleRo: 'Rugăciune de binecuvântare a familiei', titleDe: 'Segensgebet für das Paar', minutes: 10 },
  { kind: 'song', titleRo: 'Cântare de încheiere', titleDe: 'Schlusslied', minutes: 5 },
  { kind: 'other', titleRo: 'Felicitări', titleDe: 'Gratulation', minutes: 20 }
]

const blank = (order: number): ProgramItem => ({ order, kind: 'song', titleRo: '', titleDe: '' })

export function addMinutes(hhmm: string, mins: number) {
  const [h, m] = hhmm.split(':').map(Number)
  const total = (h * 60 + m + mins + 24 * 60) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function ceremonyStart(venues: Row<'venue'>[], schedule: Row<'schedule'>[]) {
  return (
    venues.find((v) => /ceremony|cununi|trauung/i.test(v.data.role))?.data.startTime ||
    schedule.find((s) => /ceremony|cununi|trauung/i.test(s.data.title))?.data.time ||
    '14:00'
  )
}

export default function Program() {
  const { t } = useI18n()
  const { list, add, update, remove } = useStore()
  const items = list('program').sort((a, b) => a.data.order - b.data.order)
  const start = ceremonyStart(list('venue'), list('schedule'))
  const place = list('venue').find((v) => /ceremony|cununi|trauung/i.test(v.data.role))?.data.name
  const [editing, setEditing] = useState<{ row?: Row<'program'>; data: ProgramItem } | null>(null)
  const total = items.reduce((a, i) => a + (i.data.minutes || 0), 0)

  const move = async (i: number, dir: -1 | 1) => {
    const a = items[i]
    const b = items[i + dir]
    if (!a || !b) return
    await update(a, { order: b.data.order })
    await update(b, { order: a.data.order })
  }

  const useSuggested = async () => {
    let o = (items[items.length - 1]?.data.order ?? 0) + 1
    for (const s of SUGGESTED) await add('program', { ...s, order: o++ })
  }

  const save = async () => {
    if (!editing || !(editing.data.titleRo.trim() || editing.data.titleDe.trim())) return
    if (editing.row) await update(editing.row, editing.data)
    else await add('program', editing.data)
    setEditing(null)
  }
  const e = editing?.data
  const set = (p: Partial<ProgramItem>) => editing && setEditing({ ...editing, data: { ...editing.data, ...p } })

  let clock = start
  return (
    <>
      <PageHead eyebrow={[place, start, t('about {n} min', { n: total })].filter(Boolean).join(' · ')} title={t('Church program')}>
        <Link className="btn" to="/print/program">
          {t('Print')}
        </Link>
        <button className="btn primary" onClick={() => setEditing({ data: blank((items[items.length - 1]?.data.order ?? 0) + 1) })}>
          {t('Add part')}
        </button>
      </PageHead>

      {items.length === 0 ? (
        <div className="card">
          <p className="muted">{t('Plan the order of service: songs, readings, sermon, vows and blessing, in Romanian and German.')}</p>
          <button className="btn primary" style={{ marginTop: 14 }} onClick={useSuggested}>
            {t('Start with a suggested order')}
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="list">
            {items.map((i, idx) => {
              const at = clock
              clock = addMinutes(clock, i.data.minutes || 0)
              return (
                <div key={i.id} className="item program-item">
                  <div className="program-time">{at}</div>
                  <div className="grow clickable" style={{ cursor: 'pointer' }} onClick={() => setEditing({ row: i, data: { ...i.data } })}>
                    <div className="eyebrow" style={{ fontSize: 10 }}>
                      {t(KIND_LABEL[i.data.kind])}
                      {i.data.minutes ? ` · ${i.data.minutes} min` : ''}
                    </div>
                    <div className="title">{i.data.titleRo}</div>
                    <div className="meta" style={{ fontStyle: 'italic' }}>
                      {i.data.titleDe}
                    </div>
                    {(i.data.detail || i.data.who) && <div className="meta">{[i.data.detail, i.data.who].filter(Boolean).join(' · ')}</div>}
                  </div>
                  <div className="reorder">
                    <button className="btn ghost small" aria-label={t('Move up')} disabled={idx === 0} onClick={() => move(idx, -1)}>
                      ↑
                    </button>
                    <button className="btn ghost small" aria-label={t('Move down')} disabled={idx === items.length - 1} onClick={() => move(idx, 1)}>
                      ↓
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>
            {t('Ends around {time}.', { time: clock })} {t('The start time comes from the ceremony venue.')}
          </p>
        </div>
      )}

      {editing && e && (
        <Sheet
          title={editing.row ? e.titleRo || e.titleDe : t('Add part')}
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
            <Field label={t('Type')}>
              <Select value={e.kind} onChange={(v) => set({ kind: v })} options={(Object.keys(KIND_LABEL) as ProgramKind[]).map((k) => ({ value: k, label: t(KIND_LABEL[k]) }))} />
            </Field>
            <Field label={t('Minutes')}>
              <Text type="number" value={e.minutes || ''} onChange={(v) => set({ minutes: Math.round(num(v)) || undefined })} />
            </Field>
            <Field label={t('Title in Romanian')} full>
              <Text value={e.titleRo} onChange={(v) => set({ titleRo: v })} placeholder="Cântare comună" />
            </Field>
            <Field label={t('Title in German')} full>
              <Text value={e.titleDe} onChange={(v) => set({ titleDe: v })} placeholder="Gemeinsames Lied" />
            </Field>
            <Field label={t('Song, verse or detail')} full>
              <Text value={e.detail} onChange={(v) => set({ detail: v })} placeholder={t('e.g. Psalm 128 or song title')} />
            </Field>
            <Field label={t('Who')} full>
              <Text value={e.who} onChange={(v) => set({ who: v })} placeholder={t('e.g. Pastor, choir, reader')} />
            </Field>
          </div>
        </Sheet>
      )}
    </>
  )
}
