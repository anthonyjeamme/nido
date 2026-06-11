-- Lot 2 — Enfants, tuteurs, santé de référence, autorisations, contrats, planning
-- (SPECS §6). RLS : l'assmat est maîtresse de son espace ; le parent ne voit
-- que ses enfants (via child_guardians.profile_id) — policies parent enrichies
-- au Lot 5 (invitation), structure posée dès maintenant.

-- ---------------------------------------------------------------------------
-- Helpers RLS
-- ---------------------------------------------------------------------------

-- L'id assmat du compte connecté (null si parent).
create or replace function public.current_assmat_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.id from public.assmats a where a.profile_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- children
-- ---------------------------------------------------------------------------
create table public.children (
  id uuid primary key default public.uuid_v7(),
  assmat_id uuid not null references public.assmats (id) on delete cascade,
  prenom text not null,
  nom text not null,
  date_naissance date not null,
  photo_path text,
  notes_privees text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index children_assmat_idx on public.children (assmat_id);

create trigger children_set_updated_at
  before update on public.children
  for each row execute function public.set_updated_at();

alter table public.children enable row level security;

create policy "L'assmat gère ses enfants accueillis"
  on public.children for all
  to authenticated
  using (assmat_id = public.current_assmat_id())
  with check (assmat_id = public.current_assmat_id());

revoke all on table public.children from anon, authenticated;
grant select, insert, update, delete on table public.children to authenticated;
grant all on table public.children to service_role;

-- ---------------------------------------------------------------------------
-- child_guardians (parents / responsables légaux)
-- ---------------------------------------------------------------------------
create table public.child_guardians (
  id uuid primary key default public.uuid_v7(),
  child_id uuid not null references public.children (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null, -- compte lié (Lot 5)
  nom text not null,
  prenom text not null,
  email text,
  telephone text,
  est_employeur boolean not null default false,
  personnes_autorisees jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index child_guardians_child_idx on public.child_guardians (child_id);
create index child_guardians_profile_idx on public.child_guardians (profile_id);

create trigger child_guardians_set_updated_at
  before update on public.child_guardians
  for each row execute function public.set_updated_at();

-- Le profil connecté est-il tuteur de cet enfant ?
-- (security definer : évite la récursion RLS children ↔ child_guardians)
create or replace function public.is_guardian_of(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.child_guardians g
    where g.child_id = p_child_id and g.profile_id = auth.uid()
  );
$$;

-- Policy différée : children est créée avant child_guardians.
create policy "Un tuteur lit la fiche de son enfant"
  on public.children for select
  to authenticated
  using (public.is_guardian_of(id));

alter table public.child_guardians enable row level security;

create policy "L'assmat gère les tuteurs de ses enfants"
  on public.child_guardians for all
  to authenticated
  using (exists (select 1 from public.children c
                 where c.id = child_id and c.assmat_id = public.current_assmat_id()))
  with check (exists (select 1 from public.children c
                      where c.id = child_id and c.assmat_id = public.current_assmat_id()));

create policy "Un tuteur lit les tuteurs de son enfant"
  on public.child_guardians for select
  to authenticated
  using (public.is_guardian_of(child_id));

revoke all on table public.child_guardians from anon, authenticated;
grant select, insert, update, delete on table public.child_guardians to authenticated;
grant all on table public.child_guardians to service_role;

-- ---------------------------------------------------------------------------
-- child_health (santé de référence, 1-1 avec l'enfant)
-- ---------------------------------------------------------------------------
create table public.child_health (
  child_id uuid primary key references public.children (id) on delete cascade,
  allergies jsonb not null default '[]'::jsonb,
  regimes jsonb not null default '[]'::jsonb,
  medecin jsonb not null default '{}'::jsonb,
  pai_document_path text,
  vaccins jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger child_health_set_updated_at
  before update on public.child_health
  for each row execute function public.set_updated_at();

alter table public.child_health enable row level security;

create policy "L'assmat gère la santé de référence de ses enfants"
  on public.child_health for all
  to authenticated
  using (exists (select 1 from public.children c
                 where c.id = child_id and c.assmat_id = public.current_assmat_id()))
  with check (exists (select 1 from public.children c
                      where c.id = child_id and c.assmat_id = public.current_assmat_id()));

create policy "Un tuteur lit la santé de référence de son enfant"
  on public.child_health for select
  to authenticated
  using (public.is_guardian_of(child_id));

revoke all on table public.child_health from anon, authenticated;
grant select, insert, update, delete on table public.child_health to authenticated;
grant all on table public.child_health to service_role;

-- ---------------------------------------------------------------------------
-- authorizations (autorisations parentales datées et signées)
-- ---------------------------------------------------------------------------
create type public.authorization_type as enum
  ('sortie', 'transport', 'photo', 'medicament', 'autre');

create table public.authorizations (
  id uuid primary key default public.uuid_v7(),
  child_id uuid not null references public.children (id) on delete cascade,
  type public.authorization_type not null,
  -- photo : 'aucune' / 'privees_parents' / 'partageables_groupe' ; libre sinon
  niveau text,
  document_path text,
  signe_par uuid references public.profiles (id),
  signe_le timestamptz,
  actif boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index authorizations_child_idx on public.authorizations (child_id);

create trigger authorizations_set_updated_at
  before update on public.authorizations
  for each row execute function public.set_updated_at();

alter table public.authorizations enable row level security;

create policy "L'assmat gère les autorisations de ses enfants"
  on public.authorizations for all
  to authenticated
  using (exists (select 1 from public.children c
                 where c.id = child_id and c.assmat_id = public.current_assmat_id()))
  with check (exists (select 1 from public.children c
                      where c.id = child_id and c.assmat_id = public.current_assmat_id()));

create policy "Un tuteur lit les autorisations de son enfant"
  on public.authorizations for select
  to authenticated
  using (public.is_guardian_of(child_id));

revoke all on table public.authorizations from anon, authenticated;
grant select, insert, update, delete on table public.authorizations to authenticated;
grant all on table public.authorizations to service_role;

-- ---------------------------------------------------------------------------
-- contracts
-- ---------------------------------------------------------------------------
create type public.contract_type as enum ('annee_complete', 'annee_incomplete');
create type public.contract_status as enum ('brouillon', 'actif', 'termine');
create type public.cp_versement_option as enum ('juin', 'prise_principale', 'au_fil');

create table public.contracts (
  id uuid primary key default public.uuid_v7(),
  assmat_id uuid not null references public.assmats (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  employeur_guardian_id uuid references public.child_guardians (id) on delete set null,
  type public.contract_type not null,
  date_debut date not null,
  date_fin date,
  taux_horaire numeric(6,2) not null check (taux_horaire > 0),
  heures_par_semaine numeric(4,1) not null check (heures_par_semaine > 0 and heures_par_semaine <= 60),
  semaines_programmees int not null check (semaines_programmees between 1 and 52),
  jours_accueil_par_semaine numeric(2,1) not null check (jours_accueil_par_semaine between 0.5 and 6),
  taux_majoration_pct numeric(5,2) not null default 10,
  indemnite_entretien_jour numeric(5,2) not null,
  indemnite_repas numeric(5,2),
  assmat_fournit_repas boolean not null default false,
  option_versement_cp public.cp_versement_option not null default 'juin',
  clause_delegation boolean not null default false,
  parent_peut_pointer boolean not null default false,
  statut public.contract_status not null default 'brouillon',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint contracts_semaines_coherentes check (
    (type = 'annee_complete' and semaines_programmees = 52)
    or (type = 'annee_incomplete' and semaines_programmees <= 51)
  )
);

create index contracts_assmat_idx on public.contracts (assmat_id);
create index contracts_child_idx on public.contracts (child_id);

create trigger contracts_set_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

alter table public.contracts enable row level security;

create policy "L'assmat gère ses contrats"
  on public.contracts for all
  to authenticated
  using (assmat_id = public.current_assmat_id())
  with check (assmat_id = public.current_assmat_id());

create policy "Un tuteur lit les contrats de son enfant"
  on public.contracts for select
  to authenticated
  using (public.is_guardian_of(child_id));

revoke all on table public.contracts from anon, authenticated;
grant select, insert, update, delete on table public.contracts to authenticated;
grant all on table public.contracts to service_role;

-- ---------------------------------------------------------------------------
-- planned_schedules (semaine type du contrat)
-- ---------------------------------------------------------------------------
create table public.planned_schedules (
  id uuid primary key default public.uuid_v7(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  jour_semaine int not null check (jour_semaine between 1 and 7), -- 1 = lundi (ISO)
  heure_debut time not null,
  heure_fin time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planned_schedules_heures_coherentes check (heure_fin > heure_debut)
);

create index planned_schedules_contract_idx on public.planned_schedules (contract_id);

create trigger planned_schedules_set_updated_at
  before update on public.planned_schedules
  for each row execute function public.set_updated_at();

alter table public.planned_schedules enable row level security;

create policy "L'assmat gère les plannings de ses contrats"
  on public.planned_schedules for all
  to authenticated
  using (exists (select 1 from public.contracts k
                 where k.id = contract_id and k.assmat_id = public.current_assmat_id()))
  with check (exists (select 1 from public.contracts k
                      where k.id = contract_id and k.assmat_id = public.current_assmat_id()));

create policy "Un tuteur lit le planning du contrat de son enfant"
  on public.planned_schedules for select
  to authenticated
  using (exists (select 1 from public.contracts k
                 where k.id = contract_id and public.is_guardian_of(k.child_id)));

revoke all on table public.planned_schedules from anon, authenticated;
grant select, insert, update, delete on table public.planned_schedules to authenticated;
grant all on table public.planned_schedules to service_role;

-- ---------------------------------------------------------------------------
-- schedule_exceptions (exceptions ponctuelles, semaines d'absence, fériés)
-- ---------------------------------------------------------------------------
create type public.schedule_exception_type as enum
  ('absence_programmee', 'horaire_modifie', 'ferie');

create table public.schedule_exceptions (
  id uuid primary key default public.uuid_v7(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  date date not null,
  type public.schedule_exception_type not null,
  heure_debut time,
  heure_fin time,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index schedule_exceptions_contract_idx on public.schedule_exceptions (contract_id, date);

create trigger schedule_exceptions_set_updated_at
  before update on public.schedule_exceptions
  for each row execute function public.set_updated_at();

alter table public.schedule_exceptions enable row level security;

create policy "L'assmat gère les exceptions de planning de ses contrats"
  on public.schedule_exceptions for all
  to authenticated
  using (exists (select 1 from public.contracts k
                 where k.id = contract_id and k.assmat_id = public.current_assmat_id()))
  with check (exists (select 1 from public.contracts k
                      where k.id = contract_id and k.assmat_id = public.current_assmat_id()));

create policy "Un tuteur lit les exceptions du contrat de son enfant"
  on public.schedule_exceptions for select
  to authenticated
  using (exists (select 1 from public.contracts k
                 where k.id = contract_id and public.is_guardian_of(k.child_id)));

revoke all on table public.schedule_exceptions from anon, authenticated;
grant select, insert, update, delete on table public.schedule_exceptions to authenticated;
grant all on table public.schedule_exceptions to service_role;
