/**
 * Smoke test e2e de Nido (HTTP, sans navigateur).
 * Parcourt : connexion magic link → enfant → contrat → activation →
 * pointage in/out (REST, comme le client) → repas → récap du soir.
 *
 * Prérequis : `supabase start` + `pnpm dev` (port 3001) + Mailpit (54324).
 * Usage : node scripts/e2e-smoke.mjs
 */

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3001";
const MAILPIT = "http://127.0.0.1:54324";
const SUPABASE_URL = "http://127.0.0.1:54321";
const APIKEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const EMAIL = `e2e.${Date.now()}@nido.fr`;

const jar = new Map();

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function absorbeCookies(response) {
  for (const sc of response.headers.getSetCookie?.() ?? []) {
    const [paire] = sc.split(";");
    const i = paire.indexOf("=");
    const nom = paire.slice(0, i).trim();
    const valeur = paire.slice(i + 1).trim();
    if (valeur === "" || /expires=Thu, 01 Jan 1970/i.test(sc)) jar.delete(nom);
    else jar.set(nom, valeur);
  }
}

async function GET(url) {
  const r = await fetch(url, {
    headers: { cookie: cookieHeader() },
    redirect: "manual",
  });
  absorbeCookies(r);
  return r;
}

/** Texte HTML sans les commentaires insérés par React entre les nœuds. */
async function texte(response) {
  return (await response.text()).replaceAll(/<!--.*?-->/g, "");
}

/** Poste le formulaire de `pageUrl` contenant `marqueur` (progressive enhancement). */
async function postForm(pageUrl, marqueur, champs, posteUrl = pageUrl) {
  const page = await GET(pageUrl);
  const html = await page.text();
  const forms = html.match(/<form[\s\S]*?<\/form>/g) ?? [];
  const form = forms.find((f) => f.includes(marqueur));
  if (!form) throw new Error(`Formulaire « ${marqueur} » introuvable sur ${pageUrl}`);
  const actionId = form.match(/\$ACTION_ID_[a-f0-9]+/)?.[0];
  if (!actionId) throw new Error(`ACTION_ID introuvable dans le formulaire « ${marqueur} »`);

  const fd = new FormData();
  fd.set(actionId, "");
  // Reprend les champs cachés du formulaire (comme un navigateur).
  for (const input of form.match(/<input[^>]*type="hidden"[^>]*>/g) ?? []) {
    const nom = input.match(/name="([^"]+)"/)?.[1];
    const valeur = input.match(/value="([^"]*)"/)?.[1] ?? "";
    if (nom && !nom.startsWith("$ACTION")) fd.set(nom, valeur);
  }
  for (const [k, v] of Object.entries(champs)) fd.set(k, v);

  const r = await fetch(posteUrl, {
    method: "POST",
    headers: { cookie: cookieHeader(), origin: BASE },
    body: fd,
    redirect: "manual",
  });
  absorbeCookies(r);
  return { status: r.status, location: r.headers.get("location") ?? "" };
}

function tokenDepuisJar() {
  const morceaux = [...jar.entries()]
    .filter(([k]) => /^sb-.*auth-token(\.\d+)?$/.test(k))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
    .join("");
  const brut = decodeURIComponent(morceaux);
  const json = JSON.parse(
    Buffer.from(brut.replace(/^base64-/, ""), "base64").toString("utf8"),
  );
  return { token: json.access_token, userId: json.user.id };
}

let echecs = 0;
function verifie(nom, condition) {
  console.log(`${condition ? "✓" : "✗"} ${nom}`);
  if (!condition) echecs++;
}

// ---------------------------------------------------------------------------
// 1. Connexion magic link
const envoi = await postForm(`${BASE}/login`, 'name="email"', { email: EMAIL });
verifie("envoi du lien magique", envoi.location.includes("envoye=1"));

