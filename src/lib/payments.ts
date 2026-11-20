import type { BudgetItem, Installment, Row } from './types'
import { todayIso, uid } from './util'

export interface Payment {
  key: string
  row: Row<'budget'>
  installmentId?: string
  label: string
  item: string
  amount: number
  dueDate: string
  paid: boolean
}

/** Every dated payment across the budget: the installments, or the old single due date. */
export function allPayments(items: Row<'budget'>[]): Payment[] {
  const out: Payment[] = []
  for (const r of items) {
    const d = r.data
    const name = d.label
    if (d.installments?.length) {
      for (const i of d.installments) {
        if (!i.dueDate) continue
        out.push({ key: r.id + i.id, row: r, installmentId: i.id, label: i.label, item: name, amount: i.amount, dueDate: i.dueDate, paid: i.paid })
      }
    } else if (d.dueDate) {
      const owed = (d.actual || d.planned || 0) - (d.paid || 0)
      out.push({ key: r.id, row: r, label: '', item: name, amount: Math.max(0, owed), dueDate: d.dueDate, paid: owed <= 0 })
    }
  }
  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export function addDaysIso(iso: string, days: number) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Unpaid payments that are overdue or due within `days`. */
export function duePayments(items: Row<'budget'>[], days: number) {
  const today = todayIso()
  const limit = addDaysIso(today, days)
  return allPayments(items).filter((p) => !p.paid && p.dueDate <= limit)
}

/** Recalculate the item's paid total and next due date from its installments. */
export function withInstallments(d: BudgetItem, installments: Installment[]): BudgetItem {
  if (!installments.length) return { ...d, installments: undefined }
  const paid = installments.filter((i) => i.paid).reduce((a, i) => a + (i.amount || 0), 0)
  const next = installments.filter((i) => !i.paid && i.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))[0]
  return { ...d, installments, paid, dueDate: next?.dueDate }
}

export function newInstallment(label: string): Installment {
  return { id: uid(), label, amount: 0, paid: false }
}

/** Mark one payment as paid (an installment, or the whole remaining amount of an item). */
export function markPaidPatch(p: Payment): Partial<BudgetItem> {
  const d = p.row.data
  if (p.installmentId && d.installments) {
    const inst = d.installments.map((i) => (i.id === p.installmentId ? { ...i, paid: true } : i))
    const next = withInstallments(d, inst)
    return { installments: next.installments, paid: next.paid, dueDate: next.dueDate }
  }
  return { paid: d.actual || d.planned || 0, dueDate: undefined }
}

/* ---------- Calendar (.ics) ---------- */

const icsDate = (iso: string) => iso.replace(/-/g, '')
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => '\\' + c)

/** A calendar file with an all-day event per payment and an alert `days` before (and on the morning itself). */
export function paymentsIcs(payments: Payment[], days: number, fmtAmount: (n: number) => string, prefix: string) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wedding Planner//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  for (const p of payments) {
    const title = `${prefix}: ${p.item}${p.label ? ' – ' + p.label : ''} (${fmtAmount(p.amount)})`
    lines.push(
      'BEGIN:VEVENT',
      `UID:${p.key}@wedding-planner`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(p.dueDate)}`,
      `DTEND;VALUE=DATE:${icsDate(addDaysIso(p.dueDate, 1))}`,
      `SUMMARY:${icsText(title)}`,
      // Alert at 09:00 `days` before the due date, and at 09:00 on the day itself.
      ...(days > 0 ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(title)}`, `TRIGGER:-P${days - 1}DT15H`, 'END:VALARM'] : []),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsText(title)}`,
      'TRIGGER:PT9H',
      'END:VALARM',
      'END:VEVENT'
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
