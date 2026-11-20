export type Side = 'bride' | 'groom' | 'both'
export type Rsvp = 'pending' | 'invited' | 'attending' | 'declined'

export interface Guest {
  name: string
  side: Side
  group: string
  household?: string
  phone?: string
  email?: string
  rsvp: Rsvp
  meal?: string
  diet?: string
  child?: boolean
  tableId?: string
  stayId?: string
  notes?: string
}

export interface Installment {
  id: string
  label: string
  amount: number
  dueDate?: string
  paid: boolean
}

export interface BudgetItem {
  category: string
  label: string
  planned: number
  actual: number
  paid: number
  /** Scheduled payments (deposit, balance…). When present, `paid` is the sum of the paid ones. */
  installments?: Installment[]
  dueDate?: string
  payer?: string
  vendorId?: string
  notes?: string
}

export type VendorStatus = 'researching' | 'contacted' | 'quoted' | 'booked' | 'declined'
export interface Vendor {
  name: string
  category: string
  contact?: string
  phone?: string
  email?: string
  website?: string
  quote?: number
  status: VendorStatus
  notes?: string
}

export interface Venue {
  name: string
  role: string
  address?: string
  contact?: string
  phone?: string
  capacity?: number
  startTime?: string
  endTime?: string
  notes?: string
}

export interface Task {
  title: string
  dueDate?: string
  owner?: string
  done: boolean
  phase?: string
}

export type TableShape = 'round' | 'long'
export interface SeatTable {
  name: string
  shape: TableShape
  seats: number
  x: number
  y: number
}

export interface ScheduleItem {
  time: string
  title: string
  place?: string
  who?: string
  notes?: string
}

export interface Note {
  title: string
  body: string
  pinned?: boolean
}

export interface MoodItem {
  /** An image (data URL or web address), a Pinterest pin link, a written idea or a web link. */
  kind: 'image' | 'pin' | 'idea' | 'link'
  src: string
  title?: string
  category: string
  favorite?: boolean
  notes?: string
  /** For a pin saved from the board: the pin's page on Pinterest. */
  link?: string
}

export type ContactRole = 'family' | 'helper' | 'church' | 'other'
export interface Contact {
  name: string
  role: ContactRole
  /** e.g. "Usher", "Best man", "Pastor" */
  title?: string
  phone?: string
  email?: string
  notes?: string
  /** Shown on the day-of helper page. */
  dayOf?: boolean
}

export interface Stay {
  hotel: string
  address?: string
  phone?: string
  website?: string
  checkIn?: string
  checkOut?: string
  rooms?: number
  pricePerNight?: number
  notes?: string
}

export type ProgramKind = 'entrance' | 'song' | 'prayer' | 'reading' | 'sermon' | 'vows' | 'blessing' | 'music' | 'other'
export interface ProgramItem {
  order: number
  kind: ProgramKind
  titleRo: string
  titleDe: string
  /** Song title, Bible reference… */
  detail?: string
  who?: string
  minutes?: number
}

export interface Settings {
  partner1: string
  partner2: string
  date: string
  guestTarget: number
  budgetTotal: number
  pinterestBoard?: string
  /** Remind this many days before a payment is due. */
  reminderDays?: number
  /** Secret part of the read-only day-of helper link. */
  helperToken?: string
  /** Skip the opening animation. */
  introOff?: boolean
}

export interface PackItem {
  item: string
  /** Which bag or group: Bride, Groom, Rings & documents… */
  group: string
  who?: string
  packed: boolean
}

export type ShotFor = 'photo' | 'video' | 'both'
export interface Shot {
  title: string
  moment: string
  for: ShotFor
  people?: string
  notes?: string
  must?: boolean
  done?: boolean
}

export interface Decision {
  title: string
  date: string
  decision: string
  why?: string
  options?: string
  by?: string
  area?: string
}

/** A photo of the couple for the opening animation. */
export interface Photo {
  src: string
  order: number
}

export interface KindMap {
  guest: Guest
  budget: BudgetItem
  vendor: Vendor
  venue: Venue
  task: Task
  table: SeatTable
  schedule: ScheduleItem
  note: Note
  mood: MoodItem
  contact: Contact
  stay: Stay
  program: ProgramItem
  photo: Photo
  pack: PackItem
  shot: Shot
  decision: Decision
  settings: Settings
}
export type Kind = keyof KindMap

export interface Row<K extends Kind = Kind> {
  id: string
  kind: K
  data: KindMap[K]
  updated_at?: string
}