await new Promise((r) => setTimeout(r, 2000));
const messages = await (await fetch(`${MAILPIT}/api/v1/messages`)).json();
const message = await (
  await fetch(`${MAILPIT}/api/v1/message/${messages.messages[0].ID}`)
).json();
const lien = message.HTML.match(/href="([^"]*token_hash[^"]*)"/)[1]
  .replaceAll("&amp;", "&")
  .replace("localhost:3000", new URL(BASE).host);
const confirm = await GET(lien);
verifie("clic sur le lien magique", confirm.status === 307);
const home = await GET(`${BASE}/`);
verifie("connecté sur Ma journée", (await texte(home)).includes("Bonjour"));

// 2. Enfant
const enfant = await postForm(`${BASE}/enfants/nouveau`, 'name="prenom"', {
  prenom: "Léa",
  nom: "Martin",
  date_naissance: "2024-05-12",
  tuteur_prenom: "Marc",
  tuteur_nom: "Martin",
  tuteur_email: "marc@test.fr",
});
verifie("création de l'enfant", /^\/enfants\/[0-9a-f-]+$/.test(enfant.location));
const childId = enfant.location.split("/").pop();
const fiche = await texte(await GET(`${BASE}${enfant.location}`));
verifie("fiche : prénom accentué intact", fiche.includes("Léa"));
verifie("fiche : tuteur employeur", fiche.includes("Marc") && fiche.includes("employeur"));

// 3. Contrat (formulaire simulateur)
const contrat = await postForm(`${BASE}/contrats/nouveau`, 'name="child_id"', {
  child_id: childId,
  type: "annee_incomplete",
  taux_horaire: "4.2",
  heures_par_semaine: "36",
  semaines_programmees: "44",
  jours_accueil_par_semaine: "4",
  taux_majoration_pct: "12",
  indemnite_entretien_jour: "4.6",
  date_debut: "2026-09-01",
  option_versement_cp: "au_fil",
  parent_peut_pointer: "on",
});
verifie("création du contrat", /^\/contrats\/[0-9a-f-]+$/.test(contrat.location));
const contractId = contrat.location.split("/").pop();

// 4. Activation
const activation = await postForm(
  `${BASE}/contrats/${contractId}`,
  ">Activer<",
  { contract_id: contractId },
);
verifie("activation du contrat", activation.status === 303);

// 5. Ma journée affiche l'enfant
const journee = await texte(await GET(`${BASE}/`));
verifie("Ma journée : Léa visible", journee.includes("Léa"));
verifie("Ma journée : compteur 0 présent", journee.includes("0/1"));

// 6. Pointage arrivée via REST (RLS + trigger horodatage serveur)
const { token, userId } = tokenDepuisJar();
const restHeaders = {
  apikey: APIKEY,
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
  prefer: "return=representation",
};
const rIn = await fetch(`${SUPABASE_URL}/rest/v1/attendance_events`, {
  method: "POST",
  headers: restHeaders,
  body: JSON.stringify({
    contract_id: contractId,
    child_id: childId,
    type: "in",
    pointe_par: userId,
    horodatage: "2020-01-01T00:00:00Z", // doit être écrasé par le serveur
  }),
});
const [pointageIn] = await rIn.json();
verifie("pointage arrivée accepté", rIn.status === 201);
verifie(
  "horodatage serveur imposé",
  pointageIn && !pointageIn.horodatage.startsWith("2020"),
);

const presente = await texte(await GET(`${BASE}/`));
verifie("compteur 1/1 présent", presente.includes("1/1"));
verifie("saisie rapide visible", presente.includes("Repas"));

// 7. Repas via formulaire de saisie rapide
const repas = await postForm(`${BASE}/`, 'value="repas"', {
  child_id: childId,
  type: "repas",
  quantite: "bien",
});
// Pas de redirect après la saisie rapide (revalidation sur place) : 200 attendu.
verifie("repas enregistré", repas.status === 200 || repas.status === 303);

