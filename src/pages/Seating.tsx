import { useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { Row, SeatTable, TableShape } from '../lib/types'
import { num } from '../lib/util'
import { Field, PageHead, Select, Sheet, Text } from '../components/ui'

const ROUND = 80

function tableSize(t: SeatTable) {
  if (t.shape === 'round') return { w: ROUND, h: ROUND }
  return { w: Math.max(90, Math.ceil(t.seats / 2) * 26 + 20), h: 46 }
}

function seatPositions(t: SeatTable) {
  const { w, h } = tableSize(t)
  const out: { left: number; top: number }[] = []
  if (t.shape === 'round') {
    const r = w / 2 + 3
    for (let i = 0; i < t.seats; i++) {
      const a = (i / t.seats) * Math.PI * 2 - Math.PI / 2
      out.push({ left: w / 2 + r * Math.cos(a) - 6.5, top: h / 2 + r * Math.sin(a) - 6.5 })
    }
  } else {
    const perSide = Math.ceil(t.seats / 2)
    for (let i = 0; i < t.seats; i++) {
      const side = i < perSide ? 0 : 1
      const idx = side ? i - perSide : i
      const n = side ? t.seats - perSide : perSide
      out.push({ left: ((idx + 0.5) / n) * w - 6.5, top: side ? h - 4 : -9 })
    }
  }
  return out
}

type Drag =
  | { type: 'table'; id: string; startX: number; startY: number; ox: number; oy: number; moved: boolean }
  | { type: 'guest'; id: string; name: string; startX: number; startY: number; moved: boolean }

export default function Seating() {
  const { t } = useI18n()
  const { list, add, update, remove } = useStore()
  const tables = list('table')
  const guests = list('guest').filter((g) => g.data.rsvp !== 'declined')
  const floorRef = useRef<HTMLDivElement>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const [hoverTable, setHoverTable] = useState<string | null>(null)
  const [livePos, setLivePos] = useState<Record<string, { x: number; y: number }>>({})
  const [editing, setEditing] = useState<{ row?: Row<'table'>; data: SeatTable } | null>(null)
  const [onlyAttending, setOnlyAttending] = useState(false)

  const seated = (id: string) => guests.filter((g) => g.data.tableId === id)
  const unseated = guests
    .filter((g) => !g.data.tableId || !tables.some((x) => x.id === g.data.tableId))
    .filter((g) => !onlyAttending || g.data.rsvp === 'attending')
    .sort((a, b) => a.data.group.localeCompare(b.data.group) || a.data.name.localeCompare(b.data.name))
  const totalSeats = tables.reduce((a, b) => a + b.data.seats, 0)
  const seatedCount = guests.filter((g) => g.data.tableId && tables.some((x) => x.id === g.data.tableId)).length

  const tableAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest('[data-table-id]') as HTMLElement | null
    return el?.dataset.tableId ?? null
  }

  const assign = (guestId: string, tableId: string) => {
    const g = guests.find((x) => x.id === guestId)
    if (g) update(g, { tableId })
    setSelectedGuest(null)
  }

  const onTableDown = (ev: RPointerEvent, row: Row<'table'>) => {
    ev.stopPropagation()
    ;(ev.target as HTMLElement).setPointerCapture?.(ev.pointerId)
    setDrag({ type: 'table', id: row.id, startX: ev.clientX, startY: ev.clientY, ox: row.data.x, oy: row.data.y, moved: false })
  }
  const onGuestDown = (ev: RPointerEvent, row: Row<'guest'>) => {
    ;(ev.target as HTMLElement).releasePointerCapture?.(ev.pointerId)
    setDrag({ type: 'guest', id: row.id, name: row.data.name, startX: ev.clientX, startY: ev.clientY, moved: false })
  }

  const onMove = (ev: RPointerEvent) => {
    if (!drag) return
    const dx = ev.clientX - drag.startX
    const dy = ev.clientY - drag.startY
    const moved = drag.moved || Math.hypot(dx, dy) > 6
    if (moved !== drag.moved) setDrag({ ...drag, moved })
    if (!moved) return
    if (drag.type === 'table') {
      const rect = floorRef.current!.getBoundingClientRect()
      const x = Math.min(96, Math.max(4, drag.ox + (dx / rect.width) * 100))
      const y = Math.min(95, Math.max(5, drag.oy + (dy / rect.height) * 100))
      setLivePos((p) => ({ ...p, [drag.id]: { x, y } }))
    } else {
      setGhost({ x: ev.clientX, y: ev.clientY })
      setHoverTable(tableAt(ev.clientX, ev.clientY))
    }
  }

  const onUp = (ev: RPointerEvent) => {
    if (!drag) return
    if (drag.type === 'table') {
      const row = tables.find((x) => x.id === drag.id)
      if (drag.moved && row && livePos[drag.id]) {
        update(row, livePos[drag.id])
      } else if (row) {
        // A tap on a table: seat the selected guest there, or select the table.
        if (selectedGuest) assign(selectedGuest, row.id)
        else setSelectedTable(selectedTable === row.id ? null : row.id)
      }
      setLivePos((p) => {
        const n = { ...p }
        delete n[drag.id]
        return n
      })
    } else {
      if (drag.moved) {
        const target = tableAt(ev.clientX, ev.clientY)
        if (target) assign(drag.id, target)
      } else {
        setSelectedGuest(selectedGuest === drag.id ? null : drag.id)
      }
      setGhost(null)
      setHoverTable(null)
    }
    setDrag(null)
  }

  const onCancel = () => {
    // The browser took over (e.g. the guest list started scrolling): drop the drag, change nothing.
    setDrag(null)
    setGhost(null)
    setHoverTable(null)
    setLivePos({})
  }

  const addTable = async (shape: TableShape) => {
    const n = tables.filter((x) => x.data.shape !== 'long' || shape === 'long').length + 1
    const row = await add('table', {
      name: shape === 'long' ? t('Long table') : String(n),
      shape,
      seats: shape === 'long' ? 8 : 10,
      x: 20 + ((tables.length * 23) % 60),
      y: 30 + ((tables.length * 17) % 50)
    })
    setSelectedTable(row.id)
  }

  const sel = tables.find((x) => x.id === selectedTable)
  const selGuest = guests.find((g) => g.id === selectedGuest)

  return (
    <div onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel}>
      <PageHead eyebrow={t('{seated} seated · {seats} seats', { seated: seatedCount, seats: totalSeats })} title={t('Seating')}>
        <button className="btn" onClick={() => addTable('round')}>
          {t('Round table')}
        </button>
        <button className="btn" onClick={() => addTable('long')}>
          {t('Long table')}
        </button>
        <button className="btn hide-mobile" onClick={() => window.print()}>
          {t('Print')}
        </button>
      </PageHead>

      {selGuest && (
        <div className="banner">
          <span>{t('Tap a table to seat {name}', { name: selGuest.data.name })}</span>
          <button className="btn small ghost" onClick={() => setSelectedGuest(null)}>
            {t('Cancel')}
          </button>
        </div>
      )}

      <div className="seating-layout">
        <div className="card" style={{ padding: 12 }}>
          <div className="floor" ref={floorRef} onPointerDown={() => setSelectedTable(null)}>
            {tables.map((row) => {
              const pos = livePos[row.id] ?? { x: row.data.x, y: row.data.y }
              const { w, h } = tableSize(row.data)
              const people = seated(row.id).length
              const cls = [
                'stable',
                row.data.shape,
                selectedTable === row.id ? 'selected' : '',
                hoverTable === row.id || (selGuest && people < row.data.seats) ? 'target' : '',
                people === row.data.seats ? 'full' : '',
                people > row.data.seats ? 'over' : ''
              ].join(' ')
              return (
                <div
                  key={row.id}
                  data-table-id={row.id}
                  className={cls}
                  style={{ left: pos.x + '%', top: pos.y + '%', width: w, height: h }}
                  onPointerDown={(ev) => onTableDown(ev, row)}
                >
                  {seatPositions(row.data).map((p, i) => (
                    <span key={i} className={'seat' + (i < people ? ' taken' : '')} style={p} />
                  ))}
                  <b>{row.data.name}</b>
                  <span>
                    {people}/{row.data.seats}
                  </span>
                </div>
              )
            })}
            {tables.length === 0 && (
              <div className="empty" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className="serif">{t('Add your first table')}</span>
                {t('Then drag guests onto it.')}
              </div>
            )}
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>
            {t('Drag tables to arrange the room. Drag a guest onto a table, or tap a guest and then a table.')}
          </p>
        </div>

        <div>
          {sel ? (
            <div className="card">
              <div className="card-head">
                <h2 className="section">
                  {t('Table')} {sel.data.name}
                </h2>
                <button className="btn small" onClick={() => setEditing({ row: sel, data: { ...sel.data } })}>
                  {t('Edit')}
                </button>
              </div>
              {seated(sel.id).length === 0 ? (
                <p className="muted small">{t('Nobody seated here yet.')}</p>
              ) : (
                <div className="list">
                  {seated(sel.id).map((g) => (
                    <div key={g.id} className="item" style={{ minHeight: 44, padding: '8px 0' }}>
                      <div className="grow">
                        <div className="title">{g.data.name}</div>
                        <div className="meta">{[t(g.data.group), g.data.diet].filter(Boolean).join(' · ')}</div>
                      </div>
                      <button className="btn small ghost" onClick={() => update(g, { tableId: undefined })}>
                        {t('Remove')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
          <div className="card">
            <div className="card-head">
              <h2 className="section">
                {t('Not seated')} · {unseated.length}
              </h2>
              <button className={'chip' + (onlyAttending ? ' on' : '')} onClick={() => setOnlyAttending(!onlyAttending)}>
                {t('Attending only')}
              </button>
            </div>
            {unseated.length === 0 ? (
              <p className="muted small">{t('Everyone has a seat.')}</p>
            ) : (
              <div style={{ maxHeight: 460, overflow: 'auto' }}>
                {unseated.map((g) => (
                  <div key={g.id} className={'guest-chip' + (selectedGuest === g.id ? ' selected' : '')} onPointerDown={(ev) => onGuestDown(ev, g)}>
                    <span>{g.data.name}</span>
                    <span className="small muted">{t(g.data.group)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {drag?.type === 'guest' && drag.moved && ghost && (
        <div className="drag-ghost" style={{ left: ghost.x, top: ghost.y }}>
          ⠿ {drag.name}
        </div>
      )}

      {editing && (
        <Sheet
          title={t('Table') + ' ' + editing.data.name}
          onClose={() => setEditing(null)}
          onSave={async () => {
            if (editing.row) await update(editing.row, editing.data)
            setEditing(null)
          }}
          onDelete={
            editing.row
              ? async () => {
                  for (const g of seated(editing.row!.id)) await update(g, { tableId: undefined })
                  await remove(editing.row!.id)
                  setSelectedTable(null)
                  setEditing(null)
                }
              : undefined
          }
        >
          <div className="form">
            <Field label={t('Name')}>
              <Text value={editing.data.name} onChange={(v) => setEditing({ ...editing, data: { ...editing.data, name: v } })} />
            </Field>
            <Field label={t('Seats')}>
              <Text
                type="number"
                value={editing.data.seats}
                onChange={(v) => setEditing({ ...editing, data: { ...editing.data, seats: Math.max(1, Math.min(40, Math.round(num(v)) || 1)) } })}
              />
            </Field>
            <Field label={t('Shape')}>
              <Select
                value={editing.data.shape}
                onChange={(v) => setEditing({ ...editing, data: { ...editing.data, shape: v } })}
                options={[
                  { value: 'round', label: t('Round') },
                  { value: 'long', label: t('Long') }
                ]}
              />
            </Field>
          </div>
        </Sheet>
      )}
    </div>
  )
}
