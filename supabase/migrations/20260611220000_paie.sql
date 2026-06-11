-- Lot 4 — Paie mensuelle : absences, CP, bulletins, déclarations Pajemploi, audit
-- (SPECS §6, M9/M10). L'écriture du bulletin passe par une RPC security definer
-- qui journalise dans audit_log (specs §6, politiques RLS).

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default public.uuid_v7(),
  table_name text not null,
  record_id uuid,
  action text not null,
  acteur uuid references public.profiles (id),
  avant jsonb,
  apres jsonb,
  horodatage timestamptz not null default now()
);

alter table public.audit_log enable row level security;
-- Personne ne lit/écrit l'audit via l'API (uniquement les fonctions definer).
revoke all on table public.audit_log from anon, authenticated;
grant all on table public.audit_log to service_role;

-- ---------------------------------------------------------------------------
-- absences
-- ---------------------------------------------------------------------------
create type public.absence_type as enum
  ('enfant_convenance', 'enfant_maladie_certificat', 'assmat_maladie',
   'cp', 'sans_solde', 'ferie');

create table public.absences (
  id uuid primary key default public.uuid_v7(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  date_debut date not null,
  date_fin date not null,
  type public.absence_type not null,
  heures numeric(5,2) not null default 0,   -- heures d'accueil non effectuées
  jours numeric(4,1) not null default 0,    -- jours d'accueil non effectués
  certificat_path text,
  qualification_confirmee boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint absences_dates_coherentes check (date_fin >= date_debut)
);

create index absences_contract_idx on public.absences (contract_id, date_debut);

create trigger absences_set_updated_at
  before update on public.absences
  for each row execute function public.set_updated_at();

alter table public.absences enable row level security;

create policy "L'assmat gère les absences de ses contrats"
  on public.absences for all
  to authenticated
  using (exists (select 1 from public.contracts k
                 where k.id = contract_id and k.assmat_id = public.current_assmat_id()))
  with check (exists (select 1 from public.contracts k
                      where k.id = contract_id and k.assmat_id = public.current_assmat_id()));

create policy "Un tuteur lit les absences du contrat de son enfant"
  on public.absences for select
  to authenticated
  using (exists (select 1 from public.contracts k
                 where k.id = contract_id and public.is_guardian_of(k.child_id)));

revoke all on table public.absences from anon, authenticated;
grant select, insert, update, delete on table public.absences to authenticated;
grant all on table public.absences to service_role;

-- ---------------------------------------------------------------------------
-- leave_balances (compteur CP par contrat et période de référence)
-- ---------------------------------------------------------------------------
create table public.leave_balances (
  id uuid primary key default public.uuid_v7(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  periode_ref_debut date not null,          -- 1er juin
  jours_acquis numeric(4,1) not null default 0,
  jours_pris numeric(4,1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, periode_ref_debut)
);

create trigger leave_balances_set_updated_at
  before update on public.leave_balances
  for each row execute function public.set_updated_at();

alter table public.leave_balances enable row level security;

create policy "L'assmat gère les compteurs CP de ses contrats"
  on public.leave_balances for all
  to authenticated
  using (exists (select 1 from public.contracts k
                 where k.id = contract_id and k.assmat_id = public.current_assmat_id()))
  with check (exists (select 1 from public.contracts k
                      where k.id = contract_id and k.assmat_id = public.current_assmat_id()));

create policy "Un tuteur lit le compteur CP du contrat de son enfant"
  on public.leave_balances for select
  to authenticated
  using (exists (select 1 from public.contracts k
                 where k.id = contract_id and public.is_guardian_of(k.child_id)));

revoke all on table public.leave_balances from anon, authenticated;
grant select, insert, update, delete on table public.leave_balances to authenticated;
grant all on table public.leave_balances to service_role;

-- ---------------------------------------------------------------------------
-- payslips + payslip_lines (l'arbre CalculLine sérialisé)
-- ---------------------------------------------------------------------------
create type public.payslip_status as enum ('brouillon', 'valide');

create table public.payslips (
  id uuid primary key default public.uuid_v7(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  mois date not null,                       -- 1er jour du mois
  statut public.payslip_status not null default 'brouillon',
  net_total numeric(8,2) not null,
  total_indemnites numeric(8,2) not null default 0,
  total_du numeric(8,2) not null,
  engine_version text not null,
  rule_set_version text,
  anomalies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, mois)
);

create trigger payslips_set_updated_at
  before update on public.payslips
  for each row execute function public.set_updated_at();

alter table public.payslips enable row level security;

create policy "L'assmat lit les bulletins de ses contrats"
  on public.payslips for select
  to authenticated
  using (exists (select 1 from public.contracts k
                 where k.id = contract_id and k.assmat_id = public.current_assmat_id()));

create policy "Un tuteur lit les bulletins du contrat de son enfant"
  on public.payslips for select
  to authenticated
  using (exists (select 1 from public.contracts k
                 where k.id = contract_id and public.is_guardian_of(k.child_id)));

-- Écriture uniquement via la RPC enregistre_bulletin (security definer).
revoke all on table public.payslips from anon, authenticated;
grant select on table public.payslips to authenticated;
grant all on table public.payslips to service_role;

create table public.payslip_lines (
  id uuid primary key default public.uuid_v7(),
  payslip_id uuid not null references public.payslips (id) on delete cascade,
  code text not null,
  label text not null,
  montant numeric(8,2) not null,
  formule text not null,
  inputs jsonb not null default '{}'::jsonb,
  ref_code text,
  ref_source text,
  ref_url text,
  section text not null default 'salaire', -- 'salaire' | 'indemnites'
  ordre int not null default 0,
  created_at timestamptz not null default now()
);

create index payslip_lines_payslip_idx on public.payslip_lines (payslip_id, ordre);

alter table public.payslip_lines enable row level security;

create policy "Lecture des lignes via le bulletin (assmat)"
  on public.payslip_lines for select
  to authenticated
  using (exists (
    select 1 from public.payslips p
    join public.contracts k on k.id = p.contract_id
    where p.id = payslip_id and k.assmat_id = public.current_assmat_id()
  ));

create policy "Lecture des lignes via le bulletin (tuteur)"
  on public.payslip_lines for select
  to authenticated
  using (exists (
    select 1 from public.payslips p
    join public.contracts k on k.id = p.contract_id
    where p.id = payslip_id and public.is_guardian_of(k.child_id)
  ));

revoke all on table public.payslip_lines from anon, authenticated;
grant select on table public.payslip_lines to authenticated;
grant all on table public.payslip_lines to service_role;

-- ---------------------------------------------------------------------------
-- pajemploi_declarations (une par enfant et par mois — règle du 25/01/2026)
-- ---------------------------------------------------------------------------
create type public.declaration_status as enum ('a_declarer', 'declare');

create table public.pajemploi_declarations (
  id uuid primary key default public.uuid_v7(),
  payslip_id uuid not null references public.payslips (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  mois date not null,
  heures_normales int not null,
  jours_activite int not null,
  jours_cp numeric(4,1) not null default 0,
  heures_complementaires numeric(6,2) not null default 0,
  heures_majorees numeric(6,2) not null default 0,
  salaire_net_total numeric(8,2) not null,
  indemnites_entretien numeric(8,2) not null default 0,
  statut public.declaration_status not null default 'a_declarer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id, mois)
);

create trigger pajemploi_declarations_set_updated_at
  before update on public.pajemploi_declarations
  for each row execute function public.set_updated_at();

alter table public.pajemploi_declarations enable row level security;

create policy "L'assmat lit les déclarations de ses enfants"
  on public.pajemploi_declarations for select
  to authenticated
  using (exists (select 1 from public.children c
                 where c.id = child_id and c.assmat_id = public.current_assmat_id()));

-- Le statut « déclaré » est coché par l'assmat (seule écriture autorisée).
create policy "L'assmat met à jour le statut de déclaration"
  on public.pajemploi_declarations for update
  to authenticated
  using (exists (select 1 from public.children c
                 where c.id = child_id and c.assmat_id = public.current_assmat_id()))
  with check (exists (select 1 from public.children c
                      where c.id = child_id and c.assmat_id = public.current_assmat_id()));

create policy "Un tuteur lit les déclarations de son enfant"
  on public.pajemploi_declarations for select
  to authenticated
  using (public.is_guardian_of(child_id));

revoke all on table public.pajemploi_declarations from anon, authenticated;
grant select, update (statut, updated_at) on table public.pajemploi_declarations to authenticated;
grant all on table public.pajemploi_declarations to service_role;

-- ---------------------------------------------------------------------------
-- RPC : enregistrement atomique d'un bulletin calculé par le moteur
-- ---------------------------------------------------------------------------
create or replace function public.enregistre_bulletin(
  p_contract_id uuid,
  p_mois date,
  p_net_total numeric,
  p_total_indemnites numeric,
  p_total_du numeric,
  p_engine_version text,
  p_anomalies jsonb,
  p_lignes jsonb,           -- [{code,label,montant,formule,inputs,ref_code,ref_source,ref_url,section,ordre}]
  p_declaration jsonb       -- {heures_normales,jours_activite,jours_cp,heures_complementaires,heures_majorees,salaire_net_total,indemnites_entretien}
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assmat uuid;
  v_child uuid;
  v_payslip uuid;
  v_ligne jsonb;
begin
  -- Contrôle de propriété : seul le propriétaire du contrat génère un bulletin.
  select k.assmat_id, k.child_id into v_assmat, v_child
  from public.contracts k where k.id = p_contract_id;

  if v_assmat is null or v_assmat <> public.current_assmat_id() then
    raise exception 'Contrat introuvable ou non autorisé';
  end if;

  -- Un bulletin validé ne se régénère pas silencieusement.
  if exists (select 1 from public.payslips p
             where p.contract_id = p_contract_id and p.mois = p_mois
               and p.statut = 'valide') then
    raise exception 'Le bulletin de ce mois est déjà validé';
  end if;

  -- Remplace le brouillon existant le cas échéant.
  delete from public.payslips p
  where p.contract_id = p_contract_id and p.mois = p_mois;

  insert into public.payslips
    (contract_id, mois, statut, net_total, total_indemnites, total_du,
     engine_version, anomalies)
  values
    (p_contract_id, p_mois, 'brouillon', p_net_total, p_total_indemnites,
     p_total_du, p_engine_version, coalesce(p_anomalies, '[]'::jsonb))
  returning id into v_payslip;

  for v_ligne in select * from jsonb_array_elements(p_lignes) loop
    insert into public.payslip_lines
      (payslip_id, code, label, montant, formule, inputs,
       ref_code, ref_source, ref_url, section, ordre)
    values
      (v_payslip,
       v_ligne->>'code', v_ligne->>'label',
       (v_ligne->>'montant')::numeric,
       v_ligne->>'formule',
       coalesce(v_ligne->'inputs', '{}'::jsonb),
       v_ligne->>'ref_code', v_ligne->>'ref_source', v_ligne->>'ref_url',
       coalesce(v_ligne->>'section', 'salaire'),
       coalesce((v_ligne->>'ordre')::int, 0));
  end loop;

  insert into public.pajemploi_declarations
    (payslip_id, child_id, mois, heures_normales, jours_activite, jours_cp,
     heures_complementaires, heures_majorees, salaire_net_total,
     indemnites_entretien)
  values
    (v_payslip, v_child, p_mois,
     (p_declaration->>'heures_normales')::int,
     (p_declaration->>'jours_activite')::int,
     coalesce((p_declaration->>'jours_cp')::numeric, 0),
     coalesce((p_declaration->>'heures_complementaires')::numeric, 0),
     coalesce((p_declaration->>'heures_majorees')::numeric, 0),
     (p_declaration->>'salaire_net_total')::numeric,
     coalesce((p_declaration->>'indemnites_entretien')::numeric, 0))
  on conflict (child_id, mois) do update set
    payslip_id = excluded.payslip_id,
    heures_normales = excluded.heures_normales,
    jours_activite = excluded.jours_activite,
    jours_cp = excluded.jours_cp,
    heures_complementaires = excluded.heures_complementaires,
    heures_majorees = excluded.heures_majorees,
    salaire_net_total = excluded.salaire_net_total,
    indemnites_entretien = excluded.indemnites_entretien,
    statut = 'a_declarer';

  insert into public.audit_log (table_name, record_id, action, acteur, apres)
  values ('payslips', v_payslip, 'genere_bulletin', auth.uid(),
          jsonb_build_object('mois', p_mois, 'net_total', p_net_total,
                             'engine_version', p_engine_version));

  return v_payslip;
end;
$$;

-- Validation du bulletin (passage brouillon → validé), journalisée.
create or replace function public.valide_bulletin(p_payslip_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assmat uuid;
begin
  select k.assmat_id into v_assmat
  from public.payslips p join public.contracts k on k.id = p.contract_id
  where p.id = p_payslip_id;

  if v_assmat is null or v_assmat <> public.current_assmat_id() then
    raise exception 'Bulletin introuvable ou non autorisé';
  end if;

  update public.payslips set statut = 'valide' where id = p_payslip_id;

  insert into public.audit_log (table_name, record_id, action, acteur)
  values ('payslips', p_payslip_id, 'valide_bulletin', auth.uid());
end;
$$;
