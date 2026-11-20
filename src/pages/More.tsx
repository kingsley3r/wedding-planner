import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { PageHead } from '../components/ui'

const ITEMS = [
  { to: '/vendors', label: 'Vendors' },
  { to: '/venues', label: 'Venues' },
  { to: '/checklist', label: 'Checklist' },
  { to: '/schedule', label: 'Day-of schedule' },
  { to: '/program', label: 'Church program' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/stays', label: 'Accommodation' },
  { to: '/mood', label: 'Mood board' },
  { to: '/notes', label: 'Notes' },
  { to: '/print', label: 'Print & export' },
  { to: '/settings', label: 'Settings' }
]

export default function More() {
  const { t } = useI18n()
  return (
    <>
      <PageHead eyebrow={t('Wedding planner')} title={t('More')} />
      <div className="card more-list">
        <div className="list">
          {ITEMS.map((i) => (
            <Link key={i.to} to={i.to} className="item clickable">
              <div className="grow title">{t(i.label)}</div>
              <span className="muted">›</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
