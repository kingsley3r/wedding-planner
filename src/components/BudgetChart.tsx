import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import type { Row } from '../lib/types'
import { money } from '../lib/util'

const PLANNED = '#4A76B5'
const ACTUAL = '#BF8430'

/** Planned vs actual per category: two thin bars per row, one shared scale, deposits still owed called out. */
export function BudgetChart({ items }: { items: Row<'budget'>[] }) {
  const { t, lang } = useI18n()
  const [hover, setHover] = useState<string | null>(null)
  const cats = new Map<string, { planned: number; actual: number; paid: number }>()
  for (const r of items) {
    const c = cats.get(r.data.category) ?? { planned: 0, actual: 0, paid: 0 }
    c.planned += r.data.planned || 0
    c.actual += r.data.actual || 0
    c.paid += r.data.paid || 0
    cats.set(r.data.category, c)
  }
  const rows = [...cats.entries()].filter(([, v]) => v.planned || v.actual).sort((a, b) => Math.max(b[1].planned, b[1].actual) - Math.max(a[1].planned, a[1].actual))
  const max = Math.max(1, ...rows.map(([, v]) => Math.max(v.planned, v.actual)))
  if (!rows.length) return null
  return (
    <div className="card">
      <div className="card-head">
        <h2 className="section">{t('Planned vs actual')}</h2>
        <div className="legend">
          <span>
            <i style={{ background: PLANNED }} />
            {t('Planned')}
          </span>
          <span>
            <i style={{ background: ACTUAL }} />
            {t('Actual')}
          </span>
        </div>
      </div>
      <div className="bvsa" role="table" aria-label={t('Planned vs actual')}>
        {rows.map(([c, v]) => {
          const owed = Math.max(0, v.actual - v.paid)
          const over = v.actual > v.planned && v.planned > 0
          return (
            <div
              key={c}
              className={'bvsa-row' + (hover === c ? ' hover' : '')}
              role="row"
              onMouseEnter={() => setHover(c)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover(hover === c ? null : c)}
            >
              <div className="bvsa-label" role="cell">
                <span>{t(c)}</span>
                {over && <span className="pill bad" style={{ padding: '1px 7px', fontSize: 10.5 }}>{t('Over')}</span>}
              </div>
              <div className="bvsa-bars" role="cell">
                <div className="bvsa-bar" style={{ width: `${(v.planned / max) * 100}%`, background: PLANNED }} />
                <div className="bvsa-bar" style={{ width: `${(v.actual / max) * 100}%`, background: ACTUAL }} />
              </div>
              <div className="bvsa-value money" role="cell">
                {hover === c ? (
                  <span className="small">
                    {money(v.planned, lang)} → {money(v.actual, lang)}
                    {owed ? ` · ${t('owed')} ${money(owed, lang)}` : ''}
                  </span>
                ) : (
                  <span className="small muted">{v.actual ? money(v.actual, lang) : money(v.planned, lang)}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
