import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { PackItem, Row } from '../lib/types'
import { Bar, Fab, Field, PageHead, Sheet, Text } from '../components/ui'

export const PACK_GROUPS = ['Rings and documents', 'Bride', 'Groom', 'Emergency kit', 'Church', 'Venue', 'Overnight bag']

/** A starter list for the day, from the rings to the safety pins. */
const STARTER: [string, string][] = [
  ['Rings and documents', 'Wedding rings'],
  ['Rings and documents', 'ID cards or passports'],
  ['Rings and documents', 'Marriage documents for the registry'],
  ['Rings and documents', 'Envelopes with payments for vendors'],
  ['Rings and documents', 'Vows and the order of service'],
  ['Bride', 'Dress and veil'],
  ['Bride', 'Shoes and comfortable spare shoes'],
  ['Bride', 'Jewellery and hair pins'],
  ['Bride', 'Make-up for touch-ups'],
  ['Bride', 'Bouquet'],
  ['Groom', 'Suit, shirt and tie'],
  ['Groom', 'Cufflinks and buttonhole'],
  ['Groom', 'Polished shoes'],
  ['Emergency kit', 'Sewing kit and safety pins'],
  ['Emergency kit', 'Plasters and painkillers'],
  ['Emergency kit', 'Tissues and wet wipes'],
  ['Emergency kit', 'Phone chargers and power bank'],
  ['Emergency kit', 'Deodorant and perfume'],
  ['Emergency kit', 'Snacks and water'],
  ['Church', 'Bibles or song sheets'],
  ['Church', 'Programs for the guests'],
  ['Church', 'Gift for the pastor'],
  ['Venue', 'Guest book and pens'],
  ['Venue', 'Place cards and table plan'],
  ['Venue', 'Card box for gifts'],
  ['Venue', 'Speaker notes'],
  ['Overnight bag', 'Clothes for the next day'],
  ['Overnight bag', 'Toiletries']
]

export default function Packing() {
  const { t } = useI18n()
  const { list, add, update, remove } = useStore()
  const items = list('pack')
  const [editing, setEditing] = useState<{ row?: Row<'pack'>; data: PackItem } | null>(null)
  const [hidePacked, setHidePacked] = useState(false)
  const packed = items.filter((i) => i.data.packed).length
  const groups = [...new Set([...PACK_GROUPS, ...items.map((i) => i.data.group)])]

  const save = async () => {
    if (!editing || !editing.data.item.trim()) return
    if (editing.row) await update(editing.row, editing.data)
    else await add('pack', editing.data)
    setEditing(null)
  }
  const e = editing?.data
  const set = (p: Partial<PackItem>) => editing && setEditing({ ...editing, data: { ...editing.data, ...p } })
  const blank = (group = 'Emergency kit'): PackItem => ({ item: '', group, packed: false })

  return (
    <>
      <PageHead eyebrow={t('{a} of {b} packed', { a: packed, b: items.length })} title={t('Packing list')}>
        <Link className="btn" to="/print/packing">
          {t('Print')}
        </Link>
        <button className="btn primary hide-mobile" onClick={() => setEditing({ data: blank() })}>
          {t('Add item')}
        </button>
      </PageHead>

      {items.length === 0 ? (
        <div className="card">
          <p className="muted">{t('Everything you need on the day, from the rings to the safety pins. Tick things off as they go in the bag.')}</p>
          <button
            className="btn primary"
            style={{ marginTop: 14 }}
            onClick={async () => {
              for (const [group, item] of STARTER) await add('pack', { group, item, packed: false })
            }}
          >
            {t('Start with a suggested list')}
          </button>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: '14px 18px' }}>
            <Bar value={packed / (items.length || 1)} />
            <div className="chips" style={{ marginTop: 12 }}>
              <button className={'chip' + (hidePacked ? ' on' : '')} onClick={() => setHidePacked(!hidePacked)}>
                {t('Hide packed')}
              </button>
            </div>
          </div>
          {groups.map((g) => {
            const rows = items.filter((i) => i.data.group === g && (!hidePacked || !i.data.packed)).sort((a, b) => Number(a.data.packed) - Number(b.data.packed))
            const all = items.filter((i) => i.data.group === g)
            if (!all.length) return null
            return (
              <div className="card" key={g}>
                <div className="card-head">
                  <h2 className="section">{t(g)}</h2>
                  <span className="small muted">
                    {all.filter((i) => i.data.packed).length} / {all.length}
                  </span>
                </div>
                <div className="list">
                  {rows.map((i) => (
                    <div key={i.id} className="item">
                      <button className={'check' + (i.data.packed ? ' on' : '')} aria-label={t('Packed')} onClick={() => update(i, { packed: !i.data.packed })} />
                      <div className="grow clickable" onClick={() => setEditing({ row: i, data: { ...i.data } })} style={{ cursor: 'pointer' }}>
                        <div className="title" style={{ textDecoration: i.data.packed ? 'line-through' : undefined, color: i.data.packed ? 'var(--muted)' : undefined }}>
                          {t(i.data.item)}
                        </div>
                        {i.data.who && <div className="meta">{i.data.who}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn small ghost" style={{ marginTop: 6 }} onClick={() => setEditing({ data: blank(g) })}>
                  + {t('Add item')}
                </button>
              </div>
            )
          })}
        </>
      )}
      <Fab label={t('Add item')} onClick={() => setEditing({ data: blank() })} />

      {editing && e && (
        <Sheet
          title={editing.row ? t(e.item) : t('Add item')}
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
            <Field label={t('Item')} full>
              <Text value={editing.row ? t(e.item) : e.item} onChange={(v) => set({ item: v })} autoFocus={!editing.row} required />
            </Field>
            <Field label={t('Bag')} full>
              <div className="chips">
                {groups.map((g) => (
                  <button type="button" key={g} className={'chip' + (e.group === g ? ' on' : '')} onClick={() => set({ group: g })}>
                    {t(g)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('Who brings it')} full>
              <Text value={e.who} onChange={(v) => set({ who: v || undefined })} placeholder={t('e.g. Best man')} />
            </Field>
          </div>
        </Sheet>
      )}
    </>
  )
}
