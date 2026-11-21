import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { MoodItem, Row } from '../lib/types'
import { buildPinterestEmbeds, isPinterestUrl, resizeImage } from '../lib/util'
import { Empty, Field, PageHead, Select, Sheet, Text } from '../components/ui'
import { Palette } from '../components/Palette'

export const MOOD_CATEGORIES = [
  'Dress',
  'Suit',
  'Hair',
  'Makeup',
  'Rings and jewellery',
  'Shoes and accessories',
  'Flowers',
  'Church',
  'Decoration',
  'Table setting',
  'Seating chart',
  'Cake',
  'Invitations',
  'Venue',
  'Colours',
  'Other'
]

function Heart({ on }: { on?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.2 4.5c2 0 3.4 1.1 4.8 2.8 1.4-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.5 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"
        fill={on ? 'var(--rose)' : 'none'}
        stroke={on ? 'var(--rose)' : 'currentColor'}
        strokeWidth="1.6"
      />
    </svg>
  )
}

const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Pinterest's script rewrites these nodes, so React must not own their children. */
function PinEmbed({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

type Feed = { state: 'idle' | 'loading' | 'error' } | { state: 'ok'; pins: { link: string; title: string; image: string }[]; board?: string; total?: number }

/** Pins from the board's public feed, read through our /api/pinterest function. */
function useBoardFeed(board?: string): Feed {
  const [feed, setFeed] = useState<Feed>({ state: 'idle' })
  useEffect(() => {
    if (!board) return setFeed({ state: 'idle' })
    let live = true
    setFeed({ state: 'loading' })
    fetch('/api/pinterest?url=' + encodeURIComponent(board))
      .then(async (r) => {
        const j = r.ok && /json/.test(r.headers.get('content-type') ?? '') ? await r.json() : null
        if (live) setFeed(j?.pins ? { state: 'ok', pins: j.pins, board: j.board, total: j.total } : { state: 'error' })
      })
      .catch(() => live && setFeed({ state: 'error' }))
    return () => {
      live = false
    }
  }, [board])
  return feed
}

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export default function Mood() {
  const { t } = useI18n()
  const { list, add, update, remove, settings, saveSettings } = useStore()
  const items = list('mood')
  const rawBoard = settings!.data.pinterestBoard
  const board = rawBoard && /^https?:\/\//i.test(rawBoard) ? rawBoard : undefined
  const [filter, setFilter] = useState<string>('all')
  const [editing, setEditing] = useState<{ row?: Row<'mood'>; data: MoodItem } | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkTitle, setLinkTitle] = useState('')
  const [idea, setIdea] = useState<{ title: string; notes: string } | null>(null)
  const [link, setLink] = useState('')
  const [boardDraft, setBoardDraft] = useState('')
  const [showBoard, setShowBoard] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pinPick, setPinPick] = useState<{ link: string; title: string; image: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const feed = useBoardFeed(board)
  const [limit, setLimit] = useState(60)
  const moreRef = useRef<HTMLDivElement>(null)
  // Load the next pins on their own as you scroll near the end.
  useEffect(() => {
    const el = moreRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && setLimit((n) => n + 60), { rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  }, [limit, feed.state])

  const shown = items
    .filter((i) => filter === 'all' || (filter === 'fav' ? i.data.favorite : i.data.category === filter))
    .sort((a, b) => Number(!!b.data.favorite) - Number(!!a.data.favorite))
  const cats = [...new Set([...MOOD_CATEGORIES, ...items.map((i) => i.data.category)])]
  const countOf = (c: string) => items.filter((i) => i.data.category === c).length
  const filled = cats.filter((c) => countOf(c) > 0)
  const empty = cats.filter((c) => countOf(c) === 0)
  const palette = settings!.data.palette ?? []
  const paletteSources = [
    ...items.filter((i) => i.data.kind === 'image').map((i) => i.data.src),
    ...(feed.state === 'ok' ? feed.pins.map((p) => p.image) : [])
  ]
  const sortPin = async (p: { link: string; title: string; image: string }, category: string) => {
    const saved = items.find((i) => i.data.src === p.image)
    if (saved) await update(saved, { category })
    else await add('mood', { kind: 'image', src: p.image, title: p.title || undefined, link: p.link || undefined, category })
    setPinPick(null)
  }

  useEffect(() => {
    buildPinterestEmbeds()
  }, [shown.length, showBoard, board, filter])

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      for (const f of Array.from(files)) {
        const src = await resizeImage(f)
        await add('mood', { kind: 'image', src, category: filter !== 'all' && filter !== 'fav' ? filter : 'Other', favorite: filter === 'fav' })
      }
    } finally {
      setBusy(false)
    }
  }

  const addLink = async () => {
    const v = link.trim()
    if (!/^https?:\/\//i.test(v)) return alert(t('Please paste a link that starts with https://'))
    const isImage = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(v) || /pinimg\.com|images\.unsplash\.com/i.test(v)
    await add('mood', {
      kind: isPinterestUrl(v) && /\/pin\//.test(v) ? 'pin' : isImage ? 'image' : 'link',
      src: v,
      title: linkTitle.trim() || undefined,
      category: filter !== 'all' && filter !== 'fav' ? filter : 'Other',
      favorite: filter === 'fav'
    })
    setLink('')
    setLinkTitle('')
    setLinkOpen(false)
  }

  const saveIdea = async () => {
    if (!idea || !(idea.title.trim() || idea.notes.trim())) return
    await add('mood', {
      kind: 'idea',
      src: '',
      title: idea.title.trim() || undefined,
      notes: idea.notes.trim() || undefined,
      category: filter !== 'all' && filter !== 'fav' ? filter : 'Other',
      favorite: filter === 'fav'
    })
    setIdea(null)
  }

  const tile = (m: Row<'mood'>) => (
    <div key={m.id} className="mood-tile">
      {m.data.kind === 'pin' ? (
        <div className="mood-pin">
          <PinEmbed key={m.data.src} html={`<a data-pin-do="embedPin" data-pin-width="medium" href="${esc(m.data.src)}">${esc(t('Pinterest pin'))}</a>`} />
          <a className="small muted" href={m.data.src} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '8px 12px' }}>
            {t('Open in Pinterest')} ↗
          </a>
        </div>
      ) : m.data.kind === 'idea' ? (
        <div className="mood-idea" onClick={() => setEditing({ row: m, data: { ...m.data } })}>
          <div className="eyebrow">{t('Idea')}</div>
          {m.data.title && <h4>{m.data.title}</h4>}
          {m.data.notes && <p>{m.data.notes}</p>}
        </div>
      ) : m.data.kind === 'link' ? (
        <a className="mood-link" href={m.data.src} target="_blank" rel="noreferrer">
          <div className="eyebrow">{hostOf(m.data.src)}</div>
          <h4>{m.data.title || m.data.src}</h4>
          <span className="small">{t('Open link')} ↗</span>
        </a>
      ) : (
        <img src={m.data.src} alt={m.data.title ?? ''} loading="lazy" referrerPolicy="no-referrer" onClick={() => setEditing({ row: m, data: { ...m.data } })} />
      )}
      <div className="mood-meta">
        <button className="grow mood-title" onClick={() => setEditing({ row: m, data: { ...m.data } })}>
          {m.data.kind === 'idea' || m.data.kind === 'link' ? t(m.data.category) : m.data.title || t(m.data.category)}
        </button>
        <button
          className={'heart' + (m.data.favorite ? ' on' : '')}
          aria-label={t('Favourite')}
          onClick={() => update(m, { favorite: !m.data.favorite })}
        >
          <Heart on={m.data.favorite} />
        </button>
      </div>
    </div>
  )

  const e = editing?.data
  const set = (p: Partial<MoodItem>) => editing && setEditing({ ...editing, data: { ...editing.data, ...p } })

  return (
    <>
      <PageHead eyebrow={t('{n} favourites', { n: items.filter((i) => i.data.favorite).length })} title={t('Mood board')}>
        <button className="btn" onClick={() => setIdea({ title: '', notes: '' })}>
          {t('Write an idea')}
        </button>
        <button className="btn" onClick={() => setLinkOpen(true)}>
          {t('Add link')}
        </button>
        <button className="btn primary" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? t('Adding…') : t('Add photos')}
        </button>
      </PageHead>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(ev) => { onFiles(ev.target.files); ev.target.value = '' }} />

      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('Our colours')}</h2>
        </div>
        <Palette colors={palette} onChange={(c) => saveSettings({ palette: c })} sources={paletteSources} />
      </div>

      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('Our Pinterest board')}</h2>
          {board && (
            <a className="btn small" href={board} target="_blank" rel="noreferrer">
              {t('Open in Pinterest')} ↗
            </a>
          )}
        </div>
        {board ? (
          <>
            {feed.state === 'loading' && <p className="small muted">{t('Loading board…')}</p>}
            {feed.state === 'ok' && feed.pins.length > 0 && (
              <>
                <p className="small muted" style={{ marginBottom: 12 }}>
                  {t('{n} pins', { n: feed.pins.length })} · {t('Tap + Section to sort a pin into Hair, Dress, Decoration and so on. The heart keeps it as a favourite.')}
                </p>
                <div className="board-grid">
                  {feed.pins.slice(0, limit).map((p) => {
                    const saved = items.find((i) => i.data.src === p.image)
                    return (
                      <div key={p.image} className="board-pin">
                        <a href={p.link || board} target="_blank" rel="noreferrer">
                          <img src={p.image} alt={p.title} loading="lazy" referrerPolicy="no-referrer" />
                        </a>
                        <button className="board-sort" onClick={() => setPinPick(p)}>
                          {saved && saved.data.category !== 'Other' ? t(saved.data.category) : '+ ' + t('Section')}
                        </button>
                        <button
                          className={'heart board-heart' + (saved?.data.favorite ? ' on' : '')}
                          aria-label={t('Favourite')}
                          onClick={() =>
                            saved
                              ? update(saved, { favorite: !saved.data.favorite })
                              : add('mood', { kind: 'image', src: p.image, title: p.title || undefined, link: p.link || undefined, category: 'Other', favorite: true })
                          }
                        >
                          <Heart on={saved?.data.favorite} />
                        </button>
                      </div>
                    )
                  })}
                </div>
                {feed.pins.length > limit && (
                  <div ref={moreRef} style={{ textAlign: 'center', marginTop: 12 }}>
                    <button className="btn small" onClick={() => setLimit((n) => n + 60)}>
                      {t('Show more')} ({feed.pins.length - limit})
                    </button>
                  </div>
                )}
              </>
            )}
            {(feed.state === 'error' || (feed.state === 'ok' && feed.pins.length === 0)) && (
              <>
                <p className="small" style={{ marginBottom: 10 }}>
                  {feed.state === 'ok'
                    ? t('The board is connected but has no pins we can show yet.')
                    : t('The pins could not be loaded here. This usually means the board is secret, or the link points to a single pin instead of the board.')}
                </p>
                <button className="btn small" onClick={() => setShowBoard(!showBoard)}>
                  {showBoard ? t('Hide') : t("Try Pinterest's own preview")}
                </button>
                {showBoard && (
                  <PinEmbed
                    key={board}
                    className="pin-board"
                    html={`<a data-pin-do="embedBoard" data-pin-board-width="900" data-pin-scale-height="520" data-pin-scale-width="100" href="${esc(board)}"></a>`}
                  />
                )}
              </>
            )}
            <p className="small muted" style={{ marginTop: 12 }}>
              <button className="linklike" onClick={() => saveSettings({ pinterestBoard: undefined })}>
                {t('Change board')}
              </button>
            </p>
          </>
        ) : (
          <form
            className="row-gap"
            onSubmit={(ev) => {
              ev.preventDefault()
              const v = boardDraft.trim()
              if (!/^https?:\/\//i.test(v) || !isPinterestUrl(v)) return alert(t('Please paste the link to your Pinterest board.'))
              saveSettings({ pinterestBoard: v })
            }}
          >
            <input
              className="input"
              style={{ flex: 1, minWidth: 220 }}
              type="url"
              placeholder="https://pin.it/… or https://www.pinterest.com/…/…/"
              value={boardDraft}
              onChange={(ev) => setBoardDraft(ev.target.value)}
            />
            <button className="btn primary">{t('Connect board')}</button>
          </form>
        )}
        {!board && (
          <p className="small muted" style={{ marginTop: 10 }}>
            {t('In the Pinterest app: open the board, tap Share, then Copy link, and paste it here.')}
          </p>
        )}
      </div>

      <div className="chips mood-chips" style={{ margin: '18px 0 14px' }}>
        <button className={'chip' + (filter === 'all' ? ' on' : '')} onClick={() => setFilter('all')}>
          {t('All sections')}
        </button>
        <button className={'chip' + (filter === 'fav' ? ' on' : '')} onClick={() => setFilter('fav')}>
          ♥ {t('Favourites')}
        </button>
        {cats.map((c) => (
          <button key={c} className={'chip' + (filter === c ? ' on' : '') + (countOf(c) ? '' : ' faint')} onClick={() => setFilter(c)}>
            {t(c)}
            {countOf(c) > 0 && <span className="chip-n">{countOf(c)}</span>}
          </button>
        ))}
      </div>

      {filter === 'all' && items.length > 0 ? (
        <>
          {filled.map((c) => (
            <section key={c} className="mood-section">
              <div className="mood-section-head">
                <h2 className="section">{t(c)}</h2>
                <button className="btn small ghost" onClick={() => setFilter(c)}>
                  {t('Open')} · {countOf(c)}
                </button>
              </div>
              <div className="mood-grid">
                {items
                  .filter((i) => i.data.category === c)
                  .sort((x, y) => Number(!!y.data.favorite) - Number(!!x.data.favorite))
                  .slice(0, 8)
                  .map(tile)}
              </div>
            </section>
          ))}
          {empty.length > 0 && (
            <p className="small muted" style={{ marginTop: 18 }}>
              {t('Still empty')}: {empty.map((c) => t(c)).join(', ')}
            </p>
          )}
        </>
      ) : shown.length === 0 ? (
        <div className="card">
          <Empty title={filter === 'fav' ? t('No favourites yet') : filter === 'all' ? t('Start your mood board') : t('Nothing in {s} yet', { s: t(filter) })}>
            <p className="small">{t('Add photos from your phone, or paste a link to an image or a Pinterest pin. Tap the heart to make it a favourite.')}</p>
          </Empty>
        </div>
      ) : (
        <div className="mood-grid">{shown.map(tile)}</div>
      )}

      {pinPick && (
        <Sheet title={t('Which section?')} onClose={() => setPinPick(null)}>
          <img src={pinPick.image} alt="" referrerPolicy="no-referrer" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 12, marginBottom: 14 }} />
          <div className="chips">
            {cats.map((c) => (
              <button type="button" key={c} className={'chip' + (items.find((i) => i.data.src === pinPick.image)?.data.category === c ? ' on' : '')} onClick={() => sortPin(pinPick, c)}>
                {t(c)}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {linkOpen && (
        <Sheet title={t('Add link')} onClose={() => setLinkOpen(false)} onSave={addLink}>
          <div className="form">
            <Field label={t('Link')} full>
              <Text value={link} onChange={setLink} type="url" placeholder="https://…" autoFocus required />
            </Field>
            <Field label={t('Title')} full>
              <Text value={linkTitle} onChange={setLinkTitle} placeholder={t('e.g. Florist we liked')} />
            </Field>
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>
            {t('Any link works: a Pinterest pin, an image, a shop or a video. Pins and images show as pictures.')}
          </p>
        </Sheet>
      )}

      {idea && (
        <Sheet title={t('Write an idea')} onClose={() => setIdea(null)} onSave={saveIdea}>
          <div className="form">
            <Field label={t('Title')} full>
              <Text value={idea.title} onChange={(v) => setIdea({ ...idea, title: v })} autoFocus placeholder={t('e.g. Candles on every table')} />
            </Field>
            <Field label={t('Idea')} full>
              <textarea className="input" style={{ minHeight: 120 }} value={idea.notes} onChange={(ev) => setIdea({ ...idea, notes: ev.target.value })} />
            </Field>
          </div>
        </Sheet>
      )}

      {editing && e && (
        <Sheet
          title={e.title || t('Inspiration')}
          onClose={() => setEditing(null)}
          onSave={async () => {
            if (editing.row) await update(editing.row, editing.data)
            setEditing(null)
          }}
          onDelete={
            editing.row
              ? async () => {
                  await remove(editing.row!.id)
                  setEditing(null)
                }
              : undefined
          }
        >
          {e.kind === 'image' && <img src={e.src} alt="" style={{ width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 360, objectFit: 'cover' }} />}
          <div className="form">
            <Field label={t('Title')}>
              <Text value={e.title} onChange={(v) => set({ title: v })} />
            </Field>
            <Field label={t('Category')}>
              <Select value={e.category} onChange={(v) => set({ category: v })} options={[...new Set([...cats, e.category])].map((c) => ({ value: c, label: t(c) }))} />
            </Field>
            <Field label={t('Notes')} full>
              <Text value={e.notes} onChange={(v) => set({ notes: v })} placeholder={t('e.g. ask the florist for this')} />
            </Field>
            <Field label={t('Favourite')}>
              <div className="chips">
                <button type="button" className={'chip' + (e.favorite ? ' on' : '')} onClick={() => set({ favorite: !e.favorite })}>
                  ♥ {e.favorite ? t('Favourite') : t('Mark as favourite')}
                </button>
              </div>
            </Field>
          </div>
        </Sheet>
      )}
    </>
  )
}
