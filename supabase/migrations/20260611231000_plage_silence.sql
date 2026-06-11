-- Plages de silence de la messagerie (US-8.2) : le parent doit pouvoir
-- afficher les horaires de disponibilité de l'assmat sans accès à la table
-- assmats (RLS) → fonction security definer ciblée, qui n'expose que cela.

create or replace function public.plage_dispo_assmat(p_child_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(a.reglages_visibilite -> 'plage_dispo', 'null'::jsonb)
  from public.children c
  join public.assmats a on a.id = c.assmat_id
  where c.id = p_child_id
    and (a.profile_id = auth.uid() or public.is_guardian_of(p_child_id));
$$;
