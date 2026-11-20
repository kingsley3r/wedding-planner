import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { HmDest, HmExpense, HmStatus, HmStay, Row } from '../lib/types'
import { fmtDate, money, num, resizeImage } from '../lib/util'
import { Bar, Empty, Fab, Field, PageHead, Sheet, Text } from '../components/ui'

/** Places that suit a honeymoon in mid to late August, leaving from Austria. Rough guides only. */
export const PROPOSALS: (Omit<HmDest, 'status'> & { tone: string; wiki: string })[] = [
  { name: 'Madeira', wiki: 'Ponta de São Lourenço', country: 'Portugal', airport: 'FNC', flightHours: 4, estCost: 3800, weather: '24–26°, mild and sunny', why: 'Cliffs, levada walks, ocean pools and quiet boutique hotels. Not too hot in August.', tone: 'sage' },
  { name: 'Santorini and Naxos', wiki: 'Oia, Greece', country: 'Greece', airport: 'JTR', flightHours: 2.5, estCost: 4200, weather: '28–30°, dry, windy evenings', why: 'Famous sunsets on Santorini, then calmer beaches on Naxos. Book early for August.', tone: 'sky' },
  { name: 'Amalfi Coast', wiki: 'Positano', country: 'Italy', airport: 'NAP', flightHours: 1.5, estCost: 4500, weather: '30°, hot and dry', why: 'Cliffside villages, boat days to Capri, and great food. Busy in August.', tone: 'gold' },
  { name: 'Mauritius', wiki: 'Le Morne Brabant', country: 'Mauritius', airport: 'MRU', flightHours: 13, estCost: 6500, weather: '23–25°, dry winter season', why: 'Lagoons, resorts with private beaches, and pleasant temperatures in August.', tone: 'sky' },
  { name: 'Zanzibar', wiki: 'Nungwi', country: 'Tanzania', airport: 'ZNZ', flightHours: 9, estCost: 4800, weather: '28°, dry season', why: 'White beaches and Stone Town. Can be combined with a short safari.', tone: 'gold' },
  { name: 'Bali', wiki: 'Tanah Lot', country: 'Indonesia', airport: 'DPS', flightHours: 16, estCost: 5200, weather: '27°, dry season', why: 'Rice terraces, villas with pools, and beaches. Long flight but great value once there.', tone: 'sage' },
  { name: 'Seychelles', wiki: "Anse Source d'Argent", country: 'Seychelles', airport: 'SEZ', flightHours: 11, estCost: 7500, weather: '26–27°, breezy', why: 'Some of the most beautiful beaches in the world, very private and calm.', tone: 'rose' },
  { name: 'Maldives', wiki: 'Maldives', country: 'Maldives', airport: 'MLE', flightHours: 11, estCost: 8000, weather: '29°, some showers in August', why: 'Overwater villas and snorkelling. Lower prices in August, with short tropical showers.', tone: 'sky' },
  { name: 'Croatian islands', wiki: 'Hvar (town)', country: 'Croatia', airport: 'SPU', flightHours: 1, estCost: 3000, weather: '28°, sunny', why: 'Hvar, Vis and Brač by boat. Close to home, you could even drive.', tone: 'rose' },
  { name: 'Norwegian fjords', wiki: 'Geirangerfjord', country: 'Norway', airport: 'BGO', flightHours: 2.5, estCost: 4500, weather: '18–20°, cool', why: 'A cool, dramatic alternative: fjord cruises, cabins and long summer evenings.', tone: 'sage' }
]

const STATUS_LABEL: Record<HmStatus, string> = { idea: 'Idea', shortlist: 'Shortlist', chosen: 'Our choice' }
const EXPENSE_CATS = ['Flights', 'Stay', 'Food', 'Activities', 'Transport', 'Shopping', 'Other']

const ymd = (d?: string) => (d ? d.replace(/-/g, '').slice(2) : '')
export function flightLinks(from: string, to: string, depart?: string, back?: string) {
  const g = `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${from} to ${to}${depart ? ` on ${depart}` : ''}${back ? ` through ${back}` : ''} for 2 adults`)}`
  const s = `https://www.skyscanner.at/transport/flights/${from.toLowerCase()}/${to.toLowerCase()}/${ymd(depart)}${back ? '/' + ymd(back) : ''}/?adultsv2=2`
  return { google: g, skyscanner: s }
}
export function stayLink(city: string, start?: string, end?: string) {
  const q = new URLSearchParams({ ss: city, group_adults: '2', no_rooms: '1' })
  if (start) q.set('checkin', start)
  if (end) q.set('checkout', end)
  return `https://www.booking.com/searchresults.html?${q}`
}

