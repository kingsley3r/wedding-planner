import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { getSession, hasStoredSession, isDemo, onAuthChange } from './lib/backend'
import { StoreProvider, useStore } from './lib/store'
import { useI18n } from './lib/i18n'
import { fmtDate } from './lib/util'
import { duePayments } from './lib/payments'
import { GROUPS, groupOf } from './lib/nav'
import { Icon } from './components/Icons'
import { Intro, introSeen } from './components/Intro'
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
import Mood from './pages/Mood'
import Print from './pages/Print'
import Contacts from './pages/Contacts'
import Stays from './pages/Stays'
import Program from './pages/Program'
import Helper from './pages/Helper'
import Packing from './pages/Packing'
import Shots from './pages/Shots'
import Decisions from './pages/Decisions'
import Weather from './pages/Weather'
import Honeymoon from './pages/Honeymoon'
import Civil from './pages/Civil'
import Invitations from './pages/Invitations'
import Rehearsal from './pages/Rehearsal'
import Music from './pages/Music'

/** Flat list of every page, kept for anything that needs all pages in order. */
export const NAV = GROUPS.flatMap((g) => g.pages)

export default function App() {
  const { pathname } = useLocation()
  // The day-of page is public: it opens from a secret link without signing in.
  if (pathname.startsWith('/helper/')) {
    return (
      <Routes>
        <Route path="/helper/:token" element={<Helper />} />
      </Routes>
    )
  }
  return <Private />
}

function Private() {
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
  // Offline with a sign-in saved on this phone: open the saved copy instead of the login page.
  if (!isDemo && !session && !(typeof navigator !== 'undefined' && !navigator.onLine && hasStoredSession())) return <Login />
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}

function Shell() {
  const { t, lang } = useI18n()
  const { settings, error, ready, list, offline, pending } = useStore()
  const dueCount = settings ? duePayments(list('budget'), settings.data.reminderDays ?? 7).length : 0
  const s = settings?.data
  const { pathname } = useLocation()
  const group = groupOf(pathname)
  const [intro, setIntro] = useState(() => !introSeen())
  const showIntro = intro && !(ready && settings?.data.introOff)
  return (
    <div className="app">
      {showIntro && <Intro onDone={() => setIntro(false)} />}
      <aside className="sidebar">
        <div className="brand">
          {s ? `${s.partner1} & ${s.partner2}` : t('Our wedding')}
          <small>{s ? fmtDate(s.date, lang, { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</small>
        </div>
        <nav className="side-nav">
          {GROUPS.filter((g) => g.id !== 'more').map((g) => (
            <div key={g.id} className={'side-group tone-' + g.tone}>
              {g.id !== 'home' && <div className="side-head">{t(g.title)}</div>}
              {g.pages.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.to === '/'}>
                  <Icon name={n.icon} size={18} />
                  {t(n.label)}
                  {n.to === '/budget' && dueCount > 0 && <b className="dot" />}
                </NavLink>
              ))}
            </div>
          ))}
          <div className="side-group side-bottom">
            {GROUPS[GROUPS.length - 1].pages.map((n) => (
              <NavLink key={n.to} to={n.to}>
                <Icon name={n.icon} size={18} />
                {t(n.label)}
              </NavLink>
            ))}
          </div>
        </nav>
        {isDemo && <div className="side-foot small muted">{t('Demo mode: data stays on this device.')}</div>}
      </aside>
      <main className="content">
        {offline && !error && (
          <div className="banner offline">
            {pending
              ? pending === 1
                ? t('Offline. 1 change is saved on this phone and will sync when you are back online.')
                : t('Offline. {n} changes are saved on this phone and will sync when you are back online.', { n: pending })
              : t('Offline. You are seeing the copy saved on this phone.')}
          </div>
        )}
        {error && (
          <div className="banner error">
            {/row-level security/i.test(error)
              ? t('Your email is not on the allowed list. Add it to allowed_users in Supabase.')
              : `${t('Could not sync')}: ${error}`}
          </div>
        )}
        {ready && group.pages.length > 1 && group.id !== 'more' && (
          <nav className={'subnav tone-' + group.tone}>
            {group.pages.map((p) => (
              <NavLink key={p.to} to={p.to} end>
                <Icon name={p.icon} size={16} />
                {t(p.label)}
              </NavLink>
            ))}
          </nav>
        )}
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
            <Route path="/mood" element={<Mood />} />
            <Route path="/program" element={<Program />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/stays" element={<Stays />} />
            <Route path="/packing" element={<Packing />} />
            <Route path="/shots" element={<Shots />} />
            <Route path="/decisions" element={<Decisions />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/civil" element={<Civil />} />
            <Route path="/invitations" element={<Invitations />} />
            <Route path="/rehearsal" element={<Rehearsal />} />
            <Route path="/music" element={<Music />} />
            <Route path="/honeymoon" element={<Honeymoon />} />
            <Route path="/honeymoon/:tab" element={<Honeymoon />} />
            <Route path="/print" element={<Print />} />
            <Route path="/print/:doc" element={<Print />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/more" element={<More />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </main>
      <nav className="tabbar">
        {GROUPS.filter((g) => !g.noTab).map((g) => (
          <NavLink key={g.id} to={g.id === 'more' ? '/more' : g.pages[0].to} end={g.id === 'home'} className={'tone-' + g.tone + (group.id === g.id || (group.noTab && g.id === 'more') ? ' active' : '')}>
            <span className="tab-icon">
              <Icon name={g.icon} size={21} />
              {g.id === 'money' && dueCount > 0 && <b className="dot" />}
            </span>
            {t(g.label)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
