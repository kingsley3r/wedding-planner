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
  notes?: string
}

export interface BudgetItem {
  category: string
  label: string
  planned: number
  actual: number
  paid: number
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

export interface Settings {
  partner1: string
  partner2: string
  date: string
  guestTarget: number
  budgetTotal: number
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
  settings: Settings
}
export type Kind = keyof KindMap

export interface Row<K extends Kind = Kind> {
  id: string
  kind: K
  data: KindMap[K]
  updated_at?: string
}
