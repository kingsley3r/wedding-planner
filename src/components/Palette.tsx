import { useState } from 'react'
import { useI18n } from '../lib/i18n'

/** Ready-made wedding palettes to start from. Every colour can be changed afterwards. */
export const PALETTE_IDEAS: { name: string; colors: string[] }[] = [
  { name: 'Sage and ivory', colors: ['#f7f4ee', '#dfe5d8', '#a7b59c', '#7c8b74', '#b89b6a'] },
  { name: 'Champagne and gold', colors: ['#fbf7ef', '#efe2c9', '#d9c29a', '#b89b6a', '#7d6a4b'] },
  { name: 'Dusty rose', colors: ['#fbf3f1', '#efd6d0', '#d8aba1', '#b98479', '#6f5a55'] },
  { name: 'Classic white and green', colors: ['#ffffff', '#f1f1ec', '#c9d3c0', '#5f7a5a', '#2f3d2e'] },
  { name: 'Terracotta and sand', colors: ['#f6efe6', '#e7cdb4', '#d29a74', '#b5653f', '#6e4a36'] },
  { name: 'Navy and blush', colors: ['#fbf4f2', '#f0d5d0', '#c9a39a', '#3f5370', '#1f2b3d'] },
  { name: 'Lavender and grey', colors: ['#f7f5fa', '#e3dcef', '#bcaed6', '#8c7fa8', '#5a5763'] },
  { name: 'Burgundy and gold', colors: ['#faf5ef', '#e8d6b5', '#c7a25f', '#7d2a35', '#4a1a22'] },
  { name: 'Olive and cream', colors: ['#f8f5ec', '#e6e1c8', '#b7b28a', '#7a7a4a', '#4b4a32'] },
  { name: 'Dusty blue and silver', colors: ['#f5f7f9', '#dde4ec', '#aebccc', '#7b93ad', '#4f6582'] }
]

const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** The main colours across a set of photos: sample each one small, group similar colours, keep the biggest groups. */
export async function paletteFromImages(srcs: string[], count = 5): Promise<string[]> {
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>()
  const c = document.createElement('canvas')
  c.width = c.height = 40
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []
  for (const src of srcs.slice(0, 40)) {
    const img = await loadImage(src)
    if (!img) continue
    try {
      ctx.clearRect(0, 0, 40, 40)
      ctx.drawImage(img, 0, 0, 40, 40)
      const d = ctx.getImageData(0, 0, 40, 40).data
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 200) continue
        const [r, g, b] = [d[i], d[i + 1], d[i + 2]]
        const key = `${r >> 5}-${g >> 5}-${b >> 5}`
        const k = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 }
        k.r += r
        k.g += g
        k.b += b
        k.n++
        buckets.set(key, k)
      }
    } catch {
      /* the site does not allow reading its pixels; skip it */
    }
  }
  const picked: { r: number; g: number; b: number }[] = []
  for (const k of [...buckets.values()].sort((a, b) => b.n - a.n)) {
    const col = { r: k.r / k.n, g: k.g / k.n, b: k.b / k.n }
    // Keep colours that look different from the ones already chosen.
    if (picked.every((p) => Math.abs(p.r - col.r) + Math.abs(p.g - col.g) + Math.abs(p.b - col.b) > 70)) picked.push(col)
    if (picked.length === count) break
  }
  // Light to dark reads like a palette.
  return picked.sort((a, b) => b.r + b.g + b.b - (a.r + a.g + a.b)).map((p) => hex(p.r, p.g, p.b))
}

export function Palette({ colors, onChange, sources }: { colors: string[]; onChange: (c: string[]) => void; sources: string[] }) {
  const { t } = useI18n()
  const [idea, setIdea] = useState('')
  const [busy, setBusy] = useState(false)
  const preview = PALETTE_IDEAS.find((p) => p.name === idea)
  const fromBoard = async () => {
    setBusy(true)
    try {
      const c = await paletteFromImages(sources)
      if (c.length) onChange(c)
      else alert(t('No colours could be read from these photos. Try adding a few photos or pins to your sections first.'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="palette">
      <div className="swatches">
        {colors.map((c, i) => (
          <label key={i} className="swatch" style={{ background: c }} title={c}>
            <input type="color" value={c} onChange={(e) => onChange(colors.map((x, j) => (j === i ? e.target.value : x)))} aria-label={t('Change colour')} />
            <button
              type="button"
              className="swatch-x"
              aria-label={t('Remove')}
              onClick={(e) => {
                e.preventDefault()
                onChange(colors.filter((_, j) => j !== i))
              }}
            >
              ×
            </button>
            <span className="swatch-hex">{c.toUpperCase()}</span>
          </label>
        ))}
        {colors.length < 8 && (
          <label className="swatch swatch-add" title={t('Add colour')}>
            <input type="color" value="#cccccc" onChange={(e) => onChange([...colors, e.target.value])} aria-label={t('Add colour')} />+
          </label>
        )}
      </div>
      <div className="row-gap" style={{ marginTop: 14 }}>
        <button type="button" className="btn small" disabled={busy || !sources.length} onClick={fromBoard}>
          {busy ? t('Reading colours…') : t('Colours from our board')}
        </button>
        <select className="input palette-pick" value={idea} onChange={(e) => setIdea(e.target.value)}>
          <option value="">{t('Palette ideas…')}</option>
          {PALETTE_IDEAS.map((p) => (
            <option key={p.name} value={p.name}>
              {t(p.name)}
            </option>
          ))}
        </select>
      </div>
      {preview && (
        <div className="palette-preview">
          <div className="swatches small">
            {preview.colors.map((c) => (
              <span key={c} className="swatch" style={{ background: c }} />
            ))}
          </div>
          <button
            type="button"
            className="btn small primary"
            onClick={() => {
              onChange(preview.colors)
              setIdea('')
            }}
          >
            {t('Use this palette')}
          </button>
        </div>
      )}
      <p className="small muted" style={{ marginTop: 10 }}>
        {t('Tap a colour to change it. Share these with the florist, the decorator and the cake maker.')}
      </p>
    </div>
  )
}
