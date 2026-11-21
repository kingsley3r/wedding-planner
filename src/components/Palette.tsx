import { useMemo, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { Sheet } from './ui'

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
  { name: 'Dusty blue and silver', colors: ['#f5f7f9', '#dde4ec', '#aebccc', '#7b93ad', '#4f6582'] },
  { name: 'Wine and blush', colors: ['#fbf4f1', '#f0d3cc', '#c98b8b', '#7d2a35', '#3d1a20'] },
  { name: 'Emerald and gold', colors: ['#f8f6f0', '#e8dcc0', '#c7a25f', '#2e7d5b', '#1d3b2e'] },
  { name: 'Peach and sage', colors: ['#fdf6f0', '#f6d3bd', '#eaa98a', '#a7b59c', '#5f6e57'] },
  { name: 'Plum and mauve', colors: ['#f9f5f7', '#e7d3dc', '#b98ea0', '#7a4466', '#3d1f33'] },
  { name: 'Mocha and nude', colors: ['#faf6f1', '#e9d8c7', '#c8ad94', '#7a5a48', '#4a3428'] },
  { name: 'Black and white', colors: ['#ffffff', '#ece8e1', '#b8b3aa', '#4a4744', '#161412'] }
]

/** Colour families and their named shades, so a colour can be picked by name. */
export const FAMILIES: { name: string; shades: [string, string][] }[] = [
  { name: 'Reds', shades: [['Blush red', '#e8b4b0'], ['Coral red', '#e06a5e'], ['Red', '#cc2f36'], ['Cherry', '#a8202f'], ['Crimson', '#9b1b30'], ['Marsala', '#955251'], ['Wine', '#7d2a35'], ['Burgundy', '#5e1a26']] },
  { name: 'Pinks', shades: [['Ballet pink', '#f6e1e1'], ['Blush', '#f0d3cc'], ['Rose', '#e8a3ad'], ['Dusty rose', '#d8aba1'], ['Antique rose', '#c48b88'], ['Peony', '#e07fa0'], ['Fuchsia', '#c13b7a'], ['Mauve', '#a87a8c']] },
  { name: 'Oranges', shades: [['Sand', '#e7cdb4'], ['Peach', '#f4c3a5'], ['Apricot', '#eea877'], ['Coral', '#ec8467'], ['Burnt orange', '#cc5e2a'], ['Terracotta', '#c0663f'], ['Copper', '#a9643a'], ['Rust', '#93432a']] },
  { name: 'Yellows', shades: [['Cream', '#f8f1df'], ['Champagne', '#efe2c9'], ['Butter', '#f3e3a1'], ['Honey', '#e0a93b'], ['Mustard', '#cc9c30'], ['Gold', '#c7a25f'], ['Antique gold', '#a8894f'], ['Ochre', '#a87522']] },
  { name: 'Greens', shades: [['Mint', '#d3e7d8'], ['Pistachio', '#c4d4a0'], ['Sage', '#a7b59c'], ['Eucalyptus', '#87a092'], ['Olive', '#7a7a4a'], ['Moss', '#5f6f3f'], ['Emerald', '#2e7d5b'], ['Forest', '#2a4331']] },
  { name: 'Blues', shades: [['Powder blue', '#cddcea'], ['Sky', '#a7c7e7'], ['Dusty blue', '#7b93ad'], ['Slate', '#5f7387'], ['Teal', '#2f6f73'], ['Royal blue', '#2f4f9e'], ['Steel', '#3f5370'], ['Navy', '#1f2b3d']] },
  { name: 'Purples', shades: [['Lilac', '#ddcfe8'], ['Lavender', '#bcaed6'], ['Wisteria', '#a38fc4'], ['Orchid', '#b97fb6'], ['Violet', '#7457a0'], ['Dusty plum', '#8a6a86'], ['Plum', '#5d2e4a'], ['Aubergine', '#3d1f33']] },
  { name: 'Browns', shades: [['Nude', '#e2c9b5'], ['Latte', '#c8ad94'], ['Caramel', '#b07d52'], ['Taupe', '#8b7b6e'], ['Cinnamon', '#8e4f2f'], ['Mocha', '#7a5a48'], ['Walnut', '#5a4030'], ['Chocolate', '#3e2a20']] },
  { name: 'Neutrals', shades: [['White', '#ffffff'], ['Ivory', '#f7f4ee'], ['Pearl', '#ece8e1'], ['Greige', '#cfc6ba'], ['Silver', '#c0c4c8'], ['Grey', '#8f8f8f'], ['Charcoal', '#3c3a38'], ['Black', '#161412']] }
]

