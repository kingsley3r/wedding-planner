import type { Kind, KindMap, Row } from './types'
import { uid } from './util'

const WEDDING_DATE = '2027-08-14'

function addMonths(date: string, months: number) {
  const d = new Date(date + 'T12:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}
function addDays(date: string, days: number) {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function row<K extends Kind>(kind: K, data: KindMap[K]): Row<K> {
  return { id: uid(), kind, data }
}

/** Starting content for a fresh wedding: settings, both venues, a checklist and a day-of outline. */
export function starterRows(): Row[] {
  const d = WEDDING_DATE
  const tasks: [number, string, string][] = [
    [-9, '9 months', 'Set the total budget together'],
    [-9, '9 months', 'Draft the guest list with both families'],
    [-9, '9 months', 'Confirm Logos Gleisdorf for the ceremony'],
    [-9, '9 months', 'Sign the contract with Congress Loipersdorf'],
    [-8, '8 months', 'Book the photographer'],
    [-8, '8 months', 'Book the videographer'],
    [-7, '7 months', 'Choose the caterer and menu style'],
    [-7, '7 months', 'Plan worship and music for the ceremony'],
    [-6, '6 months', 'Send save-the-dates'],
    [-6, '6 months', 'Choose the wedding dress'],
    [-6, '6 months', 'Book the florist and decor'],
    [-5, '5 months', 'Book hotel rooms for out-of-town family'],
    [-4, '4 months', 'Order invitations (EN / DE / RO)'],
    [-4, '4 months', 'Choose the suit'],
    [-4, '4 months', 'Order the wedding cake'],
    [-3, '3 months', 'Send invitations'],
    [-3, '3 months', 'Buy the rings'],
    [-3, '3 months', 'Plan transport from Gleisdorf to Loipersdorf'],
    [-2, '2 months', 'Menu tasting at the venue'],
    [-2, '2 months', 'Hair and makeup trial'],
    [-1, '1 month', 'Chase RSVPs and finalise the guest count'],
    [-1, '1 month', 'Finish the seating chart'],
    [-1, '1 month', 'Final dress and suit fittings'],
    [-1, '1 month', 'Share the day-of schedule with helpers'],
    [0, 'Final week', 'Confirm times with every vendor'],
    [0, 'Final week', 'Prepare final payments'],
    [0, 'Final week', 'Pack the emergency kit']
  ]
  const schedule: [string, string, string][] = [
    ['09:00', 'Getting ready', ''],
    ['12:30', 'Photographer arrives', ''],
    ['14:00', 'Ceremony', 'Logos Gleisdorf'],
    ['15:30', 'Congratulations and group photos', 'Logos Gleisdorf'],
    ['16:30', 'Drive to Loipersdorf', ''],
    ['17:30', 'Guests arrive, welcome drinks', 'Congress Loipersdorf'],
    ['18:30', 'Dinner', 'Congress Loipersdorf'],
    ['20:30', 'Cake', 'Congress Loipersdorf'],
    ['23:00', 'End of evening', 'Congress Loipersdorf']
  ]
  const budget: [string, number][] = [
    ['Venue', 0],
    ['Catering', 0],
    ['Photo and video', 0],
    ['Music', 0],
    ['Flowers and decor', 0],
    ['Attire', 0],
    ['Rings', 0],
    ['Invitations and print', 0],
    ['Transport', 0],
    ['Cake', 0]
  ]
  return [
    row('settings', { partner1: 'Darius', partner2: 'Partner', date: d, guestTarget: 150, budgetTotal: 30000 }),
    row('venue', { name: 'Logos Gleisdorf', role: 'Ceremony', address: 'Gleisdorf, Austria' }),
    row('venue', { name: 'Congress Loipersdorf', role: 'Reception', address: 'Loipersdorf, Austria' }),
    ...tasks.map(([m, phase, title]) =>
      row('task', { title, phase, done: false, dueDate: m === 0 ? addDays(d, -7) : addMonths(d, m) })
    ),
    ...schedule.map(([time, title, place]) => row('schedule', { time, title, place })),
    ...budget.map(([category, planned]) => row('budget', { category, label: category, planned, actual: 0, paid: 0 }))
  ]
}

/** Sample data so the demo looks like a wedding in progress. */
export function seedRows(): Row[] {
  const rows = starterRows()
  const settings = rows.find((r) => r.kind === 'settings')!
  ;(settings.data as KindMap['settings']).partner2 = 'Ana'
  rows.forEach((r) => {
    if (r.kind === 'task') {
      const t = r.data as KindMap['task']
      if (t.dueDate && t.dueDate < '2027-02-01') t.done = true
    }
  })
  const budgetPlan: Record<string, [number, number, number]> = {
    Venue: [9000, 9200, 3000],
    Catering: [8500, 0, 0],
    'Photo and video': [3200, 3200, 800],
    Music: [1200, 0, 0],
    'Flowers and decor': [2500, 0, 0],
    Attire: [2500, 1800, 1800],
    Rings: [1500, 0, 0],
    'Invitations and print': [600, 450, 450],
    Transport: [800, 0, 0],
    Cake: [700, 0, 0]
  }
  rows.forEach((r) => {
    if (r.kind === 'budget') {
      const b = r.data as KindMap['budget']
      const v = budgetPlan[b.category]
      if (v) [b.planned, b.actual, b.paid] = v
    }
  })
  const t1 = row('table', { name: '1', shape: 'round', seats: 10, x: 22, y: 45 })
  const t2 = row('table', { name: '2', shape: 'round', seats: 10, x: 50, y: 62 })
  const t3 = row('table', { name: '3', shape: 'round', seats: 10, x: 78, y: 45 })
  const head = row('table', { name: 'Head table', shape: 'long', seats: 8, x: 50, y: 14 })
  const people: [string, 'bride' | 'groom' | 'both', string, 'attending' | 'invited' | 'declined' | 'pending', string?][] = [
    ['Ioan Popescu', 'bride', 'Family', 'attending', head.id],
    ['Maria Popescu', 'bride', 'Family', 'attending', head.id],
    ['Andrei Popescu', 'bride', 'Family', 'attending', t1.id],
    ['Elena Popescu', 'bride', 'Family', 'attending', t1.id],
    ['Gabriel Ionescu', 'groom', 'Family', 'attending', head.id],
    ['Daniela Ionescu', 'groom', 'Family', 'attending', head.id],
    ['Pastor Mihai Lazar', 'both', 'Church', 'attending', t2.id],
    ['Ruth Lazar', 'both', 'Church', 'attending', t2.id],
    ['Samuel Moldovan', 'groom', 'Friends', 'attending', t3.id],
    ['Lea Moldovan', 'groom', 'Friends', 'attending', t3.id],
    ['Tobias Gruber', 'groom', 'Work', 'invited'],
    ['Katharina Huber', 'bride', 'Friends', 'invited'],
    ['Florin Dumitru', 'groom', 'Church', 'pending'],
    ['Simona Dumitru', 'groom', 'Church', 'pending'],
    ['Lukas Berger', 'groom', 'Work', 'declined'],
    ['Ana Marin', 'bride', 'Friends', 'attending'],
    ['Cristian Marin', 'bride', 'Friends', 'attending'],
    ['David Ionescu', 'groom', 'Family', 'attending', t1.id]
  ]
  const guests = people.map(([name, side, group, rsvp, tableId]) =>
    row('guest', { name, side, group, rsvp, tableId, meal: rsvp === 'attending' ? 'Standard' : undefined })
  )
  const vendors = [
    row('vendor', { name: 'Photo studio (example)', category: 'Photographer', status: 'booked', quote: 3200 }),
    row('vendor', { name: 'Flower shop (example)', category: 'Florist', status: 'quoted', quote: 2300 }),
    row('vendor', { name: 'Venue catering (example)', category: 'Caterer', status: 'contacted' }),
    row('vendor', { name: 'Worship band (example)', category: 'Music', status: 'researching' })
  ] as Row[]
  return [...rows, head, t1, t2, t3, ...guests, ...vendors]
}
