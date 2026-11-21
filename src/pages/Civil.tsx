import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import { fmtDate } from '../lib/util'
import { Bar, Field, PageHead, Text } from '../components/ui'

type Who = 'both' | 'at' | 'ro'
interface Step {
  id: string
  title: string
  body: string
  who?: Who
}
interface Section {
  title: string
  when: string
  steps: Step[]
}

/** Civil wedding in Austria for an Austrian and a Romanian citizen. A guide, not legal advice. */
export const CIVIL: Section[] = [
  {
    title: 'Plan ahead',
    when: '6 to 9 months before',
    steps: [
      {
        id: 'why',
        title: 'Only the civil wedding is legally binding',
        body: 'In Austria a church wedding has no legal effect on its own. You marry legally at the registry office (Standesamt), usually on the same day as the church service or a few days before.'
      },
      {
        id: 'office',
        title: 'Choose a registry office and a date',
        body: 'You can marry at any registry office in Austria, for example the one for Gleisdorf. Ask whether they can also come to another location, and what that costs. Popular summer dates fill up early.'
      },
      {
        id: 'names',
        title: 'Decide on your family names',
        body: 'Each of you can keep your name, take a shared name, or use a double name. You declare this at the registry office. It also decides which Romanian documents need updating later.'
      },
      {
        id: 'witnesses',
        title: 'Ask witnesses (optional)',
        body: 'Witnesses are optional in Austria. You may have up to two. They need a valid photo ID on the day.'
      }
    ]
  },
  {
    title: 'Documents for the Austrian partner',
    when: '3 to 6 months before',
    steps: [
      { id: 'at-id', who: 'at', title: 'Valid passport or ID card', body: 'Bring the original.' },
      {
        id: 'at-birth',
        who: 'at',
        title: 'Birth certificate (Geburtsurkunde)',
        body: 'If you were born in Austria, the registry office can usually look this up in the central register. Ask when you book.'
      },
      {
        id: 'at-cit',
        who: 'at',
        title: 'Proof of citizenship (Staatsbürgerschaftsnachweis)',
        body: 'Often also looked up in the register. Bring it if you have it.'
      },
      { id: 'at-res', who: 'at', title: 'Proof of residence (Meldezettel)', body: 'Usually checked in the central register of residents (ZMR).' }
    ]
  },
  {
    title: 'Documents from Romania',
    when: 'Order 3 to 6 months before',
    steps: [
      { id: 'ro-id', who: 'ro', title: 'Valid Romanian passport or ID card', body: 'Bring the original.' },
      {
        id: 'ro-birth',
        who: 'ro',
        title: 'Birth certificate (certificat de naștere)',
        body: 'Ask the Romanian registry office (Starea Civilă) or the Romanian consulate in Vienna for the birth certificate with the EU multilingual standard form. With that form, no apostille and usually no translation is needed.'
      },
      {
        id: 'ro-single',
        who: 'ro',
        title: 'Proof that she is free to marry',
        body: 'The registry office will ask for proof of single status or a certificate of capacity to marry. Ask the Standesamt which document they accept, then request it from the Romanian consulate in Vienna or the registry office in Romania. These proofs are often only valid for six months.'
      },
      {
        id: 'ro-res',
        who: 'ro',
        title: 'Proof of residence',
        body: 'If she lives in Austria: Meldezettel, and as an EU citizen staying longer than three months, the registration certificate (Anmeldebescheinigung). Otherwise a Romanian proof of address.'
      },
      {
        id: 'ro-translate',
        who: 'ro',
        title: 'Translations, only where needed',
        body: 'Between EU countries, public documents such as birth certificates and proof of marital status do not need an apostille (EU Regulation 2016/1191). If a document comes without the multilingual form, get a German translation from a sworn and court-certified translator (allgemein beeideter und gerichtlich zertifizierter Dolmetscher).'
      }
    ]
  },
  {
    title: 'At the registry office',
    when: 'Up to 6 months before the date',
    steps: [
      {
        id: 'ermittlung',
        who: 'both',
        title: 'Appointment to confirm you can marry (Ermittlung der Ehefähigkeit)',
        body: 'You both go in person with all original documents. The registry office checks them and sets the wedding date. The check is valid for six months, so for 14 August 2027 book it from mid-February 2027.'
      },
      {
        id: 'language',
        who: 'both',
        title: 'Language',
        body: 'Since she speaks German well, no interpreter should be needed. The registry officer decides, so mention it when you book.'
      },
      {
        id: 'fees',
        who: 'both',
        title: 'Fees',
        body: 'Expect fees for the check, the ceremony and the certificates, plus extra if the ceremony is outside the office. Ask for the exact amounts and add them to the budget.'
      }
    ]
  },
  {
    title: 'The day',
    when: 'Wedding day',
    steps: [
      { id: 'day-bring', who: 'both', title: 'Bring IDs, rings and your witnesses', body: 'Put them in the packing list under Rings and documents.' },
      {
        id: 'day-cert',
        who: 'both',
        title: 'Marriage certificate (Heiratsurkunde)',
        body: 'Ask for a few copies, including one with the EU multilingual standard form for Romania.'
      },
      { id: 'day-church', who: 'both', title: 'Give the church a copy', body: 'Your pastor may want to see the marriage certificate before the church service.' }
    ]
  },
  {
    title: 'After the wedding',
    when: 'In the weeks after',
    steps: [
      {
        id: 'ro-register',
        who: 'ro',
        title: 'Register the marriage in Romania (transcrierea certificatului de căsătorie)',
        body: 'Romanian citizens who marry abroad must have the marriage registered in Romania. Do it at the Romanian consulate in Vienna or at a registry office in Romania. She then gets a Romanian marriage certificate.'
      },
      {
        id: 'ro-docs',
        who: 'ro',
        title: 'New Romanian ID and passport if her name changes',
        body: 'Only after the Romanian marriage certificate is issued.'
      },
      {
        id: 'at-update',
        who: 'both',
        title: 'Update names and details in Austria',
        body: 'Residence register, social insurance (e-card), bank, employer and insurance policies.'
      }
    ]
  }
]

