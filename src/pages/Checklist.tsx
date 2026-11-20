import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { Row, Task } from '../lib/types'
import { fmtDate, todayIso } from '../lib/util'
import { Bar, Fab, Field, PageHead, Sheet, Text } from '../components/ui'

const blank = (): Task => ({ title: '', done: false })

export default function Checklist() {
  const { t, lang } = useI18n()
  const { list, add, update, remove, settings } = useStore()
  const tasks = list('task')
  const [showDone, setShowDone] = useState(false)
  const [editing, setEditing] = useState<{ row?: Row<'task'>; data: Task } | null>(null)
  const today = todayIso()
  const s = settings!.data

  const done = tasks.filter((x) => x.data.done).length
  const shown = tasks.filter((x) => showDone || !x.data.done).sort((a, b) => (a.data.dueDate ?? '9999').localeCompare(b.data.dueDate ?? '9999'))
  // Group by month of the due date.
  const groups = new Map<string, Row<'task'>[]>()
  for (const x of shown) {
    const key = x.data.dueDate ? x.data.dueDate.slice(0, 7) : 'none'
    groups.set(key, [...(groups.get(key) ?? []), x])
  }

  const save = async () => {
    if (!editing || !editing.data.title.trim()) return
    if (editing.row) await update(editing.row, editing.data)
    else await add('task', editing.data)
    setEditing(null)
  }
  const e = editing?.data
  const set = (p: Partial<Task>) => editing && setEditing({ ...editing, data: { ...editing.data, ...p } })

  return (
    <>
      <PageHead eyebrow={t('{done} of {total} done', { done, total: tasks.length })} title={t('Checklist')}>
        <button className="btn hide-mobile" onClick={() => setShowDone(!showDone)}>
          {showDone ? t('Hide done') : t('Show done')}
        </button>
        <button className="btn primary hide-mobile" onClick={() => setEditing({ data: blank() })}>
          {t('Add task')}
        </button>
      </PageHead>
      <div style={{ marginBottom: 20 }}>
        <Bar value={done / (tasks.length || 1)} />
      </div>
      <div className="chips hide-desktop" style={{ marginBottom: 14 }}>
        <button className={'chip' + (showDone ? ' on' : '')} onClick={() => setShowDone(!showDone)}>
          {t('Show done')}
        </button>
      </div>

      {[...groups.entries()].map(([key, rows]) => (
        <div className="card" key={key}>
          <div className="card-head">
            <h2 className="section">
              {key === 'none' ? t('No date') : fmtDate(key + '-01', lang, { month: 'long', year: 'numeric' })}
            </h2>
          </div>
          <div className="list">
            {rows.map((x) => {
              const late = !x.data.done && x.data.dueDate && x.data.dueDate < today
              return (
                <div key={x.id} className="item">
                  <button
                    className={'check' + (x.data.done ? ' on' : '')}
                    aria-label={t('Done')}
                    onClick={() => update(x, { done: !x.data.done })}
                  />
                  <div className="grow clickable" style={{ cursor: 'pointer' }} onClick={() => setEditing({ row: x, data: { ...x.data } })}>
                    <div className="title" style={{ textDecoration: x.data.done ? 'line-through' : undefined, color: x.data.done ? 'var(--muted)' : undefined }}>
                      {t(x.data.title)}
                    </div>
                    <div className="meta">{[x.data.dueDate && fmtDate(x.data.dueDate, lang), x.data.owner].filter(Boolean).join(' · ')}</div>
                  </div>
                  {late && <span className="pill bad">{t('Overdue')}</span>}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <Fab label={t('Add task')} onClick={() => setEditing({ data: blank() })} />

      {editing && e && (
        <Sheet
          title={editing.row ? t('Edit task') : t('Add task')}
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
            <Field label={t('Task')} full>
              <Text value={editing.row ? t(e.title) : e.title} onChange={(v) => set({ title: v })} autoFocus={!editing.row} required />
            </Field>
            <Field label={t('Due date')}>
              <Text type="date" value={e.dueDate} onChange={(v) => set({ dueDate: v || undefined })} />
            </Field>
            <Field label={t('Who')}>
              <div className="chips">
                {[s.partner1, s.partner2, t('Both')].map((p) => (
                  <button type="button" key={p} className={'chip' + (e.owner === p ? ' on' : '')} onClick={() => set({ owner: e.owner === p ? undefined : p })}>
                    {p}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Sheet>
      )}
    </>
  )
}