const WIKI_KEY = 'wp-wiki-photos'
const wikiCache: Record<string, string> = (() => {
  try {
    return JSON.parse(localStorage.getItem(WIKI_KEY) ?? '{}')
  } catch {
    return {}
  }
})()
const wikiPending = new Map<string, Promise<string>>()

/** A landscape photo for a place, from the Wikipedia article's images. Empty when none is found. */
export function wikiPhoto(title: string): Promise<string> {
  if (title in wikiCache) return Promise.resolve(wikiCache[title])
  const hit = wikiPending.get(title)
  if (hit) return hit
  const api = 'https://en.wikipedia.org/api/rest_v1/page/'
  const t = encodeURIComponent(title.replace(/ /g, '_'))
  const isPhoto = (u?: string) => !!u && /\.(jpe?g|png|webp)$/i.test(u.split('?')[0]) && !/flag|map|locator|coat_of_arms|logo/i.test(u)
  const job = (async () => {
    let url = ''
    try {
      const r = await fetch(api + 'summary/' + t)
      if (r.ok) {
        const d = await r.json()
        const o = d.originalimage
        if (isPhoto(o?.source)) url = o.width > 1280 && d.thumbnail?.source ? d.thumbnail.source.replace(/\/\d+px-/, '/1280px-') : o.source
      }
      if (!url) {
        const m = await fetch(api + 'media-list/' + t)
        if (m.ok) {
          const d = await m.json()
          for (const it of d.items ?? []) {
            const src: string | undefined = it.srcset?.[it.srcset.length - 1]?.src
            if (it.type === 'image' && isPhoto(it.title) && src) {
              url = src.startsWith('//') ? 'https:' + src : src
              break
            }
          }
        }
      }
    } catch {
      return '' // offline: try again next time
    }
    wikiCache[title] = url
    try {
      localStorage.setItem(WIKI_KEY, JSON.stringify(wikiCache))
    } catch {
      /* ignore */
    }
    return url
  })()
  wikiPending.set(title, job)
  return job
}

function useWikiPhoto(title?: string) {
  const [url, setUrl] = useState(title ? wikiCache[title] ?? '' : '')
  useEffect(() => {
    if (!title) return
    let live = true
    wikiPhoto(title).then((u) => live && setUrl(u))
    return () => {
      live = false
    }
  }, [title])
  return url
}

const wikiFor = (name: string) => PROPOSALS.find((p) => p.name === name)?.wiki ?? name

function Cover({ d, tone, lookup }: { d: { name: string; photo?: string }; tone?: string; lookup?: string }) {
  const auto = useWikiPhoto(d.photo ? undefined : lookup)
  const src = d.photo || auto
  return (
    <div className={'hm-cover tone-' + (tone ?? 'sky') + (src ? ' has-photo' : ' hm-cover-plain')} style={src ? { backgroundImage: `url("${src}")` } : undefined}>
      {!src && <span>{d.name}</span>}
    </div>
  )
}

function Stars({ value, onChange, label }: { value?: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="stars" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className={(value ?? 0) >= n ? 'on' : ''} onClick={(e) => (e.stopPropagation(), onChange(n === value ? 0 : n))} aria-label={`${n}`}>
          ♥
        </button>
      ))}
    </div>
  )
}

