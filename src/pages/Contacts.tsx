import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { Contact, ContactRole, Row } from '../lib/types'
import { Fab, Field, PageHead, Select, Sheet, Text } from '../components/ui'

export const ROLE_LABEL: Record<ContactRole, string> = { family: 'Family', helper: 'Helper', church: 'Church', other: 'Other' }

const digits = (p: string) => p.replace(/[^\d+]/g, '').replace(/^00/, '+')

/** Call, WhatsApp and email buttons for one person. */
export function ContactActions({ phone, email }: { phone?: string; email?: string }) {
  const { t } = useI18n()
  if (!phone && !email) return null
  return (
    <div className="contact-actions">
      {phone && (
        <a className="btn small" href={`tel:${digits(phone)}`} onClick={(e) => e.stopPropagation()}>
          {t('Call')}
        </a>
      )}
      {phone && (
        <a className="btn small ghost" href={`https://wa.me/${digits(phone).replace('+', '')}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
          WhatsApp
        </a>
      )}
      {email && (
        <a className="btn small ghost" href={`mailto:${email}`} onClick={(e) => e.stopPropagation()}>
          {t('Email')}
        </a>
      )}
    </div>
  )
}

const blank = (): Contact => ({ name: '', role: 'helper' })

export default function Contacts() {
  const { t } = useI18n()
  const { list, add, update, remove } = useStore()
  const people = list('contact').sort((a, b) => a.data.name.localeCompare(b.data.name))
  const vendors = list('vendor').filter((v) => v.data.status !== 'declined').sort((a, b) => a.data.category.localeCompare(b.data.category))
  const venues = list('venue')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<{ row?: Row<'contact'>; data: Contact } | null>(null)
  const match = (...s: (string | undefined)[]) => !q.trim() || s.some((x) => x?.toLowerCase().includes(q.trim().toLowerCase()))

  const save = async () => {
    if (!editing || !editing.data.name.trim()) return
    if (editing.row) await update(editing.row, editing.data)
    else await add('contact', editing.data)
    setEditing(null)
  }
  const e = editing?.data
  const set = (p: Partial<Contact>) => editing && setEditing({ ...editing, data: { ...editing.data, ...p } })

  return (
    <>
      <PageHead eyebrow={t('Everyone in one place')} title={t('Contacts')}>
        <button className="btn primary hide-mobile" onClick={() => setEditing({ data: blank() })}>
          {t('Add person')}
        </button>
      </PageHead>
      <div className="toolbar">
        <input className="input search" placeholder={t('Search contacts')} value={q} onChange={(ev) => setQ(ev.target.value)} />
      </div>

      {(['helper', 'family', 'church', 'other'] as ContactRole[]).map((role) => {
        const rows = people.filter((p) => p.data.role === role && match(p.data.name, p.data.title))
        if (!rows.length) return null
        return (
          <div className="card" key={role}>
            <div className="card-head">
              <h2 className="section">{t(ROLE_LABEL[role])}</h2>
            </div>
            <div className="list">
              {rows.map((p) => (
                <div key={p.id} className="item clickable contact-item" onClick={() => setEditing({ row: p, data: { ...p.data } })}>
                  <div className="grow">
                    <div className="title">{p.data.name}</div>
                    <div className="meta">{[p.data.title, p.data.phone, p.data.dayOf ? t('On the day-of page') : ''].filter(Boolean).join(' · ')}</div>
                  </div>
                  <ContactActions phone={p.data.phone} email={p.data.email} />
                </div>
              ))}
            </div>
          </div>
        )
      })}
      {people.length === 0 && (
        <div className="card">
          <p className="muted">{t('Add helpers, family and church contacts here, such as ushers, the best man, the pastor or the worship leader.')}</p>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={() => setEditing({ data: blank() })}>
            {t('Add person')}
          </button>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('Vendors')}</h2>
        </div>
        <div className="list">
          {vendors.filter((v) => match(v.data.name, v.data.category, v.data.contact)).map((v) => (
            <div key={v.id} className="item contact-item">
              <div className="grow">
                <div className="title">{v.data.name}</div>
                <div className="meta">{[t(v.data.category), v.data.contact, v.data.phone].filter(Boolean).join(' · ')}</div>
              </div>
              <ContactActions phone={v.data.phone} email={v.data.email} />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2 className="section">{t('Venues')}</h2>
        </div>
        <div className="list">
          {venues.map((v) => (
            <div key={v.id} className="item contact-item">
              <div className="grow">
                <div className="title">{v.data.name}</div>
                <div className="meta">{[t(v.data.role), v.data.contact, v.data.phone].filter(Boolean).join(' · ')}</div>
              </div>
              <ContactActions phone={v.data.phone} />
            </div>
          ))}
        </div>
      </div>

      <Fab label={t('Add person')} onClick={() => setEditing({ data: blank() })} />

      {editing && e && (
        <Sheet
          title={editing.row ? e.name : t('Add person')}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={
            editing.row
              ? async () => {
                  await remove(editing.row!.id)
                  setEditing(null)
                }
              : undefined
          }
        >
          <div className="form">
            <Field label={t('Name')} full>
              <Text value={e.name} onChange={(v) => set({ name: v })} autoFocus={!editing.row} required />
            </Field>
            <Field label={t('Group')}>
              <Select value={e.role} onChange={(v) => set({ role: v })} options={(['helper', 'family', 'church', 'other'] as ContactRole[]).map((r) => ({ value: r, label: t(ROLE_LABEL[r]) }))} />
            </Field>
            <Field label={t('Role')}>
              <Text value={e.title} onChange={(v) => set({ title: v })} placeholder={t('e.g. Usher, Best man, Pastor')} />
            </Field>
            <Field label={t('Phone')}>
              <Text type="tel" value={e.phone} onChange={(v) => set({ phone: v })} placeholder="+43 …" />
            </Field>
            <Field label={t('Email')}>
              <Text type="email" value={e.email} onChange={(v) => set({ email: v })} />
            </Field>
            <Field label={t('Notes')} full>
              <Text value={e.notes} onChange={(v) => set({ notes: v })} />
            </Field>
            <Field label={t('Day-of page')} full>
              <div className="chips">
                <button type="button" className={'chip' + (e.dayOf ? ' on' : '')} onClick={() => set({ dayOf: !e.dayOf })}>
                  {e.dayOf ? t('Shown on the day-of page') : t('Show on the day-of page')}
                </button>
              </div>
            </Field>
          </div>
        </Sheet>
      )}
    </>
  )
}
