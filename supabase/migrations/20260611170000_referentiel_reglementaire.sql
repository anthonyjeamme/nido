-- Lot 1 — Référentiel réglementaire (specs §5.1, §6)
-- Aucune constante réglementaire en dur dans le code : tout vient d'ici,
-- versionné par date d'effet. Le moteur de paie reçoit ces valeurs en entrée.

-- ---------------------------------------------------------------------------
-- bareme_values : valeurs chiffrées (SMIC, minimum garanti, seuils…)
-- ---------------------------------------------------------------------------
create table public.bareme_values (
  id uuid primary key default public.uuid_v7(),
  code text not null,                -- 'SMIC_HORAIRE_NET', 'MINIMUM_GARANTI'…
  valeur numeric not null,
  date_effet date not null,
  date_fin date,                     -- null = toujours en vigueur
  source_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code, date_effet)
);

comment on table public.bareme_values is
  'Valeurs réglementaires versionnées par date d''effet. La valeur applicable à une date est celle dont la date d''effet est la plus récente parmi celles antérieures ou égales.';

create trigger bareme_values_set_updated_at
  before update on public.bareme_values
  for each row execute function public.set_updated_at();

alter table public.bareme_values enable row level security;

-- Lecture par tous les utilisateurs connectés (données publiques de référence) ;
-- écriture réservée au service (seed/admin via migrations ou service_role).
create policy "Les barèmes sont lisibles par tous les utilisateurs connectés"
  on public.bareme_values for select
  to authenticated
  using (true);

-- Revoke d'abord : les anciennes versions de Supabase accordent des privilèges
-- par défaut ; on normalise pour que local et cloud soient identiques.
revoke all on table public.bareme_values from anon, authenticated;
grant select on table public.bareme_values to authenticated;
grant all on table public.bareme_values to service_role;

-- ---------------------------------------------------------------------------
-- rule_definitions : règles paramétrées avec référence juridique
-- ---------------------------------------------------------------------------
create table public.rule_definitions (
  id uuid primary key default public.uuid_v7(),
  code text not null,                -- 'ABSENCE_MALADIE_ENFANT', 'CP_ACQUISITION'…
  version int not null default 1,
  description text not null,
  ref_juridique text not null,       -- 'CCN IDCC 3239, art. 109-2'
  source_url text,
  date_effet date not null,
  date_fin date,
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code, version)
);

comment on table public.rule_definitions is
  'Règles réglementaires versionnées (la réglementation évolue : réforme CMG 2025, déclaration par enfant 2026…). Un bulletin référence la version de règle utilisée.';

create trigger rule_definitions_set_updated_at
  before update on public.rule_definitions
  for each row execute function public.set_updated_at();

alter table public.rule_definitions enable row level security;

create policy "Les règles sont lisibles par tous les utilisateurs connectés"
  on public.rule_definitions for select
  to authenticated
  using (true);

revoke all on table public.rule_definitions from anon, authenticated;
grant select on table public.rule_definitions to authenticated;
grant all on table public.rule_definitions to service_role;
