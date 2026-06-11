-- Tests des policies RLS : bareme_values & rule_definitions
begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

-- Seed de test (en tant que postgres)
insert into public.bareme_values (code, valeur, date_effet)
values ('TEST_SMIC', 12.00, '2026-01-01');

insert into public.rule_definitions (code, version, description, ref_juridique, date_effet)
values ('TEST_REGLE', 1, 'Règle de test', 'CCN test', '2026-01-01');

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444',
   'authenticated', 'authenticated', 'lectrice@test.fr', '{"role":"assmat"}'::jsonb);

-- --- Utilisatrice connectée : lecture seule -------------------------------
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select is(
  (select count(*) from public.bareme_values where code = 'TEST_SMIC'),
  1::bigint,
  'Une utilisatrice connectée lit les barèmes'
);

select is(
  (select count(*) from public.rule_definitions where code = 'TEST_REGLE'),
  1::bigint,
  'Une utilisatrice connectée lit les règles'
);

select throws_ok(
  $$ insert into public.bareme_values (code, valeur, date_effet) values ('PIRATE', 1, '2026-01-01') $$,
  '42501',
  null,
  'Une utilisatrice connectée ne peut pas écrire un barème'
);

select throws_ok(
  $$ update public.bareme_values set valeur = 999 where code = 'TEST_SMIC' $$,
  '42501',
  null,
  'Une utilisatrice connectée ne peut pas modifier un barème'
);

select throws_ok(
  $$ insert into public.rule_definitions (code, version, description, ref_juridique, date_effet) values ('PIRATE', 1, 'x', 'x', '2026-01-01') $$,
  '42501',
  null,
  'Une utilisatrice connectée ne peut pas écrire une règle'
);

-- --- Anonyme : aucun accès -------------------------------------------------
set local role anon;
set local "request.jwt.claims" to '{}';

select throws_ok(
  $$ select count(*) from public.bareme_values $$,
  '42501',
  null,
  'Un anonyme n''a pas accès aux barèmes'
);

select * from finish();
rollback;
