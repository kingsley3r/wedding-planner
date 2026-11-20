import type { ReactNode } from 'react'

/** Thin line icons drawn for this app, 24×24, stroke uses currentColor. */
const P: Record<string, ReactNode> = {
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  guests: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <circle cx="17" cy="9.5" r="2.4" />
      <path d="M15.8 14.3c2.4-.3 4.3 1.3 4.7 4.2" />
    </>
  ),
  seating: (
    <>
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="4.5" r="1.4" />
      <circle cx="12" cy="19.5" r="1.4" />
      <circle cx="4.5" cy="12" r="1.4" />
      <circle cx="19.5" cy="12" r="1.4" />
    </>
  ),
  stays: (
    <>
      <path d="M3 18V7" />
      <path d="M3 14h18v4" />
      <path d="M21 14v-2.5a2.5 2.5 0 0 0-2.5-2.5H11v5" />
      <circle cx="7" cy="11" r="1.8" />
    </>
  ),
  budget: (
    <>
      <rect x="3.5" y="6.5" width="17" height="12" rx="2.5" />
      <path d="M3.5 10h17" />
      <path d="M15 14.5h2.5" />
    </>
  ),
  vendors: (
    <>
      <path d="M4.5 9.5 6 5h12l1.5 4.5" />
      <path d="M4.5 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
      <path d="M5.5 12v7.5h13V12" />
      <path d="M10 19.5v-4h4v4" />
    </>
  ),
  venues: (
    <>
      <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  checklist: (
    <>
      <path d="m4 7 1.6 1.6L8.5 5.6" />
      <path d="m4 13.5 1.6 1.6 2.9-3" />
      <path d="M11.5 7h8.5" />
      <path d="M11.5 13.5h8.5" />
      <path d="M11.5 19.5h8.5" />
      <circle cx="6" cy="19.5" r=".6" />
    </>
  ),
  schedule: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  program: (
    <>
      <path d="M12 3v5" />
      <path d="M9.5 5.5h5" />
      <path d="M5 21V12l7-4 7 4v9" />
      <path d="M10 21v-4a2 2 0 0 1 4 0v4" />
    </>
  ),
  contacts: (
    <>
      <path d="M6.5 4h3l1.5 4-2 1.2a10 10 0 0 0 5.8 5.8l1.2-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4z" />
    </>
  ),
  mood: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m4 17.5 5-4.5 4 3.5 3-2.5 4.5 3.5" />
    </>
  ),
  notes: (
    <>
      <path d="M6 3.5h8.5L19 8v12.5H6z" />
      <path d="M14 3.5V8.5h5" />
      <path d="M9 13h7M9 16.5h5" />
    </>
  ),
  print: (
    <>
      <path d="M7 8V3.5h10V8" />
      <rect x="3.5" y="8" width="17" height="8.5" rx="2" />
      <path d="M7 14h10v6.5H7z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
    </>
  ),
  day: (
    <>
      <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.2 4.5c2 0 3.4 1.1 4.8 2.8 1.4-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.5 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
    </>
  ),
  plan: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M4 9.5h16M8.5 3v4M15.5 3v4" />
      <path d="m9 14.5 2 2 4-4" />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="18" cy="12" r="1.3" />
    </>
  )
}

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name] ?? P.more}
    </svg>
  )
}