// ---------- colour maths ----------
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')
const rgbOf = (h: string) => {
  const n = parseInt(h.replace('#', '').slice(0, 6).padEnd(6, '0'), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export function toHsl(h: string): [number, number, number] {
  const [r, g, b] = rgbOf(h).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [hue * 60, s * 100, l * 100]
}
export function hsl(h: number, s: number, l: number) {
  h = ((h % 360) + 360) % 360
  s = clamp(s, 0, 100) / 100
  l = clamp(l, 0, 100) / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return hex(f(0) * 255, f(8) * 255, f(4) * 255)
}
const dist = (a: string, b: string) => {
  const [r1, g1, b1] = rgbOf(a)
  const [r2, g2, b2] = rgbOf(b)
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2)
}
const lum = (c: string) => toHsl(c)[2]
const ALL_SHADES = FAMILIES.flatMap((f) => f.shades)

/** The nearest named shade, e.g. "Burgundy", or nothing if the colour is far from all of them. */
export function colourName(c: string): string | undefined {
  let best: [string, number] = ['', Infinity]
  for (const [n, h] of ALL_SHADES) {
    const d = dist(c, h)
    if (d < best[1]) best = [n, d]
  }
  return best[1] < 60 ? best[0] : undefined
}

const familyOf = (c: string) => {
  let best = [0, Infinity]
  FAMILIES.forEach((f, i) => f.shades.forEach(([, h]) => dist(c, h) < best[1] && (best = [i, dist(c, h)])))
  return best[0]
}

/** Palette ideas built around one colour. */
export function palettesFor(base: string): { name: string; colors: string[] }[] {
  const [h, s, l] = toHsl(base)
  const neutral = s < 12
  const byLight = (c: string[]) => [...c].sort((a, b) => lum(b) - lum(a))
  const gen: { name: string; colors: string[] }[] = [
    { name: '{c}, light to dark', colors: byLight([hsl(h, s * 0.35, 96), hsl(h, s * 0.5, 86), base, hsl(h, s, Math.max(l - 18, 12)), hsl(h, s * 0.75, Math.max(l - 34, 7))]) },
    { name: '{c} with ivory and gold', colors: byLight(['#f7f4ee', hsl(h, s * 0.45, 88), base, '#c7a25f', hsl(h, s * 0.6, Math.max(l - 26, 12))]) },
    { name: '{c} with greenery', colors: byLight(['#f8f6f0', hsl(h, s * 0.5, 89), base, '#a7b59c', '#5f7a5a']) },
    { name: '{c} and its neighbours', colors: byLight([hsl(h - 30, s * 0.4, 93), hsl(h + 25, s * 0.55, 78), base, hsl(h - 25, s * 0.7, l * 0.8), hsl(h + 20, s * 0.5, Math.max(l - 30, 12))]) },
    { name: '{c} with a soft contrast', colors: byLight(['#fbfaf7', hsl(h + 180, Math.min(s, 40) * 0.6, 85), base, hsl(h + 180, Math.min(s, 40) * 0.8, 52), hsl(h, s * 0.4, 20)]) },
    { name: '{c} with neutrals', colors: byLight(['#ffffff', '#ece8e1', base, '#8b7b6e', '#2d2a28']) }
  ]
  const curated = PALETTE_IDEAS.filter((p) =>
    p.colors.some((c) => {
      const [h2, s2] = toHsl(c)
      if (neutral) return s2 < 12 && Math.abs(lum(c) - l) < 25
      return s2 > 15 && Math.min(Math.abs(h2 - h), 360 - Math.abs(h2 - h)) < 18 && dist(c, base) < 120
    })
  )
  return [...gen, ...curated]
}

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
    if (picked.every((p) => Math.abs(p.r - col.r) + Math.abs(p.g - col.g) + Math.abs(p.b - col.b) > 70)) picked.push(col)
    if (picked.length === count) break
  }
  return picked.sort((a, b) => b.r + b.g + b.b - (a.r + a.g + a.b)).map((p) => hex(p.r, p.g, p.b))
}

