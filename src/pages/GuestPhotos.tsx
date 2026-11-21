import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import { deleteGuestPhoto, isDemo, listGuestPhotos, type GuestPhoto } from '../lib/backend'
import { fmtDate } from '../lib/util'
import { Empty, PageHead } from '../components/ui'
import { LinkCard, newToken } from '../components/Qr'

/** Photos guests uploaded from the QR code, and the link to share. */
export default function GuestPhotos() {
  const { t, lang } = useI18n()
  const { settings, saveSettings } = useStore()
  const s = settings!.data
  const url = s.photoToken ? `${location.origin}/p/${s.photoToken}` : ''
  const folders = s.photoFolders ?? []
  const [photos, setPhotos] = useState<GuestPhoto[] | null>(null)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState<GuestPhoto | null>(null)

  const load = useCallback(() => {
    listGuestPhotos(folders)
      .then((p) => (setPhotos(p), setErr('')))
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders.join()])
  useEffect(load, [load])

  const turnOn = () => {
    const tok = newToken()
    saveSettings({ photoToken: tok, photoFolders: [...folders, tok] })
  }

  return (
    <>
      <PageHead eyebrow={photos ? t('{n} photos', { n: photos.length }) : t('From your guests')} title={t('Guest photos')}>
        {url && (
          <Link className="btn" to="/print/photo-card">
            {t('Print table card')}
          </Link>
        )}
      </PageHead>

      <div className="card">
        <p className="small muted" style={{ marginBottom: 12 }}>
          {t('Guests scan the QR code and upload their photos straight from their phone. No app or account needed. Only the two of you can see the photos.')}
        </p>
        {url ? (
          <LinkCard url={url} title={t('Share your photos')} qrHint={t('Put it on the tables and the website.')} onNew={turnOn} onOff={() => saveSettings({ photoToken: undefined })} />
        ) : (
          <button className="btn primary" onClick={turnOn}>
            {t('Create the photo link')}
          </button>
        )}
        {isDemo ? (
          <p className="small muted" style={{ marginTop: 10 }}>
            {t('Uploads need Supabase. In demo mode the page opens but photos are not saved.')}
          </p>
        ) : (
          <p className="small muted" style={{ marginTop: 10 }}>
            {t('One-time setup: run supabase/website-photos.sql in the Supabase SQL Editor.')}
          </p>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('Photos')}</h2>
          <button className="btn small ghost" onClick={load}>
            {t('Refresh')}
          </button>
        </div>
        {err ? (
          <p className="small muted">{/bucket|not found/i.test(err) ? t('Run supabase/website-photos.sql first.') : err}</p>
        ) : !photos || photos.length === 0 ? (
          <Empty title={t('No photos yet')}>{t('They appear here as soon as guests upload them.')}</Empty>
        ) : (
          <div className="gp-grid">
            {photos.map((p) => (
              <button key={p.path} className="gp-tile" onClick={() => setOpen(p)} style={{ backgroundImage: `url("${p.url}")` }} aria-label={p.from || t('Photo')} />
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="lightbox" onClick={() => setOpen(null)} role="dialog">
          <img src={open.url} alt="" />
          <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
            <span className="small">
              {[open.from, open.at && fmtDate(open.at.slice(0, 10), lang, { day: 'numeric', month: 'short' })].filter(Boolean).join(' · ')}
            </span>
            <span className="row-gap">
              <a className="btn small" href={open.url + '&download=' + encodeURIComponent(open.path.split('/').pop() ?? 'photo.jpg')}>
                {t('Download')}
              </a>
              <button
                className="btn small ghost danger"
                onClick={async () => {
                  if (!confirm(t('Delete this photo?'))) return
                  await deleteGuestPhoto(open.path)
                  setOpen(null)
                  load()
                }}
              >
                {t('Delete')}
              </button>
            </span>
          </div>
        </div>
      )}
    </>
  )
}
