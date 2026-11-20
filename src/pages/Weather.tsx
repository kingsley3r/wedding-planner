import { useEffect, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import { fmtDate, todayIso } from '../lib/util'
import { PageHead } from '../components/ui'

const PLACES = [
  { id: 'church', name: 'Logos Gleisdorf', role: 'Ceremony', lat: 47.1039, lon: 15.7083 },
  { id: 'venue', name: 'Congress Loipersdorf', role: 'Reception', lat: 46.9886, lon: 16.1115 }
]

type Day = { date: string; code: number; max: number; min: number; rain?: number }
type Climate = { years: number; max: number; min: number; rainyPct: number; hottest: number }
type Data = { days: Day[]; climate?: Climate }

/** WMO weather codes, grouped the way people talk about the weather. */
export function describe(code: number): [string, string] {
  if (code === 0) return ['☀', 'Sunny']
  if (code <= 2) return ['⛅', 'Partly cloudy']
  if (code === 3) return ['☁', 'Cloudy']
  if (code <= 48) return ['〰', 'Fog']
  if (code <= 57) return ['☂', 'Drizzle']
  if (code <= 67 || (code >= 80 && code <= 82)) return ['☂', 'Rain']
  if (code <= 77 || code === 85 || code === 86) return ['❄', 'Snow']
  return ['⚡', 'Thunderstorms']
}

const round = (n: number) => Math.round(n)

async function load(lat: number, lon: number, wedding: string): Promise<Data> {
  const key = `wp-weather-${lat}-${lon}-${wedding}`
  try {
    const hit = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (hit && Date.now() - hit.at < 3 * 3600000) return hit.data
  } catch {
    /* ignore */
  }
  const q = `latitude=${lat}&longitude=${lon}&timezone=Europe%2FVienna`
  const f = await fetch(`https://api.open-meteo.com/v1/forecast?${q}&forecast_days=16&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max`).then((r) => r.json())
  const days: Day[] = (f.daily?.time ?? []).map((d: string, i: number) => ({
    date: d,
    code: f.daily.weather_code[i],
    max: f.daily.temperature_2m_max[i],
    min: f.daily.temperature_2m_min[i],
    rain: f.daily.precipitation_probability_max?.[i]
  }))
  // Typical weather: the same week of the year over the last ten summers.
  let climate: Climate | undefined
  try {
    const md = wedding.slice(5)
    const last = new Date().getFullYear() - (todayIso().slice(5) > md ? 0 : 1)
    const a = await fetch(`https://archive-api.open-meteo.com/v1/archive?${q}&start_date=${last - 9}-01-01&end_date=${last}-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum`).then((r) => r.json())
    const target = new Date(`2001-${md}T12:00:00`).getTime()
    const near = (a.daily?.time ?? [])
      .map((d: string, i: number) => ({ d, i }))
      .filter(({ d }: { d: string }) => Math.abs(new Date(`2001-${d.slice(5)}T12:00:00`).getTime() - target) <= 3 * 86400000)
    if (near.length) {
      const mx = near.map(({ i }: { i: number }) => a.daily.temperature_2m_max[i]).filter((x: number | null) => x != null)
      const mn = near.map(({ i }: { i: number }) => a.daily.temperature_2m_min[i]).filter((x: number | null) => x != null)
      const rainy = near.filter(({ i }: { i: number }) => (a.daily.precipitation_sum[i] ?? 0) >= 1).length
      climate = {
        years: 10,
        max: mx.reduce((x: number, y: number) => x + y, 0) / mx.length,
        min: mn.reduce((x: number, y: number) => x + y, 0) / mn.length,
        rainyPct: (rainy / near.length) * 100,
        hottest: Math.max(...mx)
      }
    }
  } catch {
    /* the forecast alone is still useful */
  }
  const data = { days, climate }
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }))
  } catch {
    /* ignore */
  }
  return data
}

function PlaceCard({ place, wedding }: { place: (typeof PLACES)[number]; wedding: string }) {
  const { t, lang } = useI18n()
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    load(place.lat, place.lon, wedding)
      .then(setData)
      .catch(() => setErr(true))
  }, [place.lat, place.lon, wedding])
  const onDay = data?.days.find((d) => d.date === wedding)

  return (
    <div className="card weather-card">
      <div className="card-head">
        <div>
          <div className="eyebrow">{t(place.role)}</div>
          <h3 className="serif" style={{ fontSize: 26, fontWeight: 400 }}>
            {place.name}
          </h3>
        </div>
      </div>
      {err && <p className="small muted">{t('The weather could not be loaded. Check your connection and try again.')}</p>}
      {!data && !err && <p className="small muted">{t('Loading…')}</p>}
      {data && (
        <>
          <div className="wx-hero">
            {onDay ? (
              <>
                <div className="wx-icon">{describe(onDay.code)[0]}</div>
                <div>
                  <div className="wx-big">
                    {round(onDay.max)}° <span>/ {round(onDay.min)}°</span>
                  </div>
                  <div className="small">
                    {t('Forecast for the wedding day')}: {t(describe(onDay.code)[1])}
                    {onDay.rain != null ? ` · ${t('{p}% chance of rain', { p: onDay.rain })}` : ''}
                  </div>
                </div>
              </>
            ) : data.climate ? (
              <>
                <div className="wx-icon">{data.climate.rainyPct < 30 ? '☀' : '⛅'}</div>
                <div>
                  <div className="wx-big">
                    {round(data.climate.max)}° <span>/ {round(data.climate.min)}°</span>
                  </div>
                  <div className="small">
                    {t('Typical for {date}, from the last {n} summers', { date: fmtDate(wedding, lang, { day: 'numeric', month: 'long' }), n: data.climate.years })}
                  </div>
                  <div className="small muted">
                    {t('Rain on {p}% of days that week', { p: round(data.climate.rainyPct) })} · {t('hottest {t}°', { t: round(data.climate.hottest) })}
                  </div>
                </div>
              </>
            ) : null}
          </div>
          {!onDay && <p className="small muted" style={{ marginTop: 8 }}>{t('The real forecast for the day appears here about 16 days before.')}</p>}
          <h2 className="section" style={{ margin: '16px 0 8px' }}>
            {t('Next 7 days')}
          </h2>
          <div className="wx-strip">
            {data.days.slice(0, 7).map((d) => (
              <div key={d.date} className="wx-day">
                <div className="small muted">{fmtDate(d.date, lang, { weekday: 'short' })}</div>
                <div className="wx-sym" title={t(describe(d.code)[1])}>
                  {describe(d.code)[0]}
                </div>
                <div className="small">
                  <b>{round(d.max)}°</b> <span className="muted">{round(d.min)}°</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Weather() {
  const { t } = useI18n()
  const { settings } = useStore()
  const wedding = settings!.data.date
  return (
    <>
      <PageHead eyebrow={t('Church and venue')} title={t('Weather')} />
      <div className="grid2 even">
        {PLACES.map((p) => (
          <PlaceCard key={p.id} place={p} wedding={wedding} />
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 12 }}>
        {t('Weather data from Open-Meteo.')}
      </p>
    </>
  )
}
