-- Lot 6 — Santé (M5), stocks (M6), menus (M7)
-- Contraintes serveur non négociables (SPECS §2 CA global, §7.3) :
-- - un médicament administré exige ordonnance jointe + autorisation active ;
-- - health_events est append-only (pas d'UPDATE/DELETE, même par l'assmat) ;
-- - chaque change décrémente automatiquement le stock de couches.

-- ---------------------------------------------------------------------------
-- Storage : bucket privé pour les documents (ordonnances, PAI…)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "Chacun gère ses documents (dossier = son uid)"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- medications : ordonnance OBLIGATOIRE
-- ---------------------------------------------------------------------------
create table public.medications (
  id uuid primary key default public.uuid_v7(),
  child_id uuid not null references public.children (id) on delete cascade,
  nom text not null,
  posologie text not null,
  ordonnance_path text not null check (btrim(ordonnance_path) <> ''),
  date_debut date not null,
  date_fin date,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index medications_child_idx on public.medications (child_id);

create trigger medications_set_updated_at
  before update on public.medications
  for each row execute function public.set_updated_at();

alter table public.medications enable row level security;

create policy "L'assmat gère les traitements de ses enfants"
  on public.medications for all
  to authenticated
  using (exists (select 1 from public.children c
                 where c.id = child_id and c.assmat_id = public.current_assmat_id()))
  with check (exists (select 1 from public.children c
                      where c.id = child_id and c.assmat_id = public.current_assmat_id()));

create policy "Un tuteur lit les traitements de son enfant"
  on public.medications for select
  to authenticated
  using (public.is_guardian_of(child_id));

revoke all on table public.medications from anon, authenticated;
grant select, insert, update on table public.medications to authenticated;
grant all on table public.medications to service_role;

-- ---------------------------------------------------------------------------
-- health_events : append-only
-- ---------------------------------------------------------------------------
create type public.health_event_type as enum
  ('fievre', 'medicament', 'symptome', 'incident');

create table public.health_events (
  id uuid primary key default public.uuid_v7(),
  child_id uuid not null references public.children (id) on delete cascade,
  type public.health_event_type not null,
  heure timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  declare_par uuid not null references public.profiles (id),
  notifie_parent boolean not null default true,
  lu_par_parent_le timestamptz,
  created_at timestamptz not null default now()
);

create index health_events_child_idx on public.health_events (child_id, heure desc);

-- Contrainte serveur : administrer un médicament exige une ordonnance active
-- ET l'autorisation parentale « medicament » active.
create or replace function public.verifie_administration_medicament()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.declare_par := auth.uid();
  new.heure := now();

  if new.type = 'medicament' then
    if new.payload->>'medication_id' is null or not exists (
      select 1 from public.medications m
      where m.id = (new.payload->>'medication_id')::uuid
        and m.child_id = new.child_id
        and m.actif
        and m.ordonnance_path is not null
    ) then
      raise exception 'Administration impossible : aucune ordonnance active pour ce traitement';
    end if;
    if not exists (
      select 1 from public.authorizations a
      where a.child_id = new.child_id
        and a.type = 'medicament'
        and a.actif
        and a.deleted_at is null
    ) then
      raise exception 'Administration impossible : autorisation parentale « médicaments » inactive';
    end if;
  end if;

  return new;
end;
$$;

create trigger health_events_verifie_medicament
  before insert on public.health_events
  for each row execute function public.verifie_administration_medicament();

-- Append-only : UPDATE limité à l'accusé de lecture parent, DELETE interdit.
create or replace function public.health_events_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Le journal de santé est infalsifiable (suppression interdite)';
  end if;
  if new.child_id <> old.child_id or new.type <> old.type
     or new.heure <> old.heure or new.payload <> old.payload
     or new.declare_par <> old.declare_par then
    raise exception 'Le journal de santé est infalsifiable (modification interdite)';
  end if;
  return new;
end;
$$;

create trigger health_events_immutable
  before update or delete on public.health_events
  for each row execute function public.health_events_append_only();

alter table public.health_events enable row level security;

create policy "L'assmat écrit et lit les événements santé de ses enfants"
  on public.health_events for select
  to authenticated
  using (exists (select 1 from public.children c
                 where c.id = child_id and c.assmat_id = public.current_assmat_id()));

create policy "L'assmat déclare un événement santé"
  on public.health_events for insert
  to authenticated
  with check (exists (select 1 from public.children c
                      where c.id = child_id and c.assmat_id = public.current_assmat_id()));

create policy "Un tuteur lit les événements santé de son enfant"
  on public.health_events for select
  to authenticated
  using (public.is_guardian_of(child_id));

-- Le parent peut signaler un symptôme (infos du matin, US-5.4)…
create policy "Un tuteur signale un symptôme"
  on public.health_events for insert
  to authenticated
  with check (type = 'symptome' and public.is_guardian_of(child_id));

-- …et accuser lecture (seul champ modifiable, verrouillé par trigger).
create policy "Un tuteur accuse lecture"
  on public.health_events for update
  to authenticated
  using (public.is_guardian_of(child_id))
  with check (public.is_guardian_of(child_id));

revoke all on table public.health_events from anon, authenticated;
grant select, insert, update (lu_par_parent_le) on table public.health_events to authenticated;
grant all on table public.health_events to service_role;

-- ---------------------------------------------------------------------------
-- supplies + supply_movements (stocks de consommables)
-- ---------------------------------------------------------------------------
create type public.supply_type as enum
  ('couches', 'lait', 'lingettes', 'creme', 'vetements', 'autre');

create table public.supplies (
  id uuid primary key default public.uuid_v7(),
  child_id uuid not null references public.children (id) on delete cascade,
  type public.supply_type not null,
  label text not null,
  quantite int not null default 0,
  seuil_alerte int not null default 8,
  unite text not null default 'unités',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id, type)
);

