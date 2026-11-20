// Reads a public Pinterest board through its RSS feed, so the mood board can show the pins
// even where Pinterest's own embed script is blocked. Only Pinterest links are fetched.

const PIN_HOST = /^([a-z0-9-]+\.)*pinterest\.[a-z.]+$/i
const SHORT_HOST = /^pin\.it$/i
const UA = 'Mozilla/5.0 (compatible; WeddingPlanner/1.0)'

/** Turn any board link (pin.it, pinterest.at/de/com, with or without ?invite) into user/board. */
export async function boardPath(raw) {
  let u = new URL(String(raw).trim())
  if (SHORT_HOST.test(u.hostname)) {
    const r = await fetch(u, { redirect: 'follow', headers: { 'user-agent': UA } })
    u = new URL(r.url)
    // pin.it sometimes lands on api.pinterest.com/url_shortener/…/redirect/?location=…
    const loc = u.searchParams.get('location') || u.searchParams.get('url')
    if (loc) u = new URL(decodeURIComponent(loc), 'https://www.pinterest.com')
  }
  if (!PIN_HOST.test(u.hostname)) throw new Error('not a Pinterest link')
  const parts = u.pathname.split('/').filter(Boolean)
  if (parts[0] === 'pin') throw new Error('pin, not board')
  if (!parts.length) throw new Error('no board in link')
  return parts.slice(0, parts[1] && !parts[1].startsWith('_') ? 2 : 1)
}

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')

export function parseRss(xml) {
  const pins = []
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item = m[1]
    const get = (tag) => decode(item.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? '').trim()
    const desc = get('description')
    const img = desc.match(/<img[^>]+src="([^"]+)"/i)?.[1]
    if (!img) continue
    pins.push({
      link: get('link'),
      title: get('title') || desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120),
      image: img.replace(/\/(236x|474x)\//, '/564x/')
    })
  }
  return pins
}

const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  accept: 'application/json, text/javascript, */*; q=0.01',
  'x-requested-with': 'XMLHttpRequest',
  'x-pinterest-appstate': 'active',
  referer: 'https://www.pinterest.com/'
}

const pickImage = (images) => images?.['564x']?.url || images?.orig?.url || images?.['474x']?.url || images?.['236x']?.url

async function resource(name, sourceUrl, options) {
  const q = new URLSearchParams({ source_url: sourceUrl, data: JSON.stringify({ options, context: {} }) })
  const r = await fetch(`https://www.pinterest.com/resource/${name}/get/?${q}`, { headers: HEADERS })
  if (!r.ok) throw new Error(`${name} ${r.status}`)
  return (await r.json()).resource_response
}

/** Every pin on the board, including pins inside sections, page by page. */
export async function allPins(parts, max = 1500) {
  if (parts.length < 2) throw new Error('profile, not board')
  const [username, slug] = parts
  const sourceUrl = `/${username}/${slug}/`
  const board = (await resource('BoardResource', sourceUrl, { username, slug, field_set_key: 'detailed' })).data
  if (!board?.id) throw new Error('board not found')
  const pins = []
  const seen = new Set()
  const take = (list) => {
    for (const p of list ?? []) {
      const image = p?.type === 'pin' || p?.images ? pickImage(p.images) : undefined
      if (!image || seen.has(p.id)) continue
      seen.add(p.id)
      pins.push({
        link: `https://www.pinterest.com/pin/${p.id}/`,
        title: (p.grid_title || p.title || p.description || '').trim().slice(0, 120),
        image
      })
    }
  }
  const page = async (name, options) => {
    let bookmark
    for (let i = 0; i < 12 && pins.length < max; i++) {
      const res = await resource(name, sourceUrl, { ...options, page_size: 250, ...(bookmark ? { bookmarks: [bookmark] } : {}) })
      take(res.data)
      bookmark = res.bookmark
      if (!bookmark || bookmark === '-end-' || !res.data?.length) break
    }
  }
  await page('BoardFeedResource', { board_id: board.id, board_url: sourceUrl, field_set_key: 'react_grid_pin', filter_section_pins: false })
  // Pins that only live in a section are not always in the board feed.
  if (board.section_count > 0 && pins.length < (board.pin_count ?? 0)) {
    const sections = (await resource('BoardSectionsResource', sourceUrl, { board_id: board.id })).data ?? []
    for (const sec of sections) await page('BoardSectionPinsResource', { section_id: sec.id })
  }
  return { pins, total: board.pin_count ?? pins.length }
}

/** Pinterest's embed widget feed: up to 50 pins, used if the full board can't be read. */
async function widgetPins(parts) {
  const r = await fetch(`https://widgets.pinterest.com/v3/pidgets/boards/${parts.map(encodeURIComponent).join('/')}/pins/`, { headers: HEADERS })
  if (!r.ok) throw new Error(`widget ${r.status}`)
  const j = await r.json()
  return (j?.data?.pins ?? [])
    .map((p) => ({ link: `https://www.pinterest.com/pin/${p.id}/`, title: (p.description || '').trim().slice(0, 120), image: pickImage(p.images) }))
    .filter((p) => p.image)
}

async function rssPins(parts) {
  const feed = `https://www.pinterest.com/${parts.map(encodeURIComponent).join('/')}${parts.length === 1 ? '/feed' : ''}.rss`
  const r = await fetch(feed, { headers: { 'user-agent': UA, accept: 'application/rss+xml, text/xml' } })
  if (!r.ok) throw new Error(`rss ${r.status}`)
  return parseRss(await r.text())
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x').searchParams.get('url')
    if (!url) return res.status(400).json({ error: 'missing url' })
    const parts = await boardPath(url)
    const board = `https://www.pinterest.com/${parts.join('/')}/`
    let pins = []
    let total
    let source = 'board'
    try {
      ;({ pins, total } = await allPins(parts))
    } catch {
      /* fall back to the smaller feeds below */
    }
    // Keep whichever source gives the most pins.
    for (const [name, fn] of [['widget', widgetPins], ['rss', rssPins]]) {
      if (total && pins.length >= total) break
      try {
        const more = await fn(parts)
        if (more.length > pins.length) {
          pins = more
          source = name
        }
      } catch {
        /* try the next one */
      }
    }
    if (!pins.length) return res.status(502).json({ error: 'no pins could be read', board })
    res.setHeader('cache-control', 's-maxage=600, stale-while-revalidate=86400')
    return res.status(200).json({ board, pins, total: total ?? pins.length, source })
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : String(e) })
  }
}
