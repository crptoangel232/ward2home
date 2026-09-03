-- ============================================================
-- Ward2Home — full schema
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================

-- ---------- TABLES ----------

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  full_name text not null,
  phone text not null,
  family_phone text,
  diagnosis text not null,
  risk_level text not null check (risk_level in ('low','medium','high')),
  discharge_date date not null,
  medications text,
  access_token text not null unique default encode(gen_random_bytes(16),'hex'),
  archived boolean not null default false
);

create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  day_number int not null check (day_number in (3,7,14,30)),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending','done','missed')),
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (patient_id, day_number)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  sender text not null check (sender in ('nurse','patient')),
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  read_by_nurse boolean not null default false,
  read_by_patient boolean not null default false
);

create index if not exists followups_due_idx on public.followups (due_date, status);
create index if not exists followups_patient_idx on public.followups (patient_id);
create index if not exists messages_patient_created_idx on public.messages (patient_id, created_at desc);

-- ---------- ROW LEVEL SECURITY ----------

alter table public.patients enable row level security;
alter table public.followups enable row level security;
alter table public.messages enable row level security;

-- Nurses can only see/manage patients they registered
create policy "nurse manages own patients"
  on public.patients for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "nurse manages own followups"
  on public.followups for all to authenticated
  using (exists (select 1 from public.patients p
                where p.id = followups.patient_id and p.created_by = auth.uid()))
  with check (exists (select 1 from public.patients p
                where p.id = followups.patient_id and p.created_by = auth.uid()));

create policy "nurse manages own messages"
  on public.messages for all to authenticated
  using (exists (select 1 from public.patients p
                where p.id = messages.patient_id and p.created_by = auth.uid()))
  with check (exists (select 1 from public.patients p
                where p.id = messages.patient_id and p.created_by = auth.uid()));

-- ---------- PATIENT ACCESS (token, no login) ----------
-- Patients open a private link /p/<token>. These security-definer
-- functions let them read/send messages without an account.

create or replace function public.get_patient_by_token(p_token text)
returns table (id uuid, full_name text, diagnosis text, risk_level text,
              discharge_date date, access_token text)
language sql security definer set search_path = public
as $$
  select p.id, p.full_name, p.diagnosis, p.risk_level, p.discharge_date, p.access_token
  from public.patients p
  where p.access_token = p_token;
$$;

create or replace function public.get_patient_schedule(p_token text)
returns table (day_number int, due_date date, status text, completed_at timestamptz)
language sql security definer set search_path = public
as $$
  select f.day_number, f.due_date, f.status, f.completed_at
  from public.followups f
  join public.patients p on p.id = f.patient_id
  where p.access_token = p_token
  order by f.day_number;
$$;

create or replace function public.get_patient_conversation(p_token text)
returns table (id uuid, sender text, body text, created_at timestamptz,
              read_by_patient boolean)
language sql security definer set search_path = public
as $$
  select m.id, m.sender, m.body, m.created_at, m.read_by_patient
  from public.messages m
  join public.patients p on p.id = m.patient_id
  where p.access_token = p_token
  order by m.created_at asc;
$$;

create or replace function public.send_patient_message(p_token text, p_body text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.messages (patient_id, sender, body)
  select p.id, 'patient', trim(p_body)
  from public.patients p
  where p.access_token = p_token
    and char_length(trim(p_body)) > 0;
end;
$$;

create or replace function public.mark_patient_read(p_token text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.messages m
  set read_by_patient = true
  from public.patients p
  where p.id = m.patient_id
    and p.access_token = p_token
    and m.sender = 'nurse'
    and m.read_by_patient = false;
end;
$$;

revoke all on function public.get_patient_by_token(text) from public;
revoke all on function public.get_patient_schedule(text) from public;
revoke all on function public.get_patient_conversation(text) from public;
revoke all on function public.send_patient_message(text, text) from public;
revoke all on function public.mark_patient_read(text) from public;
grant execute on function public.get_patient_by_token(text) to anon, authenticated;
grant execute on function public.get_patient_schedule(text) to anon, authenticated;
grant execute on function public.get_patient_conversation(text) to anon, authenticated;
grant execute on function public.send_patient_message(text, text) to anon, authenticated;
grant execute on function public.mark_patient_read(text) to anon, authenticated;

-- ---------- REALTIME ----------
-- Nurses get live message updates via Supabase Realtime.

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.followups;

-- ---------- AUTO-SCHEDULE FOLLOWUPS ON DISCHARGE ----------
-- (The app also inserts them explicitly; this is a safety net.)

create or replace function public.schedule_followups_for_patient()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.followups (patient_id, day_number, due_date)
  values
    (new.id, 3,  (new.discharge_date + interval '3 days')::date),
    (new.id, 7,  (new.discharge_date + interval '7 days')::date),
    (new.id, 14, (new.discharge_date + interval '14 days')::date),
    (new.id, 30, (new.discharge_date + interval '30 days')::date)
  on conflict (patient_id, day_number) do nothing;
  return new;
end;
$$;

drop trigger if exists on_patient_created on public.patients;
create trigger on_patient_created
  after insert on public.patients
  for each row execute function public.schedule_followups_for_patient();