create trigger supplies_set_updated_at
  before update on public.supplies
  for each row execute function public.set_updated_at();

alter table public.supplies enable row level security;

create policy "L'assmat gère les stocks de ses enfants"
  on public.supplies for all
  to authenticated
  using (exists (select 1 from public.children c
                 where c.id = child_id and c.assmat_id = public.current_assmat_id()))
  with check (exists (select 1 from public.children c
                      where c.id = child_id and c.assmat_id = public.current_assmat_id()));

create policy "Un tuteur lit les stocks de son enfant"
  on public.supplies for select
  to authenticated
  using (public.is_guardian_of(child_id));

revoke all on table public.supplies from anon, authenticated;
grant select, insert, update on table public.supplies to authenticated;
grant all on table public.supplies to service_role;

create type public.supply_movement_source as enum
  ('change_auto', 'reappro_parent', 'ajustement');

create table public.supply_movements (
  id uuid primary key default public.uuid_v7(),
  supply_id uuid not null references public.supplies (id) on delete cascade,
  delta int not null,
  source public.supply_movement_source not null,
  confirme boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index supply_movements_supply_idx on public.supply_movements (supply_id, created_at);

create trigger supply_movements_set_updated_at
  before update on public.supply_movements
  for each row execute function public.set_updated_at();

-- Application du mouvement au stock : immédiate (assmat), à la confirmation
-- (réappro parent).
create or replace function public.applique_mouvement_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.source <> 'reappro_parent' then
      new.confirme := true;
      update public.supplies
      set quantite = greatest(quantite + new.delta, 0)
      where id = new.supply_id;
    end if;
  elsif tg_op = 'UPDATE' and new.confirme and not old.confirme then
    update public.supplies
    set quantite = greatest(quantite + new.delta, 0)
    where id = new.supply_id;
  end if;
  return new;
end;
$$;

create trigger supply_movements_applique
  before insert or update on public.supply_movements
  for each row execute function public.applique_mouvement_stock();

alter table public.supply_movements enable row level security;

create policy "L'assmat gère les mouvements de stock"
  on public.supply_movements for all
  to authenticated
  using (exists (
    select 1 from public.supplies s join public.children c on c.id = s.child_id
    where s.id = supply_id and c.assmat_id = public.current_assmat_id()
  ))
  with check (exists (
    select 1 from public.supplies s join public.children c on c.id = s.child_id
    where s.id = supply_id and c.assmat_id = public.current_assmat_id()
  ));

create policy "Un tuteur lit les mouvements du stock de son enfant"
  on public.supply_movements for select
  to authenticated
  using (exists (
    select 1 from public.supplies s
    where s.id = supply_id and public.is_guardian_of(s.child_id)
  ));

create policy "Un tuteur annonce un réapprovisionnement"
  on public.supply_movements for insert
  to authenticated
  with check (
    source = 'reappro_parent' and not confirme and delta > 0
    and exists (
      select 1 from public.supplies s
      where s.id = supply_id and public.is_guardian_of(s.child_id)
    )
  );

revoke all on table public.supply_movements from anon, authenticated;
grant select, insert, update on table public.supply_movements to authenticated;
grant all on table public.supply_movements to service_role;

-- Décrément automatique des couches à chaque change (US-6.1).
create or replace function public.decremente_couches()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_supply uuid;
begin
  if new.type = 'change' then
    select s.id into v_supply
    from public.supplies s
    where s.child_id = new.child_id and s.type = 'couches';
    if v_supply is not null then
      insert into public.supply_movements (supply_id, delta, source, note)
      values (v_supply, -1, 'change_auto', 'Décrément automatique (change)');
    end if;
  end if;
  return new;
end;
$$;

create trigger daily_log_change_decremente_couches
  after insert on public.daily_log_entries
  for each row execute function public.decremente_couches();

-- ---------------------------------------------------------------------------
-- dishes + menus (M7)
-- ---------------------------------------------------------------------------
create table public.dishes (
  id uuid primary key default public.uuid_v7(),
  assmat_id uuid not null references public.assmats (id) on delete cascade,
  nom text not null,
  allergenes text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.dishes enable row level security;

create policy "L'assmat gère sa bibliothèque de plats"
  on public.dishes for all
  to authenticated
  using (assmat_id = public.current_assmat_id())
  with check (assmat_id = public.current_assmat_id());

create policy "Un tuteur lit les plats de l'assmat de son enfant"
  on public.dishes for select
  to authenticated
  using (exists (
    select 1 from public.children c
    where c.assmat_id = dishes.assmat_id and public.is_guardian_of(c.id)
  ));

revoke all on table public.dishes from anon, authenticated;
grant select, insert, update, delete on table public.dishes to authenticated;
grant all on table public.dishes to service_role;

create table public.menus (
  id uuid primary key default public.uuid_v7(),
  assmat_id uuid not null references public.assmats (id) on delete cascade,
  semaine date not null,                    -- lundi de la semaine
  entrees jsonb not null default '{}'::jsonb, -- {lundi:{midi:"…",gouter:"…"},…}
  publie boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assmat_id, semaine)
);

create trigger menus_set_updated_at
  before update on public.menus
  for each row execute function public.set_updated_at();

alter table public.menus enable row level security;

create policy "L'assmat gère ses menus"
  on public.menus for all
  to authenticated
  using (assmat_id = public.current_assmat_id())
  with check (assmat_id = public.current_assmat_id());

create policy "Un tuteur lit les menus publiés de l'assmat de son enfant"
  on public.menus for select
  to authenticated
  using (publie and exists (
    select 1 from public.children c
    where c.assmat_id = menus.assmat_id and public.is_guardian_of(c.id)
  ));

revoke all on table public.menus from anon, authenticated;
grant select, insert, update, delete on table public.menus to authenticated;
grant all on table public.menus to service_role;
