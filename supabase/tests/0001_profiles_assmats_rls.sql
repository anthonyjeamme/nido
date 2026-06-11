-- Tests des policies RLS : profiles & assmats (pgTAP, lancés via `supabase test db`)
begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- Deux utilisatrices assmat créées via auth.users (le trigger crée profil + assmat)
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'alice@test.fr', '{"role":"assmat","display_name":"Alice"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'brigitte@test.fr', '{"role":"assmat","display_name":"Brigitte"}'::jsonb);

-- Un parent (pas de ligne assmat créée)
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'parent@test.fr', '{"role":"parent","display_name":"Paul"}'::jsonb);

select is(
  (select count(*) from public.profiles),
  3::bigint,
  'Le trigger crée un profil par utilisateur'
);

select is(
  (select count(*) from public.assmats),
  2::bigint,
  'Le trigger crée une ligne assmat uniquement pour le rôle assmat'
);

-- --- Connectée en tant qu'Alice -------------------------------------------
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'Alice ne voit que son propre profil'
);

select is(
  (select display_name from public.profiles),
  'Alice',
  'Le profil visible est bien le sien'
);

select is(
  (select count(*) from public.assmats),
  1::bigint,
  'Alice ne voit que sa propre ligne assmat'
);

-- Alice ne peut pas modifier la ligne assmat de Brigitte (0 ligne touchée)
update public.assmats set agrement_capacite = 4
where profile_id = '22222222-2222-2222-2222-222222222222';

select is(
  (select count(*) from public.assmats where agrement_capacite = 4),
  0::bigint,
  'Alice ne peut pas modifier l''espace d''une autre assmat'
);

-- Alice peut modifier le sien
update public.assmats set agrement_capacite = 3
where profile_id = '11111111-1111-1111-1111-111111111111';

select is(
  (select agrement_capacite from public.assmats where profile_id = '11111111-1111-1111-1111-111111111111'),
  3,
  'Alice peut modifier son propre espace'
);

-- --- Connecté en tant qu'anonyme ------------------------------------------
set local role anon;
set local "request.jwt.claims" to '{}';

select is(
  (select count(*) from public.profiles) + (select count(*) from public.assmats),
  0::bigint,
  'Un anonyme ne voit rien'
);

select * from finish();
rollback;
