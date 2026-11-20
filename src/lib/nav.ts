export type Tone = 'gold' | 'sage' | 'rose' | 'sky'
export interface NavPage {
  to: string
  label: string
  icon: string
}
export interface NavGroup {
  id: string
  /** Short name for the tab bar. */
  label: string
  /** Longer heading for the sidebar and the More page. */
  title: string
  icon: string
  tone: Tone
  pages: NavPage[]
}

/** Every page, grouped by what belongs together. The first page of a group is where its tab leads. */
export const GROUPS: NavGroup[] = [
  { id: 'home', label: 'Home', title: 'Home', icon: 'home', tone: 'gold', pages: [{ to: '/', label: 'Overview', icon: 'home' }] },
  {
    id: 'guests',
    label: 'Guests',
    title: 'Guests',
    icon: 'guests',
    tone: 'sage',
    pages: [
      { to: '/guests', label: 'Guests & RSVPs', icon: 'guests' },
      { to: '/seating', label: 'Seating', icon: 'seating' },
      { to: '/stays', label: 'Accommodation', icon: 'stays' }
    ]
  },
  {
    id: 'money',
    label: 'Budget',
    title: 'Budget & vendors',
    icon: 'budget',
    tone: 'gold',
    pages: [
      { to: '/budget', label: 'Budget', icon: 'budget' },
      { to: '/vendors', label: 'Vendors', icon: 'vendors' }
    ]
  },
  {
    id: 'day',
    label: 'The day',
    title: 'The day',
    icon: 'day',
    tone: 'rose',
    pages: [
      { to: '/schedule', label: 'Day-of schedule', icon: 'schedule' },
      { to: '/program', label: 'Church program', icon: 'program' },
      { to: '/venues', label: 'Venues', icon: 'venues' },
      { to: '/contacts', label: 'Contacts', icon: 'contacts' },
      { to: '/shots', label: 'Shot list', icon: 'shots' },
      { to: '/packing', label: 'Packing list', icon: 'packing' },
      { to: '/weather', label: 'Weather', icon: 'weather' }
    ]
  },
  {
    id: 'plan',
    label: 'Planning',
    title: 'Planning',
    icon: 'plan',
    tone: 'sky',
    pages: [
      { to: '/checklist', label: 'Checklist', icon: 'checklist' },
      { to: '/mood', label: 'Mood board', icon: 'mood' },
      { to: '/decisions', label: 'Decision log', icon: 'decisions' },
      { to: '/notes', label: 'Notes', icon: 'notes' }
    ]
  },
  {
    id: 'more',
    label: 'More',
    title: 'More',
    icon: 'more',
    tone: 'gold',
    pages: [
      { to: '/print', label: 'Print & export', icon: 'print' },
      { to: '/settings', label: 'Settings', icon: 'settings' }
    ]
  }
]

export function groupOf(pathname: string): NavGroup {
  if (pathname === '/more') return GROUPS[GROUPS.length - 1]
  return GROUPS.find((g) => g.pages.some((p) => (p.to === '/' ? pathname === '/' : pathname === p.to || pathname.startsWith(p.to + '/')))) ?? GROUPS[0]
}
