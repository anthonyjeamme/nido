-- Tests RLS + triggers : attendance_events, daily_log_entries, daily_summaries
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

-- Décor : Alice (assmat) accueille Adam ; Paul est tuteur (contrat AVEC pointage
-- parent) ; Brigitte (assmat) et Pia (tutrice d'un autre enfant) ne voient rien.
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'alice@test.fr', '{"role":"assmat"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'brigitte@test.fr', '{"role":"assmat"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'paul@test.fr', '{"role":"parent"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'pia@test.fr', '{"role":"parent"}'::jsonb);

update public.assmats set id = 'eeeeeeee-0000-0000-0000-000000000001'
where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001';

insert into public.children (id, assmat_id, prenom, nom, date_naissance) values
  ('cccccccc-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 'Adam', 'Apple', '2024-03-01');

insert into public.child_guardians (child_id, profile_id, nom, prenom, est_employeur) values
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'A', 'Paul', true);

insert into public.contracts (id, assmat_id, child_id, type, date_debut, taux_horaire,
  heures_par_semaine, semaines_programmees, jours_accueil_par_semaine,
  indemnite_entretien_jour, parent_peut_pointer, statut)
values ('dddddddd-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001',
  'cccccccc-0000-0000-0000-000000000001', 'annee_incomplete', '2026-01-05',
  4.00, 36, 44, 4, 4.50, true, 'actif');

-- ===== Alice pointe ========================================================
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

insert into public.attendance_events (contract_id, child_id, type, pointe_par, horodatage)
values ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
        'in', 'aaaaaaaa-0000-0000-0000-000000000001', '2020-01-01 00:00:00+00');

select is((select count(*) from public.attendance_events), 1::bigint,
  'Alice pointe une arrivée');

select isnt((select horodatage from public.attendance_events limit 1),
  '2020-01-01 00:00:00+00'::timestamptz,
  'L''horodatage client est ignoré : le serveur fait foi');

-- Correction sans motif : refusée
select throws_ok(
  $$ update public.attendance_events set horodatage = now() - interval '1 hour' $$,
  'P0001', 'Un motif de correction est obligatoire',
  'Corriger un pointage sans motif est refusé');

-- Correction avec motif : trace conservée
update public.attendance_events
set horodatage = now() - interval '1 hour', motif_correction = 'Oubli du matin';

select is((select corrige from public.attendance_events limit 1), true,
  'La correction est tracée (corrige = true)');

select isnt((select valeur_initiale from public.attendance_events limit 1), null,
  'La valeur initiale est conservée');

-- ===== Paul (tuteur, contrat avec pointage parent) =========================
set local "request.jwt.claims" to '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}';

insert into public.attendance_events (contract_id, child_id, type, pointe_par)
values ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
        'out', 'bbbbbbbb-0000-0000-0000-000000000001');

select is((select count(*) from public.attendance_events), 2::bigint,
  'Paul pointe un départ (contrat parent_peut_pointer)');

select is(
  (select pointe_par from public.attendance_events order by horodatage desc limit 1),
  'bbbbbbbb-0000-0000-0000-000000000001'::uuid,
  'Le pointage parent est attribué à Paul (forcé par trigger)');

-- Paul ne peut pas corriger un pointage (update interdit aux tuteurs)
update public.attendance_events set horodatage = now(), motif_correction = 'tentative'
where type = 'in';
select is(
  (select count(*) from public.attendance_events where motif_correction = 'tentative'),
  0::bigint,
  'Un tuteur ne peut pas corriger un pointage');

-- ===== Journal de bord =====================================================
set local "request.jwt.claims" to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

insert into public.daily_log_entries (child_id, assmat_id, type, payload, visible_parents) values
  ('cccccccc-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001',
   'repas', '{"quantite":"bien"}'::jsonb, true),
  ('cccccccc-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001',
   'note', '{"texte":"note privée"}'::jsonb, false);

select is((select count(*) from public.daily_log_entries), 2::bigint,
  'Alice écrit dans son journal');

-- Paul ne voit que les entrées visibles
set local "request.jwt.claims" to '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}';

select is((select count(*) from public.daily_log_entries), 1::bigint,
  'Paul ne voit que les entrées visibles parents');

select is((select type::text from public.daily_log_entries limit 1), 'repas',
  'L''entrée privée reste invisible');

-- Pia (tutrice d'aucun enfant d'Alice) ne voit rien
set local "request.jwt.claims" to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}';

select is(
  (select count(*) from public.daily_log_entries)
  + (select count(*) from public.attendance_events),
  0::bigint,
  'Pia ne voit ni journal ni pointages d''Adam');

select * from finish();
rollback;
