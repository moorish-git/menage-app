-- MénageApp — Schéma de base de données Supabase
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor > New Query)

-- ============================================================
-- 1. Profils utilisateurs (lien avec auth.users + rôle)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'cleaner')),
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- ============================================================
-- 2. Logements
-- ============================================================
create table if not exists public.apartments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  price numeric(10,2) not null default 25,
  image_url text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.apartments enable row level security;

drop policy if exists "apartments_read_all" on public.apartments;
create policy "apartments_read_all" on public.apartments
  for select to authenticated using (true);

drop policy if exists "apartments_admin_write" on public.apartments;
create policy "apartments_admin_write" on public.apartments
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ============================================================
-- 3. Dates de ménage
-- ============================================================
create table if not exists public.cleaning_dates (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  scheduled_date date not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'refused', 'done')),
  price numeric(10,2) not null,
  admin_note text,
  cleaner_note text,
  responded_at timestamptz,
  done_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists cleaning_dates_scheduled_idx on public.cleaning_dates(scheduled_date);
create index if not exists cleaning_dates_status_idx on public.cleaning_dates(status);

alter table public.cleaning_dates enable row level security;

drop policy if exists "cleaning_dates_read_all" on public.cleaning_dates;
create policy "cleaning_dates_read_all" on public.cleaning_dates
  for select to authenticated using (true);

drop policy if exists "cleaning_dates_admin_insert" on public.cleaning_dates;
create policy "cleaning_dates_admin_insert" on public.cleaning_dates
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "cleaning_dates_admin_delete" on public.cleaning_dates;
create policy "cleaning_dates_admin_delete" on public.cleaning_dates
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "cleaning_dates_authenticated_update" on public.cleaning_dates;
create policy "cleaning_dates_authenticated_update" on public.cleaning_dates
  for update to authenticated using (true) with check (true);

-- ============================================================
-- 4. Stock (consommables par logement)
-- ============================================================
create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  name text not null,
  quantity integer not null default 0,
  low_threshold integer not null default 1,
  unit text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.stock_items enable row level security;

drop policy if exists "stock_read_all" on public.stock_items;
create policy "stock_read_all" on public.stock_items
  for select to authenticated using (true);

drop policy if exists "stock_write_all" on public.stock_items;
create policy "stock_write_all" on public.stock_items
  for all to authenticated using (true) with check (true);

-- ============================================================
-- 5. Notifications
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  target_role text not null check (target_role in ('admin', 'cleaner')),
  type text not null,
  title text not null,
  message text,
  related_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_role_read_idx on public.notifications(target_role, read);

alter table public.notifications enable row level security;

drop policy if exists "notifications_read_own_role" on public.notifications;
create policy "notifications_read_own_role" on public.notifications
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = notifications.target_role));

drop policy if exists "notifications_insert_all" on public.notifications;
create policy "notifications_insert_all" on public.notifications
  for insert to authenticated with check (true);

drop policy if exists "notifications_update_own_role" on public.notifications;
create policy "notifications_update_own_role" on public.notifications
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = notifications.target_role));

-- ============================================================
-- 6. Realtime (activer sur toutes les tables)
-- ============================================================
alter publication supabase_realtime add table public.apartments;
alter publication supabase_realtime add table public.cleaning_dates;
alter publication supabase_realtime add table public.stock_items;
alter publication supabase_realtime add table public.notifications;

-- ============================================================
-- 7. Bucket Storage pour les images de logement
-- ============================================================
-- À créer manuellement dans Supabase : Storage > New bucket > name=apartments, public=true
-- Puis exécuter ces policies :

insert into storage.buckets (id, name, public)
values ('apartments', 'apartments', true)
on conflict (id) do nothing;

drop policy if exists "apartments_images_public_read" on storage.objects;
create policy "apartments_images_public_read" on storage.objects
  for select using (bucket_id = 'apartments');

drop policy if exists "apartments_images_authenticated_write" on storage.objects;
create policy "apartments_images_authenticated_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'apartments');

drop policy if exists "apartments_images_authenticated_update" on storage.objects;
create policy "apartments_images_authenticated_update" on storage.objects
  for update to authenticated using (bucket_id = 'apartments');

drop policy if exists "apartments_images_authenticated_delete" on storage.objects;
create policy "apartments_images_authenticated_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'apartments');
