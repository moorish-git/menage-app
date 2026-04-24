-- Initial schema for location-app
-- A exécuter dans le SQL Editor de Supabase (dans l'ordre) ou via le CLI Supabase.

-- =========================
-- PROFILES
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text not null default 'guest' check (role in ('guest', 'host')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are readable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger qui crée un profil à la création d'un utilisateur auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================
-- PROPERTIES
-- =========================
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  address text,
  city text not null,
  country text not null default 'France',
  price_per_night integer not null check (price_per_night >= 0), -- centimes
  cleaning_fee integer not null default 0 check (cleaning_fee >= 0),
  deposit_amount integer not null default 0 check (deposit_amount >= 0),
  max_guests integer not null default 2 check (max_guests > 0),
  bedrooms integer not null default 1 check (bedrooms >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.properties enable row level security;

create policy "Published properties are readable by everyone"
  on public.properties for select
  using (is_published = true or auth.uid() = host_id);

create policy "Hosts can insert their own properties"
  on public.properties for insert
  with check (auth.uid() = host_id);

create policy "Hosts can update their own properties"
  on public.properties for update
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

create policy "Hosts can delete their own properties"
  on public.properties for delete
  using (auth.uid() = host_id);

-- =========================
-- PROPERTY PHOTOS
-- =========================
create table if not exists public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.property_photos enable row level security;

create policy "Property photos are readable by everyone"
  on public.property_photos for select
  using (true);

create policy "Only host can manage photos"
  on public.property_photos for all
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.host_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.host_id = auth.uid()
    )
  );

-- =========================
-- BOOKINGS
-- =========================
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  guest_id uuid not null references public.profiles(id) on delete restrict,
  check_in date not null,
  check_out date not null,
  guest_count integer not null default 1 check (guest_count > 0),
  nights integer not null check (nights > 0),
  subtotal_amount integer not null check (subtotal_amount >= 0),
  cleaning_fee integer not null default 0 check (cleaning_fee >= 0),
  total_amount integer not null check (total_amount >= 0),
  deposit_amount integer not null default 0 check (deposit_amount >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'disputed')),
  deposit_status text not null default 'none'
    check (deposit_status in ('none', 'authorized', 'captured', 'released', 'expired')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_deposit_intent_id text,
  created_at timestamptz not null default now(),
  constraint check_dates check (check_out > check_in)
);

create index if not exists bookings_property_dates_idx
  on public.bookings (property_id, check_in, check_out)
  where status in ('pending', 'confirmed');

alter table public.bookings enable row level security;

create policy "Guests read their own bookings"
  on public.bookings for select
  using (auth.uid() = guest_id);

create policy "Hosts read bookings for their properties"
  on public.bookings for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.host_id = auth.uid()
    )
  );

create policy "Guests create their own bookings"
  on public.bookings for insert
  with check (auth.uid() = guest_id);

create policy "Guests update their own bookings"
  on public.bookings for update
  using (auth.uid() = guest_id)
  with check (auth.uid() = guest_id);

-- =========================
-- STORAGE BUCKET (photos)
-- =========================
-- A exécuter via l'UI Supabase Storage OU décommenter si vous exécutez
-- les migrations avec un rôle capable d'écrire dans storage.buckets :
-- insert into storage.buckets (id, name, public) values ('property-photos', 'property-photos', true)
--   on conflict (id) do nothing;
