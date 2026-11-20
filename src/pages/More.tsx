import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { GROUPS } from '../lib/nav'
import { Icon } from '../components/Icons'
import { PageHead } from '../components/ui'

export default function More() {
  const { t } = useI18n()
  return (
    <>
      <PageHead eyebrow={t('Wedding planner')} title={t('Everything')} />
      {GROUPS.filter((g) => g.id !== 'home').map((g) => (
        <div key={g.id} className={'card more-list tone-' + g.tone}>
          <div className="card-head">
            <h2 className="section">{t(g.title)}</h2>
          </div>
          <div className="list">
            {g.pages.map((i) => (
              <Link key={i.to} to={i.to} className="item clickable">
                <span className="icon-badge">
                  <Icon name={i.icon} size={20} />
                </span>
                <div className="grow title">{t(i.label)}</div>
                <span className="muted">›</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