const WHO: Record<Who, string> = { both: 'Both of you', at: 'Austrian partner', ro: 'Romanian partner' }

export default function Civil() {
  const { t, lang } = useI18n()
  const { settings, saveSettings } = useStore()
  const s = settings!.data
  const done = new Set(s.civilDone ?? [])
  const total = CIVIL.reduce((n, sec) => n + sec.steps.length, 0)
  const toggle = (id: string) => {
    const next = new Set(done)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    saveSettings({ civilDone: [...next] })
  }
  return (
    <>
      <PageHead
        eyebrow={s.civilDate ? fmtDate(s.civilDate, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : t('{a} of {b} done', { a: done.size, b: total })}
        title={t('Civil wedding')}
      />
      <div className="card">
        <p className="small muted" style={{ marginBottom: 12 }}>
          {t('A step-by-step guide for an Austrian and a Romanian citizen marrying in Austria. Rules change, so confirm the details with your registry office and the Romanian consulate in Vienna.')}
        </p>
        <Bar value={done.size / total} tone="sky" />
        <div className="form" style={{ marginTop: 14 }}>
          <Field label={t('Registry office')}>
            <Text value={s.civilOffice} onChange={(v) => saveSettings({ civilOffice: v || undefined })} placeholder={t('e.g. Standesamt Gleisdorf')} />
          </Field>
          <Field label={t('Civil ceremony date')}>
            <Text type="date" value={s.civilDate} onChange={(v) => saveSettings({ civilDate: v || undefined })} />
          </Field>
        </div>
      </div>
      {CIVIL.map((sec) => (
        <div className="card" key={sec.title}>
          <div className="card-head">
            <h2 className="section">{t(sec.title)}</h2>
            <span className="small muted">{t(sec.when)}</span>
          </div>
          <div className="list">
            {sec.steps.map((st) => (
              <div key={st.id} className="item civil-step">
                <button className={'check' + (done.has(st.id) ? ' on' : '')} role="checkbox" aria-checked={done.has(st.id)} aria-label={t(st.title)} onClick={() => toggle(st.id)} />
                <div className="grow">
                  <div className="title" style={{ textDecoration: done.has(st.id) ? 'line-through' : undefined, color: done.has(st.id) ? 'var(--muted)' : undefined }}>
                    {t(st.title)}
                  </div>
                  {st.who && <span className={'pill ' + (st.who === 'ro' ? 'sky' : st.who === 'at' ? 'rose' : '')}>{t(WHO[st.who])}</span>}
                  <p className="small muted" style={{ marginTop: 4 }}>
                    {t(st.body)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="card">
        <h2 className="section" style={{ marginBottom: 8 }}>
          {t('Official sources')}
        </h2>
        <div className="list">
          <a className="item" href="https://www.oesterreich.gv.at" target="_blank" rel="noreferrer">
            <div className="grow">
              <div className="title">oesterreich.gv.at ↗</div>
              <div className="meta">{t('Austrian government guide: search for "Eheschließung"')}</div>
            </div>
          </a>
          <a className="item" href="https://viena.mae.ro" target="_blank" rel="noreferrer">
            <div className="grow">
              <div className="title">viena.mae.ro ↗</div>
              <div className="meta">{t('Romanian embassy in Vienna, consular section')}</div>
            </div>
          </a>
          <a className="item" href="https://europa.eu/youreurope/citizens/family/couple/marriage/index_en.htm" target="_blank" rel="noreferrer">
            <div className="grow">
              <div className="title">Your Europe ↗</div>
              <div className="meta">{t('EU guide to marrying in another EU country')}</div>
            </div>
          </a>
        </div>
      </div>
    </>
  )
}
