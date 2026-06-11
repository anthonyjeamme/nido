-- Lot 1 — Seed des règles CCN IDCC 3239 (15/03/2021, en vigueur depuis le 01/01/2022)
-- Sources triplement recoupées : Légifrance, service-public.fr, texte conventionnel.
-- Chaque règle est paramétrée (params jsonb) : le moteur lit les paramètres ici,
-- jamais de constante en dur.

insert into public.rule_definitions (code, version, description, ref_juridique, source_url, date_effet, params) values

('HEURES_COMP_MAJOREES', 1,
 'Heures au-delà du contrat jusqu''à 45 h/sem incluses : complémentaires, taux de base sans majoration obligatoire. Au-delà de 45 h/sem : majorées, taux fixé au contrat avec plancher de 10 %. Durée max 48 h/sem en moyenne sur 4 mois.',
 'CCN IDCC 3239, socle assistant maternel, art. 96.4, 110.1, 110.2',
 'https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000044594539',
 '2022-01-01',
 '{"seuil_majoration_hebdo": 45, "plancher_majoration_pct": 10, "duree_max_hebdo_moyenne": 48, "periode_moyenne_mois": 4}'),

('ABSENCE_ENFANT_MALADIE', 1,
 'Absence de l''enfant pour maladie/accident justifiée par certificat médical (remis au plus tard au retour) : non rémunérée dans la limite de 5 jours d''absence (pas nécessairement consécutifs) par période de 12 mois glissants, ou 14 jours calendaires consécutifs (maladie ou hospitalisation). Au-delà de 14 jours consécutifs : reprise du paiement ou rupture. ⚠ L''ancien plafond de 10 jours (CCN 2004) est caduc.',
 'CCN IDCC 3239, socle assistant maternel, art. 105',
 'https://www.legifrance.gouv.fr/conv_coll/article/KALIARTI000043942276',
 '2022-01-01',
 '{"plafond_jours_par_12_mois": 5, "plafond_jours_consecutifs": 14, "justificatif": "certificat_medical_ou_hospitalisation"}'),

('JOUR_FERIE_1ER_MAI', 1,
 '1er mai : chômé et payé s''il tombe un jour habituel de travail (aucune réduction de rémunération, assimilé à du travail effectif pour CP et ancienneté). S''il est travaillé (accord des parties) : rémunération majorée de 100 %.',
 'CCN IDCC 3239, socle commun, art. 47.1',
 'https://www.legifrance.gouv.fr/conv_coll/article/KALIARTI000043942116',
 '2022-01-01',
 '{"majoration_si_travaille_pct": 100, "chome_paye_si_jour_habituel": true}'),

('JOUR_FERIE_ORDINAIRE', 1,
 'Férié ordinaire chômé tombant un jour habituellement travaillé : maintien de la rémunération si la salariée a travaillé le dernier jour précédant ET le premier jour suivant le férié (sauf absence autorisée). Aucune condition d''ancienneté. Férié travaillé : doit être prévu au contrat écrit (sinon accord écrit, refus possible), majoration de 10 %.',
 'CCN IDCC 3239, socle commun, art. 47.2',
 'https://www.legifrance.gouv.fr/conv_coll/article/KALIARTI000043942117',
 '2022-01-01',
 '{"majoration_si_travaille_pct": 10, "condition_encadrement": true, "condition_anciennete": false}'),

('CP_ACQUISITION', 1,
 'Acquisition : 2,5 jours ouvrables par mois (ou période de 4 semaines) de travail, plafonné à 30 jours ouvrables. Période de référence du 1er juin au 31 mai.',
 'CCN IDCC 3239, socle commun, art. 48',
 'https://www.service-public.gouv.fr/particuliers/vosdroits/F31655',
 '2022-01-01',
 '{"jours_par_mois": 2.5, "plafond_jours": 30, "periode_reference_debut": "06-01", "periode_reference_fin": "05-31"}'),

('CP_REMUNERATION_AI', 1,
 'Année incomplète (≤ 46 semaines) : la mensualisation n''inclut pas les CP, rémunérés EN SUS. Comparaison 1/10e de la rémunération totale de la période de référence vs maintien de salaire : le plus favorable. Versement selon 3 options exclusives fixées au contrat : en une fois en juin, à la prise principale, ou au fur et à mesure de la prise. Toute autre modalité (ex. 1/12e mensuel de l''ancienne CCN 2004) est proscrite.',
 'CCN IDCC 3239, socle commun art. 48.1.1.5 ; socle assistant maternel art. 102.1.2.2',
 'https://www.legifrance.gouv.fr/conv_coll/article/KALIARTI000043942125',
 '2022-01-01',
 '{"methodes": ["dixieme", "maintien"], "choix": "plus_favorable", "options_versement": ["juin", "prise_principale", "au_fil"], "option_douzieme_proscrite": true}'),

