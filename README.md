# Ward2Home

30-day post-discharge patient tracking for psychiatric nurses in Sierra Leone.

## Problem
50% of psychiatric patients relapse within 30 days of discharge because hospitals lose contact.

## Solution
A web app for nurses to track patients for 30 days after discharge using WhatsApp check-ins.

## Tech Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS
- UI: shadcn/ui style components (included)
- Backend: Netlify Functions (serverless)
- Database: Supabase (PostgreSQL + Auth)
- Hosting: Netlify

## Features
- Discharge patients and auto-schedule follow-ups (Day 3, 7, 14, 30)
- Dashboard showing who to contact today
- Filter by Due Today, At Risk, Completed
- Send WhatsApp check-in button (demo: logs to DB)
- Supabase Auth with row-level security

## Setup Guide

### Step 1: Create Supabase Project
1. Go to https://supabase.com and create a new project
2. Wait for it to provision (2-3 minutes)

### Step 2: Create Database Tables
1. In Supabase, go to SQL Editor
2. Paste and run this SQL:

```sql
create extension if not exists "uuid-ossp";

create table patients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  family_phone text,
  diagnosis text,
  discharge_date date not null,
  risk_level text default 'Medium',
  created_by uuid,
  created_at timestamp with time zone default now()
);

create table discharge_plans (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  meds_json jsonb,
  notes text,
  created_by uuid,
  created_at timestamp with time zone default now()
);

create table followups (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  day integer not null,
  scheduled_date date not null,
  status text default 'PENDING',
  created_at timestamp with time zone default now()
);

create table followup_logs (
  id uuid primary key default uuid_generate_v4(),
  followup_id uuid references followups(id) on delete cascade,
  response text,
  note text,
  action_taken text,
  created_at timestamp with time zone default now()
);

alter table patients enable row level security;
alter table discharge_plans enable row level security;
alter table followups enable row level security;
alter table followup_logs enable row level security;

create policy "Enable all for authenticated users" on patients for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users" on discharge_plans for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users" on followups for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users" on followup_logs for all using (auth.role() = 'authenticated');
```

### Step 3: Create Test Nurse Account
1. In Supabase, go to Authentication > Users
2. Click "Add user"
3. Enter email and password
4. Make sure "Auto Confirm User" is checked

### Step 4: Get Your API Keys
1. In Supabase, go to Project Settings > API
2. Copy these 3 values:
   - Project URL (VITE_SUPABASE_URL)
   - anon public key (VITE_SUPABASE_ANON_KEY)
   - service_role key (SUPABASE_SERVICE_ROLE_KEY)

### Step 5: Push to GitHub
```bash
git init
git add .
git commit -m "Ward2Home MVP"
git remote add origin https://github.com/YOUR_USERNAME/ward2home.git
git push -u origin main
```

### Step 6: Deploy to Netlify
1. Go to https://app.netlify.com
2. Click "Add new site" > "Import an existing project"
3. Connect your GitHub account
4. Select the ward2home repo
5. Build settings will auto-detect from netlify.toml
6. Before deploying, add environment variables:
   - Go to Site Settings > Environment Variables
   - Add VITE_SUPABASE_URL = your_project_url
   - Add VITE_SUPABASE_ANON_KEY = your_anon_key
   - Add SUPABASE_SERVICE_ROLE_KEY = your_service_role_key
7. Click Deploy

### Step 7: Test
1. Open your Netlify URL
2. Log in with the nurse account you created
3. Go to Discharge, fill in a patient
4. Go to Dashboard, check if follow-ups appear
5. Click "Check-in" to simulate sending a WhatsApp message

## Local Development
```bash
npm install
npm run dev
```

Create a `.env` file in the root:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Author
Albert Taylor — Freetown, Sierra Leone

## License
MIT