// 8. Pointage départ
await fetch(`${SUPABASE_URL}/rest/v1/attendance_events`, {
  method: "POST",
  headers: restHeaders,
  body: JSON.stringify({
    contract_id: contractId,
    child_id: childId,
    type: "out",
    pointe_par: userId,
  }),
});
const apresDepart = await texte(await GET(`${BASE}/`));
verifie("récap du soir proposé", apresDepart.includes("récap du soir"));

// 9. Récap : génération, lecture, envoi
const dateJour = new Date().toISOString().slice(0, 10);
const generation = await postForm(`${BASE}/`, "récap du soir", {
  child_id: childId,
  date: dateJour,
});
verifie("génération du récap", generation.location.startsWith(`/recap/${childId}`));
const pageRecap = await texte(await GET(`${BASE}${generation.location}`));
verifie("récap : repas présent", pageRecap.includes("bien mangé"));

const envoi2 = await postForm(
  `${BASE}${generation.location}`,
  'name="mot_du_jour"',
  { child_id: childId, date: dateJour, mot_du_jour: "Très belle journée !" },
);
verifie("envoi du récap", envoi2.status === 303);
const final = await texte(await GET(`${BASE}/`));
verifie("Ma journée : récap envoyé", final.includes("Récap du soir envoyé"));

// ---------------------------------------------------------------------------
// 10. Paie : génération du bulletin du mois courant
const moisCourant = dateJour.slice(0, 7);
const pagePaie = await texte(await GET(`${BASE}/paie`));
verifie("page Paie : contrat listé", pagePaie.includes("Léa"));

const generationBulletin = await postForm(`${BASE}/paie`, `value="${moisCourant}"`, {
  contract_id: contractId,
  mois: moisCourant,
});
verifie(
  "génération du bulletin",
  generationBulletin.location === `/paie/${contractId}/${moisCourant}`,
);

const pageBulletin = await texte(
  await GET(`${BASE}/paie/${contractId}/${moisCourant}`),
);
// Mensualisation : 4,20 × 36 × 44 ÷ 12 = 554,40 €
verifie("bulletin : mensualisation 554,40 €", pageBulletin.includes("554,40"));
verifie("bulletin : ligne expliquée (formule)", pageBulletin.includes("semaines_programmées"));
verifie("déclaration : heures normales 132", pageBulletin.includes(">132<"));
verifie("déclaration : jours d'activité 15", pageBulletin.includes(">15<"));

// 11. Validation puis marquage « déclaré »
const validation = await postForm(
  `${BASE}/paie/${contractId}/${moisCourant}`,
  'name="payslip_id"',
  {},
  `${BASE}/paie/${contractId}/${moisCourant}`,
);
verifie("validation du bulletin", validation.status === 303);

const apresValidation = await texte(
  await GET(`${BASE}/paie/${contractId}/${moisCourant}`),
);
verifie("bulletin validé", apresValidation.includes("validé"));

const declaration = await postForm(
  `${BASE}/paie/${contractId}/${moisCourant}`,
  'name="declaration_id"',
  {},
);
verifie("marquage déclaré", declaration.status === 303);
const apresDeclaration = await texte(
  await GET(`${BASE}/paie/${contractId}/${moisCourant}`),
);
verifie("statut Déclaré ✓", apresDeclaration.includes("Déclaré ✓"));

// ---------------------------------------------------------------------------
// 12. Espace parent : invitation, timeline, pointage parent, messagerie
const ficheAvecInvitation = await texte(await GET(`${BASE}/enfants/${childId}`));
const tokenInvitation = ficheAvecInvitation.match(/\/invitation\/([0-9a-f-]+)/)?.[1];
verifie("lien d'invitation affiché sur la fiche", Boolean(tokenInvitation));

// L'assmat ouvre sa messagerie (crée le fil de discussion)
await GET(`${BASE}/messages`);

// --- Session parent (jar séparé)
const jarAssmat = new Map(jar);
jar.clear();

