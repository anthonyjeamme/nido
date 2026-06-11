-- Tests RLS : invitations, threads, messages
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'alice@test.fr', '{"role":"assmat"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'paul@test.fr', '{"role":"assmat"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'pia@test.fr', '{"role":"parent"}'::jsonb);
-- (Paul arrive avec le rôle par défaut « assmat » : la RPC doit le basculer.)

update public.assmats set id = 'eeeeeeee-0000-0000-0000-000000000001'
where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001';

insert into public.children (id, assmat_id, prenom, nom, date_naissance) values
  ('cccccccc-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 'Adam', 'Apple', '2024-03-01');

insert into public.child_guardians (id, child_id, nom, prenom, est_employeur, invitation_token) values
  ('ffffffff-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
   'A', 'Paul', true, '99999999-0000-0000-0000-000000000001');

insert into public.threads (id, assmat_id, child_id) values
  ('77777777-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001');

-- ===== Paul réclame son invitation =========================================
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}';

select is(
  public.reclame_invitation('99999999-0000-0000-0000-000000000001'),
  'cccccccc-0000-0000-0000-000000000001'::uuid,
  'Paul réclame son invitation et reçoit le child_id');

select is(
  (select profile_id from public.child_guardians where id = 'ffffffff-0000-0000-0000-000000000001'),
  'bbbbbbbb-0000-0000-0000-000000000001'::uuid,
  'Le compte de Paul est rattaché au tuteur');

select is(
  (select role::text from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'parent',
  'Le profil de Paul bascule en rôle parent');

select is((select count(*) from public.children), 1::bigint,
  'Paul voit désormais la fiche d''Adam');

-- Paul écrit un message structuré « absent demain »
insert into public.messages (thread_id, auteur, contenu, type, payload)
values ('77777777-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
        'Adam sera absent demain', 'absence', '{"date":"2026-06-12"}'::jsonb);

select is((select count(*) from public.messages), 1::bigint,
  'Paul écrit dans le fil de son enfant');

-- Paul ne peut pas écrire au nom d'Alice
select throws_ok(
  $$ insert into public.messages (thread_id, auteur, contenu)
     values ('77777777-0000-0000-0000-000000000001',
             'aaaaaaaa-0000-0000-0000-000000000001', 'usurpation') $$,
  '42501', null,
  'Paul ne peut pas écrire au nom d''un autre profil');

-- ===== Pia (étrangère) ne réclame pas une invitation déjà utilisée ========
set local "request.jwt.claims" to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}';

select throws_ok(
  $$ select public.reclame_invitation('99999999-0000-0000-0000-000000000001') $$,
  'P0001', 'Cette invitation a déjà été utilisée par un autre compte',
  'Une invitation utilisée n''est pas réutilisable');

select is(
  (select count(*) from public.messages) + (select count(*) from public.threads),
  0::bigint,
  'Pia ne voit ni fil ni messages');

-- ===== Alice lit et traite =================================================
set local "request.jwt.claims" to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

update public.messages set traite_le = now()
where type = 'absence';

select is(
  (select count(*) from public.messages where traite_le is not null),
  1::bigint,
  'Alice traite le message structuré');

select * from finish();
rollback;
