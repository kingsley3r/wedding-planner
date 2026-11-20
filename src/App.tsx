import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { getSession, isDemo, onAuthChange } from './lib/backend'
import { StoreProvider, useStore } from './lib/store'
import { useI18n } from './lib/i18n'
import { fmtDate } from './lib/util'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Guests from './pages/Guests'
import Budget from './pages/Budget'
import Vendors from './pages/Vendors'
import Venues from './pages/Venues'
import Checklist from './pages/Checklist'
import Seating from './pages/Seating'
import Schedule from './pages/Schedule'
import Notes from './pages/Notes'
import Settings from './pages/Settings'
import More from './pages/More'

export const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/guests', label: 'Guests & RSVPs' },
  { to: '/budget', label: 'Budget' },
  { to: '/vendors', label: 'Vendors' },
  { to: '/venues', label: 'Venues' },
  { to: '/checklist', label: 'Checklist' },
  { to: '/seating', label: 'Seating' },
  { to: '/schedule', label: 'Day-of schedule' },
  { to: '/notes', label: 'Notes' },
  { to: '/settings', label: 'Settings' }
]

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checked, setChecked] = useState(isDemo)

  useEffect(() => {
    if (isDemo) return
    getSession().then((s) => {
      setSession(s)
      setChecked(true)
    })
    return onAuthChange(setSession)
  }, [])

  if (!checked) return null
  if (!isDemo && !session) return <Login />
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}

function Shell() {
  const { t, lang } = useI18n()
  const { settings, error, ready } = useStore()
  const s = settings?.data
  const { pathname } = useLocation()
  const inMore = ['/vendors', '/venues', '/checklist', '/schedule', '/notes', '/settings'].includes(pathname)
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          {s ? `${s.partner1} & ${s.partner2}` : t('Our wedding')}
          <small>{s ? fmtDate(s.date, lang, { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</small>
        </div>
        <nav className="side-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}>
              <i />
              {t(n.label)}
            </NavLink>
          ))}
        </nav>
        {isDemo && <div className="side-foot small muted">{t('Demo mode: data stays on this device.')}</div>}
      </aside>
      <main className="content">
        {error && <div className="banner error">{t('Could not sync')}: {error}</div>}
        {ready && (
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/guests" element={<Guests />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/venues" element={<Venues />} />
            <Route path="/checklist" element={<Checklist />} />
            <Route path="/seating" element={<Seating />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/more" element={<More />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </main>
      <nav className="tabbar">
        {[
          { to: '/', label: 'Home' },
          { to: '/guests', label: 'Guests' },
          { to: '/budget', label: 'Budget' },
          { to: '/seating', label: 'Seating' },
          { to: '/more', label: 'More' }
        ].map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) => (isActive || (n.to === '/more' && inMore) ? 'active' : '')}
          >
            <i />
            {t(n.label)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
