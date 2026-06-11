# Nido — conventions du projet

Nido est l'OS de l'assistante maternelle en France : quotidien (pointage, journal de bord),
administratif (contrats, paie, déclaration Pajemploi) et, à terme, mode MAM.
Le cahier des charges complet est dans `SPECS.md` — le lire avant tout nouveau module.
Le développement suit les lots du §9 de SPECS.md ; ne pas commencer un lot avant validation
explicite du précédent par l'utilisateur.

## Architecture

- Monorepo Turborepo + pnpm : `apps/web` (Next.js App Router, PWA unique assmat + parent),
  `packages/paie-engine` (moteur de calcul pur), `packages/db` (types Supabase générés),
  `packages/ui` (design system), `packages/config` (tsconfig partagés).
- Next.js 16 : `proxy.ts` (et non `middleware.ts`), `cookies()`/`headers()`/`params`/`searchParams`
  sont asynchrones. Docs de référence dans `node_modules/next/dist/docs/`.
- Supabase : Postgres + RLS + Auth (magic link) + Storage + Realtime. Stack locale via
  `supabase start` (Docker). Projet cloud : `jtobebedkqyqvlftqbme` (région Paris).

## Règles non négociables

1. **Aucune constante réglementaire en dur dans le code.** Toute valeur (SMIC, minimum garanti,
   seuils, plafonds) vient de `bareme_values` / `rule_definitions`, versionnées par date d'effet.
2. **Tout calcul monétaire passe par `packages/paie-engine`.** Interdiction de calcul de paie
   dans l'UI, les Server Actions ou les routes. Le moteur est pur (zéro dépendance UI/DB) et
   produit des arbres de `CalculLine` explicables (formule + inputs + référence réglementaire).
3. **Aucun calcul du moteur n'est mergé sans test** (vitest, cas dorés en fixtures JSON).
4. **Toute table a sa policy RLS + un test de policy** (pgTAP dans `supabase/tests/`,
   lancés par `supabase test db`). Un parent ne doit jamais voir les données d'un autre enfant.
5. **Migrations SQL uniquement via fichiers versionnés** dans `supabase/migrations/` —
   jamais de modification manuelle du schéma (ni en local, ni dans le dashboard cloud).
   Chaque migration qui crée une table déclare aussi ses **GRANT explicites** (anon /
   authenticated / service_role) : Supabase n'accorde plus de privilèges par défaut,
   RLS filtre les lignes mais l'accès à la table doit être accordé.
6. **Écritures sensibles** (génération de bulletin, correction de pointage) : fonctions RPC
   `security definer` qui journalisent dans `audit_log`, jamais d'écriture directe.
7. **Texte UI en français, vouvoiement, ton chaleureux et simple** (utilisatrices non techniques).
   Jamais de jargon réglementaire sans explication (tooltip).
8. **Mobile-first radical** pour tout le quotidien : utilisable à une main, saisie ≤ 10 s.
9. **RGPD (données de mineurs)** : buckets privés + URLs signées, autorisation parentale
   contrainte en base (pas seulement en UI), pas de donnée santé au-delà du nécessaire.

## Commandes

- `pnpm dev` — app web (le port 3000 est parfois pris ; Next bascule sur 3001)
- `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` — via turbo
- `supabase start` / `supabase stop` — stack locale (Docker requis)
- `supabase test db` — tests RLS pgTAP
- `supabase db reset` — rejoue les migrations + seed en local
- `pnpm db:types` — régénère `packages/db/src/types/database.ts` après toute migration
- E-mails locaux (magic links) : Mailpit sur http://127.0.0.1:54324

## Environnement

- `apps/web/.env.local` : Supabase local (URL + clé publishable affichées par `supabase start`).
- `.env` à la racine : credentials du projet cloud (jamais commité).
- Déploiement cible : Vercel, sans couplage Vercel-spécifique (portage Cloudflare possible).
