import { useEffect, useState } from 'react'
import { useI18n } from '../lib/i18n'

const MILESTONES = [365, 200, 100, 50, 30, 14, 7, 1]

/** Live countdown to the start of the ceremony, with milestones along the way. */
export function Countdown({ date, time }: { date: string; time?: string }) {
  const { t } = useI18n()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const target = new Date(`${date}T${time && /^\d\d:\d\d$/.test(time) ? time : '14:00'}:00`).getTime()
  const left = Math.max(0, target - now)
  const days = Math.floor(left / 86400000)
  const hours = Math.floor((left % 86400000) / 3600000)
  const mins = Math.floor((left % 3600000) / 60000)
  const secs = Math.floor((left % 60000) / 1000)
  const next = MILESTONES.filter((m) => m < days).sort((a, b) => b - a)[0]
  const pad = (n: number) => String(n).padStart(2, '0')

  if (left === 0) {
    return (
      <div className="countdown">
        <b>♡</b>
        <span>{t('today is the day')}</span>
      </div>
    )
  }
  return (
    <div className="countdown">
      <b>{days}</b>
      <span>{t('days to go')}</span>
      <div className="cd-clock" aria-label={t('{h} hours {m} minutes', { h: hours, m: mins })}>
        {pad(hours)}
        <i>:</i>
        {pad(mins)}
        <i>:</i>
        {pad(secs)}
      </div>
      <div className="cd-weeks">
        {t('{w} weeks', { w: Math.floor(days / 7) })}
        {next ? ` · ${t('{n}-day mark in {d} days', { n: next, d: days - next })}` : ''}
      </div>
    </div>
  )
}
