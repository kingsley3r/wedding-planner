import { useEffect, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import { fmtDate } from '../lib/util'

const SEEN = 'wp-intro-seen'
const PHOTO_MS = 1500

export function introSeen() {
  try {
    return sessionStorage.getItem(SEEN) === '1'
  } catch {
    return false
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN, '1')
  } catch {
    /* ignore */
  }
}

const initial = (name: string) => (name.trim()[0] ?? '').toUpperCase()

/** The opening animation: the monogram draws itself, over your photos when there are some. Tap to skip. */
export function Intro({ onDone, preview }: { onDone: () => void; preview?: boolean }) {
  const { lang } = useI18n()
  const { ready, settings, list } = useStore()
  const [leaving, setLeaving] = useState(false)
  const [shot, setShot] = useState(0)
  const photos = list('photo')
    .sort((a, b) => a.data.order - b.data.order)
    .slice(0, 5)
  const s = settings?.data
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  const finish = () => {
    if (!preview) markSeen()
    setLeaving(true)
    setTimeout(onDone, 500)
  }

  useEffect(() => {
    if (!ready) return
    const total = reduced ? 1200 : Math.max(3000, photos.length * PHOTO_MS + 900)
    const end = setTimeout(finish, total)
    const tick = photos.length > 1 && !reduced ? setInterval(() => setShot((n) => Math.min(n + 1, photos.length - 1)), PHOTO_MS) : undefined
    return () => {
      clearTimeout(end)
      if (tick) clearInterval(tick)
    }
    // Start once, when the data has arrived.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const hasPhotos = photos.length > 0
  return (
    <div className={'intro' + (hasPhotos ? ' with-photos' : '') + (leaving ? ' leaving' : '') + (ready && s ? ' go' : '')} onClick={finish} role="presentation">
      {hasPhotos &&
        photos.map((p, i) => (
          <div key={p.id} className={'intro-photo' + (i === shot ? ' on' : '')} style={{ backgroundImage: `url("${p.data.src}")` }} />
        ))}
      {hasPhotos && <div className="intro-shade" />}
      {s && (
        <div className="intro-mark">
          <svg viewBox="0 0 200 200" className="intro-ring" aria-hidden="true">
            <circle cx="100" cy="100" r="92" />
            <circle cx="100" cy="100" r="84" className="inner" />
          </svg>
          <div className="intro-initials">
            <span>{initial(s.partner1)}</span>
            <em>&amp;</em>
            <span>{initial(s.partner2)}</span>
          </div>
          <div className="intro-names">
            {s.partner1} &amp; {s.partner2}
          </div>
          <div className="intro-date">{fmtDate(s.date, lang, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      )}
    </div>
  )
}
