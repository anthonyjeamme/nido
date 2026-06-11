-- Normalisation des privilèges de profiles/assmats : les anciennes versions
-- de Supabase (local) accordent des privilèges par défaut que les versions
-- récentes (cloud, CI) n'accordent plus. On révoque tout puis on re-grante
-- exactement ce qui est prévu, pour un comportement identique partout.

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.assmats from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select on table public.profiles to anon;

grant select, insert, update, delete on table public.assmats to authenticated;
grant select on table public.assmats to anon;
