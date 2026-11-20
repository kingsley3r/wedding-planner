import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { Row, Shot, ShotFor } from '../lib/types'
import { Fab, Field, PageHead, Sheet, Text } from '../components/ui'

export const MOMENTS = ['Getting ready', 'Church', 'Family groups', 'Couple', 'Venue and details', 'Reception', 'Evening']
export const FOR_LABEL: Record<ShotFor, string> = { photo: 'Photo', video: 'Video', both: 'Photo and video' }

const STARTER: [string, string, ShotFor, boolean?][] = [
  ['Getting ready', 'Bride getting ready with mother and sisters', 'both'],
  ['Getting ready', 'Groom and groomsmen getting ready', 'both'],
  ['Getting ready', 'Dress, shoes, rings and invitation details', 'photo'],
  ['Getting ready', 'First look or the walk to the car', 'video', true],
  ['Church', 'Guests arriving at Logos Gleisdorf', 'video'],
  ['Church', 'Entrance of the bride', 'both', true],
  ['Church', "Groom's face as the bride walks in", 'both', true],
  ['Church', 'Worship and songs, wide and close', 'video'],
  ['Church', 'Sermon, with the pastor and the couple', 'both'],
  ['Church', 'Vows and exchange of rings', 'both', true],
  ['Church', 'Prayer of blessing with hands laid on', 'both', true],
  ['Church', 'Exit and congratulations line', 'both'],
  ['Family groups', 'Couple with both families', 'photo', true],
  ['Family groups', "Couple with the bride's parents", 'photo', true],
  ['Family groups', "Couple with the groom's parents", 'photo', true],
  ['Family groups', 'Couple with grandparents', 'photo'],
  ['Family groups', 'Large group photo of all guests', 'photo'],
  ['Couple', 'Portraits in golden hour', 'both', true],
  ['Couple', 'Slow walk and drone shot at the venue', 'video'],
  ['Venue and details', 'Room before guests enter, tables and flowers', 'both'],
  ['Venue and details', 'Cake and table settings', 'photo'],
  ['Reception', 'Grand entrance of the couple', 'both', true],
  ['Reception', 'Speeches and family blessings', 'both'],
  ['Reception', 'Cutting the cake', 'both', true],
  ['Reception', 'Guests singing and children playing', 'video'],
  ['Evening', 'Last moments and send-off', 'both']
]

export default function Shots() {
  const { t } = useI18n()
  const { list, add, update, remove } = useStore()
  const shots = list('shot')
  const [only, setOnly] = useState<'all' | 'photo' | 'video'>('all')
  const [editing, setEditing] = useState<{ row?: Row<'shot'>; data: Shot } | null>(null)
  const shown = shots.filter((s) => only === 'all' || s.data.for === only || s.data.for === 'both')
  const moments = [...new Set([...MOMENTS, ...shots.map((s) => s.data.moment)])]
  const blank = (moment = 'Church'): Shot => ({ title: '', moment, for: 'both' })

  const save = async () => {
    if (!editing || !editing.data.title.trim()) return
    if (editing.row) await update(editing.row, editing.data)
    else await add('shot', editing.data)
    setEditing(null)
  }
  const e = editing?.data
  const set = (p: Partial<Shot>) => editing && setEditing({ ...editing, data: { ...editing.data, ...p } })

  return (
    <>
      <PageHead eyebrow={t('{n} shots · {m} must-haves', { n: shots.length, m: shots.filter((s) => s.data.must).length })} title={t('Shot list')}>
        <Link className="btn" to="/print/shots-photo">
          {t('For the photographer')}
        </Link>
        <Link className="btn" to="/print/shots-video">
          {t('For the videographer')}
        </Link>
      </PageHead>

      {shots.length === 0 ? (
        <div className="card">
          <p className="muted">{t('The moments and people you want captured, so the photographer and videographer know exactly what matters to you.')}</p>
          <button
            className="btn primary"
            style={{ marginTop: 14 }}
            onClick={async () => {
              for (const [moment, title, f, must] of STARTER) await add('shot', { moment, title, for: f, must })
            }}
          >
            {t('Start with a suggested list')}
          </button>
        </div>
      ) : (
        <>
          <div className="chips" style={{ marginBottom: 14 }}>
            {(['all', 'photo', 'video'] as const).map((k) => (
              <button key={k} className={'chip' + (only === k ? ' on' : '')} onClick={() => setOnly(k)}>
                {k === 'all' ? t('All') : t(FOR_LABEL[k])}
              </button>
            ))}
          </div>
          {moments.map((m) => {
            const rows = shown.filter((s) => s.data.moment === m)
            if (!rows.length) return null
            return (
              <div className="card" key={m}>
                <div className="card-head">
                  <h2 className="section">{t(m)}</h2>
                </div>
                <div className="list">
                  {rows.map((s) => (
                    <div key={s.id} className="item clickable" onClick={() => setEditing({ row: s, data: { ...s.data } })}>
                      <div className="grow">
                        <div className="title">
                          {s.data.must && <span className="must">★ </span>}
                          {t(s.data.title)}
                        </div>
                        {(s.data.people || s.data.notes) && <div className="meta">{[s.data.people, s.data.notes].filter(Boolean).join(' · ')}</div>}
                      </div>
                      <span className={'pill ' + (s.data.for === 'video' ? 'rose' : s.data.for === 'photo' ? 'sky' : '')}>{t(FOR_LABEL[s.data.for])}</span>
                    </div>
                  ))}
                </div>
                <button className="btn small ghost" style={{ marginTop: 6 }} onClick={() => setEditing({ data: blank(m) })}>
                  + {t('Add shot')}
                </button>
              </div>
            )
          })}
        </>
      )}
      <Fab label={t('Add shot')} onClick={() => setEditing({ data: blank() })} />

      {editing && e && (
        <Sheet
          title={editing.row ? t(e.title) : t('Add shot')}
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
            <Field label={t('Shot')} full>
              <Text value={editing.row ? t(e.title) : e.title} onChange={(v) => set({ title: v })} autoFocus={!editing.row} required />
            </Field>
            <Field label={t('For')} full>
              <div className="chips">
                {(['photo', 'video', 'both'] as ShotFor[]).map((k) => (
                  <button type="button" key={k} className={'chip' + (e.for === k ? ' on' : '')} onClick={() => set({ for: k })}>
                    {t(FOR_LABEL[k])}
                  </button>
                ))}
                <button type="button" className={'chip' + (e.must ? ' on' : '')} onClick={() => set({ must: !e.must || undefined })}>
                  ★ {t('Must-have')}
                </button>
              </div>
            </Field>
            <Field label={t('Moment')} full>
              <div className="chips">
                {moments.map((m) => (
                  <button type="button" key={m} className={'chip' + (e.moment === m ? ' on' : '')} onClick={() => set({ moment: m })}>
                    {t(m)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('Who is in it')} full>
              <Text value={e.people} onChange={(v) => set({ people: v || undefined })} placeholder={t('e.g. grandparents from Romania')} />
            </Field>
            <Field label={t('Notes')} full>
              <Text value={e.notes} onChange={(v) => set({ notes: v || undefined })} />
            </Field>
          </div>
        </Sheet>
      )}
    </>
  )
}