const emailParent = `parent.${Date.now()}@nido.fr`;
await postForm(`${BASE}/login?next=/invitation/${tokenInvitation}`, 'name="email"', {
  email: emailParent,
  next: `/invitation/${tokenInvitation}`,
});
await new Promise((r) => setTimeout(r, 2000));
const messagesParent = await (await fetch(`${MAILPIT}/api/v1/messages`)).json();
const mailParent = await (
  await fetch(`${MAILPIT}/api/v1/message/${messagesParent.messages[0].ID}`)
).json();
const lienParent = mailParent.HTML.match(/href="([^"]*token_hash[^"]*)"/)[1]
  .replaceAll("&amp;", "&")
  .replace("localhost:3000", new URL(BASE).host);
const confirmParent = await GET(lienParent);
const versInvitation = confirmParent.headers.get("location") ?? "";
verifie(
  "connexion parent redirige vers l'invitation",
  versInvitation.startsWith("/invitation/"),
);
const pageInvitation = await GET(`${BASE}${versInvitation}`);
verifie(
  "invitation acceptée → espace parent",
  pageInvitation.headers.get("location") === "/parent",
);

const espaceParent = await texte(await GET(`${BASE}/parent`));
verifie("espace parent : Léa visible", espaceParent.includes("Léa"));
verifie(
  "pointage parent proposé (contrat l'autorise)",
  espaceParent.includes("Je dépose mon enfant"),
);

// Pointage par le parent
const pointageParent = await postForm(`${BASE}/parent`, 'name="contract_id"', {});
verifie("le parent pointe l'arrivée", pointageParent.status === 200 || pointageParent.status === 303);
const apresPointageParent = await texte(await GET(`${BASE}/parent`));
verifie(
  "présence visible côté parent",
  apresPointageParent.includes("Chez l'assistante maternelle"),
);

// Bulletin côté parent (mêmes explications)
const bulletinParent = await texte(
  await GET(`${BASE}/parent/bulletins/${contractId}/${moisCourant}`),
);
verifie("bulletin parent : montant expliqué", bulletinParent.includes("554,40"));
verifie("bulletin parent : déclaration copiable", bulletinParent.includes("Votre déclaration Pajemploi"));

// Message structuré « absent demain »
const messageAbsence = await postForm(
  `${BASE}/parent/messages/${childId}`,
  'value="absence"',
  {},
);
verifie("message structuré envoyé", messageAbsence.status === 303);

// --- Retour session assmat : confirmation du message
const jarParent = new Map(jar);
jar.clear();
for (const [k, v] of jarAssmat) jar.set(k, v);

const filAssmat = await texte(await GET(`${BASE}/messages/${childId}`));
verifie("l'assmat voit le message structuré", filAssmat.includes("absent"));

const confirmation = await postForm(
  `${BASE}/messages/${childId}`,
  'name="message_id"',
  {},
);
verifie("confirmation de l'absence", confirmation.status === 303);
const filApres = await texte(await GET(`${BASE}/messages/${childId}`));
verifie("message confirmé ✓", filApres.includes("Confirmé"));

// ---------------------------------------------------------------------------
// 13. Santé, stocks, menus (session assmat — l'enfant est présent, pointé par
// le parent à l'étape précédente)

// Allergie sur la fiche (pour le croisement allergènes des menus)
await postForm(`${BASE}/enfants/${childId}`, 'name="allergies"', {
  child_id: childId,
  allergies: "arachide",
});

// Stock de couches initial (au-dessus du seuil)
await postForm(`${BASE}/enfants/${childId}`, 'name="seuil_alerte"', {
  child_id: childId,
  quantite: "9",
  seuil_alerte: "8",
});

// Un change décrémente automatiquement (9 → 8, sous le seuil → alertes)
await postForm(`${BASE}/`, ">Pipi<", { child_id: childId, type: "change" });
const ficheStock = await texte(await GET(`${BASE}/enfants/${childId}`));
verifie("change → stock décrémenté (8)", ficheStock.includes('value="8"'));
verifie("alerte stock côté assmat", ficheStock.includes("Plus que 8 couches"));

