-- Tests RLS + contraintes serveur : santé (ordonnance, append-only), stocks
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'alice@test.fr', '{"role":"assmat"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'paul@test.fr', '{"role":"parent"}'::jsonb);

update public.assmats set id = 'eeeeeeee-0000-0000-0000-000000000001'
where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001';

insert into public.children (id, assmat_id, prenom, nom, date_naissance) values
  ('cccccccc-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 'Adam', 'Apple', '2024-03-01');

insert into public.child_guardians (child_id, profile_id, nom, prenom, est_employeur) values
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'A', 'Paul', true);

insert into public.supplies (id, child_id, type, label, quantite, seuil_alerte) values
  ('88888888-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
   'couches', 'Couches T3', 10, 8);

-- ===== Alice ===============================================================
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

-- Médicament SANS ordonnance : impossible (ordonnance_path NOT NULL + check)
select throws_ok(
  $$ insert into public.medications (child_id, nom, posologie, ordonnance_path, date_debut)
     values ('cccccccc-0000-0000-0000-000000000001', 'Doliprane', '1 dose', '', '2026-06-01') $$,
  '23514', null,
  'Un traitement sans ordonnance jointe est refusé');

-- Administration sans autorisation parentale : refusée
insert into public.medications (id, child_id, nom, posologie, ordonnance_path, date_debut)
values ('66666666-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
        'Doliprane', '1 dose si fièvre', 'aaaaaaaa-0000-0000-0000-000000000001/ordonnance.pdf', '2026-06-01');

select throws_ok(
  $$ insert into public.health_events (child_id, type, payload, declare_par)
     values ('cccccccc-0000-0000-0000-000000000001', 'medicament',
             '{"medication_id":"66666666-0000-0000-0000-000000000001","dose":"1"}'::jsonb,
             'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'P0001', 'Administration impossible : autorisation parentale « médicaments » inactive',
  'Administrer sans autorisation parentale active est bloqué côté serveur');

-- Avec autorisation active : OK
insert into public.authorizations (child_id, type, actif, signe_par, signe_le)
values ('cccccccc-0000-0000-0000-000000000001', 'medicament', true,
        'bbbbbbbb-0000-0000-0000-000000000001', now());

select lives_ok(
  $$ insert into public.health_events (child_id, type, payload, declare_par)
     values ('cccccccc-0000-0000-0000-000000000001', 'medicament',
             '{"medication_id":"66666666-0000-0000-0000-000000000001","dose":"1"}'::jsonb,
             'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'Administration valide avec ordonnance + autorisation');

-- Append-only : modification et suppression interdites dès le niveau
-- privilège (grant UPDATE limité à lu_par_parent_le, aucun grant DELETE) ;
-- le trigger reste en défense en profondeur pour les autres chemins.
select throws_ok(
  $$ update public.health_events set payload = '{"falsifie":true}'::jsonb $$,
  '42501', null,
  'Le journal de santé ne se modifie pas');

select throws_ok(
  $$ delete from public.health_events $$,
  '42501', null,
  'Le journal de santé ne se supprime pas');

-- Décrément automatique des couches au change
insert into public.daily_log_entries (child_id, assmat_id, type, payload)
values ('cccccccc-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001',
        'change', '{}'::jsonb);

select is(
  (select quantite from public.supplies where id = '88888888-0000-0000-0000-000000000001'),
  9,
  'Un change décrémente automatiquement le stock de couches');

-- ===== Paul (tuteur) =======================================================
set local "request.jwt.claims" to '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}';

select is((select count(*) from public.health_events), 1::bigint,
  'Paul lit les événements santé de son enfant');

-- Paul signale un symptôme (infos du matin)
select lives_ok(
  $$ insert into public.health_events (child_id, type, payload, declare_par)
     values ('cccccccc-0000-0000-0000-000000000001', 'symptome',
             '{"texte":"nuit difficile"}'::jsonb, 'bbbbbbbb-0000-0000-0000-000000000001') $$,
  'Paul signale un symptôme du matin');

-- Paul ne peut pas déclarer une fièvre (réservé à l'assmat)
select throws_ok(
  $$ insert into public.health_events (child_id, type, payload, declare_par)
     values ('cccccccc-0000-0000-0000-000000000001', 'fievre',
             '{"temp":39}'::jsonb, 'bbbbbbbb-0000-0000-0000-000000000001') $$,
  '42501', null,
  'Paul ne déclare pas de fièvre (réservé à l''assmat)');

-- Paul annonce un réapprovisionnement (non confirmé : stock inchangé)
insert into public.supply_movements (supply_id, delta, source, confirme)
values ('88888888-0000-0000-0000-000000000001', 20, 'reappro_parent', false);

select is(
  (select quantite from public.supplies where id = '88888888-0000-0000-0000-000000000001'),
  9,
  'Le réappro parent n''est appliqué qu''à la confirmation');

-- ===== Alice confirme ======================================================
set local "request.jwt.claims" to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

update public.supply_movements set confirme = true
where source = 'reappro_parent';

select is(
  (select quantite from public.supplies where id = '88888888-0000-0000-0000-000000000001'),
  29,
  'La confirmation applique le réappro (+20)');

select is(
  (select count(*) from public.supply_movements where source = 'change_auto'),
  1::bigint,
  'Le mouvement automatique du change est tracé');

select * from finish();
rollback;
