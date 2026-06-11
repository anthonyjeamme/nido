-- Lot 0 — Socle identité : profiles + assmats
-- Conventions (SPECS §6) : snake_case, UUID v7 en PK, created_at/updated_at,
-- soft delete sur les données métier, RLS activée sur toutes les tables.

-- ---------------------------------------------------------------------------
-- UUID v7 (Postgres < 18 n'a pas uuidv7() natif)
-- Timestamp ms dans les 48 premiers bits, le reste aléatoire (RFC 9562).
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

create or replace function public.uuid_v7()
returns uuid
language sql
volatile
set search_path = ''
as $$
  select encode(
    set_bit(
      set_bit(
        overlay(
          extensions.gen_random_bytes(16)
          placing substring(int8send((extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
          from 1 for 6
        ),
        52, 1
      ),
      53, 1
    ),
    'hex'
  )::uuid;
$$;

comment on function public.uuid_v7() is
  'Génère un UUID v7 (triable par temps de création) — PK par défaut de toutes les tables.';

-- ---------------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — un par utilisateur auth (assmat ou parent)
-- ---------------------------------------------------------------------------
create type public.profile_role as enum ('assmat', 'parent');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.profile_role not null,
  display_name text,
  phone text,
  locale text not null default 'fr-FR',
  notif_prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Profil applicatif lié 1-1 à auth.users. Le rôle détermine l''espace (assmat ou parent).';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "Chacun lit son propre profil"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Chacun met à jour son propre profil"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = (select p.role from public.profiles p where p.id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- assmats — données professionnelles de l'assistante maternelle
-- ---------------------------------------------------------------------------
create table public.assmats (
  id uuid primary key default public.uuid_v7(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  agrement_capacite int not null default 1 check (agrement_capacite between 1 and 6),
  agrement_date_renouvellement date,
  adresse jsonb not null default '{}'::jsonb,
  horaires_type jsonb not null default '{}'::jsonb,
  reglages_visibilite jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.assmats is
  'Espace professionnel d''une assistante maternelle (agrément, horaires types, réglages de visibilité parents).';
comment on column public.assmats.agrement_capacite is
  'Nombre d''enfants simultanés autorisés par l''agrément (contrôle de capacité du planning, M3).';

create trigger assmats_set_updated_at
  before update on public.assmats
  for each row execute function public.set_updated_at();

alter table public.assmats enable row level security;

create policy "L'assmat gère son propre espace"
  on public.assmats for all
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Création automatique du profil à l'inscription.
-- Le rôle vient des métadonnées d'inscription ('assmat' par défaut) ;
-- les parents seront créés via invitation avec role='parent' (Lot 5).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.profile_role, 'assmat'),
    new.raw_user_meta_data ->> 'display_name'
  );

  if coalesce(new.raw_user_meta_data ->> 'role', 'assmat') = 'assmat' then
    insert into public.assmats (profile_id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