// ---------- pieces ----------
function Strip({ colors, big }: { colors: string[]; big?: boolean }) {
  return (
    <div className={'pal-strip' + (big ? ' big' : '')}>
      {colors.map((c, i) => (
        <span key={i} style={{ background: c }} />
      ))}
    </div>
  )
}

function IdeaList({ ideas, base, onUse }: { ideas: { name: string; colors: string[] }[]; base?: string; onUse: (c: string[]) => void }) {
  const { t } = useI18n()
  const [sel, setSel] = useState<number | null>(null)
  const cname = base ? t(colourName(base) ?? 'this colour') : ''
  return (
    <div className="pal-ideas">
      {ideas.map((p, i) => (
        <div key={p.name + i} className={'pal-idea' + (sel === i ? ' on' : '')} role="button" tabIndex={0} onClick={() => setSel(sel === i ? null : i)}>
          <Strip colors={p.colors} big />
          <div className="pal-idea-foot">
            <span className="small">{t(p.name, { c: cname })}</span>
            {sel === i && (
              <button
                type="button"
                className="btn small primary"
                onClick={(e) => {
                  e.stopPropagation()
                  onUse(p.colors)
                  setSel(null)
                }}
              >
                {t('Use this palette')}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Pick a colour: a family, then a shade, then fine-tune brightness and softness. */
function ColourPicker({ initial, onClose, onPick, onPalette, title }: { initial?: string; title: string; onClose: () => void; onPick: (c: string) => void; onPalette: (c: string[]) => void }) {
  const { t } = useI18n()
  const [fam, setFam] = useState(initial ? familyOf(initial) : 0)
  const [base, setBase] = useState(initial ?? FAMILIES[0].shades[6][1])
  const [light, setLight] = useState(0)
  const [soft, setSoft] = useState(0)
  const [bh, bs, bl] = toHsl(base)
  const colour = light || soft ? hsl(bh, bs - soft, bl + light) : base
  const name = colourName(colour)
  const ideas = useMemo(() => palettesFor(colour), [colour])
  const choose = (h: string) => {
    setBase(h)
    setLight(0)
    setSoft(0)
  }
  return (
    <Sheet title={title} onClose={onClose} onSave={() => onPick(colour)}>
      <div className="picker">
        <div className="picker-preview" style={{ background: colour }}>
          <span style={{ color: lum(colour) > 60 ? '#2a2623' : '#fff' }}>
            {name ? t(name) : ''} <b>{colour.toUpperCase()}</b>
          </span>
        </div>
        <div className="picker-fams" role="tablist">
          {FAMILIES.map((f, i) => (
            <button type="button" key={f.name} role="tab" aria-selected={fam === i} className={'picker-fam' + (fam === i ? ' on' : '')} onClick={() => setFam(i)}>
              <span style={{ background: f.shades[4][1] }} />
              {t(f.name)}
            </button>
          ))}
        </div>
        <div className="picker-shades">
          {FAMILIES[fam].shades.map(([n, h]) => (
            <button type="button" key={n} className={'picker-shade' + (base === h ? ' on' : '')} onClick={() => choose(h)}>
              <span style={{ background: h }} />
              {t(n)}
            </button>
          ))}
        </div>
        <label className="picker-slider">
          <span className="small muted">{t('Brightness')}</span>
          <input type="range" min={-40} max={40} value={light} onChange={(e) => setLight(+e.target.value)} style={{ background: `linear-gradient(90deg, ${hsl(bh, bs, bl - 40)}, ${base}, ${hsl(bh, bs, bl + 40)})` }} />
        </label>
        <label className="picker-slider">
          <span className="small muted">{t('Vivid or soft')}</span>
          <input type="range" min={-40} max={60} value={soft} onChange={(e) => setSoft(+e.target.value)} style={{ background: `linear-gradient(90deg, ${hsl(bh, bs + 40, bl + light)}, ${hsl(bh, bs - 60, bl + light)})` }} />
        </label>
        <h4 className="section" style={{ marginTop: 18 }}>
          {t('Palettes with {c}', { c: name ? t(name) : colour.toUpperCase() })}
        </h4>
        <IdeaList ideas={ideas} base={colour} onUse={onPalette} />
      </div>
    </Sheet>
  )
}

export function Palette({ colors, onChange, sources }: { colors: string[]; onChange: (c: string[]) => void; sources: string[] }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<number | 'add' | 'start' | null>(null)
  const [ideasOpen, setIdeasOpen] = useState(false)
  const [base, setBase] = useState<string | undefined>()
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
  const ideas = base ? palettesFor(base) : PALETTE_IDEAS
  return (
    <div className="palette">
      <Strip colors={colors.length ? colors : ['var(--surface-2)']} big />
      <div className="swatches">
        {colors.map((c, i) => (
          <div key={i} className="swatch-cell">
            <button type="button" className="swatch" style={{ background: c }} title={c.toUpperCase()} aria-label={t('Change colour')} onClick={() => setEditing(i)} />
            <button type="button" className="swatch-x" aria-label={t('Remove')} onClick={() => onChange(colors.filter((_, j) => j !== i))}>
              ×
            </button>
            <span className="swatch-hex">{t(colourName(c) ?? '') || c.toUpperCase()}</span>
          </div>
        ))}
        {colors.length < 8 && (
          <div className="swatch-cell">
            <button type="button" className="swatch swatch-add" aria-label={t('Add colour')} onClick={() => setEditing('add')}>
              +
            </button>
          </div>
        )}
      </div>
      <div className="row-gap" style={{ marginTop: 6 }}>
        <button type="button" className="btn small" onClick={() => setIdeasOpen((o) => !o)} aria-expanded={ideasOpen}>
          {t('Palette ideas')} {ideasOpen ? '▴' : '▾'}
        </button>
        <button type="button" className="btn small ghost" disabled={busy || !sources.length} onClick={fromBoard}>
          {busy ? t('Reading colours…') : t('Colours from our board')}
        </button>
      </div>
      {ideasOpen && (
        <div className="pal-panel">
          <div className="row-gap" style={{ alignItems: 'center' }}>
            <button type="button" className="chip" onClick={() => setEditing('start')}>
              {base && <span className="chip-dot" style={{ background: base }} />}
              {base ? t('Ideas with {c}', { c: t(colourName(base) ?? '') || base.toUpperCase() }) : t('Start from a colour…')}
            </button>
            {base && (
              <button type="button" className="chip faint" onClick={() => setBase(undefined)}>
                {t('All ideas')}
              </button>
            )}
          </div>
          <IdeaList key={base ?? 'all'} ideas={ideas} base={base} onUse={onChange} />
        </div>
      )}
      <p className="small muted" style={{ marginTop: 10 }}>
        {t('Tap a colour to change it. Share these with the florist, the decorator and the cake maker.')}
      </p>
      {editing !== null && (
        <ColourPicker
          title={editing === 'start' ? t('Start from a colour') : editing === 'add' ? t('Add colour') : t('Change colour')}
          initial={typeof editing === 'number' ? colors[editing] : base}
          onClose={() => setEditing(null)}
          onPick={(c) => {
            if (typeof editing === 'number') onChange(colors.map((x, j) => (j === editing ? c : x)))
            else if (editing === 'add') onChange([...colors, c])
            setBase(c)
            setIdeasOpen(true)
            setEditing(null)
          }}
          onPalette={(p) => {
            onChange(p)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
