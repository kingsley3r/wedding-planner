import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { RehearsalStep, Row } from '../lib/types'
import { fmtDate } from '../lib/util'
import { Bar, Fab, Field, PageHead, Sheet, Text } from '../components/ui'

/** A run-through for the church rehearsal, in the order it usually happens. */
const STARTER: [string, string?][] = [
  ['Welcome and prayer', 'Pastor'],
  ['Introduce everyone and their job on the day', 'Coordinator'],
  ['Show where everyone sits and stands'],
  ['Practise the entrance: groom, bridesmaids, then the bride', 'Band'],
  ['Music cues with the band or choir', 'Band'],
  ['Vows and rings: who holds the rings and when', 'Best man'],
  ['Prayer and blessing over the couple', 'Pastor'],
  ['Practise leaving the church, in order', 'Band'],
  ['Congratulations line and group photos: who gathers people', 'Ushers'],
  ['Agree on arrival times for the day']
]

export default function Rehearsal() {
  const { t, lang } = useI18n()
  const { list, add, update, remove, settings, saveSettings } = useStore()
  const s = settings!.data
  const steps = list('rehearsal').sort((a, b) => a.data.order - b.data.order)
  const done = steps.filter((x) => x.data.done).length
  const [editing, setEditing] = useState<{ row?: Row<'rehearsal'>; data: RehearsalStep } | null>(null)
  const e = editing?.data
  const set = (p: Partial<RehearsalStep>) => setEditing((c) => (c ? { ...c, data: { ...c.data, ...p } } : c))
  const nextOrder = (steps[steps.length - 1]?.data.order ?? 0) + 1
  const save = async () => {
    if (!editing || !editing.data.title.trim()) return
    if (editing.row) await update(editing.row, editing.data)
    else await add('rehearsal', editing.data)
    setEditing(null)
  }
  const move = async (i: number, dir: -1 | 1) => {
    const a = steps[i]
    const b = steps[i + dir]
    if (!a || !b) return
    await update(a, { order: b.data.order })
    await update(b, { order: a.data.order })
  }

  return (
    <>
      <PageHead
        eyebrow={s.rehearsalDate ? fmtDate(s.rehearsalDate, lang, { weekday: 'long', day: 'numeric', month: 'long' }) + (s.rehearsalTime ? ` · ${s.rehearsalTime}` : '') : t('Usually one or two days before')}
        title={t('Rehearsal')}
      >
        <Link className="btn" to="/print/rehearsal">
          {t('Print')}
        </Link>
      </PageHead>

      <div className="card">
        <div className="form">
          <Field label={t('Date')}>
            <Text type="date" value={s.rehearsalDate} onChange={(v) => saveSettings({ rehearsalDate: v || undefined })} />
          </Field>
          <Field label={t('Time')}>
            <Text type="time" value={s.rehearsalTime} onChange={(v) => saveSettings({ rehearsalTime: v || undefined })} />
          </Field>
          <Field label={t('Place')} full>
            <Text value={s.rehearsalPlace} onChange={(v) => saveSettings({ rehearsalPlace: v || undefined })} placeholder="Logos Gleisdorf" />
          </Field>
          <Field label={t('Who comes')} full>
            <textarea
              className="input"
              rows={3}
              value={s.rehearsalPeople ?? ''}
              placeholder={t('e.g. Pastor, parents, best man, bridesmaids, ushers, band leader, photographer')}
              onChange={(ev) => saveSettings({ rehearsalPeople: ev.target.value || undefined })}
            />
          </Field>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('Run-through')}</h2>
          {steps.length > 0 && <span className="small muted">{t('{a} of {b} done', { a: done, b: steps.length })}</span>}
        </div>
        {steps.length === 0 ? (
          <>
            <p className="muted small">{t('Walk through the service once with everyone who has a job, so the day runs calmly.')}</p>
            <button
              className="btn primary"
              style={{ marginTop: 12 }}
              onClick={async () => {
                let order = 1
                for (const [title, who] of STARTER) await add('rehearsal', { title, who, order: order++ })
              }}
            >
              {t('Start with a suggested run-through')}
            </button>
          </>
        ) : (
          <>
            <Bar value={done / steps.length} tone="rose" />
            <div className="list" style={{ marginTop: 8 }}>
              {steps.map((x, i) => (
                <div key={x.id} className="item">
                  <button className={'check' + (x.data.done ? ' on' : '')} aria-label={t('Done')} onClick={() => update(x, { done: !x.data.done || undefined })} />
                  <div className="grow clickable" onClick={() => setEditing({ row: x, data: { ...x.data } })}>
                    <div className="title" style={{ textDecoration: x.data.done ? 'line-through' : undefined, color: x.data.done ? 'var(--muted)' : undefined }}>
                      {x.data.time && <span className="money">{x.data.time} · </span>}
                      {t(x.data.title)}
                    </div>
                    {(x.data.who || x.data.notes) && <div className="meta">{[x.data.who && t(x.data.who), x.data.notes].filter(Boolean).join(' · ')}</div>}
                  </div>
                  <div className="order-btns">
                    <button aria-label={t('Move up')} disabled={i === 0} onClick={() => move(i, -1)}>
                      ↑
                    </button>
                    <button aria-label={t('Move down')} disabled={i === steps.length - 1} onClick={() => move(i, 1)}>
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Fab label={t('Add step')} onClick={() => setEditing({ data: { title: '', order: nextOrder } })} />

      {editing && e && (
        <Sheet
          title={editing.row ? t(e.title) : t('Add step')}
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
            <Field label={t('Step')} full>
              <Text value={editing.row ? t(e.title) : e.title} onChange={(v) => set({ title: v })} autoFocus={!editing.row} required />
            </Field>
            <Field label={t('Time')}>
              <Text type="time" value={e.time} onChange={(v) => set({ time: v || undefined })} />
            </Field>
            <Field label={t('Who')}>
              <Text value={e.who ? t(e.who) : ''} onChange={(v) => set({ who: v || undefined })} placeholder={t('e.g. Pastor')} />
            </Field>
            <Field label={t('Notes')} full>
              <textarea className="input" rows={3} value={e.notes ?? ''} onChange={(ev) => set({ notes: ev.target.value || undefined })} />
            </Field>
          </div>
        </Sheet>
      )}
    </>
  )
}
