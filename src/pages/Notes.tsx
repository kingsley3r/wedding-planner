import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { Note, Row } from '../lib/types'
import { Empty, Fab, Field, PageHead, Sheet, Text } from '../components/ui'

export default function Notes() {
  const { t } = useI18n()
  const { list, add, update, remove } = useStore()
  const notes = list('note').sort((a, b) => Number(!!b.data.pinned) - Number(!!a.data.pinned) || (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
  const [editing, setEditing] = useState<{ row?: Row<'note'>; data: Note } | null>(null)
  const save = async () => {
    if (!editing || !(editing.data.title.trim() || editing.data.body.trim())) return
    if (editing.row) await update(editing.row, editing.data)
    else await add('note', editing.data)
    setEditing(null)
  }
  const e = editing?.data
  const set = (p: Partial<Note>) => editing && setEditing({ ...editing, data: { ...editing.data, ...p } })

  return (
    <>
      <PageHead eyebrow={t('Ideas and reminders')} title={t('Notes')}>
        <button className="btn primary hide-mobile" onClick={() => setEditing({ data: { title: '', body: '' } })}>
          {t('New note')}
        </button>
      </PageHead>
      {notes.length === 0 ? (
        <div className="card">
          <Empty title={t('No notes yet')}>
            <p className="small">{t('Song ideas, Bible verses for the ceremony, questions for the venue…')}</p>
          </Empty>
        </div>
      ) : (
        <div className="notes-grid">
          {notes.map((n) => (
            <div key={n.id} className="card note-card" onClick={() => setEditing({ row: n, data: { ...n.data } })}>
              {n.data.pinned && <div className="eyebrow" style={{ marginBottom: 6 }}>{t('Pinned')}</div>}
              <h4>{n.data.title || t('Untitled')}</h4>
              <p>{n.data.body}</p>
            </div>
          ))}
        </div>
      )}
      <Fab label={t('New note')} onClick={() => setEditing({ data: { title: '', body: '' } })} />
      {editing && e && (
        <Sheet
          title={editing.row ? t('Edit note') : t('New note')}
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
            <Field label={t('Title')} full>
              <Text value={e.title} onChange={(v) => set({ title: v })} autoFocus={!editing.row} />
            </Field>
            <Field label={t('Note')} full>
              <textarea className="input" style={{ minHeight: 200 }} value={e.body} onChange={(ev) => set({ body: ev.target.value })} />
            </Field>
            <Field label={t('Pinned')}>
              <div className="chips">
                <button type="button" className={'chip' + (e.pinned ? ' on' : '')} onClick={() => set({ pinned: !e.pinned })}>
                  {e.pinned ? t('Pinned') : t('Pin to top')}
                </button>
              </div>
            </Field>
          </div>
        </Sheet>
      )}
    </>
  )
}