function PhotoField({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  const { t } = useI18n()
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const isLink = !!value && /^https?:/.test(value)
  return (
    <div className="photo-field">
      {value && <div className="photo-preview" style={{ backgroundImage: `url("${value}")` }} />}
      <div className="row-gap">
        <button type="button" className="btn small" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? t('Adding…') : value ? t('Change photo') : t('Add photo')}
        </button>
        {value && (
          <button type="button" className="btn small ghost" onClick={() => onChange(undefined)}>
            {t('Remove')}
          </button>
        )}
      </div>
      <input
        className="input"
        type="url"
        inputMode="url"
        placeholder={t('…or paste a photo link')}
        value={isLink ? value : ''}
        onChange={(ev) => onChange(ev.target.value.trim() || undefined)}
      />
      {err && <div className="small" style={{ color: 'var(--rose-ink, #a0524f)' }}>{err}</div>}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={async (ev) => {
          const f = ev.target.files?.[0]
          ev.target.value = ''
          if (!f) return
          setBusy(true)
          setErr('')
          try {
            onChange(await resizeImage(f, 1000, 0.75))
          } catch {
            setErr(t('That photo could not be read. Try a screenshot of it, or paste a link.'))
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}

/** Edit sheet shared by the four kinds of honeymoon rows. */
function useEditor<K extends 'hmDest' | 'hmFlight' | 'hmStay' | 'hmExpense'>(kind: K, isValid: (d: Row<K>['data']) => boolean) {
  const { add, update, remove } = useStore()
  const [editing, setEditing] = useState<{ row?: Row<K>; data: Row<K>['data'] } | null>(null)
  const set = (p: Partial<Row<K>['data']>) => setEditing((cur) => (cur ? { ...cur, data: { ...cur.data, ...p } } : cur))
  const save = async () => {
    if (!editing || !isValid(editing.data)) return
    if (editing.row) await update(editing.row, editing.data)
    else await add(kind, editing.data)
    setEditing(null)
  }
  const del = editing?.row
    ? async () => {
        await remove(editing.row!.id)
        setEditing(null)
      }
    : undefined
  return { editing, setEditing, set, save, del }
}

export default function Honeymoon() {
  const { tab = 'ideas' } = useParams()
  const { t } = useI18n()
  const { settings } = useStore()
  const s = settings!.data
  const range = s.honeymoonStart && s.honeymoonEnd ? `${s.honeymoonStart} – ${s.honeymoonEnd}` : ''
  return (
    <>
      <PageHead eyebrow={range || t('After the wedding')} title={t('Honeymoon')} />
      {tab === 'flights' ? <Flights /> : tab === 'stays' ? <Stays /> : tab === 'budget' ? <Budget /> : <Ideas />}
    </>
  )
}

function Ideas() {
  const { t, lang } = useI18n()
  const { list, add, update, settings, saveSettings } = useStore()
  const s = settings!.data
  const dests = list('hmDest')
  const ed = useEditor('hmDest', (d) => !!d.name.trim())
  const e = ed.editing?.data
  const flights = list('hmFlight')
  const stays = list('hmStay')
  const order: HmStatus[] = ['chosen', 'shortlist', 'idea']
  const compare = dests.filter((d) => d.data.status !== 'idea')
  const cheapestFlight = (id: string) => Math.min(...flights.filter((f) => f.data.destId === id).map((f) => f.data.price))
  const cheapestNight = (id: string) => Math.min(...stays.filter((x) => x.data.destId === id && x.data.pricePerNight).map((x) => x.data.pricePerNight!))
  const fmt = (n: number) => (Number.isFinite(n) ? money(n, lang) : '—')

  return (
    <>
      <div className="card">
        <div className="form">
          <Field label={t('Leaving')}>
            <Text type="date" value={s.honeymoonStart} onChange={(v) => saveSettings({ honeymoonStart: v || undefined })} />
          </Field>
          <Field label={t('Coming home')}>
            <Text type="date" value={s.honeymoonEnd} onChange={(v) => saveSettings({ honeymoonEnd: v || undefined })} />
          </Field>
          <Field label={t('Flying from')}>
            <Text value={s.homeAirport ?? 'VIE'} onChange={(v) => saveSettings({ homeAirport: v.toUpperCase().slice(0, 3) || undefined })} placeholder="VIE" />
          </Field>
          <Field label={t('Honeymoon budget (EUR)')}>
            <Text type="number" value={s.honeymoonBudget ?? ''} onChange={(v) => saveSettings({ honeymoonBudget: num(v) || undefined })} />
          </Field>
        </div>
      </div>

      {compare.length > 1 && (
        <div className="card">
          <div className="card-head">
            <h2 className="section">{t('Compare')}</h2>
          </div>
          <div className="hm-compare">
            <table className="doc-table">
              <thead>
                <tr>
                  <th />
                  {compare.map((d) => (
                    <th key={d.id}>{d.data.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t('Rough cost')}</td>
                  {compare.map((d) => (
                    <td key={d.id}>{d.data.estCost ? money(d.data.estCost, lang) : '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td>{t('Flight time')}</td>
                  {compare.map((d) => (
                    <td key={d.id}>{d.data.flightHours ? `${d.data.flightHours} h` : '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td>{t('Weather')}</td>
                  {compare.map((d) => (
                    <td key={d.id}>{d.data.weather ? t(d.data.weather) : '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td>{t('Cheapest flight')}</td>
                  {compare.map((d) => (
                    <td key={d.id}>{fmt(cheapestFlight(d.id))}</td>
                  ))}
                </tr>
                <tr>
                  <td>{t('Cheapest night')}</td>
                  {compare.map((d) => (
                    <td key={d.id}>{fmt(cheapestNight(d.id))}</td>
                  ))}
                </tr>
                <tr>
                  <td>{s.partner1}</td>
                  {compare.map((d) => (
                    <td key={d.id}>{'♥'.repeat(d.data.rating1 ?? 0) || '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td>{s.partner2}</td>
                  {compare.map((d) => (
                    <td key={d.id}>{'♥'.repeat(d.data.rating2 ?? 0) || '—'}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {order.map((st) => {
        const rows = dests.filter((d) => d.data.status === st)
        if (!rows.length) return null
        return (
          <div key={st}>
            <h2 className="section hm-h">{t(STATUS_LABEL[st])}</h2>
            <div className="hm-grid">
              {rows.map((d) => (
                <div key={d.id} className={'card hm-card' + (st === 'chosen' ? ' chosen' : '')} onClick={() => ed.setEditing({ row: d, data: { ...d.data } })}>
                  <Cover d={d.data} tone={PROPOSALS.find((p) => p.name === d.data.name)?.tone} lookup={wikiFor(d.data.name)} />
                  <div className="hm-body">
                    <div className="eyebrow">{t(d.data.country ?? '')}</div>
                    <h3>{t(d.data.name)}</h3>
                    {d.data.why && <p className="small">{t(d.data.why)}</p>}
                    <div className="meta small muted">
                      {[d.data.estCost ? `~${money(d.data.estCost, lang)}` : '', d.data.flightHours ? `${d.data.flightHours} h ✈` : '', d.data.weather ? t(d.data.weather) : ''].filter(Boolean).join(' · ')}
                    </div>
                    <div className="hm-ratings">
                      <span className="small">{s.partner1}</span>
                      <Stars value={d.data.rating1} label={s.partner1} onChange={(v) => update(d, { rating1: v || undefined })} />
                      <span className="small">{s.partner2}</span>
                      <Stars value={d.data.rating2} label={s.partner2} onChange={(v) => update(d, { rating2: v || undefined })} />
                    </div>
                    <div className="chips" onClick={(ev) => ev.stopPropagation()}>
                      {(['idea', 'shortlist', 'chosen'] as HmStatus[]).map((k) => (
                        <button key={k} className={'chip' + (d.data.status === k ? ' on' : '')} onClick={() => update(d, { status: k })}>
                          {t(STATUS_LABEL[k])}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <h2 className="section hm-h">{t('Ideas for August')}</h2>
      <p className="small muted" style={{ marginBottom: 12 }}>
        {t('Places that suit late August, leaving from Austria. Costs are a rough guide for two people for about ten days.')}
      </p>
      <div className="hm-grid">
        {PROPOSALS.filter((p) => !dests.some((d) => d.data.name === p.name)).map((p) => (
          <div key={p.name} className="card hm-card">
            <Cover d={p} tone={p.tone} lookup={p.wiki} />
            <div className="hm-body">
              <div className="eyebrow">{t(p.country!)}</div>
              <h3>{t(p.name)}</h3>
              <p className="small">{t(p.why!)}</p>
              <div className="meta small muted">
                ~{money(p.estCost!, lang)} · {p.flightHours} h ✈ · {t(p.weather!)}
              </div>
              <button
                className="btn small"
                style={{ marginTop: 10 }}
                onClick={async () => {
                  const { tone: _tone, wiki, ...rest } = p
                  void _tone
                  const photo = await wikiPhoto(wiki)
                  add('hmDest', { ...rest, ...(photo ? { photo } : {}), status: 'idea' })
                }}
              >
                + {t('Add to our ideas')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Fab label={t('Add destination')} onClick={() => ed.setEditing({ data: { name: '', status: 'idea' } })} />
      <button className="btn primary hide-mobile" style={{ marginTop: 16 }} onClick={() => ed.setEditing({ data: { name: '', status: 'idea' } })}>
        {t('Add destination')}
      </button>

      {ed.editing && e && (
        <Sheet title={ed.editing.row ? t(e.name) : t('Add destination')} onClose={() => ed.setEditing(null)} onSave={ed.save} onDelete={ed.del}>
          <div className="form">
            <Field label={t('Place')}>
              <Text value={e.name} onChange={(v) => ed.set({ name: v })} autoFocus={!ed.editing.row} required />
            </Field>
            <Field label={t('Country')}>
              <Text value={e.country} onChange={(v) => ed.set({ country: v || undefined })} />
            </Field>
            <Field label={t('Rough cost (EUR)')}>
              <Text type="number" value={e.estCost ?? ''} onChange={(v) => ed.set({ estCost: num(v) || undefined })} />
            </Field>
            <Field label={t('Flight time (hours)')}>
              <Text type="number" value={e.flightHours ?? ''} onChange={(v) => ed.set({ flightHours: num(v) || undefined })} />
            </Field>
            <Field label={t('Airport code')}>
              <Text value={e.airport} onChange={(v) => ed.set({ airport: v.toUpperCase().slice(0, 3) || undefined })} placeholder="FNC" />
            </Field>
            <Field label={t('Weather')}>
              <Text value={e.weather} onChange={(v) => ed.set({ weather: v || undefined })} />
            </Field>
            <Field label={t('Why we like it')} full>
              <Text value={e.why} onChange={(v) => ed.set({ why: v || undefined })} />
            </Field>
            <Field label={t('Link (blog, video, review)')} full>
              <Text type="url" value={e.link} onChange={(v) => ed.set({ link: v || undefined })} />
            </Field>
            <Field label={t('Notes')} full>
              <textarea className="input" style={{ minHeight: 80 }} value={e.notes ?? ''} onChange={(ev) => ed.set({ notes: ev.target.value || undefined })} />
            </Field>
            <Field label={t('Photo')} full>
              <PhotoField value={e.photo} onChange={(v) => ed.set({ photo: v })} />
            </Field>
          </div>
          {e.link && (
            <a className="btn small ghost" href={e.link} target="_blank" rel="noreferrer" style={{ marginTop: 10 }}>
              {t('Open link')} ↗
            </a>
          )}
        </Sheet>
      )}
    </>
  )
}

function DestPicker({ value, onChange }: { value?: string; onChange: (id?: string) => void }) {
  const { t } = useI18n()
  const { list } = useStore()
  const dests = list('hmDest').filter((d) => d.data.status !== 'idea' || d.id === value)
  if (!dests.length) return <p className="small muted">{t('Shortlist a destination first to link it here.')}</p>
  return (
    <div className="chips">
      {dests.map((d) => (
        <button type="button" key={d.id} className={'chip' + (value === d.id ? ' on' : '')} onClick={() => onChange(value === d.id ? undefined : d.id)}>
          {t(d.data.name)}
        </button>
      ))}
    </div>
  )
}

function SearchLinks({ children }: { children: ReactNode }) {
  return <div className="card hm-search">{children}</div>
}

function Flights() {
  const { t, lang } = useI18n()
  const { list, update, settings } = useStore()
  const s = settings!.data
  const flights = list('hmFlight').sort((a, b) => a.data.price - b.data.price)
  const dests = list('hmDest').filter((d) => d.data.status !== 'idea' && d.data.airport)
  const ed = useEditor('hmFlight', (d) => !!d.airline.trim() && d.price > 0)
  const e = ed.editing?.data
  const fastest = Math.min(...flights.filter((f) => f.data.hours).map((f) => f.data.hours!))
  const destName = (id?: string) => list('hmDest').find((d) => d.id === id)?.data.name
  const from = s.homeAirport || 'VIE'

  return (
    <>
      <SearchLinks>
        <h2 className="section" style={{ marginBottom: 8 }}>
          {t('Search and compare')}
        </h2>
        {dests.length === 0 ? (
          <p className="small muted">{t('Shortlist destinations and give them an airport code to get search links here.')}</p>
        ) : (
          <div className="list">
            {dests.map((d) => {
              const l = flightLinks(from, d.data.airport!, s.honeymoonStart, s.honeymoonEnd)
              return (
                <div key={d.id} className="item">
                  <div className="grow">
                    <div className="title">
                      {from} → {d.data.airport} · {t(d.data.name)}
                    </div>
                    <div className="meta">{s.honeymoonStart ? `${fmtDate(s.honeymoonStart, lang)} – ${fmtDate(s.honeymoonEnd, lang)}` : t('Set your dates on the Ideas tab')}</div>
                  </div>
                  <a className="btn small" href={l.google} target="_blank" rel="noreferrer">
                    Google
                  </a>
                  <a className="btn small ghost" href={l.skyscanner} target="_blank" rel="noreferrer">
                    Skyscanner
                  </a>
                </div>
              )
            })}
          </div>
        )}
        <p className="small muted" style={{ marginTop: 8 }}>
          {t('Found a good one? Add it below with the price for both of you, and the app sorts them for you.')}
        </p>
      </SearchLinks>

      {flights.length === 0 ? (
        <div className="card">
          <Empty title={t('No flights saved yet')} />
        </div>
      ) : (
        <div className="card">
          <div className="list">
            {flights.map((f, i) => (
              <div key={f.id} className="item clickable" onClick={() => ed.setEditing({ row: f, data: { ...f.data } })}>
                <button
                  className={'check' + (f.data.chosen ? ' on' : '')}
                  aria-label={t('Our choice')}
                  onClick={(ev) => {
                    ev.stopPropagation()
                    update(f, { chosen: !f.data.chosen || undefined })
                  }}
                />
                <div className="grow">
                  <div className="title">
                    {f.data.airline} {f.data.from && f.data.to ? `· ${f.data.from} → ${f.data.to}` : ''}
                  </div>
                  <div className="meta">
                    {[destName(f.data.destId) ? t(destName(f.data.destId)!) : '', f.data.depart ? fmtDate(f.data.depart, lang, { day: 'numeric', month: 'short' }) : '', f.data.hours ? `${f.data.hours} h` : '', f.data.stops != null ? (f.data.stops ? t('{n} stops', { n: f.data.stops }) : t('Direct')) : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  <div className="row-gap" style={{ marginTop: 4 }}>
                    {i === 0 && flights.length > 1 && <span className="pill ok">{t('Cheapest')}</span>}
                    {f.data.hours === fastest && flights.length > 1 && <span className="pill sky">{t('Fastest')}</span>}
                    {f.data.chosen && <span className="pill warn">{t('Our choice')}</span>}
                  </div>
                </div>
                <b className="money">{money(f.data.price, lang)}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      <Fab label={t('Add flight')} onClick={() => ed.setEditing({ data: { airline: '', price: 0, from } })} />
      <button className="btn primary hide-mobile" style={{ marginTop: 16 }} onClick={() => ed.setEditing({ data: { airline: '', price: 0, from } })}>
        {t('Add flight')}
      </button>

      {ed.editing && e && (
        <Sheet title={ed.editing.row ? e.airline : t('Add flight')} onClose={() => ed.setEditing(null)} onSave={ed.save} onDelete={ed.del}>
          <div className="form">
            <Field label={t('Airline')}>
              <Text value={e.airline} onChange={(v) => ed.set({ airline: v })} autoFocus={!ed.editing.row} required />
            </Field>
            <Field label={t('Price for both (EUR)')}>
              <Text type="number" value={e.price || ''} onChange={(v) => ed.set({ price: num(v) })} required />
            </Field>
            <Field label={t('From')}>
              <Text value={e.from} onChange={(v) => ed.set({ from: v.toUpperCase() || undefined })} placeholder="VIE" />
            </Field>
            <Field label={t('To')}>
              <Text value={e.to} onChange={(v) => ed.set({ to: v.toUpperCase() || undefined })} placeholder="FNC" />
            </Field>
            <Field label={t('Outbound')}>
              <Text type="date" value={e.depart} onChange={(v) => ed.set({ depart: v || undefined })} />
            </Field>
            <Field label={t('Return')}>
              <Text type="date" value={e.back} onChange={(v) => ed.set({ back: v || undefined })} />
            </Field>
            <Field label={t('Travel time (hours)')}>
              <Text type="number" value={e.hours ?? ''} onChange={(v) => ed.set({ hours: num(v) || undefined })} />
            </Field>
            <Field label={t('Stops')}>
              <Text type="number" value={e.stops ?? ''} onChange={(v) => ed.set({ stops: v === '' ? undefined : Math.round(num(v)) })} />
            </Field>
            <Field label={t('Destination')} full>
              <DestPicker value={e.destId} onChange={(v) => ed.set({ destId: v })} />
            </Field>
            <Field label={t('Booking link')} full>
              <Text type="url" value={e.link} onChange={(v) => ed.set({ link: v || undefined })} />
            </Field>
          </div>
        </Sheet>
      )}
    </>
  )
}

function Stays() {
  const { t, lang } = useI18n()
  const { list, update, settings } = useStore()
  const s = settings!.data
  const stays = list('hmStay').sort((a, b) => (b.data.score ?? 0) - (a.data.score ?? 0))
  const dests = list('hmDest').filter((d) => d.data.status !== 'idea')
  const ed = useEditor('hmStay', (d) => !!d.name.trim())
  const e = ed.editing?.data
  const nightsDefault = s.honeymoonStart && s.honeymoonEnd ? Math.round((new Date(s.honeymoonEnd).getTime() - new Date(s.honeymoonStart).getTime()) / 86400000) : undefined
  const total = (x: HmStay) => (x.pricePerNight ?? 0) * (x.nights ?? nightsDefault ?? 0)
  const cheapest = Math.min(...stays.filter((x) => x.data.pricePerNight).map((x) => x.data.pricePerNight!))
  const destName = (id?: string) => list('hmDest').find((d) => d.id === id)?.data.name

  return (
    <>
      {dests.length > 0 && (
        <SearchLinks>
          <h2 className="section" style={{ marginBottom: 8 }}>
            {t('Search hotels')}
          </h2>
          <div className="chips">
            {dests.map((d) => (
              <a key={d.id} className="chip" href={stayLink(d.data.name, s.honeymoonStart, s.honeymoonEnd)} target="_blank" rel="noreferrer">
                {t(d.data.name)} ↗
              </a>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>
            {t('Opens Booking.com with your dates. Copy the review score and price of the ones you like into the app.')}
          </p>
        </SearchLinks>
      )}
      {stays.length === 0 ? (
        <div className="card">
          <Empty title={t('No hotels saved yet')} />
        </div>
      ) : (
        <div className="hm-grid">
          {stays.map((x, i) => (
            <div key={x.id} className={'card hm-card' + (x.data.chosen ? ' chosen' : '')} onClick={() => ed.setEditing({ row: x, data: { ...x.data } })}>
              <Cover d={x.data} tone="sky" />
              <div className="hm-body">
                <div className="eyebrow">{[x.data.city, destName(x.data.destId) ? t(destName(x.data.destId)!) : ''].filter(Boolean).join(' · ')}</div>
                <h3>{x.data.name}</h3>
                <div className="row-gap" style={{ margin: '4px 0 6px' }}>
                  {x.data.score != null && <span className="score">{x.data.score.toFixed(1)}</span>}
                  {i === 0 && stays.length > 1 && x.data.score != null && <span className="pill ok">{t('Best rated')}</span>}
                  {x.data.pricePerNight === cheapest && stays.length > 1 && <span className="pill sky">{t('Cheapest')}</span>}
                  {x.data.chosen && <span className="pill warn">{t('Our choice')}</span>}
                </div>
                {x.data.reviews && <p className="small">“{x.data.reviews}”</p>}
                <div className="meta small muted">
                  {x.data.pricePerNight ? `${money(x.data.pricePerNight, lang)} / ${t('night')}` : ''}
                  {total(x.data) ? ` · ${money(total(x.data), lang)} ${t('in total')}` : ''}
                </div>
                <div className="row-gap" style={{ marginTop: 10 }} onClick={(ev) => ev.stopPropagation()}>
                  <button className={'chip' + (x.data.chosen ? ' on' : '')} onClick={() => update(x, { chosen: !x.data.chosen || undefined })}>
                    {x.data.chosen ? t('Our choice') : t('Choose this one')}
                  </button>
                  {x.data.link && (
                    <a className="btn small ghost" href={x.data.link} target="_blank" rel="noreferrer">
                      {t('Open link')} ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Fab label={t('Add hotel')} onClick={() => ed.setEditing({ data: { name: '', nights: nightsDefault } })} />
      <button className="btn primary hide-mobile" style={{ marginTop: 16 }} onClick={() => ed.setEditing({ data: { name: '', nights: nightsDefault } })}>
        {t('Add hotel')}
      </button>

      {ed.editing && e && (
        <Sheet title={ed.editing.row ? e.name : t('Add hotel')} onClose={() => ed.setEditing(null)} onSave={ed.save} onDelete={ed.del}>
          <div className="form">
            <Field label={t('Hotel')} full>
              <Text value={e.name} onChange={(v) => ed.set({ name: v })} autoFocus={!ed.editing.row} required />
            </Field>
            <Field label={t('Town or area')}>
              <Text value={e.city} onChange={(v) => ed.set({ city: v || undefined })} />
            </Field>
            <Field label={t('Review score (0–10)')}>
              <Text type="number" value={e.score ?? ''} onChange={(v) => ed.set({ score: v === '' ? undefined : Math.min(10, num(v)) })} />
            </Field>
            <Field label={t('Price per night (EUR)')}>
              <Text type="number" value={e.pricePerNight ?? ''} onChange={(v) => ed.set({ pricePerNight: num(v) || undefined })} />
            </Field>
            <Field label={t('Nights')}>
              <Text type="number" value={e.nights ?? ''} onChange={(v) => ed.set({ nights: Math.round(num(v)) || undefined })} />
            </Field>
            <Field label={t('What reviewers say')} full>
              <Text value={e.reviews} onChange={(v) => ed.set({ reviews: v || undefined })} placeholder={t('e.g. Amazing breakfast, quiet rooms')} />
            </Field>
            <Field label={t('Destination')} full>
              <DestPicker value={e.destId} onChange={(v) => ed.set({ destId: v })} />
            </Field>
            <Field label={t('Booking link')} full>
              <Text type="url" value={e.link} onChange={(v) => ed.set({ link: v || undefined })} />
            </Field>
            <Field label={t('Photo')} full>
              <PhotoField value={e.photo} onChange={(v) => ed.set({ photo: v })} />
            </Field>
          </div>
        </Sheet>
      )}
    </>
  )
}

function Budget() {
  const { t, lang } = useI18n()
  const { list, update, settings } = useStore()
  const s = settings!.data
  const exps = list('hmExpense')
  const flight = list('hmFlight').filter((f) => f.data.chosen)
  const nightsDefault = s.honeymoonStart && s.honeymoonEnd ? Math.round((new Date(s.honeymoonEnd).getTime() - new Date(s.honeymoonStart).getTime()) / 86400000) : 0
  const stays = list('hmStay').filter((x) => x.data.chosen)
  const ed = useEditor('hmExpense', (d) => !!d.label.trim())
  const e = ed.editing?.data
  const flightSum = flight.reduce((a, f) => a + f.data.price, 0)
  const staySum = stays.reduce((a, x) => a + (x.data.pricePerNight ?? 0) * (x.data.nights ?? nightsDefault), 0)
  const extra = exps.reduce((a, x) => a + x.data.amount, 0)
  const total = flightSum + staySum + extra
  const budget = s.honeymoonBudget ?? 0

  const lines: { key: string; label: string; amount: number; row?: Row<'hmExpense'> }[] = [
    ...flight.map((f) => ({ key: f.id, label: `${t('Flight')}: ${f.data.airline}`, amount: f.data.price })),
    ...stays.map((x) => ({ key: x.id, label: `${t('Hotel')}: ${x.data.name}`, amount: (x.data.pricePerNight ?? 0) * (x.data.nights ?? nightsDefault) })),
    ...exps.map((x) => ({ key: x.id, label: x.data.label, amount: x.data.amount, row: x }))
  ]

  return (
    <>
      <div className="stats three">
        <div className="card stat tone-sky">
          <h2 className="section">{t('Planned')}</h2>
          <div className="big">{money(total, lang)}</div>
          <div className="sub">{budget ? t('of {total} budget', { total: money(budget, lang) }) : t('Set a budget on the Ideas tab')}</div>
          {budget > 0 && <Bar value={total / budget} tone={total > budget ? 'rose' : 'sky'} />}
        </div>
        <div className="card stat tone-gold">
          <h2 className="section">{t('Flights and hotels')}</h2>
          <div className="big">{money(flightSum + staySum, lang)}</div>
          <div className="sub">{t('from the ones you chose')}</div>
        </div>
        <div className="card stat tone-rose">
          <h2 className="section">{t('Paid')}</h2>
          <div className="big">{money(exps.filter((x) => x.data.paid).reduce((a, x) => a + x.data.amount, 0), lang)}</div>
          <div className="sub">{t('of the other costs')}</div>
        </div>
      </div>
      <div className="card">
        {lines.length === 0 ? (
          <p className="muted">{t('Choose a flight and a hotel, and add other costs like food, trips and transfers.')}</p>
        ) : (
          <div className="list">
            {lines.map((l) => (
              <div key={l.key} className={'item' + (l.row ? ' clickable' : '')} onClick={() => l.row && ed.setEditing({ row: l.row, data: { ...l.row.data } })}>
                {l.row ? (
                  <button
                    className={'check' + (l.row.data.paid ? ' on' : '')}
                    aria-label={t('Paid')}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      update(l.row!, { paid: !l.row!.data.paid || undefined })
                    }}
                  />
                ) : (
                  <span className="check on" style={{ opacity: 0.35 }} />
                )}
                <div className="grow">
                  <div className="title">{l.label}</div>
                  {l.row && <div className="meta">{t(l.row.data.category)}</div>}
                </div>
                <b className="money">{money(l.amount, lang)}</b>
              </div>
            ))}
          </div>
        )}
      </div>
      <Fab label={t('Add cost')} onClick={() => ed.setEditing({ data: { label: '', category: 'Activities', amount: 0 } })} />
      <button className="btn primary hide-mobile" style={{ marginTop: 16 }} onClick={() => ed.setEditing({ data: { label: '', category: 'Activities', amount: 0 } })}>
        {t('Add cost')}
      </button>
      {ed.editing && e && (
        <Sheet title={ed.editing.row ? e.label : t('Add cost')} onClose={() => ed.setEditing(null)} onSave={ed.save} onDelete={ed.del}>
          <div className="form">
            <Field label={t('What')} full>
              <Text value={e.label} onChange={(v) => ed.set({ label: v })} autoFocus={!ed.editing.row} required placeholder={t('e.g. Boat trip')} />
            </Field>
            <Field label={t('Amount (EUR)')}>
              <Text type="number" value={e.amount || ''} onChange={(v) => ed.set({ amount: num(v) })} />
            </Field>
            <Field label={t('Category')} full>
              <div className="chips">
                {EXPENSE_CATS.map((c) => (
                  <button type="button" key={c} className={'chip' + (e.category === c ? ' on' : '')} onClick={() => ed.set({ category: c } as Partial<HmExpense>)}>
                    {t(c)}
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

