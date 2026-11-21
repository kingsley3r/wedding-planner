import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { Row, Song, SongMoment } from '../lib/types'
import { Fab, Field, PageHead, Sheet, Text } from '../components/ui'

export const MOMENTS: { id: SongMoment; label: string; place: string }[] = [
  { id: 'prelude', label: 'While guests arrive', place: 'Church' },
  { id: 'church-in', label: 'Entrance', place: 'Church' },
  { id: 'service', label: 'During the service', place: 'Church' },
  { id: 'church-out', label: 'Leaving the church', place: 'Church' },
  { id: 'venue-in', label: 'Entrance at the venue', place: 'Venue' },
  { id: 'venue', label: 'Other moments at the venue', place: 'Venue' }
]

export default function Music() {
  const { t } = useI18n()
  const { list, add, update, remove, settings, saveSettings } = useStore()
  const s = settings!.data
  const songs = list('song').sort((a, b) => a.data.order - b.data.order)
  const [editing, setEditing] = useState<{ row?: Row<'song'>; data: Song } | null>(null)
  const e = editing?.data
  const set = (p: Partial<Song>) => setEditing((c) => (c ? { ...c, data: { ...c.data, ...p } } : c))
  const nextOrder = (songs[songs.length - 1]?.data.order ?? 0) + 1
  const blank = (moment: SongMoment = 'church-in'): Song => ({ title: '', moment, order: nextOrder })
  const save = async () => {
    if (!editing || !editing.data.title.trim()) return
    if (editing.row) await update(editing.row, editing.data)
    else await add('song', editing.data)
    setEditing(null)
  }
  const move = async (rows: Row<'song'>[], i: number, dir: -1 | 1) => {
    const a = rows[i]
    const b = rows[i + dir]
    if (!a || !b) return
    await update(a, { order: b.data.order })
    await update(b, { order: a.data.order })
  }

  return (
    <>
      <PageHead eyebrow={songs.length === 1 ? t('1 song') : t('{n} songs', { n: songs.length })} title={t('Band & songs')}>
        <Link className="btn" to="/print/songs">
          {t('Print for the band')}
        </Link>
      </PageHead>

      <div className="card">
        <div className="form">
          <Field label={t('Band, orchestra or choir')}>
            <Text value={s.bandName} onChange={(v) => saveSettings({ bandName: v || undefined })} placeholder={t('e.g. Church orchestra')} />
          </Field>
          <Field label={t('Contact')}>
            <Text value={s.bandContact} onChange={(v) => saveSettings({ bandContact: v || undefined })} placeholder={t('Name and phone')} />
          </Field>
        </div>
      </div>

      {['Church', 'Venue'].map((place) => (
        <div key={place}>
          <h2 className="section hm-h">{t(place)}</h2>
          {MOMENTS.filter((m) => m.place === place).map((m) => {
            const rows = songs.filter((x) => x.data.moment === m.id)
            return (
              <div className="card" key={m.id}>
                <div className="card-head">
                  <h2 className="section">{t(m.label)}</h2>
                  {rows.length > 0 && <span className="small muted">{rows.length}</span>}
                </div>
                {rows.length > 0 && (
                  <div className="list">
                    {rows.map((x, i) => (
                      <div key={x.id} className="item">
                        <span className="song-no">{i + 1}</span>
                        <div className="grow clickable" onClick={() => setEditing({ row: x, data: { ...x.data } })}>
                          <div className="title">{x.data.title}</div>
                          <div className="meta">{[x.data.artist, x.data.who, x.data.key && `${t('Key')} ${x.data.key}`, x.data.notes].filter(Boolean).join(' · ')}</div>
                        </div>
                        {x.data.link && (
                          <a className="btn small ghost" href={x.data.link} target="_blank" rel="noreferrer" aria-label={t('Listen')}>
                            ▶
                          </a>
                        )}
                        <div className="order-btns">
                          <button aria-label={t('Move up')} disabled={i === 0} onClick={() => move(rows, i, -1)}>
                            ↑
                          </button>
                          <button aria-label={t('Move down')} disabled={i === rows.length - 1} onClick={() => move(rows, i, 1)}>
                            ↓
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button className="btn small ghost" style={{ marginTop: 6 }} onClick={() => setEditing({ data: blank(m.id) })}>
                  + {t('Add song')}
                </button>
              </div>
            )
          })}
        </div>
      ))}

      <Fab label={t('Add song')} onClick={() => setEditing({ data: blank() })} />

      {editing && e && (
        <Sheet
          title={editing.row ? e.title : t('Add song')}
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
            <Field label={t('Song')} full>
              <Text value={e.title} onChange={(v) => set({ title: v })} autoFocus={!editing.row} required />
            </Field>
            <Field label={t('When')} full>
              <div className="chips">
                {MOMENTS.map((m) => (
                  <button type="button" key={m.id} className={'chip' + (e.moment === m.id ? ' on' : '')} onClick={() => set({ moment: m.id })}>
                    {t(m.label)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('Artist or composer')}>
              <Text value={e.artist} onChange={(v) => set({ artist: v || undefined })} />
            </Field>
            <Field label={t('Who plays or sings')}>
              <Text value={e.who} onChange={(v) => set({ who: v || undefined })} placeholder={t('e.g. Choir')} />
            </Field>
            <Field label={t('Key')}>
              <Text value={e.key} onChange={(v) => set({ key: v || undefined })} placeholder="G" />
            </Field>
            <Field label={t('Link (YouTube, Spotify)')}>
              <Text type="url" value={e.link} onChange={(v) => set({ link: v || undefined })} />
            </Field>
            <Field label={t('Notes for the band')} full>
              <textarea className="input" rows={3} value={e.notes ?? ''} onChange={(ev) => set({ notes: ev.target.value || undefined })} placeholder={t('e.g. Start when the doors open, two verses only')} />
            </Field>
          </div>
        </Sheet>
      )}
    </>
  )
}
