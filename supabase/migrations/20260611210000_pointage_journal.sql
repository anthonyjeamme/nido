-- Lot 3 — Pointage horodaté et journal de bord (SPECS §6, M3/M4)

-- ---------------------------------------------------------------------------
-- attendance_events : pointages arrivée/départ, horodatés SERVEUR
-- ---------------------------------------------------------------------------
create type public.attendance_type as enum ('in', 'out');

create table public.attendance_events (
  id uuid primary key default public.uuid_v7(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  type public.attendance_type not null,
  horodatage timestamptz not null default now(),      -- serveur, fait foi
  horodatage_device timestamptz,                      -- métadonnée (mode hors ligne)
  pointe_par uuid not null references public.profiles (id),
  corrige boolean not null default false,
  valeur_initiale timestamptz,                        -- trace de correction
  motif_correction text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index attendance_events_contract_idx on public.attendance_events (contract_id, horodatage);
create index attendance_events_child_jour_idx on public.attendance_events (child_id, horodatage);

create trigger attendance_events_set_updated_at
  before update on public.attendance_events
  for each row execute function public.set_updated_at();

-- L'horodatage serveur ne se déclare pas : il s'impose (même via l'API).
create or replace function public.force_horodatage_serveur()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.horodatage := now();
    new.corrige := false;
    new.valeur_initiale := null;
    new.motif_correction := null;
    new.pointe_par := auth.uid();
  end if;
  return new;
end;
$$;

create trigger attendance_events_force_horodatage
  before insert on public.attendance_events
  for each row execute function public.force_horodatage_serveur();

-- Correction a posteriori : uniquement l'assmat, avec trace obligatoire.
create or replace function public.verifie_correction_pointage()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Seuls l'horodatage et les champs de correction peuvent changer.
  if new.contract_id <> old.contract_id
     or new.child_id <> old.child_id
     or new.type <> old.type
     or new.pointe_par <> old.pointe_par then
    raise exception 'Seul l''horodatage d''un pointage peut être corrigé';
  end if;
  if new.horodatage <> old.horodatage then
    new.corrige := true;
    new.valeur_initiale := coalesce(old.valeur_initiale, old.horodatage);
    if new.motif_correction is null or btrim(new.motif_correction) = '' then
      raise exception 'Un motif de correction est obligatoire';
    end if;
  end if;
  return new;
end;
$$;

create trigger attendance_events_correction
  before update on public.attendance_events
  for each row execute function public.verifie_correction_pointage();

alter table public.attendance_events enable row level security;

create policy "L'assmat gère les pointages de ses contrats"
  on public.attendance_events for all
  to authenticated
  using (exists (select 1 from public.contracts k
                 where k.id = contract_id and k.assmat_id = public.current_assmat_id()))
  with check (exists (select 1 from public.contracts k
                      where k.id = contract_id and k.assmat_id = public.current_assmat_id()));

-- Le parent pointe si le contrat l'y autorise (lecture au Lot 5).
create policy "Un tuteur pointe si le contrat l'autorise"
  on public.attendance_events for insert
  to authenticated
  with check (exists (
    select 1 from public.contracts k
    where k.id = contract_id
      and k.parent_peut_pointer
      and public.is_guardian_of(k.child_id)
  ));

create policy "Un tuteur lit les pointages de son enfant"
  on public.attendance_events for select
  to authenticated
  using (public.is_guardian_of(child_id));

revoke all on table public.attendance_events from anon, authenticated;
grant select, insert, update on table public.attendance_events to authenticated;
grant all on table public.attendance_events to service_role;

-- ---------------------------------------------------------------------------
-- daily_log_entries : journal de bord (repas, sieste, change, activité…)
-- ---------------------------------------------------------------------------
create type public.log_entry_type as enum
  ('repas', 'sieste', 'change', 'activite', 'humeur', 'note', 'arrivee_info');

create table public.daily_log_entries (
  id uuid primary key default public.uuid_v7(),
  child_id uuid not null references public.children (id) on delete cascade,
  assmat_id uuid not null references public.assmats (id) on delete cascade,
  date date not null default current_date,
  heure time not null default localtime(0),
  type public.log_entry_type not null,
  payload jsonb not null default '{}'::jsonb,
  visible_parents boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index daily_log_entries_child_date_idx on public.daily_log_entries (child_id, date);

create trigger daily_log_entries_set_updated_at
  before update on public.daily_log_entries
  for each row execute function public.set_updated_at();

alter table public.daily_log_entries enable row level security;

create policy "L'assmat gère son journal de bord"
  on public.daily_log_entries for all
  to authenticated
  using (assmat_id = public.current_assmat_id())
  with check (assmat_id = public.current_assmat_id());

create policy "Un tuteur lit le journal visible de son enfant"
  on public.daily_log_entries for select
  to authenticated
  using (visible_parents and public.is_guardian_of(child_id));

revoke all on table public.daily_log_entries from anon, authenticated;
grant select, insert, update, delete on table public.daily_log_entries to authenticated;
grant all on table public.daily_log_entries to service_role;

-- ---------------------------------------------------------------------------
-- daily_summaries : récap du soir
-- ---------------------------------------------------------------------------
create type public.summary_status as enum ('genere', 'valide', 'envoye');

create table public.daily_summaries (
  id uuid primary key default public.uuid_v7(),
  child_id uuid not null references public.children (id) on delete cascade,
  date date not null,
  contenu jsonb not null default '{}'::jsonb,
  statut public.summary_status not null default 'genere',
  envoye_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id, date)
);

create trigger daily_summaries_set_updated_at
  before update on public.daily_summaries
  for each row execute function public.set_updated_at();

alter table public.daily_summaries enable row level security;

create policy "L'assmat gère les récaps de ses enfants"
  on public.daily_summaries for all
  to authenticated
  using (exists (select 1 from public.children c
                 where c.id = child_id and c.assmat_id = public.current_assmat_id()))
  with check (exists (select 1 from public.children c
                      where c.id = child_id and c.assmat_id = public.current_assmat_id()));

create policy "Un tuteur lit les récaps envoyés de son enfant"
  on public.daily_summaries for select
  to authenticated
  using (statut = 'envoye' and public.is_guardian_of(child_id));

revoke all on table public.daily_summaries from anon, authenticated;
grant select, insert, update, delete on table public.daily_summaries to authenticated;
grant all on table public.daily_summaries to service_role;
