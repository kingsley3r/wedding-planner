import { useMemo, useRef, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { Guest, Row, Rsvp, Side } from '../lib/types'
import { Empty, Fab, Field, PageHead, Select, Sheet, Text } from '../components/ui'

const RSVPS: Rsvp[] = ['pending', 'invited', 'attending', 'declined']
const RSVP_TONE: Record<Rsvp, string> = { pending: '', invited: 'warn', attending: 'ok', declined: 'bad' }
const RSVP_LABEL: Record<Rsvp, string> = {
  pending: 'Not invited yet',
  invited: 'Invited',
  attending: 'Attending',
  declined: 'Declined'
}
const SIDE_LABEL: Record<Side, string> = { bride: 'Bride', groom: 'Groom', both: 'Both' }
export const GROUPS = ['Family', 'Church', 'Friends', 'Work', 'Neighbours', 'Other']

const blank = (): Guest => ({ name: '', side: 'both', group: 'Family', rsvp: 'pending' })

/** Very small CSV parser: handles quotes, commas and semicolons (Excel in German/Romanian uses ;). */
function parseCsv(text: string): string[][] {
  const sep = (text.split('\n')[0].match(/;/g)?.length ?? 0) > (text.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === sep) {
      row.push(cell.trim())
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell.trim())
      if (row.some((x) => x)) rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  row.push(cell.trim())
  if (row.some((x) => x)) rows.push(row)
  return rows
}

export default function Guests() {
  const { t } = useI18n()
  const { list, add, update, remove, settings } = useStore()
  const guests = list('guest')
  const tables = list('table')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Rsvp | 'all'>('all')
  const [side, setSide] = useState<Side | 'all'>('all')
  const [editing, setEditing] = useState<{ row?: Row<'guest'>; data: Guest } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const shown = useMemo(
    () =>
      guests
        .filter((g) => filter === 'all' || g.data.rsvp === filter)
        .filter((g) => side === 'all' || g.data.side === side)
        .filter((g) => {
          const s = q.trim().toLowerCase()
          return !s || [g.data.name, g.data.group, g.data.household].some((x) => x?.toLowerCase().includes(s))
        })
        .sort((a, b) => a.data.name.localeCompare(b.data.name)),
    [guests, filter, side, q]
  )

  const count = (r: Rsvp) => guests.filter((g) => g.data.rsvp === r).length
  const tableName = (id?: string) => tables.find((x) => x.id === id)?.data.name

  const save = async () => {
    if (!editing || !editing.data.name.trim()) return
    if (editing.row) await update(editing.row, editing.data)
    else await add('guest', editing.data)
    setEditing(null)
  }

  const cycle = (g: Row<'guest'>) => {
    const next = RSVPS[(RSVPS.indexOf(g.data.rsvp) + 1) % RSVPS.length]
    update(g, { rsvp: next })
  }

  const importCsv = async (file: File) => {
    const rows = parseCsv(await file.text())
    if (!rows.length) return
    const header = rows[0].map((h) => h.toLowerCase())
    const hasHeader = header.some((h) => ['name', 'nume', 'side', 'group', 'email', 'phone', 'telefon'].includes(h))
    const col = (names: string[]) => header.findIndex((h) => names.includes(h))
    const ci = hasHeader
      ? {
          name: col(['name', 'nume', 'guest']),
          side: col(['side', 'seite', 'parte']),
          group: col(['group', 'gruppe', 'grup']),
          phone: col(['phone', 'telefon', 'tel']),
          email: col(['email', 'e-mail'])
        }
      : { name: 0, side: -1, group: -1, phone: -1, email: -1 }
    const body = hasHeader ? rows.slice(1) : rows
    let n = 0
    for (const r of body) {
      const name = r[ci.name >= 0 ? ci.name : 0]
      if (!name) continue
      const sideRaw = (ci.side >= 0 ? r[ci.side] : '').toLowerCase()
      const sideVal: Side = /bride|braut|mireas/.test(sideRaw) ? 'bride' : /groom|bräut|ginere|mire/.test(sideRaw) ? 'groom' : 'both'
      await add('guest', {
        name,
        side: sideVal,
        group: (ci.group >= 0 && r[ci.group]) || 'Other',
        phone: ci.phone >= 0 ? r[ci.phone] : undefined,
        email: ci.email >= 0 ? r[ci.email] : undefined,
        rsvp: 'pending'
      })
      n++
    }
    alert(t('Imported {n} guests.', { n }))
  }

  const e = editing?.data
  const set = (p: Partial<Guest>) => editing && setEditing({ ...editing, data: { ...editing.data, ...p } })

  return (
    <>
      <PageHead eyebrow={t('{n} of {target} expected', { n: count('attending'), target: settings!.data.guestTarget })} title={t('Guests & RSVPs')}>
        <button className="btn hide-mobile" onClick={() => fileRef.current?.click()}>
          {t('Import CSV')}
        </button>
        <button className="btn primary hide-mobile" onClick={() => setEditing({ data: blank() })}>
          {t('Add guest')}
        </button>
      </PageHead>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(ev) => {
          const f = ev.target.files?.[0]
          if (f) importCsv(f)
          ev.target.value = ''
        }}
      />

      <div className="stats compact">
        {(['attending', 'invited', 'pending', 'declined'] as Rsvp[]).map((r) => (
          <button
            key={r}
            className="card stat"
            style={{ textAlign: 'left', cursor: 'pointer', outline: filter === r ? '2px solid var(--line)' : undefined }}
            onClick={() => setFilter(filter === r ? 'all' : r)}
          >
            <h2 className="section">{t(RSVP_LABEL[r])}</h2>
            <div className="big">{count(r)}</div>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <input className="input search" placeholder={t('Search guests')} value={q} onChange={(ev) => setQ(ev.target.value)} />
          <div className="chips">
            {(['all', 'bride', 'groom', 'both'] as const).map((s) => (
              <button key={s} className={'chip' + (side === s ? ' on' : '')} onClick={() => setSide(s)}>
                {s === 'all' ? t('All') : t(SIDE_LABEL[s])}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <Empty title={guests.length ? t('No guests match') : t('No guests yet')}>
            <div className="row-gap" style={{ justifyContent: 'center', marginTop: 12 }}>
              <button className="btn primary" onClick={() => setEditing({ data: blank() })}>
                {t('Add guest')}
              </button>
              <button className="btn" onClick={() => fileRef.current?.click()}>
                {t('Import CSV')}
              </button>
            </div>
          </Empty>
        ) : (
          <div className="list">
            {shown.map((g) => (
              <div key={g.id} className="item clickable" onClick={() => setEditing({ row: g, data: { ...g.data } })}>
                <div className="grow">
                  <div className="title">{g.data.name}</div>
                  <div className="meta">
                    {[t(SIDE_LABEL[g.data.side]), t(g.data.group), tableName(g.data.tableId) && `${t('Table')} ${tableName(g.data.tableId)}`, g.data.diet]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <button
                  className={'pill ' + RSVP_TONE[g.data.rsvp]}
                  style={{ cursor: 'pointer' }}
                  title={t('Tap to change')}
                  onClick={(ev) => {
                    ev.stopPropagation()
                    cycle(g)
                  }}
                >
                  {t(RSVP_LABEL[g.data.rsvp])}
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="small muted hide-desktop" style={{ marginTop: 12 }}>
          <button className="btn small" onClick={() => fileRef.current?.click()}>
            {t('Import CSV')}
          </button>
        </p>
      </div>

      <Fab label={t('Add guest')} onClick={() => setEditing({ data: blank() })} />

      {editing && e && (
        <Sheet
          title={editing.row ? e.name || t('Guest') : t('Add guest')}
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
            <Field label={t('Name')} full>
              <Text value={e.name} onChange={(v) => set({ name: v })} autoFocus={!editing.row} required />
            </Field>
            <Field label={t('Side')}>
              <Select value={e.side} onChange={(v) => set({ side: v })} options={(['bride', 'groom', 'both'] as Side[]).map((s) => ({ value: s, label: t(SIDE_LABEL[s]) }))} />
            </Field>
            <Field label={t('Group')}>
              <Select
                value={e.group}
                onChange={(v) => set({ group: v })}
                options={[...new Set([...GROUPS, e.group])].map((g) => ({ value: g, label: t(g) }))}
              />
            </Field>
            <Field label={t('RSVP')}>
              <Select value={e.rsvp} onChange={(v) => set({ rsvp: v })} options={RSVPS.map((r) => ({ value: r, label: t(RSVP_LABEL[r]) }))} />
            </Field>
            <Field label={t('Table')}>
              <Select
                value={e.tableId ?? ''}
                onChange={(v) => set({ tableId: v || undefined })}
                options={[{ value: '', label: '—' }, ...tables.map((x) => ({ value: x.id, label: x.data.name }))]}
              />
            </Field>
            <Field label={t('Household / plus-one of')}>
              <Text value={e.household} onChange={(v) => set({ household: v })} />
            </Field>
            <Field label={t('Meal')}>
              <Text value={e.meal} onChange={(v) => set({ meal: v })} placeholder={t('e.g. Standard, Vegetarian, Kids')} />
            </Field>
            <Field label={t('Dietary needs')}>
              <Text value={e.diet} onChange={(v) => set({ diet: v })} placeholder={t('e.g. no nuts')} />
            </Field>
            <Field label={t('Child')}>
              <Select
                value={e.child ? 'yes' : 'no'}
                onChange={(v) => set({ child: v === 'yes' })}
                options={[
                  { value: 'no', label: t('No') },
                  { value: 'yes', label: t('Yes') }
                ]}
              />
            </Field>
            <Field label={t('Phone')}>
              <Text type="tel" value={e.phone} onChange={(v) => set({ phone: v })} />
            </Field>
            <Field label={t('Email')}>
              <Text type="email" value={e.email} onChange={(v) => set({ email: v })} />
            </Field>
            <Field label={t('Notes')} full>
              <Text value={e.notes} onChange={(v) => set({ notes: v })} />
            </Field>
          </div>
        </Sheet>
      )}
    </>
  )
}
