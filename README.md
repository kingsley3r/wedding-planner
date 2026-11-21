# Wedding Planner

A calm, private planner for one wedding, made for two iPhones. Guests and RSVPs, budget in EUR, vendors, both venues, a checklist, a drag-and-drop seating chart and the day-of schedule, in English, German and Romanian.

## Try it

```bash
npm install
npm run dev
```

Without Supabase keys the app runs in **demo mode**: it fills itself with sample data and saves only in that browser. Settings > Reset demo data starts over.

## Set it up for real (about 15 minutes)

1. **Supabase** (free): create a project at supabase.com.
   - SQL Editor > New query: paste `supabase/schema.sql`, put your two email addresses in the last lines, Run.
   - Authentication > Users > *Add user* > *Create new user*: add both email addresses with a password and tick **Auto Confirm User**. (No email is sent, so Supabase's email limit doesn't matter.)
   - Authentication > Sign In / Providers: turn **off** "Allow new users to sign up", so nobody else can create an account.
   - Project Settings > API: copy the *Project URL* and the *anon public* key.
2. **Vercel** (free): import this GitHub repository, and under Environment Variables add
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon key

   Deploy. Then in Supabase > Authentication > URL Configuration, set the *Site URL* to your Vercel address.
3. **On each iPhone**: open the Vercel address in Safari, sign in with your email and password (or ask for an email link), then Share > *Add to Home Screen*. It opens full screen like an app.

The first sign-in fills the planner with your two venues, a checklist counting down to the date, a day-of outline and budget categories. Change anything in Settings or on each page.

## How it is built

- Vite + React + TypeScript, plain CSS (`src/styles.css` holds the colours and type).
- Supabase for login (email + password, or an email link), the database (`items` table, one JSON record per thing) and live sync between phones.
- Installable PWA (works offline once loaded).
- Translations: `src/lib/i18n-de.ts`, `src/lib/i18n-ro.ts`. English text is the key.

## Importing guests

Guests > Import CSV. A header row with any of `name`, `side`, `group`, `phone`, `email` is recognised (German and Romanian headers too); commas or semicolons both work, so an Excel export is fine.

## Backups

There are three layers, so nothing is lost if a phone breaks or Supabase has a problem:

1. **Download backup** in Settings saves everything as one `.json` file. **Restore from a file** puts it back.
2. **Daily copies on this phone.** The app keeps one copy per day for the last 7 days, listed in Settings.
3. **Nightly backup on GitHub (set up once).** `.github/workflows/backup.yml` exports the database every night at about 3:30 in Austria. It encrypts the file with your passphrase and stores it for 90 days under the repository's **Actions** tab. This repository is public, so the files are only ever stored encrypted.

### Set up the nightly backup

In GitHub, open **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret | Where to find it |
| --- | --- |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key (keep this secret) |
| `BACKUP_PASSPHRASE` | A long passphrase you make up. Store it in your password manager: without it the backups can't be opened. |

Then open **Actions → Nightly backup → Run workflow** once to check that it works.

### Open a nightly backup

Download the artifact from the Actions run, unzip it, then on a Mac or Linux:

```sh
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in wedding-backup-YYYY-MM-DD.json.gz.enc -out backup.json.gz -pass pass:'YOUR PASSPHRASE'
gunzip backup.json.gz
```

Then use **Settings → Restore from a file** in the app and pick `backup.json`.
