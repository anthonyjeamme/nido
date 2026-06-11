-- Privilèges explicites par table (les versions récentes de Supabase
-- n'accordent plus de privilèges par défaut aux rôles API : RLS filtre
-- les lignes, mais l'accès à la table doit être accordé explicitement).
-- Convention : chaque migration qui crée une table déclare ses grants.

grant usage on schema public to anon, authenticated, service_role;

-- profiles : lecture/mise à jour de son propre profil (RLS restreint aux
-- propres lignes ; l'INSERT passe par le trigger handle_new_user).
grant select, update on table public.profiles to authenticated;
grant select on table public.profiles to anon;
grant all on table public.profiles to service_role;

-- assmats : l'assmat gère son espace (RLS restreint à profile_id = auth.uid()).
grant select, insert, update, delete on table public.assmats to authenticated;
grant select on table public.assmats to anon;
grant all on table public.assmats to service_role;
