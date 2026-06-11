-- Tests RLS + RPC : payslips, payslip_lines, pajemploi_declarations, audit_log
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'alice@test.fr', '{"role":"assmat"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'brigitte@test.fr', '{"role":"assmat"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'paul@test.fr', '{"role":"parent"}'::jsonb);

update public.assmats set id = 'eeeeeeee-0000-0000-0000-000000000001'
where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001';

insert into public.children (id, assmat_id, prenom, nom, date_naissance) values
  ('cccccccc-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 'Adam', 'Apple', '2024-03-01');

insert into public.child_guardians (child_id, profile_id, nom, prenom, est_employeur) values
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'A', 'Paul', true);

insert into public.contracts (id, assmat_id, child_id, type, date_debut, taux_horaire,
  heures_par_semaine, semaines_programmees, jours_accueil_par_semaine,
  indemnite_entretien_jour, statut)
values ('dddddddd-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001',
  'cccccccc-0000-0000-0000-000000000001', 'annee_incomplete', '2026-01-05',
  4.00, 36, 44, 4, 4.50, 'actif');

-- ===== Alice génère un bulletin via la RPC =================================
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

select lives_ok(
  $$ select public.enregistre_bulletin(
       'dddddddd-0000-0000-0000-000000000001', '2026-06-01',
       528.00, 76.50, 604.50, '0.1.0', '[]'::jsonb,
       '[{"code":"MENSUALISATION","label":"Salaire mensualisé","montant":528.00,
          "formule":"taux × heures × semaines ÷ 12","inputs":{"taux":4},
          "ref_code":"MENSUALISATION_AI","ref_source":"CCN art. 109.2","section":"salaire","ordre":0}]'::jsonb,
       '{"heures_normales":132,"jours_activite":15,"jours_cp":0,
         "heures_complementaires":0,"heures_majorees":0,
         "salaire_net_total":528.00,"indemnites_entretien":76.50}'::jsonb) $$,
  'Alice génère un bulletin via la RPC');

select is((select count(*) from public.payslips), 1::bigint, 'Le bulletin existe');
select is((select count(*) from public.payslip_lines), 1::bigint, 'Les lignes existent');
select is((select heures_normales from public.pajemploi_declarations), 132,
  'La déclaration Pajemploi est créée');

-- Écriture directe interdite (tout passe par la RPC)
select throws_ok(
  $$ insert into public.payslips (contract_id, mois, net_total, total_du, engine_version)
     values ('dddddddd-0000-0000-0000-000000000001', '2026-07-01', 1, 1, 'x') $$,
  '42501', null,
  'Insertion directe d''un bulletin interdite');

-- Validation puis tentative de régénération
select lives_ok(
  $$ select public.valide_bulletin((select id from public.payslips limit 1)) $$,
  'Alice valide le bulletin');

select throws_ok(
  $$ select public.enregistre_bulletin(
       'dddddddd-0000-0000-0000-000000000001', '2026-06-01',
       1, 0, 1, '0.1.0', '[]'::jsonb, '[]'::jsonb,
       '{"heures_normales":1,"jours_activite":1,"salaire_net_total":1}'::jsonb) $$,
  'P0001', 'Le bulletin de ce mois est déjà validé',
  'Un bulletin validé ne se régénère pas');

-- ===== Brigitte ne génère pas sur le contrat d'Alice =======================
set local "request.jwt.claims" to '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';

select throws_ok(
  $$ select public.enregistre_bulletin(
       'dddddddd-0000-0000-0000-000000000001', '2026-08-01',
       1, 0, 1, '0.1.0', '[]'::jsonb, '[]'::jsonb,
       '{"heures_normales":1,"jours_activite":1,"salaire_net_total":1}'::jsonb) $$,
  'P0001', 'Contrat introuvable ou non autorisé',
  'Brigitte ne génère pas de bulletin sur le contrat d''Alice');

-- ===== Paul (tuteur) lit mais n'écrit pas ==================================
set local "request.jwt.claims" to '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}';

select is(
  (select count(*) from public.payslips) + (select count(*) from public.payslip_lines),
  2::bigint,
  'Paul lit le bulletin et ses lignes');

select throws_ok(
  $$ select count(*) from public.audit_log $$,
  '42501', null,
  'L''audit log n''est pas lisible via l''API');

select * from finish();
rollback;
