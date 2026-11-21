import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { photoInfo, uploadGuestPhoto } from '../lib/backend'
import { useI18n, type Lang } from '../lib/i18n'
import { fmtDate } from '../lib/util'

const NAME = 'wp-guest-name'

/** Shrink a photo to at most 2400 px on its long side, as JPEG. Keeps uploads quick on mobile data. */
function shrink(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, 2400 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read image'))), 'image/jpeg', 0.88)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}

/** Guests upload their photos here from the QR code. No sign-in, and they can't see anyone else's photos. */
export default function PhotoUpload() {
  const { token = '' } = useParams()
  const { t, lang, setLang } = useI18n()
  const [info, setInfo] = useState<{ partner1?: string; partner2?: string; date?: string } | null | undefined>(undefined)
  const [notSetUp, setNotSetUp] = useState(false)
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME) ?? ''
    } catch {
      return ''
    }
  })
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    photoInfo(token)
      .then(setInfo)
      .catch((e) => {
        setNotSetUp(/guest_photo_info|function|schema cache/i.test(e instanceof Error ? e.message : String(e?.message ?? e)))
        setInfo(null)
      })
  }, [token])

  const send = async (files: FileList | null) => {
    if (!files?.length) return
    try {
      localStorage.setItem(NAME, name)
    } catch {
      /* private mode */
    }
    const list = [...files].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    let done = 0
    let failed = 0
    setProgress({ done, total: list.length, failed })
    for (const f of list) {
      try {
        await uploadGuestPhoto(token, await shrink(f), name.trim())
        done++
      } catch {
        failed++
      }
      setProgress({ done, total: list.length, failed })
    }
  }

  const langs = (
    <div className="site-langs">
      {(['en', 'de', 'ro'] as Lang[]).map((l) => (
        <button key={l} className={l === lang ? 'on' : ''} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )

  if (info === undefined) return <div className="site" />
  if (!info) {
    return (
      <div className="site">
        {langs}
        <div className="site-card" style={{ textAlign: 'center', marginTop: 80 }}>
          <h2>{t('This link no longer works')}</h2>
          <p className="muted">{notSetUp ? t('Photo uploads are not set up in Supabase yet.') : t('Ask the couple for the new link.')}</p>
        </div>
      </div>
    )
  }

  const finished = progress && progress.done + progress.failed === progress.total
  return (
    <div className="site">
      {langs}
      <header className="site-hero" style={{ paddingBottom: 10 }}>
        <div className="site-eyebrow">{t('Share your photos')}</div>
        <h1>
          {info.partner1} <span>&amp;</span> {info.partner2}
        </h1>
        {info.date && <div className="site-date">{fmtDate(info.date, lang, { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
      </header>
      <section className="site-card">
        <p className="muted" style={{ marginBottom: 14 }}>
          {t('Thank you for celebrating with us! Choose the photos you took, as many as you like. Only the two of us will see them.')}
        </p>
        <label className="field">
          <span>{t('Your name (optional)')}</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => (send(e.target.files), (e.target.value = ''))} />
        <button className="btn primary site-upload" disabled={!!progress && !finished} onClick={() => input.current?.click()}>
          {progress && !finished ? t('Uploading {a} of {b}…', { a: progress.done + progress.failed + 1, b: progress.total }) : t('Choose photos')}
        </button>
        {progress && (
          <div className="upload-bar">
            <span style={{ width: `${((progress.done + progress.failed) / Math.max(progress.total, 1)) * 100}%` }} />
          </div>
        )}
        {finished && (
          <p className="site-thanks">
            {progress.failed ? t('{a} photos sent, {b} could not be sent. Please try those again.', { a: progress.done, b: progress.failed }) : t('Thank you! {n} photos sent.', { n: progress.done })}
          </p>
        )}
      </section>
    </div>
  )
}
