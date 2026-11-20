// Serves the suggested honeymoon photos from Wikimedia Commons through the app's own domain.
// Loading them straight from Wikimedia is unreliable on phones (hotlink limits, thumbnail sizes),
// so this looks up the right thumbnail with a proper User-Agent and lets Vercel's CDN cache it.

const UA = 'WeddingPlanner/1.0 (private wedding planning app; https://github.com/kingsley3r/wedding-planner)'
const NAME = /^[^/\\:?#]{1,200}\.(jpe?g|png|webp)$/i

async function thumbUrl(file, width) {
  const q = new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url', titles: 'File:' + file })
  if (width) q.set('iiurlwidth', String(width))
  const r = await fetch('https://commons.wikimedia.org/w/api.php?' + q, { headers: { 'user-agent': UA } })
  if (!r.ok) throw new Error('commons ' + r.status)
  const d = await r.json()
  const page = Object.values(d.query?.pages ?? {})[0]
  const info = page?.imageinfo?.[0]
  return info?.thumburl || info?.url
}

export default async function handler(req, res) {
  const file = new URL(req.url, 'http://x').searchParams.get('file')
  if (!file || !NAME.test(file)) return res.status(400).json({ error: 'bad file name' })
  for (const width of [1280, 960, 0]) {
    try {
      const src = await thumbUrl(file, width)
      if (!src) continue
      const img = await fetch(src, { headers: { 'user-agent': UA } })
      if (!img.ok) continue
      const buf = Buffer.from(await img.arrayBuffer())
      res.setHeader('content-type', img.headers.get('content-type') || 'image/jpeg')
      res.setHeader('cache-control', 'public, max-age=604800, s-maxage=31536000, immutable')
      return res.status(200).send(buf)
    } catch {
      /* try the next size */
    }
  }
  res.status(404).json({ error: 'photo not found' })
}
