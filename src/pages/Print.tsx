import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import { fmtDate } from '../lib/util'
import { PageHead } from '../components/ui'
import { DOCS, renderDoc } from '../docs/docs'

const PICK_KEY = 'wp-print-pick'
const GROUPS = ['Guests', 'The day', 'Planning'] as const

function loadPick(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(PICK_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => DOCS.some((d) => d.id === x)) : []
  } catch {
    return []
  }
}

export default function Print() {
  const { doc } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { t, lang } = useI18n()
  const { list, settings } = useStore()
  const s = settings!.data
  const [pick, setPick] = useState<string[]>(loadPick)

  const toggle = (id: string) => {
    const next = pick.includes(id) ? pick.filter((x) => x !== id) : [...pick, id]
    setPick(next)
    try {
      localStorage.setItem(PICK_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  if (!doc) {
    // Keep the menu order, whatever order they were ticked in.
    const chosen = DOCS.filter((d) => pick.includes(d.id)).map((d) => d.id)
    return (
      <>
        <PageHead eyebrow={t('Print or save as PDF')} title={t('Print & export')} />
        <p className="small muted" style={{ marginBottom: 14 }}>
          {t('Tick the documents you want and print them together, or open one on its own.')}
        </p>
        {GROUPS.map((g) => (
          <div className="card" key={g}>
            <div className="card-head">
              <h2 className="section">{t(g)}</h2>
            </div>
            <div className="list">
              {DOCS.filter((d) => d.group === g).map((d) => {
                const on = pick.includes(d.id)
                return (
                  <div key={d.id} className="item print-pick">
                    <button className={'check' + (on ? ' on' : '')} role="checkbox" aria-checked={on} aria-label={t(d.title)} onClick={() => toggle(d.id)} />
                    <div className="grow clickable" onClick={() => toggle(d.id)}>
                      <div className="title">{t(d.title)}</div>
                      <div className="meta">{t(d.desc)}</div>
                    </div>
                    <Link to={'/print/' + d.id} className="btn small ghost">
                      {t('Open')}
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div className="print-bar">
          <span className="small">{chosen.length ? t('{n} selected', { n: chosen.length }) : t('Nothing selected')}</span>
          <div className="row-gap">
            {chosen.length > 0 && (
              <button className="btn small ghost" onClick={() => (setPick([]), localStorage.removeItem(PICK_KEY))}>
                {t('Clear')}
              </button>
            )}
            <button className="btn small primary" disabled={!chosen.length} onClick={() => nav('/print/bundle?docs=' + chosen.join(','))}>
              {t('Print selected')}
            </button>
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          {t('On iPhone: tap Print, then pinch out on the preview or use Share to save it as a PDF.')}
        </p>
      </>
    )
  }

  const ids = doc === 'bundle' ? (params.get('docs') ?? '').split(',').filter((x) => DOCS.some((d) => d.id === x)) : [doc]
  const ctx = { list, settings: s, t, lang }
  const couple = `${s.partner1} & ${s.partner2}`
  const dateStr = fmtDate(s.date, lang, { day: 'numeric', month: 'long', year: 'numeric' })
  const docs = ids.map((id) => ({ meta: DOCS.find((d) => d.id === id), ...renderDoc(id, ctx) }))
  const single = docs.length === 1 ? docs[0] : null

  return (
    <>
      <div className="doc-toolbar no-print">
        <Link to="/print" className="btn small ghost">
          ‹ {t('Print & export')}
        </Link>
        <div className="row-gap">
          {single?.exportCsv && (
            <button className="btn small" onClick={single.exportCsv}>
              {t('Download Excel (CSV)')}
            </button>
          )}
          <button className="btn small primary" onClick={() => window.print()}>
            {t('Print / Save PDF')}
          </button>
        </div>
      </div>
      {docs.length === 0 && <p>{t('Not found')}</p>}
      {docs.map((d, i) => (
        <article key={ids[i]} className={'doc' + (d.meta?.wide ? ' doc-wide' : '') + (i > 0 ? ' doc-next' : '')}>
          <header className="doc-head">
            <div className="eyebrow">
              {couple} · {dateStr}
            </div>
            <h1>{d.meta ? t(d.meta.title) : ''}</h1>
          </header>
          {d.meta ? d.body : <p>{t('Not found')}</p>}
        </article>
      ))}
    </>
  )
}
