import { useMemo, useState } from 'react'
import qrcode from 'qrcode-generator'
import { useI18n } from '../lib/i18n'
import { uid } from '../lib/util'

/** A QR code as crisp SVG. Dark on white so every phone camera reads it, also in dark mode. */
export function Qr({ text, size = 180, label }: { text: string; size?: number; label?: string }) {
  const path = useMemo(() => {
    const q = qrcode(0, 'M')
    q.addData(text)
    q.make()
    const n = q.getModuleCount()
    let d = ''
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`
    return { d, n: n + 8 }
  }, [text])
  return (
    <svg className="qr" width={size} height={size} viewBox={`0 0 ${path.n} ${path.n}`} role="img" aria-label={label ?? text} shapeRendering="crispEdges">
      <rect width={path.n} height={path.n} fill="#fff" />
      <path d={path.d} fill="#161412" />
    </svg>
  )
}

export const newToken = () => (uid() + uid()).replace(/-/g, '').slice(0, 32)

/** A secret link with share, open, QR code, a new link and off. */
export function LinkCard({ url, title, onNew, onOff, qrHint }: { url: string; title: string; onNew: () => void; onOff: () => void; qrHint?: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title, url })
      else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      /* cancelled */
    }
  }
  return (
    <div className="link-card">
      <div className="link-qr">
        <Qr text={url} size={150} label={title} />
        {qrHint && <p className="small muted">{qrHint}</p>}
      </div>
      <div className="share-link">
        <code>{url}</code>
        <button className="btn small primary" onClick={share}>
          {copied ? t('Copied') : t('Share')}
        </button>
      </div>
      <div className="row-gap" style={{ marginTop: 10 }}>
        <a className="btn small ghost" href={url} target="_blank" rel="noreferrer">
          {t('Open')}
        </a>
        <button className="btn small ghost" onClick={() => confirm(t('Make a new link? The old one stops working.')) && onNew()}>
          {t('New link')}
        </button>
        <button className="btn small ghost" onClick={() => confirm(t('Turn the link off? It stops working for everyone.')) && onOff()}>
          {t('Turn off')}
        </button>
      </div>
    </div>
  )
}
