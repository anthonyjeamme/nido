# Cahier des charges — « Nido » (nom de code), l'OS de l'assistante maternelle

> Document destiné à être implémenté par Claude Code (modèle Fable).
> Stack cible : monorepo TypeScript, Next.js App Router (PWA mobile-first), Supabase (Postgres + RLS + Auth + Storage + Realtime), moteur de calcul en package pur testé unitairement.
> Marché : France. Réglementation : CCN des particuliers employeurs et de l'emploi à domicile + règles Pajemploi/Urssaf.

---

## 1. Vision et thèse produit

Le marché est coupé en deux : des outils de **paie/contrats** (Top'Assmat, Zen avec mon Assmat) et des outils de **liaison parents** (TisLien, Mon Ass'Mat, Gazouyi). Personne n'unifie les deux, et personne ne traite la MAM sérieusement.

**Nido = un seul outil, trois couches :**
1. **Le quotidien** — pointage horodaté, journal de bord (repas, sieste, change, activités), photos, santé, stocks de couches, menus.
2. **L'administratif** — contrat, mensualisation, paie, congés payés, déclaration Pajemploi prête à recopier, fin de contrat, abattement fiscal.
3. **Le collectif (V2)** — mode MAM : planning partagé, délégation d'accueil, balance d'heures entre collègues.

**Deux différenciateurs non négociables :**
- **Le calcul explicable.** Chaque montant affiché est décomposable : formule, paramètres, référence (article CCN / page Pajemploi). Jamais de boîte noire. C'est la réponse directe au reproche n°1 fait au leader (interprétations juridiques opaques et contestées).
- **Le parent employeur est un utilisateur natif, pas un spectateur.** Il pointe (si l'assmat l'autorise), lit les transmissions, comprend sa fiche de paie ligne par ligne. Chaque parent exposé à l'app est un canal de distribution gratuit.

**Émotion cible :** supprimer « la boule au ventre de fin de mois » (verbatim récurrent des assmats) et les conflits d'heures avec les parents.

---

## 2. Personas et rôles

| Rôle | Description | Accès |
|---|---|---|
| **Assmat** (propriétaire du compte) | Assistante maternelle agréée, à domicile. 1 à 4 enfants simultanés selon agrément. Peu de temps, les mains prises, smartphone uniquement en journée. | Tout son espace. Décide de ce que voient les parents. |
| **Parent employeur (PE)** | Particulier employeur d'un contrat. Veut de la transparence (heures, paie) et des nouvelles de son enfant. | Uniquement son/ses enfant(s) et son/ses contrat(s). |
| **Co-parent** | Deuxième responsable légal rattaché à l'enfant. | Lecture journal/santé/menus + messagerie. Droits de pointage configurables. |
| **Membre MAM (V2)** | Assmat exerçant en MAM avec 1 à 3 collègues. | Son espace + vues partagées MAM (planning, délégation). |