// Fièvre depuis Ma journée
const fievre = await postForm(`${BASE}/`, 'name="temp"', {
  child_id: childId,
  temp: "38.7",
  action: "appel_parent",
});
verifie("fièvre déclarée", fievre.status === 200 || fievre.status === 303);

// Traitement avec ordonnance (upload) puis autorisation + administration
const formMedicament = new FormData();
const pageFiche = await texte(await GET(`${BASE}/enfants/${childId}`));
const formMed = (pageFiche.match(/<form[\s\S]*?<\/form>/g) ?? []).find((f) =>
  f.includes('name="ordonnance"'),
);
verifie("formulaire traitement présent", Boolean(formMed));
formMedicament.set(formMed.match(/\$ACTION_ID_[a-f0-9]+/)[0], "");
formMedicament.set("child_id", childId);
formMedicament.set("nom", "Doliprane");
formMedicament.set("posologie", "1 dose si T° > 38,5");
formMedicament.set("date_debut", dateJour);
formMedicament.set(
  "ordonnance",
  new File([Buffer.from("%PDF-1.4 ordonnance test")], "ordonnance.pdf", {
    type: "application/pdf",
  }),
);
const resMedicament = await fetch(`${BASE}/enfants/${childId}`, {
  method: "POST",
  headers: { cookie: cookieHeader(), origin: BASE },
  body: formMedicament,
  redirect: "manual",
});
verifie("traitement créé (ordonnance uploadée)", resMedicament.status === 303);

// Activer l'autorisation « médicaments » puis administrer
await postForm(`${BASE}/enfants/${childId}`, 'value="medicament"', {});
const administration = await postForm(
  `${BASE}/enfants/${childId}`,
  'name="medication_id"',
  {},
);
verifie("administration enregistrée", administration.status === 303);
const ficheApres = await texte(await GET(`${BASE}/enfants/${childId}`));
verifie("journal santé : médicament tracé", ficheApres.includes("💊 Médicament"));

// Menu de la semaine avec allergène → alerte
const menu = await postForm(`${BASE}/menus`, 'name="lundi_midi"', {
  lundi_midi: "Cookies à l'arachide",
  lundi_gouter: "Compote",
  publier: "on",
});
verifie("menu enregistré", menu.status === 303);
const pageMenus = await texte(await GET(`${BASE}/menus`));
verifie(
  "alerte allergène (arachide × Léa)",
  pageMenus.includes("arachide") && pageMenus.includes("allergique"),
);

// --- Côté parent : fièvre visible, réappro, menu
const jarAssmat2 = new Map(jar);
jar.clear();
for (const [k, v] of jarParent) jar.set(k, v);

const parentApresSante = await texte(await GET(`${BASE}/parent`));
verifie("parent : fièvre signalée", parentApresSante.includes("Fièvre signalée"));
verifie("parent : alerte couches", parentApresSante.includes("ramener des couches"));
verifie("parent : menu publié visible", parentApresSante.includes("Cookies"));

const reappro = await postForm(`${BASE}/parent`, 'name="supply_id"', {});
verifie("parent annonce un réappro", reappro.status === 303 || reappro.status === 200);

// --- L'assmat confirme la réception
jar.clear();
for (const [k, v] of jarAssmat2) jar.set(k, v);

const confirmationReappro = await postForm(
  `${BASE}/enfants/${childId}`,
  'name="mouvement_id"',
  {},
);
verifie("assmat confirme le réappro", confirmationReappro.status === 303);
const ficheFinale = await texte(await GET(`${BASE}/enfants/${childId}`));
verifie("stock mis à jour (8 + 20 = 28)", ficheFinale.includes('value="28"'));

console.log(echecs === 0 ? "\n✅ Smoke test OK" : `\n❌ ${echecs} échec(s)`);
process.exit(echecs === 0 ? 0 : 1);
