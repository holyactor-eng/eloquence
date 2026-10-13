// Atelier langue : logique pure (sans DOM), testée dans test/langue.test.js.
// Carnet : une erreur revient le lendemain, puis à J+3, puis à J+7, et sort après trois réussites de suite.

// Corrections du coach qui entrent dans le carnet (catégories de coach.js).
export const CATEGORIES_CARNET = [
  'préposition ou élision', 'phrase incomplète', 'mot lourd ou rare', 'redondance', 'phrase trop longue', 'registre',
  'connecteur', 'pronom relatif', 'pronom démonstratif', 'pronom en ou y', 'mot passe-partout', 'genre ou accord',
];

export const TYPES = {
  relier: { titre: 'Relier', consigne: 'Dis ces idées en une phrase, avec le connecteur imposé.' },
  fusionner: { titre: 'Fusionner', consigne: 'Dis ces deux phrases en une seule, sans répétition.' },
  remplacer: { titre: 'Remplacer', consigne: 'Réponds, ou redis la phrase, sans répéter le nom : un pronom le remplace.' },
  preciser: { titre: 'Préciser', consigne: 'Redis la phrase avec un mot précis à la place du mot passe-partout.' },
  couper: { titre: 'Couper', consigne: 'Redis cette phrase en deux ou trois phrases de quinze mots au plus, sans changer le sens.' },
  corriger: { titre: 'Carnet', consigne: 'Redis cette phrase correctement.' },
};

const REVISIONS = 4; // révisions du carnet par séance, au plus
const NOUVELLES = 3; // phrases de fiche par séance
const INTERVALLES = [1, 3, 7]; // jours avant la révision suivante, selon le nombre de réussites
const SORTIE = INTERVALLES.length; // réussites de suite pour sortir du carnet