**Principe de permissions :** l'assmat est toujours maîtresse de la visibilité. Chaque catégorie d'information a un interrupteur global + par contrat (ex. : « les parents pointent eux-mêmes » : ON/OFF par contrat — point de friction connu du métier, certaines assmats refusent l'accès parents).

---

## 3. Périmètre par version

| Module | MVP | V1.1 | V2 |
|---|---|---|---|
| Onboarding assmat + agrément | ✅ | | |
| Enfants, fiches, autorisations | ✅ | | |
| Contrats + mensualisation + simulateur | ✅ | | |
| Planning prévisionnel + pointage horodaté | ✅ | | |
| Journal de bord + transmissions parents | ✅ | | |
| Moteur de paie + fiche expliquée | ✅ | | |
| Tableau déclaration Pajemploi (copie manuelle) | ✅ | | |
| Congés payés et absences | ✅ | | |
| App parent (lecture + pointage + messagerie) | ✅ | | |
| Santé (fièvre, médicaments, allergies/PAI) | ✅ | | |
| Stocks consommables (couches…) + rappels | ✅ | | |
| Menus de la semaine | ✅ | | |
| Photos sécurisées | | ✅ | |
| Avenants de contrat | | ✅ | |
| Régularisation fin de contrat | | ✅ | |
| Abattement fiscal (aide impôts) | | ✅ | |
| Notifications push | | ✅ | |
| Mode MAM (planning partagé, délégation, balance d'heures) | | | ✅ |
| Génération PDF contrat de travail | | | ✅ |
| Simulateur CMG côté parent (réforme 2025) | | | ✅ |

**Hors scope (toutes versions) :** mise en relation / annonces (terrain de Nounou-top), signature électronique qualifiée, comptabilité d'association MAM, paiement du salaire dans l'app.

---

## 4. Modules fonctionnels — user stories et critères d'acceptation

### M1 — Onboarding et profil assmat
- US-1.1 : En tant qu'assmat, je renseigne mon agrément : nombre d'enfants simultanés autorisés, tranches d'âge éventuelles, date de renouvellement. **CA :** alerte à J-90 du renouvellement ; la capacité alimente les contrôles du planning (M3).
- US-1.2 : Je configure mes horaires types d'ouverture, mes semaines de congés prévisionnelles, mes tarifs par défaut (taux horaire, indemnité entretien, indemnité repas).
- US-1.3 : Je choisis mes réglages de visibilité parents par défaut (pointage par les parents ON/OFF, photos, plages de silence de la messagerie).

### M2 — Enfants et autorisations
- US-2.1 : Fiche enfant : identité, date de naissance, contacts d'urgence, médecin traitant, personnes autorisées à récupérer l'enfant.
- US-2.2 : Santé de référence : allergies, régimes, PAI (document joint), vaccins (documents).
- US-2.3 : Autorisations parentales datées et signées en ligne (case + horodatage + identité) : sorties, transport, photos (3 niveaux : aucune / privées parents / partageables groupe), administration de médicaments sur ordonnance.
- **CA global :** aucune photo ne peut être partagée sans autorisation « photos » active ; un médicament ne peut être enregistré comme administré sans ordonnance jointe + autorisation active (blocage UI + contrainte serveur).

### M3 — Planning et pointage
- US-3.1 : Planning prévisionnel par contrat : semaine type (jours + créneaux), exceptions ponctuelles, semaines d'absence programmées (année incomplète).
- US-3.2 : Pointage arrivée/départ en 1 tap, horodaté serveur, par l'assmat **ou** par le parent selon réglage du contrat. Correction possible a posteriori par l'assmat avec trace (valeur initiale conservée, motif).
- US-3.3 : Vue « ma journée » : qui est là, qui arrive, qui part à quelle heure. Compteur de présence simultanée vs capacité d'agrément ; **alerte visuelle si dépassement** (y compris en prévisionnel).
- US-3.4 : Détection automatique des écarts planning/réel : retards, heures au-delà du contrat → classées heures complémentaires (jusqu'à 45 h/semaine) ou majorées (au-delà de 45 h/semaine), conformément aux règles Pajemploi.
- **CA :** un mois de pointages génère sans saisie supplémentaire le récap d'heures consommé par M9.

### M4 — Journal de bord et transmissions
- US-4.1 : Saisie ultra-rapide (cible : ≤ 10 s, une main) d'événements typés : repas (quantité : tout/bien/peu/refus + commentaire), sieste (début/fin ou durée), change (pipi/selles), activité (texte libre + tags réutilisables), humeur, note libre.
- US-4.2 : Chaque événement a une visibilité : privé assmat / visible parents. Défaut configurable par type.
- US-4.3 : « Récap du soir » : à l'heure de départ de l'enfant, génération automatique d'une transmission synthétique de la journée (repas, sieste, activités, infos santé) que l'assmat valide/édite en 1 écran avant envoi au parent.
- US-4.4 : Côté parent : timeline de la journée de son enfant uniquement, en temps réel si l'assmat publie au fil de l'eau, sinon au récap du soir.
- **CA :** le parent d'un enfant A ne voit jamais un événement, une photo ou un prénom d'un enfant B.

### M5 — Santé
- US-5.1 : Événement fièvre : température, heure, action (surveillance, appel parent, antipyrétique si autorisé), notification immédiate au parent (avec accusé de lecture).
- US-5.2 : Administration de médicament : sélection de l'ordonnance active, dose, heure → journal infalsifiable (append-only), notification parent.
- US-5.3 : Tableau de bord santé par enfant : allergies en bandeau permanent sur toutes les vues de l'enfant, traitements en cours, historique.
- US-5.4 : Les parents peuvent signaler le matin : nuit difficile, médicament donné à la maison, symptômes (formulaire court) — visible avant l'arrivée.

### M6 — Stocks et consommables
- US-6.1 : Par enfant : compteurs de consommables fournis par les parents (couches, lait, lingettes, crème, tenues de rechange). Décrément automatique : chaque événement « change » décrémente le stock de couches.
- US-6.2 : Seuil d'alerte par consommable (défaut : 8 couches) → notification au parent « pensez à ramener des couches » + bandeau côté assmat.
- US-6.3 : Le parent peut marquer « j'ai réapprovisionné » → l'assmat confirme la quantité en 1 tap.

### M7 — Menus de la semaine
- US-7.1 : Saisie des menus par semaine (midi/goûter), duplication d'une semaine précédente, bibliothèque de plats réutilisables.
- US-7.2 : Publication aux parents ; les allergies de chaque enfant croisées avec les tags allergènes du plat déclenchent un avertissement à la saisie.
- US-7.3 : Ne s'active que si le contrat prévoit que l'assmat fournit les repas (sinon module masqué pour ce contrat).

### M8 — Messagerie
- US-8.1 : Fil de discussion par famille (assmat ↔ parents d'un enfant). Pièces jointes images/PDF.
- US-8.2 : **Plages de silence** : l'assmat définit ses horaires de disponibilité ; hors plage, le parent peut écrire mais est informé que le message sera lu plus tard, et l'assmat ne reçoit pas de notification. Anti-charge mentale.
- US-8.3 : Messages structurés rapides côté parent : « absent demain », « en retard ce soir (+15/+30 min) », « RDV médecin à 16 h » → créent automatiquement l'événement correspondant (absence, ajustement planning) après confirmation de l'assmat.

### M9 — Paie et déclaration Pajemploi (cœur du produit)
- US-9.1 : À la création du contrat, calcul de la mensualisation (année complète / incomplète) avec simulateur interactif : l'assmat peut faire varier heures/semaines/taux devant les parents en entretien.
- US-9.2 : Chaque fin de mois : génération automatique du bulletin à partir des pointages + absences + CP du mois. **Chaque ligne est cliquable → formule, valeurs, référence réglementaire.**
- US-9.3 : Écran « Déclaration Pajemploi » : reprend champ par champ le formulaire Pajemploi (une déclaration **par enfant**, obligatoire depuis le 25/01/2026) avec les valeurs calculées et un bouton copier par champ : nombre d'heures normales (arrondi à l'entier), nombre de jours d'activité, nombre de jours de congés payés, heures complémentaires, heures majorées, salaire net total, indemnités d'entretien. Statut par mois : à déclarer / déclaré.
- US-9.4 : Vue parent : son bulletin, avec les mêmes explications ligne par ligne. Objectif : zéro litige « je ne comprends pas le montant ».
- US-9.5 (V1.1) : Régularisation de fin de contrat (année incomplète) : comparaison heures réellement effectuées vs heures payées via la mensualisation, calcul du solde, document récapitulatif.

### M10 — Congés payés et absences
- US-10.1 : Compteur de CP par contrat : acquisition, pris, solde, sur la période de référence (1er juin → 31 mai).
- US-10.2 : Pose de congés (assmat) et déclaration d'absences (enfant malade avec certificat, convenance des parents, jours fériés) avec qualification automatique de l'impact paie selon les règles du moteur (§6).
- US-10.3 : Année incomplète : calcul de la rémunération des CP selon la méthode la plus favorable (10 % vs maintien) et le mode de versement choisi au contrat.

### M11 — Impôts (V1.1)
- US-11.1 : Calcul de l'abattement fiscal spécifique assmat (basé sur les jours de garde réels et les heures) → montant à reporter sur la déclaration de revenus, avec explication.

### M12 — Mode MAM (V2)
- US-12.1 : Création d'une MAM (2 à 4 assmats), chacune gardant ses contrats propres.
- US-12.2 : Planning mural partagé : tous les enfants de la MAM, toutes les assmats, capacités individuelles contrôlées.
- US-12.3 : Délégation d'accueil : pour un créneau donné, l'enfant du contrat de l'assmat A est confié à l'assmat B. Préconditions bloquantes : clause de délégation dans le contrat, accord écrit de B annexé, capacité de B non dépassée. L'app génère les documents d'accord.
- US-12.4 : **Balance d'heures de délégation** entre assmats (les heures doivent se rendre sur le même mois) : compteur A↔B, alerte de déséquilibre en fin de mois.

---

## 5. Le moteur de calcul (spécification critique)

### 5.1 Principes d'architecture
- **Package TypeScript pur** (`packages/paie-engine`), zéro dépendance UI/DB. Fonctions pures : `(contrat, événements_du_mois, barèmes) → bulletin`.
- **Déterministe et testé** : suite de tests unitaires sur des cas dorés (exemples officiels Pajemploi, cas des guides CAF/Urssaf, cas limites). Objectif : aucun calcul n'est mergé sans test.
- **Explicable par construction** : la sortie n'est pas un montant mais un arbre de `CalculLine { code, label, montant, formule, inputs, ref }` où `ref` pointe vers une entrée du référentiel réglementaire (article CCN, page Pajemploi). L'UI ne fait que rendre cet arbre.
- **Barèmes en base, versionnés par date d'effet** (table `bareme_values`) : SMIC horaire, minimum garanti, taux de cotisations indicatif, seuils. Jamais de constante réglementaire en dur dans le code.
- **Règles versionnées** : chaque règle a un identifiant et une plage de validité (la réglementation bouge : réforme CMG sept. 2025, déclaration par enfant janv. 2026…). Un bulletin référence la version de règle utilisée.

### 5.2 Formules de référence (à implémenter avec tests)

**Mensualisation**
- Année complète (52 semaines) : `salaire_mensuel = taux_horaire × heures_par_semaine × 52 ÷ 12`
- Année incomplète (≤ 46 semaines programmées) : `salaire_mensuel = taux_horaire × heures_par_semaine × semaines_programmées ÷ 12`

**Champs Pajemploi mensuels (par enfant)**
- `jours_activité = (jours_accueil_par_semaine × semaines_programmées) ÷ 12`, moins les jours d'absence non rémunérés du mois ; les jours de CP n'en font pas partie.
- `heures_normales = heures mensualisées ± ajustements` (absences non rémunérées converties en heures déduites ; en année incomplète, rémunération des CP versée ce mois convertie en heures ajoutées), arrondi à l'entier le plus proche.
- `heures_complémentaires` : heures réalisées au-delà du contrat, jusqu'à 45 h/semaine.
- `heures_majorées` : au-delà de 45 h/semaine, au taux de majoration défini au contrat (paramètre, pas de taux légal imposé — à confirmer CCN à l'implémentation).
- `salaire_net_total = mensualisation + heures comp/majorées + absences rémunérées + CP versés (année incomplète) + primes éventuelles`.
- `indemnités_entretien` : cumul du mois, par jour de présence réelle. Minimum légal proportionnel à la durée d'accueil (référence : 90 % du minimum garanti pour 9 h, proratisé — valeurs exactes dans `bareme_values`, à vérifier à l'implémentation).
- `indemnités_repas` : selon contrat (uniquement si l'assmat fournit), montant libre par repas.

**Congés payés**
- Acquisition : 2,5 jours ouvrables par mois de travail effectif, période de référence du 1er juin au 31 mai.
- Année complète : CP inclus dans la mensualisation, jamais déclarés à Pajemploi.
- Année incomplète : rémunération des CP **en plus** du salaire mensualisé, méthode la plus favorable entre règle du 1/10e et maintien de salaire ; versement selon l'option du contrat (en une fois en juin / à la prise principale / au fur et à mesure de la prise) ; déclarés dans le champ « nombre de jours de congés payés » au moment du versement, et convertis en heures dans `heures_normales` (sauf mensualisation 52 semaines).

**Absences (qualification → impact paie)**
- Absence prévue au contrat (semaines non programmées en année incomplète) : aucun impact, déjà hors mensualisation.
- Absence enfant non prévue, convenance des parents : rémunérée (maintien).
- Absence enfant pour maladie avec certificat : retenue possible dans les limites CCN (plafond de jours/an à paramétrer — **valider la valeur CCN en vigueur à l'implémentation**).
- Absence assmat : non rémunérée (hors CP), avec retenue calculée.
- Jours fériés : règles spécifiques (1er mai chômé payé sous conditions, fériés ordinaires selon contrat) — encodées comme règles paramétrées avec `ref`.
- Chaque type d'absence est une règle distincte avec sa source ; l'UI propose la qualification, l'assmat confirme.

**Régularisation de fin de contrat (année incomplète, V1.1)**
- `solde = (heures réellement travaillées valorisées) − (heures payées via mensualisation)` sur toute la durée du contrat + CP restants dus + éventuelle indemnité de rupture. Document récapitulatif généré, partagé au parent avec les explications.

### 5.3 Ce que le moteur ne fait PAS
- Pas de calcul exact des cotisations (Pajemploi fait foi) : on affiche le net estimé avec mention « montant Pajemploi faisant foi ».
- Pas de conseil juridique : en cas de zone grise (ex. pose de jours isolés en année incomplète, sujet contesté chez les concurrents), l'app expose les interprétations possibles avec leurs sources et laisse le choix documenté à l'utilisatrice, au lieu d'imposer silencieusement une lecture.

---

## 6. Modèle de données (Supabase / Postgres)

> Conventions : `snake_case`, UUID v7 en PK, `created_at/updated_at` partout, soft delete (`deleted_at`) sur les données métier, RLS activée sur toutes les tables.

```sql
-- IDENTITÉ & TENANCY ------------------------------------------------------
-- auth.users (Supabase Auth)
profiles            (id PK = auth.users.id, role enum('assmat','parent'),
                     display_name, phone, locale, notif_prefs jsonb)
assmats             (id PK, profile_id FK unique, agrement_capacite int,
                     agrement_date_renouvellement date, adresse jsonb,
                     horaires_type jsonb, reglages_visibilite jsonb)
mams                (id PK, nom, adresse jsonb)                      -- V2
mam_members         (mam_id FK, assmat_id FK, role, PRIMARY KEY(mam_id, assmat_id))

-- ENFANTS -----------------------------------------------------------------
children            (id PK, assmat_id FK, prenom, nom, date_naissance,
                     photo_path, notes_privees text)
child_guardians     (id PK, child_id FK, profile_id FK nullable,  -- compte parent lié
                     nom, prenom, email, telephone, est_employeur bool,
                     personnes_autorisees jsonb)
child_health        (child_id PK/FK, allergies jsonb, regimes jsonb,
                     medecin jsonb, pai_document_path, vaccins jsonb)
authorizations      (id PK, child_id FK, type enum('sortie','transport','photo',
                     'medicament','autre'), niveau text, document_path,
                     signe_par FK profiles, signe_le timestamptz, actif bool)

-- CONTRATS ----------------------------------------------------------------
contracts           (id PK, assmat_id FK, child_id FK, employeur_guardian_id FK,
                     type enum('annee_complete','annee_incomplete'),
                     date_debut, date_fin nullable,
                     taux_horaire numeric, heures_par_semaine numeric,
                     semaines_programmees int,           -- 52 si année complète
                     jours_accueil_par_semaine numeric,
                     taux_majoration_pct numeric,        -- heures > 45h/sem
                     indemnite_entretien_jour numeric,
                     indemnite_repas numeric nullable, assmat_fournit_repas bool,
                     option_versement_cp enum('juin','prise_principale','au_fil'),
                     clause_delegation bool default false,        -- MAM V2
                     parent_peut_pointer bool default false,
                     statut enum('brouillon','actif','termine'))
contract_amendments (id PK, contract_id FK, date_effet, changements jsonb,
                     statut, document_path)                        -- V1.1
planned_schedules   (id PK, contract_id FK, jour_semaine int,
                     heure_debut time, heure_fin time)
schedule_exceptions (id PK, contract_id FK, date, type enum('absence_programmee',
                     'horaire_modifie','ferie'), heure_debut, heure_fin, note)

-- POINTAGE & JOURNAL ------------------------------------------------------
attendance_events   (id PK, contract_id FK, child_id FK, type enum('in','out'),
                     horodatage timestamptz default now(),  -- horodaté serveur
                     pointe_par FK profiles,
                     corrige bool default false, valeur_initiale timestamptz,
                     motif_correction text)
daily_log_entries   (id PK, child_id FK, assmat_id FK, date, heure,
                     type enum('repas','sieste','change','activite',
                     'humeur','note','arrivee_info'),
                     payload jsonb,            -- {quantite:'bien'} {duree_min:90} {selles:true}…
                     visible_parents bool)
daily_summaries     (id PK, child_id FK, date, contenu jsonb,
                     statut enum('genere','valide','envoye'), envoye_le)
photos              (id PK, child_id FK, storage_path, prise_le,
                     visibilite enum('privee_parents','groupe'), envoyee bool) -- V1.1

-- SANTÉ -------------------------------------------------------------------
medications         (id PK, child_id FK, nom, posologie text,
                     ordonnance_path NOT NULL, date_debut, date_fin, actif bool)
health_events       (id PK, child_id FK, type enum('fievre','medicament',
                     'symptome','incident'), heure timestamptz,
                     payload jsonb,            -- {temp:38.5} {medication_id, dose}
                     notifie_parent bool, lu_par_parent_le timestamptz)
                     -- append-only : pas d'UPDATE/DELETE (trigger + RLS)

-- STOCKS, MENUS -----------------------------------------------------------
supplies            (id PK, child_id FK, type enum('couches','lait','lingettes',
                     'creme','vetements','autre'), label, quantite int,
                     seuil_alerte int, unite)
supply_movements    (id PK, supply_id FK, delta int, source enum('change_auto',
                     'reappro_parent','ajustement'), confirme bool, note)
dishes              (id PK, assmat_id FK, nom, allergenes text[])
menus               (id PK, assmat_id FK, semaine date,  -- lundi de la semaine
                     entrees jsonb)            -- {lundi:{midi:[dish_id],gouter:[…]}}

-- MESSAGERIE --------------------------------------------------------------
threads             (id PK, assmat_id FK, child_id FK)
messages            (id PK, thread_id FK, auteur FK profiles, contenu text,
                     piece_jointe_path, type enum('libre','absence','retard',
                     'rdv','reappro'), payload jsonb, lu_le timestamptz)

-- PAIE --------------------------------------------------------------------
absences            (id PK, contract_id FK, date_debut, date_fin,
                     type enum('enfant_convenance','enfant_maladie_certificat',
                     'assmat_maladie','cp','sans_solde','ferie'),
                     certificat_path, qualification_confirmee bool)
leave_balances      (id PK, contract_id FK, periode_ref_debut date,
                     jours_acquis numeric, jours_pris numeric)
payslips            (id PK, contract_id FK, mois date, statut enum('brouillon',
                     'valide'), net_total numeric, engine_version text,
                     rule_set_version text)
payslip_lines       (id PK, payslip_id FK, code, label, montant numeric,
                     quantite numeric, taux numeric, formule text,
                     inputs jsonb, ref_reglementaire text, ordre int)
pajemploi_declarations (id PK, payslip_id FK, child_id FK, mois date,
                     heures_normales int, jours_activite numeric,
                     jours_cp numeric, heures_complementaires numeric,
                     heures_majorees numeric, salaire_net_total numeric,
                     indemnites_entretien numeric,
                     statut enum('a_declarer','declare'))

-- RÉFÉRENTIEL RÉGLEMENTAIRE -----------------------------------------------
bareme_values       (id PK, code text,         -- 'SMIC_HORAIRE','MINIMUM_GARANTI'…
                     valeur numeric, date_effet date, source_url text)
rule_definitions    (id PK, code text, version int, description,
                     ref_juridique text, date_effet, date_fin nullable,
                     params jsonb)

-- MAM V2 ------------------------------------------------------------------
delegations         (id PK, mam_id FK, contract_id FK,
                     assmat_delegante FK, assmat_delegataire FK,
                     date, heure_debut, heure_fin,
                     accord_document_path, statut)
delegation_balances (mam_id FK, assmat_a FK, assmat_b FK, mois date,
                     heures_a_vers_b numeric, heures_b_vers_a numeric)

audit_log           (id PK, table_name, record_id, action, acteur FK,
                     avant jsonb, apres jsonb, horodatage)
```

### Politiques RLS (principes)
- `assmat` : accès complet aux lignes dont `assmat_id` = son id (directement ou via jointure contrat/enfant).
- `parent` : SELECT uniquement sur les lignes liées à ses `child_guardians.profile_id`, et seulement si `visible_parents = true` (journal) / autorisations actives (photos). INSERT limité : `attendance_events` (si `parent_peut_pointer`), `messages`, `supply_movements(reappro_parent)`, formulaire « infos du matin ».
- `health_events` : append-only pour tous (pas d'UPDATE/DELETE via policy + trigger).
- Toute logique d'écriture sensible (génération bulletin, correction pointage) passe par des fonctions RPC `security definer` qui journalisent dans `audit_log`.

---

## 7. Architecture technique

### 7.1 Monorepo
```
nido/
├── apps/
│   └── web/                  # Next.js App Router — PWA unique (assmat + parent)
├── packages/
│   ├── paie-engine/          # Moteur de calcul pur, testé (vitest)
│   ├── db/                   # Schéma SQL, migrations, types générés Supabase
│   ├── ui/                   # Composants partagés (design system)
│   └── config/               # eslint, tsconfig partagés
├── turbo.json                # Turborepo + pnpm
└── CLAUDE.md
```

### 7.2 Choix structurants
- **Une seule app PWA** servant les deux rôles (routing par rôle après auth), installable sur l'écran d'accueil. Pas d'app stores en V1.
- **Supabase** : Auth (magic link email + OTP SMS pour les parents — friction minimale), Postgres + RLS (la sécurité EST le modèle de données), Storage (photos, ordonnances, PDF — buckets privés, URLs signées), Realtime (timeline parent en direct, vue « ma journée »).
- **Accès données** : client Supabase + RLS pour les lectures simples ; Server Actions / RPC Postgres pour toute écriture métier (bulletins, corrections, délégations).
- **Pointage et journal tolérants au réseau** : file d'attente locale (IndexedDB) avec resynchronisation — une assmat en promenade n'a pas toujours du réseau. L'horodatage device est conservé comme métadonnée, l'horodatage serveur fait foi avec écart affiché s'il dépasse 5 min.
- **Notifications** : Web Push (assmat + parents) + fallback email (Resend). Respect strict des plages de silence.
- **Hébergement** : Vercel pour démarrer (simplicité Next.js) ; portage Cloudflare (OpenNext) possible plus tard — ne rien coupler à Vercel.
- **Mobile-first radical** : tout le quotidien (M3–M8) doit être utilisable à une main, gros boutons, saisie ≤ 10 s. Le bureau ne sert que pour l'administratif (M2, M9, M10).

### 7.3 RGPD et sécurité (non négociable — données de mineurs)
- Hébergement données en UE (région Supabase eu-central / eu-west).
- Minimisation : aucune donnée santé au-delà du nécessaire opérationnel ; pas de NIR/numéro de sécu.
- Photos : bucket privé, URLs signées courtes, autorisation parentale obligatoire en base (contrainte, pas juste UI), pas de photo de groupe partagée si un seul enfant du cadre n'a pas l'autorisation « groupe ».
- Droit d'accès/effacement : export JSON+fichiers par enfant, purge à la fin du contrat après délai légal de conservation des documents de paie (les bulletins/déclarations sont conservés, le journal/photos sont purgés ou rendus au parent).
- Journalisation des accès aux données santé (`audit_log`).
- Registre des traitements + mentions/CGU : à rédiger avant mise en production (hors scope Claude Code).

---

## 8. Principes UX

1. **La règle des 10 secondes** : tout événement du quotidien (change, repas, sieste, pointage) se saisit en ≤ 10 s, une main, depuis l'écran « Ma journée ».
2. **« Ma journée » est le hub** : enfants présents, prochains arrivées/départs, alertes (capacité, stock couches, fièvre non lue), accès 1-tap à la saisie.
3. **Le récap du soir remplace le carnet** : généré automatiquement, validé en un écran au moment du départ de chaque enfant.
4. **La paie se lit comme une facture détaillée** : chaque ligne dépliable → formule → source. Le parent voit exactement la même chose que l'assmat.
5. **Jamais de jargon réglementaire sans explication** : tooltip systématique (mensualisation, année incomplète, heures majorées…).
6. **L'assmat contrôle, le parent participe** : tout accès parent est un privilège accordé contrat par contrat, révocable.

---

## 9. Plan d'implémentation pour Claude Code

> Chaque lot = une PR/branche, avec tests, migration SQL, et critères de done. Ne pas commencer un lot avant validation du précédent.

- **Lot 0 — Socle** : monorepo Turborepo/pnpm, Next.js App Router, Supabase local (CLI), CI (lint, typecheck, tests), `packages/db` avec migrations initiales (profiles, assmats), auth magic link, layout PWA (manifest, service worker minimal).
- **Lot 1 — Référentiel & moteur de paie** : `bareme_values`, `rule_definitions`, `packages/paie-engine` complet (mensualisation AC/AI, heures comp/majorées, CP, indemnités, champs Pajemploi) avec **suite de tests dorés en fixtures JSON** (cas des guides Pajemploi + cas limites). C'est le lot le plus important : le faire en premier, sans UI, valide les fondations.
- **Lot 2 — Enfants & contrats** : CRUD enfants, tuteurs, autorisations, contrats avec simulateur de mensualisation (branché sur le moteur), planning prévisionnel. RLS complète + tests de policies.
- **Lot 3 — Pointage & journal** : attendance, file offline, écran « Ma journée », saisie rapide des événements, contrôle de capacité d'agrément, récap du soir.
- **Lot 4 — Paie mensuelle** : génération du bulletin depuis les pointages/absences, fiche expliquée (rendu de l'arbre de calcul), écran déclaration Pajemploi champ par champ avec copie, statuts mensuels.
- **Lot 5 — Espace parent** : invitation par l'assmat (lien), onboarding parent, timeline enfant, pointage parent (si activé), bulletin expliqué côté parent, messagerie + messages structurés + plages de silence.
- **Lot 6 — Santé, stocks, menus** : modules M5, M6, M7 avec leurs contraintes (ordonnance obligatoire, décrément auto des couches, croisement allergènes).
- **Lot 7 — Finitions V1.1** : photos sécurisées, avenants, régularisation fin de contrat, abattement fiscal, push notifications.
- **Lot 8 — MAM (V2)** : mams, planning partagé, délégation avec préconditions, balance d'heures, documents d'accord.

### Conventions pour CLAUDE.md (à créer au Lot 0)
- Toute valeur réglementaire vient de `bareme_values`/`rule_definitions` — interdiction de constante réglementaire en dur.
- Tout calcul de paie passe par `paie-engine` — interdiction de calcul monétaire dans l'UI ou les routes.
- Toute table a sa policy RLS + un test de policy (accès parent interdit hors périmètre).
- Migrations SQL uniquement via fichiers versionnés (`supabase/migrations`), jamais de modification manuelle.
- Texte UI en français, vouvoiement, ton chaleureux et simple (utilisatrices non techniques).

---

## 10. Points à vérifier à l'implémentation (réglementaire mouvant)

| # | Point | Pourquoi |
|---|---|---|
| 1 | Valeurs 2026 : SMIC horaire, minimum garanti, minimum conventionnel assmat, plancher indemnité d'entretien | Alimentent `bareme_values` ; évoluent chaque année |
| 2 | Modalités exactes CCN : retenue pour maladie de l'enfant (plafond jours/an), jours fériés, taux/règles heures majorées | Règles paramétrées du moteur |
| 3 | Pose de jours de CP isolés en année incomplète | Zone grise contestée chez les concurrents → implémenter en « choix documenté » |
| 4 | Réforme CMG sept. 2025 (calcul lissé, disparition du plafond journalier) | Pour le simulateur parent V2 |
| 5 | Déclaration Pajemploi par enfant (en vigueur depuis le 25/01/2026) | Déjà intégré au modèle — vérifier le format exact des champs à date |
| 6 | Conservation légale des documents de paie / durée | Politique de purge RGPD |
| 7 | Validation terrain par une assmat en exercice (relecture de ce document, 30 min) | Assurance qualité la moins chère du projet |

---

## 11. Mesure du succès (V1)

- Une assmat boucle sa fin de mois (bulletin + déclaration Pajemploi recopiée) en **moins de 10 minutes par contrat**.
- Zéro écart entre le tableau Nido et ce que Pajemploi accepte (validé sur 3 mois réels).
- Le récap du soir est envoyé pour ≥ 80 % des journées de présence (preuve que la saisie quotidienne ne pèse pas).
- Un parent invité active son compte en < 2 minutes depuis le lien.