('MENSUALISATION', 1,
 'Salaire mensualisé sur 12 mois. Année complète (52 sem.) : heures/sem × 52 ÷ 12 × taux horaire, CP inclus. Année incomplète (46 sem. ou moins) : heures/sem × semaines programmées ÷ 12 × taux horaire, CP en sus. Accueil occasionnel : pas de mensualisation. ⚠ Vide conventionnel entre 47 et 51 semaines : à traiter en choix documenté.',
 'CCN IDCC 3239, socle assistant maternel, art. 109.1, 109.2, 109.3',
 'https://www.legifrance.gouv.fr/conv_coll/article/KALIARTI000043942290',
 '2022-01-01',
 '{"seuil_annee_incomplete_semaines": 46, "zone_grise_semaines": [47, 51]}'),

('DECLARATION_PAJEMPLOI_PAR_ENFANT', 1,
 'Depuis la période d''emploi de janvier 2026 (service ouvert le 25/01/2026) : une déclaration par enfant. Champs : heures normales (arrondi à l''entier le plus proche, ex. 138,66 → 139), jours d''activité (arrondi toujours à l''entier supérieur), jours de congés payés (année incomplète uniquement, au moment du versement), heures complémentaires, heures majorées, salaire net total, indemnités d''entretien.',
 'Règle de gestion Urssaf/Pajemploi (pas un article CCN)',
 'https://www.urssaf.fr/accueil/actualites/pajemploi-declaration-par-enfant.html',
 '2026-01-25',
 '{"arrondi_heures_normales": "entier_le_plus_proche", "arrondi_jours_activite": "entier_superieur", "jours_cp_seulement_annee_incomplete": true}'),

('REGUL_FIN_CONTRAT', 1,
 'Année incomplète : régularisation prévisionnelle chaque année à la date anniversaire (salaires mensualisés versés vs salaires dus au titre des heures réellement effectuées). En cours de contrat, les régularisations se compensent sans règlement ; à la rupture, les sommes restant dues sont déclarées et réglées. ⚠ Le trop-versé employeur n''est pas récupérable (interprétation dominante, contestée).',
 'CCN IDCC 3239, socle assistant maternel, art. 109.2 ; art. 56 (documents de fin de contrat)',
 'https://www.legifrance.gouv.fr/conv_coll/article/KALIARTI000043942290',
 '2022-01-01',
 '{"frequence": "date_anniversaire", "reglement": "a_la_rupture_uniquement", "trop_verse_recuperable": false}'),

('INDEMNITE_RUPTURE', 1,
 'Retrait de l''enfant (rupture employeur) avec au moins 9 mois d''accueil : indemnité = 1/80e du total des salaires bruts perçus pendant le contrat. Exclusions : faute grave/lourde, rupture liée à l''agrément. N''a pas le caractère de salaire (exonérée de cotisations). Aucune indemnité en cas de démission.',
 'CCN IDCC 3239, socle assistant maternel, art. 121.1',
 'https://www.service-public.gouv.fr/particuliers/vosdroits/F16842',
 '2022-01-01',
 '{"fraction": 0.0125, "anciennete_min_mois": 9, "exclusions": ["faute_grave", "faute_lourde", "agrement"]}');

-- Valeurs complémentaires découvertes pendant la recherche des règles --------
insert into public.bareme_values (code, valeur, date_effet, source_url, notes) values
('MAJORATION_HEURES_PLANCHER_PCT', 10, '2022-01-01',
 'https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000044594539',
 'CCN 3239 art. 110.1 : le taux de majoration des heures > 45 h/sem est fixé au contrat, sans pouvoir être inférieur à 10 %'),
('ASSMAT_MIN_CONV_NET_HORAIRE', 2.74, '2025-01-01',
 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-baremes-assistant-maternel.html',
 'Équivalent net métropole du minimum conventionnel (3,50 € brut)'),
('ASSMAT_MIN_CONV_NET_HORAIRE', 2.86, '2025-04-01',
 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-baremes-assistant-maternel.html',
 'Équivalent net métropole (3,64 € brut)'),
('ASSMAT_MIN_CONV_NET_HORAIRE', 3.28, '2026-06-01',
 'https://www.urssaf.fr/accueil/actualites/particuliers-evolutions-minimas.html',
 'Équivalent net métropole (4,20 € brut, avenant n° 10)');
