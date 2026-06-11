-- Tests RLS : children, child_guardians, child_health, authorizations,
-- contracts, planned_schedules — isolation assmat/assmat et parent/parent.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

-- Deux assmats + deux parents
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'alice@test.fr', '{"role":"assmat","display_name":"Alice"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'brigitte@test.fr', '{"role":"assmat","display_name":"Brigitte"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'parent.a@test.fr', '{"role":"parent","display_name":"Paul A"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'parent.b@test.fr', '{"role":"parent","display_name":"Pia B"}'::jsonb);

-- Ids assmat fixes pour les littéraux des tests
update public.assmats set id = 'eeeeeeee-0000-0000-0000-000000000001'
where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.assmats set id = 'eeeeeeee-0000-0000-0000-000000000002'
where profile_id = 'aaaaaaaa-0000-0000-0000-000000000002';

-- Enfants : Adam chez Alice, Bilal chez Brigitte
insert into public.children (id, assmat_id, prenom, nom, date_naissance) values
  ('cccccccc-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 'Adam', 'Apple', '2024-03-01'),
  ('cccccccc-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000002', 'Bilal', 'Berry', '2023-11-15');

-- Tuteurs : parent A → Adam ; parent B → Bilal
insert into public.child_guardians (child_id, profile_id, nom, prenom, est_employeur) values
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'A', 'Paul', true),
  ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'B', 'Pia', true);

-- Santé + autorisation + contrat pour Adam
insert into public.child_health (child_id, allergies)
values ('cccccccc-0000-0000-0000-000000000001', '["arachide"]'::jsonb);

insert into public.authorizations (child_id, type, niveau, actif)
values ('cccccccc-0000-0000-0000-000000000001', 'photo', 'privees_parents', true);

insert into public.contracts (id, assmat_id, child_id, type, date_debut, taux_horaire,
  heures_par_semaine, semaines_programmees, jours_accueil_par_semaine, indemnite_entretien_jour)
values ('dddddddd-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001',
  'cccccccc-0000-0000-0000-000000000001', 'annee_incomplete', '2026-09-01', 4.00, 36, 44, 4, 4.50);

insert into public.planned_schedules (contract_id, jour_semaine, heure_debut, heure_fin)
values ('dddddddd-0000-0000-0000-000000000001', 1, '08:00', '17:00');

-- ===== Alice (assmat) ======================================================
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

select is((select count(*) from public.children), 1::bigint,
  'Alice ne voit que ses propres enfants accueillis');

select is((select prenom from public.children), 'Adam',
  'L''enfant visible est bien le sien');

select is((select count(*) from public.contracts), 1::bigint,
  'Alice voit son contrat');

-- Alice ne peut pas créer un enfant chez Brigitte
select throws_ok(
  $$ insert into public.children (assmat_id, prenom, nom, date_naissance)
     values ('eeeeeeee-0000-0000-0000-000000000002', 'Intrus', 'X', '2024-01-01') $$,
  '42501', null,
  'Alice ne peut pas créer un enfant dans l''espace de Brigitte');

-- ===== Brigitte (assmat) ===================================================
set local "request.jwt.claims" to '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';

select is((select prenom from public.children), 'Bilal',
  'Brigitte ne voit que Bilal');

select is((select count(*) from public.contracts), 0::bigint,
  'Brigitte ne voit pas les contrats d''Alice');

select is((select count(*) from public.child_health), 0::bigint,
  'Brigitte ne voit pas la santé des enfants d''Alice');

-- ===== Parent A ============================================================
set local "request.jwt.claims" to '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}';

select is((select count(*) from public.children), 1::bigint,
  'Le parent A ne voit qu''un seul enfant');

select is((select prenom from public.children), 'Adam',
  'Le parent A voit Adam, jamais Bilal');

select is((select count(*) from public.child_health), 1::bigint,
  'Le parent A lit la santé de référence de son enfant');

select is((select count(*) from public.contracts), 1::bigint,
  'Le parent A lit le contrat de son enfant');

select is((select count(*) from public.planned_schedules), 1::bigint,
  'Le parent A lit le planning de son enfant');

-- Le parent ne peut pas modifier la fiche enfant (0 ligne touchée)
update public.children set prenom = 'Pirate' where id = 'cccccccc-0000-0000-0000-000000000001';
select is((select prenom from public.children where id = 'cccccccc-0000-0000-0000-000000000001'),
  'Adam', 'Le parent ne peut pas modifier la fiche de l''enfant');

-- ===== Parent B ============================================================
set local "request.jwt.claims" to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}';

select is(
  (select count(*) from public.children where id = 'cccccccc-0000-0000-0000-000000000001')
  + (select count(*) from public.contracts)
  + (select count(*) from public.authorizations),
  0::bigint,
  'Le parent B ne voit rien d''Adam (ni fiche, ni contrat, ni autorisations)');

select * from finish();
rollback;
