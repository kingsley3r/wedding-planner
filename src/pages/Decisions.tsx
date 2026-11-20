import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { Decision, Row } from '../lib/types'
import { fmtDate, todayIso } from '../lib/util'
import { Empty, Fab, Field, PageHead, Sheet, Text } from '../components/ui'

const AREAS = ['Ceremony', 'Venue', 'Guests', 'Budget', 'Food', 'Music', 'Decor', 'Clothes', 'Honeymoon', 'Other']

/** What you decided, when and why, so neither of you has to remember it. */
export default function Decisions() {
  const { t, lang } = useI18n()
  const { list, add, update, remove, settings } = useStore()
  const s = settings!.data
  const rows = list('decision').sort((a, b) => b.data.date.localeCompare(a.data.date))
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<{ row?: Row<'decision'>; data: Decision } | null>(null)
  const needle = q.trim().toLowerCase()
  const shown = rows.filter((r) => !needle || [r.data.title, r.data.decision, r.data.why, r.data.options, r.data.area].some((x) => x?.toLowerCase().includes(needle)))
  const blank = (): Decision => ({ title: '', date: todayIso(), decision: '' })

  const save = async () => {
    if (!editing || !editing.data.title.trim()) return
    if (editing.row) await update(editing.row, editing.data)
    else await add('decision', editing.data)
    setEditing(null)
  }
  const e = editing?.data
  const set = (p: Partial<Decision>) => editing && setEditing({ ...editing, data: { ...editing.data, ...p } })

  return (
    <>
      <PageHead eyebrow={t('{n} decisions', { n: rows.length })} title={t('Decision log')}>
        <button className="btn primary hide-mobile" onClick={() => setEditing({ data: blank() })}>
          {t('Add decision')}
        </button>
      </PageHead>
      {rows.length > 3 && (
        <div className="toolbar">
          <input className="input search" placeholder={t('Search decisions')} value={q} onChange={(ev) => setQ(ev.target.value)} />
        </div>
      )}
      {rows.length === 0 ? (
        <div className="card">
          <Empty title={t('No decisions yet')}>
            <p className="small">{t('Write down what you agreed, when and why. For example: no dancing, the menu, or which photographer you chose.')}</p>
          </Empty>
        </div>
      ) : (
        <div className="card">
          <div className="dl-list">
            {shown.map((r) => (
              <div key={r.id} className="dl-item clickable" onClick={() => setEditing({ row: r, data: { ...r.data } })}>
                <div className="dl-date">{fmtDate(r.data.date, lang, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div className="dl-body">
                  <div className="title">{r.data.title}</div>
                  {r.data.decision && <div className="dl-decision">{r.data.decision}</div>}
                  {r.data.why && (
                    <div className="meta">
                      {t('Why')}: {r.data.why}
                    </div>
                  )}
                  <div className="meta">{[r.data.area ? t(r.data.area) : '', r.data.by, r.data.options ? `${t('Also considered')}: ${r.data.options}` : ''].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Fab label={t('Add decision')} onClick={() => setEditing({ data: blank() })} />

      {editing && e && (
        <Sheet
          title={editing.row ? e.title : t('Add decision')}
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
            <Field label={t('What was decided about')} full>
              <Text value={e.title} onChange={(v) => set({ title: v })} autoFocus={!editing.row} required placeholder={t('e.g. Photographer')} />
            </Field>
            <Field label={t('Decision')} full>
              <Text value={e.decision} onChange={(v) => set({ decision: v })} placeholder={t('e.g. We book Studio Lumen')} />
            </Field>
            <Field label={t('Why')} full>
              <textarea className="input" style={{ minHeight: 80 }} value={e.why ?? ''} onChange={(ev) => set({ why: ev.target.value || undefined })} />
            </Field>
            <Field label={t('Also considered')} full>
              <Text value={e.options} onChange={(v) => set({ options: v || undefined })} />
            </Field>
            <Field label={t('Date')}>
              <Text type="date" value={e.date} onChange={(v) => v && set({ date: v })} />
            </Field>
            <Field label={t('Decided by')}>
              <div className="chips">
                {[s.partner1, s.partner2, t('Both')].map((p) => (
                  <button type="button" key={p} className={'chip' + (e.by === p ? ' on' : '')} onClick={() => set({ by: e.by === p ? undefined : p })}>
                    {p}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('Area')} full>
              <div className="chips">
                {AREAS.map((a) => (
                  <button type="button" key={a} className={'chip' + (e.area === a ? ' on' : '')} onClick={() => set({ area: e.area === a ? undefined : a })}>
                    {t(a)}
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
