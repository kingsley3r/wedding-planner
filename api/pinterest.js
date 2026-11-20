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

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x').searchParams.get('url')
    if (!url) return res.status(400).json({ error: 'missing url' })
    const parts = await boardPath(url)
    const feed = `https://www.pinterest.com/${parts.map(encodeURIComponent).join('/')}${parts.length === 1 ? '/feed' : ''}.rss`
    const r = await fetch(feed, { headers: { 'user-agent': UA, accept: 'application/rss+xml, text/xml' } })
    if (!r.ok) return res.status(r.status === 404 ? 404 : 502).json({ error: `Pinterest answered ${r.status}`, board: `https://www.pinterest.com/${parts.join('/')}/` })
    const pins = parseRss(await r.text())
    res.setHeader('cache-control', 's-maxage=900, stale-while-revalidate=86400')
    return res.status(200).json({ board: `https://www.pinterest.com/${parts.join('/')}/`, pins })
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : String(e) })
  }
}
