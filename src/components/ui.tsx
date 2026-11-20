import { useEffect, type ReactNode } from 'react'
import { useI18n } from '../lib/i18n'

export function Sheet({
  title,
  onClose,
  onSave,
  onDelete,
  children
}: {
  title: string
  onClose: () => void
  onSave?: () => void
  onDelete?: () => void
  children: ReactNode
}) {
  const { t } = useI18n()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="sheet"
        role="dialog"
        aria-label={title}
        onSubmit={(e) => {
          e.preventDefault()
          onSave?.()
        }}
      >
        <h3>{title}</h3>
        {children}
        <div className="sheet-actions">
          <div>
            {onDelete && (
              <button
                type="button"
                className="btn ghost danger"
                onClick={() => {
                  if (confirm(t('Delete this?'))) onDelete()
                }}
              >
                {t('Delete')}
              </button>
            )}
          </div>
          <div className="row-gap">
            <button type="button" className="btn" onClick={onClose}>
              {t('Cancel')}
            </button>
            {onSave && (
              <button type="submit" className="btn primary">
                {t('Save')}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

export function Field({ label, full, children }: { label: string; full?: boolean; children: ReactNode }) {
  return (
    <div className={'field' + (full ? ' full' : '')}>
      <label>{label}</label>
      {children}
    </div>
  )
}

export function Text({
  value,
  onChange,
  type = 'text',
  placeholder,
  autoFocus,
  required
}: {
  value: string | number | undefined
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  autoFocus?: boolean
  required?: boolean
}) {
  return (
    <input
      className="input"
      type={type}
      value={value ?? ''}
      placeholder={placeholder}
      autoFocus={autoFocus}
      required={required}
      inputMode={type === 'number' ? 'decimal' : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function Select<T extends string>({
  value,
  onChange,
  options
}: {
  value: T | undefined
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function PageHead({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page">{title}</h1>
      </div>
      {children && <div className="row-gap">{children}</div>}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="serif">{title}</span>
      {children}
    </div>
  )
}

export function Bar({ value, tone }: { value: number; tone?: 'gold' | 'rose' | 'sky' }) {
  const pct = Math.max(0, Math.min(100, value * 100))
  return (
    <div className={'bar' + (tone ? ' ' + tone : '')}>
      <span style={{ width: pct + '%' }} />
    </div>
  )
}

export function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="fab" aria-label={label} onClick={onClick}>
      +
    </button>
  )
}
