import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { KidSlot, KidTask, Row } from '../lib/types'
import { Field, PageHead, Sheet, Text } from '../components/ui'

const ACTIVITIES = [
  'Colouring pages with Bible stories',
  'Craft table: stickers, beads, paper crowns',
  'Quiet corner with picture books during the service',
  'Bubbles outside after the church',
  'Puzzles and memory games',
  'A short children’s film in a side room',
  'Kids’ dance with the band',
  'Little jobs: handing out programmes, flower petals'
]
const SUPPLIES = ['Crayons and colouring books', 'Snacks and juice', 'Wet wipes and tissues', 'First aid kit', 'Small gift bags', 'Blankets and pillows for the little ones', 'Name stickers', 'Spare clothes bag']

type Edit = { kind: 'slot'; row?: Row<'kidSlot'>; data: KidSlot } | { kind: 'task'; row?: Row<'kidTask'>; data: KidTask }

/** Everything for the children: who they are, who looks after them when, and what to bring. */
export default function Kids() {
  const { t } = useI18n()
  const { list, add, update, remove, settings, saveSettings } = useStore()
  const s = settings!.data
  const kids = list('guest').filter((g) => g.data.child)
  const coming = kids.filter((g) => g.data.rsvp !== 'declined')
  const slots = list('kidSlot').sort((a, b) => a.data.time.localeCompare(b.data.time))
  const tasks = list('kidTask')
  const [edit, setEdit] = useState<Edit | null>(null)

  const save = async () => {
    if (!edit) return
    if (edit.kind === 'slot') {
      if (!edit.data.time || !edit.data.who.trim()) return
      if (edit.row) await update(edit.row, edit.data)
      else await add('kidSlot', edit.data)
    } else {
      if (!edit.data.title.trim()) return
      if (edit.row) await update(edit.row, edit.data)
      else await add('kidTask', edit.data)
    }
    setEdit(null)
  }
  const setSlot = (p: Partial<KidSlot>) => setEdit((e) => (e && e.kind === 'slot' ? { ...e, data: { ...e.data, ...p } } : e))
  const setTask = (p: Partial<KidTask>) => setEdit((e) => (e && e.kind === 'task' ? { ...e, data: { ...e.data, ...p } } : e))

  const taskList = (type: KidTask['type'], title: string, starter: string[]) => {
    const rows = tasks.filter((x) => x.data.type === type)
    return (
      <div className="card">
        <div className="card-head">
          <h2 className="section">{t(title)}</h2>
          {rows.length > 0 && <span className="small muted">{t('{a} of {b} done', { a: rows.filter((x) => x.data.done).length, b: rows.length })}</span>}
        </div>
        {rows.length > 0 && (
          <div className="list">
            {rows.map((x) => (
              <div key={x.id} className="item">
                <button className={'check' + (x.data.done ? ' on' : '')} aria-label={t('Done')} onClick={() => update(x, { done: !x.data.done || undefined })} />
                <div className="grow clickable" onClick={() => setEdit({ kind: 'task', row: x, data: { ...x.data } })}>
                  <div className="title" style={{ textDecoration: x.data.done ? 'line-through' : undefined, color: x.data.done ? 'var(--muted)' : undefined }}>
                    {t(x.data.title)}
                  </div>
                  {x.data.notes && <div className="meta">{x.data.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="row-gap" style={{ marginTop: 8 }}>
          <button className="btn small ghost" onClick={() => setEdit({ kind: 'task', data: { title: '', type } })}>
            + {t('Add')}
          </button>
          {rows.length === 0 && (
            <button
              className="btn small"
              onClick={async () => {
                for (const title of starter) await add('kidTask', { title, type })
              }}
            >
              {t('Add suggestions')}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHead eyebrow={t('{n} children coming', { n: coming.length })} title={t('Kids’ corner')} />

      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('Children')}</h2>
          <Link className="btn small ghost" to="/guests">
            {t('Guest list')}
          </Link>
        </div>
        {kids.length === 0 ? (
          <p className="small muted">{t('Mark guests as a child in the guest list and they show up here.')}</p>
        ) : (
          <div className="list">
            {kids.map((g) => (
              <div key={g.id} className="item">
                <div className="grow">
                  <div className="title">{g.data.name}</div>
                  <div className="meta">{[g.data.household, g.data.diet].filter(Boolean).join(' · ')}</div>
                </div>
                <span className={'pill ' + (g.data.rsvp === 'attending' ? 'ok' : g.data.rsvp === 'declined' ? 'bad' : 'warn')}>
                  {g.data.rsvp === 'attending' ? t('Coming') : g.data.rsvp === 'declined' ? t('Declined') : t('Not sure yet')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="form">
          <Field label={t('Where the kids’ corner is')} full>
            <Text value={s.kidsRoom} onChange={(v) => saveSettings({ kidsRoom: v || undefined })} placeholder={t('e.g. Side room next to the hall')} />
          </Field>
          <Field label={t('Good to know')} full>
            <textarea
              className="input"
              rows={3}
              value={s.kidsNotes ?? ''}
              placeholder={t('e.g. Allergies, who picks up whom, nap times, phone numbers of the parents')}
              onChange={(e) => saveSettings({ kidsNotes: e.target.value || undefined })}
            />
          </Field>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('Who looks after the children')}</h2>
        </div>
        {slots.length === 0 ? (
          <p className="small muted">{t('Plan who minds the children and when, for example during the service, the meal and the speeches.')}</p>
        ) : (
          <div className="list">
            {slots.map((x) => (
              <div key={x.id} className="item clickable" onClick={() => setEdit({ kind: 'slot', row: x, data: { ...x.data } })}>
                <span className="money kid-time">
                  {x.data.time}
                  {x.data.until && `–${x.data.until}`}
                </span>
                <div className="grow">
                  <div className="title">{x.data.who}</div>
                  <div className="meta">{[x.data.where, x.data.notes].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="btn small ghost" style={{ marginTop: 8 }} onClick={() => setEdit({ kind: 'slot', data: { time: '', who: '' } })}>
          + {t('Add a time')}
        </button>
      </div>

      {taskList('activity', 'Activities', ACTIVITIES)}
      {taskList('supply', 'To bring', SUPPLIES)}

      {edit && (
        <Sheet
          title={edit.kind === 'slot' ? t('Who looks after the children') : edit.row ? t(edit.data.title) : t('Add')}
          onClose={() => setEdit(null)}
          onSave={save}
          onDelete={
            edit.row
              ? async () => {
                  await remove(edit.row!.id)
                  setEdit(null)
                }
              : undefined
          }
        >
          {edit.kind === 'slot' ? (
            <div className="form">
              <Field label={t('From')}>
                <Text type="time" value={edit.data.time} onChange={(v) => setSlot({ time: v })} required />
              </Field>
              <Field label={t('Until')}>
                <Text type="time" value={edit.data.until} onChange={(v) => setSlot({ until: v || undefined })} />
              </Field>
              <Field label={t('Who')} full>
                <Text value={edit.data.who} onChange={(v) => setSlot({ who: v })} placeholder={t('e.g. Ana and Maria from the youth group')} required />
              </Field>
              <Field label={t('Where')} full>
                <Text value={edit.data.where} onChange={(v) => setSlot({ where: v || undefined })} />
              </Field>
              <Field label={t('Notes')} full>
                <textarea className="input" rows={2} value={edit.data.notes ?? ''} onChange={(e) => setSlot({ notes: e.target.value || undefined })} />
              </Field>
            </div>
          ) : (
            <div className="form">
              <Field label={edit.data.type === 'activity' ? t('Activity') : t('Item')} full>
                <Text value={edit.row ? t(edit.data.title) : edit.data.title} onChange={(v) => setTask({ title: v })} autoFocus={!edit.row} required />
              </Field>
              <Field label={t('Notes')} full>
                <textarea className="input" rows={2} value={edit.data.notes ?? ''} onChange={(e) => setTask({ notes: e.target.value || undefined })} />
              </Field>
            </div>
          )}
        </Sheet>
      )}
    </>
  )
}
