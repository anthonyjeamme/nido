-- Lot 1 — Seed des barèmes (valeurs vérifiées sur sources officielles, juin 2026).
-- Chaque valeur est versionnée par date d'effet ; la valeur applicable à une
-- date est la plus récente parmi celles antérieures ou égales.
-- ⚠ 2026 comporte une DOUBLE bascule : 01/01 (décret SMIC/MG) et 01/06
-- (arrêté inflation + avenant n°10 CCN 3239 : minimum conventionnel +15 %).

insert into public.bareme_values (code, valeur, date_effet, source_url, notes) values

-- SMIC horaire brut --------------------------------------------------------
('SMIC_HORAIRE_BRUT', 11.88, '2024-11-01',
 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/montant-smic.html',
 'Décret n° 2024-951 du 23/10/2024, inchangé au 01/01/2025'),
('SMIC_HORAIRE_BRUT', 12.02, '2026-01-01',
 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053042520',
 'Décret n° 2025-1228 du 17/12/2025 (+1,18 %)'),
('SMIC_HORAIRE_BRUT', 12.31, '2026-06-01',
 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054126589',
 'Arrêté du 22/05/2026 — revalorisation automatique inflation (+2,41 %)'),

-- Minimum garanti (base de l''indemnité d''entretien) ------------------------
('MINIMUM_GARANTI', 4.22, '2024-11-01',
 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-baremes-assistant-maternel.html',
 'Décret n° 2024-951'),
('MINIMUM_GARANTI', 4.25, '2026-01-01',
 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053042520',
 'Décret n° 2025-1228 — art. L3231-12 c. trav.'),
('MINIMUM_GARANTI', 4.35, '2026-06-01',
 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054126589',
 'Arrêté du 22/05/2026'),

-- Salaire horaire minimum conventionnel assmat (brut, par enfant) -----------
('ASSMAT_MIN_CONV_BRUT_HORAIRE', 3.50, '2025-01-01',
 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-baremes-assistant-maternel.html',
 'CCN 3239 annexe 5 — net Urssaf : 2,74 € métropole'),
('ASSMAT_MIN_CONV_BRUT_HORAIRE', 3.64, '2025-04-01',
 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-baremes-assistant-maternel.html',
 'Net Urssaf : 2,86 € métropole, 2,81 € Alsace-Moselle'),
('ASSMAT_MIN_CONV_BRUT_HORAIRE', 4.20, '2026-06-01',
 'https://www.urssaf.fr/accueil/actualites/particuliers-evolutions-minimas.html',
 'Avenant n° 10 du 05/02/2026 à l''annexe 5 CCN 3239, étendu (JO 08/05/2026), +15 % — net Urssaf : 3,28 € métropole'),
('ASSMAT_MIN_CONV_TITRE_BRUT_HORAIRE', 4.37, '2026-06-01',
 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-baremes-assistant-maternel.html',
 'Majoration 4 % titre « Assistant maternel – garde d''enfants » — net : 3,41 € métropole'),

-- Minimum légal (part du SMIC par heure d''accueil, art. D423-9 CASF) --------
('ASSMAT_MIN_LEGAL_PART_SMIC', 0.281, '2019-01-01',
 'https://www.service-public.gouv.fr/particuliers/vosdroits/F12812',
 'Minimum légal = 0,281 × SMIC horaire brut par heure d''accueil et par enfant (le plus favorable avec le conventionnel s''applique)'),

-- Indemnité d''entretien -----------------------------------------------------
('INDEMNITE_ENTRETIEN_MIN_9H', 3.80, '2024-11-01',
 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-baremes-assistant-maternel.html',
 '90 % du minimum garanti pour 9 h d''accueil, proratisable (art. D423-7 CASF)'),
('INDEMNITE_ENTRETIEN_MIN_9H', 3.83, '2026-01-01',
 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-baremes-assistant-maternel.html',
 '= 90 % × 4,25'),
('INDEMNITE_ENTRETIEN_MIN_9H', 3.92, '2026-06-01',
 'https://www.service-public.gouv.fr/particuliers/vosdroits/F12812',
 '= 90 % × 4,35'),
('INDEMNITE_ENTRETIEN_PLANCHER_JOUR', 2.65, '2022-01-01',
 'https://www.service-public.gouv.fr/particuliers/vosdroits/F12812',
 'Plancher conventionnel fixe (CCN 3239) non indexé : l''indemnité ne descend jamais sous 2,65 €/jour. Minimum dû = max(0,9 × MG ÷ 9 × heures, 2,65)'),

-- Cotisations salariales (conversion brut → net, indicatif) ------------------
('COTIS_SALARIALES_METROPOLE_PCT', 21.86, '2026-01-01',
 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-baremes-assistant-maternel.html',
 'Net ≈ 78,1 % du brut. Indicatif : Pajemploi fait foi. CSG/CRDS assises sur 98,25 % du brut'),
('COTIS_SALARIALES_ALSACE_MOSELLE_PCT', 23.16, '2026-01-01',
 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-baremes-assistant-maternel.html',
 'Métropole + 1,30 % maladie (Haut-Rhin, Bas-Rhin, Moselle)'),

-- CMG (réforme du 01/09/2025 : plafond horaire non excluant) -----------------
('CMG_PLAFOND_HORAIRE_ASSMAT', 8.00, '2025-09-01',
 'https://www.urssaf.fr/accueil/actualites/evolution-cmg-ce-qui-va-changer.html',
 'Réforme CMG : l''ancien plafond excluant « 5 SMIC/jour » est supprimé ; ce plafond écrête seulement le calcul'),
('CMG_PLAFOND_HORAIRE_ASSMAT', 8.09, '2026-04-01',
 'https://www.urssaf.fr/accueil/actualites/evolution-cmg-ce-qui-va-changer.html',
 'Barème avril 2026'),

-- Seuils du moteur de paie ---------------------------------------------------
('SEUIL_HEURES_MAJOREES_SEMAINE', 45, '2022-01-01',
 'https://www.pajemploi.urssaf.fr/pajewebinfo/cms/sites/pajewebinfo/accueil/assistante-maternelle-agreee/je-suis-remuneree-et-declaree/la-remuneration.html',
 'CCN 3239 : heures au-delà du contrat jusqu''à 45 h/sem = complémentaires ; au-delà de 45 h = majorées (taux libre au contrat)');
