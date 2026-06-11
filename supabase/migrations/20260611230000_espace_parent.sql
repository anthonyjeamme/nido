-- Lot 5 — Espace parent : invitations, messagerie (SPECS M8, US-5.x lot 5)

-- ---------------------------------------------------------------------------
-- Invitations : un token par tuteur, généré par l'assmat
-- ---------------------------------------------------------------------------
alter table public.child_guardians
  add column invitation_token uuid unique default public.uuid_v7(),
  add column invitation_acceptee_le timestamptz;

-- Le parent invité réclame son invitation : rattache son compte au tuteur,
-- bascule son profil en rôle parent (s'il n'a aucune activité assmat).
create or replace function public.reclame_invitation(p_token uuid)
returns uuid  -- child_id rattaché
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guardian public.child_guardians%rowtype;
  v_a_des_enfants boolean;
begin
  select * into v_guardian
  from public.child_guardians
  where invitation_token = p_token and deleted_at is null;

  if v_guardian.id is null then
    raise exception 'Invitation introuvable ou expirée';
  end if;

  if v_guardian.profile_id is not null and v_guardian.profile_id <> auth.uid() then
    raise exception 'Cette invitation a déjà été utilisée par un autre compte';
  end if;

  update public.child_guardians
  set profile_id = auth.uid(), invitation_acceptee_le = now()
  where id = v_guardian.id;

  -- Bascule le compte en parent si ce n'est pas une assmat en activité.
  select exists (
    select 1 from public.assmats a
    join public.children c on c.assmat_id = a.id
    where a.profile_id = auth.uid()
  ) into v_a_des_enfants;

  if not v_a_des_enfants then
    update public.profiles set role = 'parent' where id = auth.uid();
    delete from public.assmats where profile_id = auth.uid();
  end if;

  insert into public.audit_log (table_name, record_id, action, acteur, apres)
  values ('child_guardians', v_guardian.id, 'invitation_acceptee', auth.uid(),
          jsonb_build_object('child_id', v_guardian.child_id));

  return v_guardian.child_id;
end;
$$;

-- Le rôle du profil peut maintenant changer via la RPC : assouplir la policy
-- de mise à jour du profil (le rôle reste verrouillé côté API directe).
-- (Aucun changement nécessaire : la RPC est security definer.)

-- ---------------------------------------------------------------------------
-- threads + messages (un fil par enfant)
-- ---------------------------------------------------------------------------
create table public.threads (
  id uuid primary key default public.uuid_v7(),
  assmat_id uuid not null references public.assmats (id) on delete cascade,
  child_id uuid not null unique references public.children (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.threads enable row level security;

create policy "L'assmat gère les fils de ses enfants"
  on public.threads for all
  to authenticated
  using (assmat_id = public.current_assmat_id())
  with check (assmat_id = public.current_assmat_id());

create policy "Un tuteur lit le fil de son enfant"
  on public.threads for select
  to authenticated
  using (public.is_guardian_of(child_id));

revoke all on table public.threads from anon, authenticated;
grant select, insert on table public.threads to authenticated;
grant all on table public.threads to service_role;

create type public.message_type as enum ('libre', 'absence', 'retard', 'rdv', 'reappro');

create table public.messages (
  id uuid primary key default public.uuid_v7(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  auteur uuid not null references public.profiles (id),
  contenu text not null,
  piece_jointe_path text,
  type public.message_type not null default 'libre',
  payload jsonb not null default '{}'::jsonb,
  traite_le timestamptz,                 -- message structuré confirmé par l'assmat
  lu_le timestamptz,
  created_at timestamptz not null default now()
);

create index messages_thread_idx on public.messages (thread_id, created_at);

alter table public.messages enable row level security;

-- Visible par l'assmat du fil et les tuteurs de l'enfant du fil.
create policy "Les participants lisent le fil"
  on public.messages for select
  to authenticated
  using (exists (
    select 1 from public.threads t
    where t.id = thread_id
      and (t.assmat_id = public.current_assmat_id() or public.is_guardian_of(t.child_id))
  ));

create policy "Les participants écrivent en leur nom"
  on public.messages for insert
  to authenticated
  with check (
    auteur = (select auth.uid())
    and exists (
      select 1 from public.threads t
      where t.id = thread_id
        and (t.assmat_id = public.current_assmat_id() or public.is_guardian_of(t.child_id))
    )
  );

-- L'assmat marque lu / traite les messages structurés.
create policy "L'assmat met à jour les messages de ses fils"
  on public.messages for update
  to authenticated
  using (exists (
    select 1 from public.threads t
    where t.id = thread_id and t.assmat_id = public.current_assmat_id()
  ))
  with check (exists (
    select 1 from public.threads t
    where t.id = thread_id and t.assmat_id = public.current_assmat_id()
  ));

revoke all on table public.messages from anon, authenticated;
grant select, insert, update on table public.messages to authenticated;
grant all on table public.messages to service_role;
