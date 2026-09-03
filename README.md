# Ward2Home

30-day post-discharge patient tracking for psychiatric nurses in Sierra Leone.

Nurses register discharged patients, and the app schedules follow-up check-ins on days 3, 7, 14, and 30. Each patient gets a private link they can open on any phone — no account needed — where they see their check-in schedule and chat with their nurse in real time.

## Stack

- React + Vite + TypeScript
- Tailwind CSS (flat, no gradients)
- Supabase (Postgres, Auth, Row Level Security, Realtime)
- Netlify hosting

## Features

- Nurse accounts (Supabase email/password auth)
- Patient registration with automatic follow-up scheduling (days 3, 7, 14, 30)
- Dashboard: due today, overdue, completed
- Real-time chat between nurse and patient
- Patients access their chat via a private tokenized link — no login required
- Row Level Security: each nurse only sees their own patients

## Setup

### 1. Supabase

1. Create a project at supabase.com
2. Open SQL Editor and run the full contents of `supabase/schema.sql`
3. Get your Project URL and anon key from Settings > API

### 2. Local development

```bash
npm install
cp .env.example .env
# fill in:
#   VITE_SUPABASE_URL=https://<project>.supabase.co
#   VITE_SUPABASE_ANON_KEY=<anon key>
npm run dev
```

Create your first nurse account from the login page ("Create one").

### 3. Deploy to Netlify

1. Push this repo to GitHub
2. In Netlify: Add new site > Import an existing project > pick this repo
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

## How patient chat works

When a nurse registers a patient, the app generates a private access token and shows a link like `https://<your-site>/p/<token>`. The nurse sends this link (or reads it out) to the patient. Opening the link shows the patient's check-in schedule and a live chat with the nurse — the patient never signs in.

## Structure

```
src/
  pages/
    Login.tsx        nurse sign in / sign up
    Dashboard.tsx    follow-ups due today, overdue, completed
    Discharge.tsx    register patient, get private chat link
    Messages.tsx    nurse inbox + real-time conversation
    PatientChat.tsx  public patient chat (tokenized link)
  lib/
    supabase.ts      Supabase client
    auth.tsx         session context
supabase/
  schema.sql         tables, RLS policies, realtime, patient-access functions
```