// Jour local AAAA-MM-JJ, n jours après `jour`. Midi évite les sauts du changement d'heure.
export function plus(jour, n) {
  const d = new Date(`${jour}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('sv');
}

export const normaliser = (s = '') => s.toLowerCase().replace(/’/g, "'").replace(/[-.,;:!?«»"()…]/g, ' ').replace(/\s+/g, ' ').trim();

// Une prise a-t-elle de la voix ? Un micro muet donne quand même un fichier audio : on regarde la dictée et le niveau sonore.
export const aParle = (prise) => Boolean(normaliser(prise.transcript)) || prise.speechEnd > 0;

// La dictée correspond-elle à une réponse attendue ? Un « oui » en tête ne compte pas.
export function correspond(dit, attendus) {
  const sansOui = (s) => normaliser(s).replace(/^oui /, '');
  const d = sansOui(dit);
  return Boolean(d) && attendus.some((a) => sansOui(a) === d);
}

const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]");

// Découpe une phrase en blocs ; le joint devient un bloc à part. Dans un joint, « … » sépare les parties, « | » les variantes.
export function decouper(phrase, joint) {
  if (!joint) return [{ texte: phrase, joint: false }];
  const parts = joint.split(/…|\|/).map((p) => p.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
  const re = new RegExp(`(?<!\\p{L})(${parts.map(echapper).join('|')})(?!\\p{L})`, 'giu');
  const out = [];
  let i = 0;
  for (const m of phrase.matchAll(re)) {
    out.push({ texte: phrase.slice(i, m.index).trim(), joint: false }, { texte: m[0], joint: true });
    i = m.index + m[0].length;
  }
  out.push({ texte: phrase.slice(i).trim(), joint: false });
  return out.filter((s) => s.texte);
}

// Ajoute une erreur. Déjà présente (même phrase, pas sortie) : elle repart de zéro. Sans phrase dite ni correction : rien.
export function ajouterAuCarnet(carnet, { categorie, dit, correct, regle = '', origine, source }, jour, maintenant = new Date().toISOString()) {
  if (!normaliser(dit) || !normaliser(correct)) return carnet;
  const prochaine = plus(jour, INTERVALLES[0]);
  const deja = carnet.find((e) => !e.sorti && normaliser(e.dit) === normaliser(dit));
  if (deja) return carnet.map((e) => (e === deja ? { ...e, reussites: 0, prochaine, maj: maintenant } : e));
  return [...carnet, { id: crypto.randomUUID(), categorie, dit, correct, regle, origine, source, ajoute: maintenant, prochaine, reussites: 0, sorti: null, maj: maintenant }];
}

export function apresRevision(e, reussi, jour, maintenant = new Date().toISOString()) {
  if (!reussi) return { ...e, reussites: 0, prochaine: plus(jour, INTERVALLES[0]), maj: maintenant };
  const reussites = e.reussites + 1;
  if (reussites >= SORTIE) return { ...e, reussites, sorti: maintenant, maj: maintenant };
  return { ...e, reussites, prochaine: plus(jour, INTERVALLES[reussites]), maj: maintenant };
}

// Faux positif du coach ou erreur de dictée : l'entrée sort sans être effacée (la synchro ne la ferait pas revenir).
export const retirer = (e, maintenant = new Date().toISOString()) => ({ ...e, sorti: maintenant, retire: true, maj: maintenant });

export function aReviser(carnet, jour) {
  return carnet
    .filter((e) => !e.sorti && e.prochaine <= jour)
    .sort((a, b) => a.prochaine.localeCompare(b.prochaine) || a.ajoute.localeCompare(b.ajoute))
    .slice(0, REVISIONS);
}

export const entreAuCarnet = (c) => CATEGORIES_CARNET.includes(c.categorie) && !c.aVerifier && c.propositions?.length > 0;

// Corrections du coach après une séance : celles de langue, sûres, entrent dans le carnet.
export function versCarnet(carnet, corrections, sessionId, jour, maintenant = new Date().toISOString()) {
  return corrections.filter(entreAuCarnet).reduce(
    (acc, c) => ajouterAuCarnet(acc, { categorie: c.categorie, dit: c.dit, correct: c.propositions[0], regle: c.regle, origine: 'seance', source: sessionId }, jour, maintenant),
    carnet,
  );
}

// Une phrase de fiche tentée est vue ; réussie, elle est faite.
export function noterPhrase(langue, id, reussi, maintenant) {
  return {
    vus: { ...langue.vus, [id]: langue.vus?.[id] ?? maintenant },
    faits: reussi ? { ...langue.faits, [id]: langue.faits?.[id] ?? maintenant } : { ...langue.faits },
  };
}

export const ficheCourante = (fiches, langue) => fiches.find((f) => f.phrases.some((p) => !langue.vus?.[p.id])) ?? null;

export function etatFiches(fiches, langue) {
  const courante = ficheCourante(fiches, langue);
  return fiches.map((f) => {
    const vues = f.phrases.filter((p) => langue.vus?.[p.id]).length;
    const faites = f.phrases.filter((p) => langue.faits?.[p.id]).length;
    const statut = faites === f.phrases.length ? 'acquise' : f === courante ? 'en cours' : vues === f.phrases.length ? 'vue' : 'à venir';
    return { n: f.n, titre: f.titre, total: f.phrases.length, vues, faites, statut };
  });
}

function melanger(liste, hasard) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(hasard() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// La séance : révisions du carnet, puis les phrases pas encore vues de la fiche en cours.
// Toutes les fiches vues : trois phrases au hasard, en entretien.
export function seanceDuJour(fiches, langue, carnet, jour, hasard = Math.random) {
  const revisions = aReviser(carnet, jour).map((e) => ({
    id: e.id, type: 'corriger', donnee: [e.dit], joint: null, attendus: [e.correct], regle: e.regle, categorie: e.categorie, carnet: e.id,
  }));
  const toutes = fiches.flatMap((f) => f.phrases.map((p) => ({ ...p, fiche: f.n, categorie: f.categorie })));
  const courante = ficheCourante(fiches, langue);
  const nouvelles = courante
    ? toutes.filter((p) => p.fiche === courante.n && !langue.vus?.[p.id]).slice(0, NOUVELLES)
    : melanger(toutes, hasard).slice(0, NOUVELLES);
  return [...revisions, ...nouvelles];
}

const jourDe = (iso) => new Date(iso).toLocaleDateString('sv');

// Erreurs de langue relevées par le coach : 14 derniers jours et 14 jours d'avant.
export function erreursParCategorie(sessions, jour) {
  const debut = plus(jour, -13), avant = plus(jour, -27);
  const res = {};
  for (const s of sessions) {
    if (!s.feedback) continue;
    const d = jourDe(s.date);
    const periode = d >= debut ? 'recent' : d >= avant ? 'avant' : null;
    if (!periode) continue;
    for (const c of s.feedback.corrections) {
      if (!CATEGORIES_CARNET.includes(c.categorie) || c.aVerifier) continue; // une correction incertaine n'est pas une erreur comptée
      res[c.categorie] ??= { recent: 0, avant: 0 };
      res[c.categorie][periode] += 1;
    }
  }
  return Object.entries(res).sort((a, b) => b[1].recent - a[1].recent);
}

export function tauxAtelier(sessions, jour) {
  const debut = plus(jour, -13);
  const r = sessions.filter((s) => s.exId === 'atelier-langue' && jourDe(s.date) >= debut).flatMap((s) => s.langue ?? []);
  return { reussies: r.filter((x) => x.reussi).length, total: r.length };
}
