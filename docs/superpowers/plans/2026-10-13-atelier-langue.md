# Atelier langue : plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à Éloquence un « Atelier langue » quotidien (7 fiches, phrases dites à voix haute, carnet d'erreurs à révisions espacées), reconnaissable par le turquoise et le motif du joint.

**Architecture:** Le contenu va dans `fiches.js`, la logique pure (carnet, séance, découpage en blocs) dans `langue.js`, toutes deux testées sous Node. `coach.js` gagne six catégories et `verifierPhrase`. `app.js` ajoute la route `#/langue`, le bloc sur Aujourd'hui, la séance, le carnet alimenté par les retours du coach et la section « Ma langue ». `sync.js` fusionne les deux nouvelles clés.

**Tech Stack:** HTML, CSS et JavaScript en modules ES natifs, sans build ni dépendance. Tests : `node --test test/*.test.js` (Node 24). Coach : Gemini, offre gratuite, via `ask()` de `coach.js`.

**Spec:** `docs/superpowers/specs/2026-10-13-atelier-langue-design.md`

## Global Constraints

- Aucune dépendance, aucune étape de build. Modules ES chargés par `index.html`.
- Tests : `node --test test/*.test.js` depuis `eloquence/`. Base de départ : 18 tests verts.
- Textes français : ni tiret cadratin ni demi-cadratin, guillemets « », tutoiement, aucun tic de la liste `BANNIS` de `test/content.test.js`. Dans `content.js`, « en effet » n'apparaît qu'entre guillemets.
- Contenu des fiches : aucun accord au masculin ou au féminin à la première personne (le genre de l'utilisateur n'est pas supposé), aucun chiffre dans les réponses attendues.
- Turquoise `#40e0d0` (`--langue`) réservé à l'atelier. Le lundi de la série et les formes Memphis passent à golbehi `#f7a8b8`.
- Gemini gratuit uniquement, modèles existants de `coach.js`. L'audio n'est jamais stocké.
- Nouvelles clés synchronisées : `langue` et `carnet`.
- Commits avec l'auteur `holyactor-eng <291823819+holyactor-eng@users.noreply.github.com>` et la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pousser uniquement avec l'accord de l'utilisateur.

## Review Focus

- Dictée vide ou micro muet : aucune entrée vide ne doit entrer au carnet ; l'écran propose « Redire ». Test : Task 1 (`ajouterAuCarnet` ignore une phrase vide), vérification : Task 8.
- Le coach relève deux fois la même faute dans un retour : une seule entrée au carnet. Test : Task 1 (`versCarnet`).
- Une synchro arrive pendant une séance : l'écran de séance ne doit pas se redessiner. Vérification : Task 7, étape dédiée.
- Changement d'heure (25 octobre, 29 mars) : les dates de révision restent justes. Test : Task 1 (`plus`).
- Écran étroit (360 px) : les cinq onglets tiennent sans déborder. Vérification : Task 6.

---

### Task 1 : logique pure de l'atelier (`langue.js`)

**Files:**
- Create: `langue.js`
- Test: `test/langue.test.js`

**Interfaces:**
- Consumes : rien.
- Produces :
  - `CATEGORIES_CARNET: string[]`
  - `TYPES: { [type]: { titre: string, consigne: string } }` pour `relier`, `fusionner`, `remplacer`, `preciser`, `couper`, `corriger`
  - `plus(jour: 'AAAA-MM-JJ', n: number): 'AAAA-MM-JJ'`
  - `normaliser(s: string): string`
  - `correspond(dit: string, attendus: string[]): boolean`
  - `decouper(phrase: string, joint: string|null): { texte: string, joint: boolean }[]`
  - `ajouterAuCarnet(carnet, { categorie, dit, correct, regle, origine, source }, jour, maintenant?): carnet`
  - `apresRevision(entree, reussi: boolean, jour, maintenant?): entree`
  - `retirer(entree, maintenant?): entree`
  - `aReviser(carnet, jour): entree[]`
  - `entreAuCarnet(correction): boolean`
  - `versCarnet(carnet, corrections, sessionId, jour, maintenant?): carnet`
  - `noterPhrase(langue, id, reussi, maintenant): { vus, faits }`
  - `ficheCourante(fiches, langue): fiche|null`
  - `etatFiches(fiches, langue): { n, titre, total, vues, faites, statut: 'acquise'|'en cours'|'vue'|'à venir' }[]`
  - `seanceDuJour(fiches, langue, carnet, jour, hasard?): phrase[]` ; une phrase de séance a `{ id, type, donnee, joint, attendus, indice?, fiche?, categorie, carnet?, regle? }`
  - `erreursParCategorie(sessions, jour): [categorie, { recent, avant }][]`
  - `tauxAtelier(sessions, jour): { reussies, total }`
  - Entrée du carnet : `{ id, categorie, dit, correct, regle, origine: 'atelier'|'seance', source, ajoute, prochaine, reussites, sorti, maj, retire? }`

- [ ] **Step 1 : écrire les tests qui échouent**

Créer `test/langue.test.js` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  plus, normaliser, correspond, decouper, ajouterAuCarnet, apresRevision, retirer, aReviser, versCarnet, entreAuCarnet,
  noterPhrase, ficheCourante, etatFiches, seanceDuJour, erreursParCategorie, tauxAtelier,
} from '../langue.js';

const J = '2026-10-13', T = '2026-10-13T09:00:00.000Z';
const err = (o = {}) => ({ categorie: 'pronom relatif', dit: "le projet que je t'ai parlé", correct: "le projet dont je t'ai parlé", regle: 'Parler de : dont.', origine: 'seance', source: 's1', ...o });

test("plus : jours locaux, y compris au changement d'heure", () => {
  assert.equal(plus(J, 1), '2026-10-14');
  assert.equal(plus('2026-10-24', 1), '2026-10-25');
  assert.equal(plus('2026-10-25', 1), '2026-10-26');
  assert.equal(plus('2026-03-28', 1), '2026-03-29');
  assert.equal(plus(J, -13), '2026-09-30');
});

test('normaliser et correspond : casse, apostrophes, tirets, ponctuation, « oui » en tête', () => {
  assert.equal(normaliser('  C’est-à-dire, « bien » !  '), "c'est à dire bien");
  assert.ok(correspond("j'y vais", ["Oui, j'y vais."]));
  assert.ok(correspond('Oui j’y vais', ["Oui, j'y vais."]));
  assert.ok(correspond("c'est à dire que je crée des liens", ["C'est-à-dire que je crée des liens."]));
  assert.ok(!correspond("j'en vais", ["Oui, j'y vais."]));
  assert.ok(!correspond('', ['']));
});

test('decouper : le joint en bloc à part, parties, variantes, apostrophes', () => {
  assert.deepEqual(decouper("J'ai un projet dont je parle souvent.", 'dont'), [
    { texte: "J'ai un projet", joint: false }, { texte: 'dont', joint: true }, { texte: 'je parle souvent.', joint: false },
  ]);
  const joints = (p, j) => decouper(p, j).filter((s) => s.joint).map((s) => s.texte);
  assert.deepEqual(joints('Certes, le budget est faible, mais la tournée a lieu.', 'certes… mais'), ['Certes', 'mais']);
  assert.deepEqual(decouper("Oui, j'y vais.", 'y').map((s) => s.texte), ["Oui, j'", 'y', 'vais.']);
  assert.deepEqual(joints('Le public a bien accueilli le spectacle.', 'accueil|accueilli'), ['accueilli']);
  assert.deepEqual(joints('Je me souviens de lui.', 'en'), []);
  assert.deepEqual(joints('C’est pourquoi nous partons.', "c'est pourquoi"), ['C’est pourquoi']);
  assert.deepEqual(decouper('Une idée.', null), [{ texte: 'Une idée.', joint: false }]);
});

test('carnet : ajout, doublon remis à zéro, entrée vide ignorée', () => {
  let c = ajouterAuCarnet([], err(), J, T);
  assert.equal(c.length, 1);
  assert.deepEqual([c[0].prochaine, c[0].reussites, c[0].sorti, c[0].maj], ['2026-10-14', 0, null, T]);
  c = [{ ...c[0], reussites: 2, prochaine: '2026-10-20' }];
  c = ajouterAuCarnet(c, err({ dit: 'Le projet QUE je t’ai parlé.' }), J, T);
  assert.equal(c.length, 1);
  assert.deepEqual([c[0].reussites, c[0].prochaine], [0, '2026-10-14']);
  assert.equal(ajouterAuCarnet(c, err({ dit: '' }), J, T), c);
  assert.equal(ajouterAuCarnet(c, err({ dit: 'autre chose', correct: '' }), J, T), c);
});

test('révisions : lendemain, J+3, J+7, sortie ; un échec ramène au lendemain', () => {
  const [e0] = ajouterAuCarnet([], err(), J, T);
  const e1 = apresRevision(e0, true, '2026-10-14', T);
  assert.deepEqual([e1.reussites, e1.prochaine, e1.sorti], [1, '2026-10-17', null]);
  const e2 = apresRevision(e1, true, '2026-10-17', T);
  assert.deepEqual([e2.reussites, e2.prochaine], [2, '2026-10-24']);
  assert.equal(apresRevision(e2, true, '2026-10-24', T).sorti, T);
  const rate = apresRevision(e2, false, '2026-10-24', T);
  assert.deepEqual([rate.reussites, rate.prochaine, rate.sorti], [0, '2026-10-25', null]);
  assert.deepEqual([retirer(e0, T).sorti, retirer(e0, T).retire], [T, true]);
});

test("aReviser : échues seulement, quatre au plus, les plus anciennes d'abord", () => {
  const e = (id, prochaine, sorti = null) => ({ ...err(), id, prochaine, sorti, ajoute: T });
  const c = [e('a', '2026-10-13'), e('b', '2026-10-10'), e('c', '2026-10-14'), e('d', '2026-10-12'), e('e', '2026-10-11'), e('f', '2026-10-09', T), e('g', '2026-10-13')];
  assert.deepEqual(aReviser(c, J).map((x) => x.id), ['b', 'e', 'd', 'a']);
});

test("versCarnet : catégories de langue sûres seulement, une faute relevée deux fois n'entre qu'une fois", () => {
  const corr = (categorie, dit, o = {}) => ({ categorie, dit, propositions: [`${dit} corrigé`], regle: 'r', aVerifier: false, ...o });
  const c = versCarnet([], [
    corr('pronom relatif', 'a'), corr('pronom relatif', 'a'), corr('tic de langage', 'b'),
    corr('connecteur', 'c', { aVerifier: true }), corr('structure', 'd'), corr('genre ou accord', 'e', { propositions: [] }),
  ], 's9', J, T);
  assert.deepEqual(c.map((x) => [x.dit, x.correct, x.origine, x.source]), [['a', 'a corrigé', 'seance', 's9']]);
  assert.ok(entreAuCarnet(corr('mot passe-partout', 'x')));
});

const FICHES_TEST = [
  { n: 1, titre: 'Un', categorie: 'connecteur', phrases: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }, { id: 'a4' }] },
  { n: 2, titre: 'Deux', categorie: 'pronom relatif', phrases: [{ id: 'b1' }, { id: 'b2' }] },
];

test('séance du jour : révisions, puis trois phrases non vues de la fiche en cours', () => {
  const carnet = [{ ...err(), id: 'r1', prochaine: J, ajoute: T, reussites: 0, sorti: null }];
  const s = seanceDuJour(FICHES_TEST, { vus: { a1: T } }, carnet, J);
  assert.deepEqual(s.map((p) => p.id), ['r1', 'a2', 'a3', 'a4']);
  assert.deepEqual([s[0].type, s[0].carnet, s[0].attendus], ['corriger', 'r1', ["le projet dont je t'ai parlé"]]);
  assert.deepEqual([s[1].fiche, s[1].categorie], [1, 'connecteur']);
});

test('fiche suivante quand tout est vu ; entretien quand toutes les fiches sont vues', () => {
  const vus1 = { a1: T, a2: T, a3: T, a4: T };
  assert.equal(ficheCourante(FICHES_TEST, { vus: vus1 }).n, 2);
  assert.deepEqual(seanceDuJour(FICHES_TEST, { vus: vus1 }, [], J).map((p) => p.id), ['b1', 'b2']);
  const tout = { vus: { ...vus1, b1: T, b2: T } };
  assert.equal(ficheCourante(FICHES_TEST, tout), null);
  assert.equal(seanceDuJour(FICHES_TEST, tout, [], J, () => 0).length, 3);
  assert.equal(ficheCourante(FICHES_TEST, {}).n, 1);
});

test('état des fiches : vue, acquise, en cours ; une phrase ratée est vue, pas faite', () => {
  const l = { vus: { a1: T, a2: T, a3: T, a4: T }, faits: { a1: T, a2: T, a3: T } };
  assert.deepEqual(etatFiches(FICHES_TEST, l).map((f) => f.statut), ['vue', 'en cours']);
  const l2 = noterPhrase(l, 'a4', true, T);
  assert.deepEqual(etatFiches(FICHES_TEST, l2).map((f) => [f.statut, f.faites, f.total]), [['acquise', 4, 4], ['en cours', 0, 2]]);
  const l3 = noterPhrase({}, 'b1', false, T);
  assert.deepEqual([l3.vus.b1, l3.faits.b1], [T, undefined]);
});

test("Ma langue : erreurs de langue par période de 14 jours, réussite de l'atelier", () => {
  const s = (date, cats) => ({ date, feedback: { corrections: cats.map((categorie) => ({ categorie })) } });
  const sessions = [
    s('2026-10-12T10:00:00', ['connecteur', 'connecteur', 'tic de langage']),
    s('2026-09-25T10:00:00', ['connecteur', 'pronom relatif']),
    s('2026-08-01T10:00:00', ['connecteur']),
    { date: '2026-10-11T10:00:00', exId: 'atelier-langue', langue: [{ reussi: true }, { reussi: false }, { reussi: true }] },
    { date: '2026-09-01T10:00:00', exId: 'atelier-langue', langue: [{ reussi: false }] },
  ];
  assert.deepEqual(erreursParCategorie(sessions, J), [['connecteur', { recent: 2, avant: 1 }], ['pronom relatif', { recent: 0, avant: 1 }]]);
  assert.deepEqual(tauxAtelier(sessions, J), { reussies: 2, total: 3 });
});
```

- [ ] **Step 2 : vérifier l'échec**

Run : `node --test test/langue.test.js`
Expected : FAIL, `Cannot find module '.../langue.js'`.

- [ ] **Step 3 : écrire `langue.js`**

```js
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
      if (!CATEGORIES_CARNET.includes(c.categorie)) continue;
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
```

- [ ] **Step 4 : vérifier**

Run : `node --test test/*.test.js`
Expected : PASS, 29 tests (18 + 11).

- [ ] **Step 5 : commit**

```bash
git add langue.js test/langue.test.js
git -c user.email=291823819+holyactor-eng@users.noreply.github.com commit -m "Atelier langue : logique du carnet et des séances

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2 : contenu des sept fiches (`fiches.js`)

**Files:**
- Create: `fiches.js`
- Test: `test/fiches.test.js`

**Interfaces:**
- Consumes : `TYPES`, `decouper` (Task 1).
- Produces :
  - `CONNECTEURS: { fiche: 1|2, relation: string, mots: string[], piege: string }[]` (35 mots)
  - `FICHES: { n, titre, categorie, embleme: [avant, joint, apres], cartes: { titre, texte }[], phrases: { id, type, donnee: string[], joint: string|null, attendus: string[], indice? }[] }[]`
  - Dans `cartes[].texte`, `{mot}` marque un mot à afficher en bloc turquoise.

- [ ] **Step 1 : écrire les tests qui échouent**

Créer `test/fiches.test.js` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FICHES, CONNECTEURS } from '../fiches.js';
import { TYPES, decouper } from '../langue.js';

const strings = (v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
const phrases = FICHES.flatMap((f) => f.phrases);

test('sept fiches complètes, ids uniques', () => {
  assert.deepEqual(FICHES.map((f) => f.n), [1, 2, 3, 4, 5, 6, 7]);
  for (const f of FICHES) {
    assert.ok(f.titre && f.categorie && f.embleme.length === 3, `fiche ${f.n}`);
    assert.ok(f.cartes.length >= 3 && f.cartes.length <= 4, `cartes de la fiche ${f.n}`);
    assert.ok(f.phrases.length >= 8, `phrases de la fiche ${f.n}`);
  }
  const ids = phrases.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('chaque phrase : type connu, donnée, réponses attendues sauf pour « couper », joint présent dans chaque réponse', () => {
  for (const p of phrases) {
    assert.ok(TYPES[p.type] && p.type !== 'corriger', `type ${p.id}`);
    assert.ok(p.donnee.length >= 1, `donnée ${p.id}`);
    if (p.type === 'couper') assert.deepEqual(p.attendus, [], p.id);
    else assert.ok(p.attendus.length >= 1, `attendus ${p.id}`);
    if (p.joint) for (const a of p.attendus) assert.ok(decouper(a, p.joint).some((s) => s.joint), `joint « ${p.joint} » absent de : ${a}`);
  }
});

test('pas de chiffres dans les réponses attendues (la dictée écrit les nombres de deux façons)', () => {
  for (const p of phrases) for (const a of p.attendus) assert.ok(!/\d/.test(a), a);
});

test('35 connecteurs, chacun travaillé par une phrase de sa fiche', () => {
  assert.equal(CONNECTEURS.flatMap((c) => c.mots).length, 35);
  for (const c of CONNECTEURS) {
    const reponses = FICHES[c.fiche - 1].phrases.flatMap((p) => p.attendus).join(' ').toLowerCase();
    for (const m of c.mots) for (const part of m.split('…')) assert.ok(reponses.includes(part.trim()), `« ${m} » sans phrase dans la fiche ${c.fiche}`);
  }
});

test('typographie : ni tiret cadratin, ni demi-cadratin, ni guillemets droits ; guillemets équilibrés', () => {
  for (const s of strings({ FICHES, CONNECTEURS })) {
    assert.ok(!/[—–"]/.test(s), s);
    assert.equal((s.match(/«/g) ?? []).length, (s.match(/»/g) ?? []).length, s);
  }
});
```

- [ ] **Step 2 : vérifier l'échec**

Run : `node --test test/fiches.test.js`
Expected : FAIL, `Cannot find module '.../fiches.js'`.

- [ ] **Step 3 : écrire `fiches.js`**

```js
// Atelier langue : le contenu des sept fiches. La logique est dans langue.js.
// Une phrase : { id, type, donnee: phrases affichées, joint: mot travaillé (« … » sépare les parties, « | » les variantes), attendus: réponses modèles, indice? }.
// Aucun chiffre dans les réponses attendues : la dictée écrit les nombres tantôt en chiffres, tantôt en lettres.
// Aucun accord au masculin ou au féminin à la première personne.
// Dans le texte des cartes, {mot} s'affiche en bloc turquoise.

export const CONNECTEURS = [
  { fiche: 1, relation: "Expliquer", mots: ["car", "puisque", "en effet", "comme", "étant donné que"], piege: "« En effet » justifie ce qui précède, « en fait » corrige. « Car » ne commence jamais une phrase." },
  { fiche: 1, relation: "Conséquence", mots: ["donc", "c'est pourquoi", "par conséquent", "ainsi", "si bien que"], piege: "« Du coup » est familier. Devant un jury, dis plutôt « donc » ou « c'est pourquoi »." },
  { fiche: 1, relation: "Illustrer", mots: ["par exemple", "notamment", "c'est le cas de"], piege: "« Notamment » introduit un exemple parmi d'autres." },
  { fiche: 1, relation: "Reformuler", mots: ["autrement dit", "c'est-à-dire", "plus précisément"], piege: "« C'est-à-dire » sert à préciser, pas à gagner du temps." },
  { fiche: 2, relation: "Ajouter", mots: ["de plus", "d'ailleurs", "par ailleurs", "non seulement… mais aussi"], piege: "« D'ailleurs » renforce ce qui précède. « Par ailleurs » aborde un autre aspect." },
  { fiche: 2, relation: "Opposer, concéder", mots: ["pourtant", "cependant", "en revanche", "alors que", "même si", "bien que", "certes… mais"], piege: "« Bien que » est suivi du subjonctif, « même si » de l'indicatif. « En revanche » compare deux choses, « au contraire » contredit." },
  { fiche: 2, relation: "Organiser", mots: ["d'abord", "ensuite", "enfin", "d'une part… d'autre part"], piege: "« D'une part » doit être suivi de « d'autre part »." },
  { fiche: 2, relation: "Conclure", mots: ["bref", "en somme", "finalement", "pour conclure"], piege: "« Enfin » annonce le dernier point. « Finalement » donne le résultat." },
];

export const FICHES = [
  {
    n: 1, titre: "Connecteurs : expliquer", categorie: "connecteur", embleme: ["La salle était pleine", "c'est pourquoi", "on a ajouté une date"],
    cartes: [
      { titre: "Donner une cause", texte: "{Car}, {puisque}, {comme} et {étant donné que} annoncent une cause. « Je postule, car la médiation est au cœur de mon métier. » « Puisque » donne une cause que l'autre connaît déjà : « Puisque vous avez lu mon dossier, je vais à l'essentiel. » « Comme » se place en début de phrase : « Comme la salle était pleine, on a ajouté une date. »" },
      { titre: "« En effet » n'est pas « en fait »", texte: "{En effet} justifie ou confirme ce qui vient d'être dit : « Le projet a marché. En effet, les familles sont revenues. » « En fait » corrige ou précise : « On pensait que les élèves s'ennuieraient. En fait, ils ont demandé une autre séance. » Piège : on ne commence pas une phrase par « car ». En début de phrase, dis « En effet »." },
      { titre: "Donner une conséquence", texte: "{Donc}, {c'est pourquoi}, {par conséquent}, {ainsi} et {si bien que} annoncent un résultat. « C'est pourquoi » et « par conséquent » conviennent devant un jury. « Si bien que » relie dans la même phrase : « Les familles sont venues, si bien que la salle était pleine. » « Du coup » est familier et devient vite un tic : garde-le pour les amis." },
      { titre: "Illustrer et reformuler", texte: "{Par exemple}, {notamment} et {c'est le cas de} annoncent un cas concret. « Notamment » choisit un exemple parmi d'autres : « Nous travaillons avec des écoles, notamment dans les quartiers nord. » {Autrement dit}, {c'est-à-dire} et {plus précisément} redisent une idée plus simplement, ou plus exactement. Ils servent à éclairer, pas à gagner du temps." },
    ],
    phrases: [
      { id: "c1-01", type: "relier", donnee: ["La salle était pleine.", "Nous avons ajouté une date."], joint: "c'est pourquoi", attendus: ["La salle était pleine, c'est pourquoi nous avons ajouté une date."] },
      { id: "c1-02", type: "relier", donnee: ["Je connais bien ces publics.", "J'anime des ateliers dans leurs quartiers depuis des années."], joint: "en effet", attendus: ["Je connais bien ces publics. En effet, j'anime des ateliers dans leurs quartiers depuis des années."] },
      { id: "c1-03", type: "relier", donnee: ["Le budget a baissé.", "Nous avons réduit le nombre de dates."], joint: "par conséquent", attendus: ["Le budget a baissé. Par conséquent, nous avons réduit le nombre de dates."] },
      { id: "c1-04", type: "relier", donnee: ["Je postule à ce poste.", "La médiation est au cœur de mon métier."], joint: "car", attendus: ["Je postule à ce poste, car la médiation est au cœur de mon métier."] },
      { id: "c1-05", type: "relier", donnee: ["Vous avez lu mon dossier.", "Je vais droit à l'essentiel."], joint: "puisque", attendus: ["Puisque vous avez lu mon dossier, je vais droit à l'essentiel.", "Je vais droit à l'essentiel, puisque vous avez lu mon dossier."] },
      { id: "c1-06", type: "relier", donnee: ["Les répétitions ont lieu le soir.", "Les parents peuvent venir."], joint: "comme", attendus: ["Comme les répétitions ont lieu le soir, les parents peuvent venir."] },
      { id: "c1-07", type: "relier", donnee: ["Les élèves ont joué devant leurs familles.", "Plusieurs parents sont revenus au théâtre."], joint: "si bien que", attendus: ["Les élèves ont joué devant leurs familles, si bien que plusieurs parents sont revenus au théâtre."] },
      { id: "c1-08", type: "relier", donnee: ["Nous accueillons des publics variés.", "Nous accueillons des lycéens, des retraités et des familles."], joint: "par exemple", attendus: ["Nous accueillons des publics variés, par exemple des lycéens, des retraités et des familles."] },
      { id: "c1-09", type: "relier", donnee: ["Le projet a touché plusieurs villes.", "Il a touché Lormont et Cenon, parmi d'autres."], joint: "notamment", attendus: ["Le projet a touché plusieurs villes, notamment Lormont et Cenon."] },
      { id: "c1-10", type: "relier", donnee: ["Certains lieux accueillent déjà des ateliers.", "La médiathèque en accueille."], joint: "c'est le cas de", attendus: ["Certains lieux accueillent déjà des ateliers. C'est le cas de la médiathèque."] },
      { id: "c1-11", type: "relier", donnee: ["Je veux rendre la scène accessible.", "Chacun doit pouvoir y monter, même sans expérience."], joint: "autrement dit", attendus: ["Je veux rendre la scène accessible. Autrement dit, chacun doit pouvoir y monter, même sans expérience."] },
      { id: "c1-12", type: "relier", donnee: ["Mon métier est la médiation.", "Je crée des liens entre les œuvres et les publics."], joint: "c'est-à-dire", attendus: ["Mon métier est la médiation, c'est-à-dire que je crée des liens entre les œuvres et les publics."] },
      { id: "c1-13", type: "relier", donnee: ["Nous répétons dans les écoles.", "Les élèves n'ont pas à se déplacer."], joint: "ainsi", attendus: ["Nous répétons dans les écoles. Ainsi, les élèves n'ont pas à se déplacer."] },
      { id: "c1-14", type: "relier", donnee: ["Le spectacle est long.", "Nous prévoyons un entracte."], joint: "étant donné que", attendus: ["Étant donné que le spectacle est long, nous prévoyons un entracte."] },
      { id: "c1-15", type: "relier", donnee: ["Je connais déjà l'équipe.", "Je peux commencer dès lundi."], joint: "donc", attendus: ["Je connais déjà l'équipe, donc je peux commencer dès lundi."] },
      { id: "c1-16", type: "relier", donnee: ["Je cherche un poste dans la culture.", "Je cherche un poste de médiation dans une scène nationale."], joint: "plus précisément", attendus: ["Je cherche un poste dans la culture, plus précisément un poste de médiation dans une scène nationale."] },
    ],
  },
  {
    n: 2, titre: "Connecteurs : construire", categorie: "connecteur", embleme: ["Le budget était faible", "pourtant", "la tournée a eu lieu"],
    cartes: [
      { titre: "Ajouter", texte: "{De plus} ajoute un argument du même côté. {D'ailleurs} ajoute un argument qui renforce ce qui précède : « Le public a suivi. D'ailleurs, la dernière date était complète. » {Par ailleurs} ouvre un autre aspect du sujet : « Par ailleurs, je parle plusieurs langues. » {Non seulement}… {mais aussi} met deux atouts en valeur dans la même phrase." },
      { titre: "Opposer", texte: "{Pourtant} et {cependant} annoncent un résultat inattendu : « Le budget était faible. Pourtant, la tournée a eu lieu. » {En revanche} compare deux choses : « Les écoles ont suivi. En revanche, les collèges ont hésité. » {Alors que} oppose deux faits dans la même phrase. Ne le confonds pas avec « au contraire », qui contredit ce qui vient d'être dit." },
      { titre: "Concéder", texte: "Concéder, c'est reconnaître un point avant d'affirmer le tien. {Certes}… {mais} : « Certes, mon parcours est surtout artistique, mais j'ai coordonné de nombreux projets. » {Même si} est suivi de l'indicatif : « même si le temps est court ». {Bien que} est suivi du subjonctif : « bien que le temps soit court »." },
      { titre: "Organiser et conclure", texte: "{D'abord}, {ensuite} et {enfin} annoncent les étapes. {D'une part} appelle toujours {d'autre part}. Pour finir, {bref} et {en somme} résument, {pour conclure} annonce la fin, {finalement} donne le résultat : « Finalement, le spectacle a eu lieu. » « Enfin » annonce le dernier point d'une liste ; dit avec un soupir, il exprime l'agacement." },
    ],
    phrases: [
      { id: "c2-01", type: "relier", donnee: ["Le budget était faible.", "La tournée a eu lieu."], joint: "pourtant", attendus: ["Le budget était faible. Pourtant, la tournée a eu lieu."] },
      { id: "c2-02", type: "relier", donnee: ["La salle est petite.", "Elle convient parfaitement aux ateliers."], joint: "cependant", attendus: ["La salle est petite. Cependant, elle convient parfaitement aux ateliers."] },
      { id: "c2-03", type: "relier", donnee: ["Les écoles ont tout de suite accepté.", "Les collèges ont hésité."], joint: "en revanche", attendus: ["Les écoles ont tout de suite accepté. En revanche, les collèges ont hésité."] },
      { id: "c2-04", type: "relier", donnee: ["Mon parcours est surtout artistique.", "J'ai coordonné de nombreux projets."], joint: "certes… mais", attendus: ["Certes, mon parcours est surtout artistique, mais j'ai coordonné de nombreux projets."] },
      { id: "c2-05", type: "relier", donnee: ["Le temps de répétition est court.", "Le groupe est prêt."], joint: "bien que", attendus: ["Bien que le temps de répétition soit court, le groupe est prêt.", "Le groupe est prêt, bien que le temps de répétition soit court."] },
      { id: "c2-06", type: "relier", donnee: ["Le temps de répétition est court.", "Le groupe est prêt."], joint: "même si", attendus: ["Même si le temps de répétition est court, le groupe est prêt.", "Le groupe est prêt, même si le temps de répétition est court."] },
      { id: "c2-07", type: "relier", donnee: ["Les adultes restaient silencieux.", "Les enfants posaient beaucoup de questions."], joint: "alors que", attendus: ["Les adultes restaient silencieux, alors que les enfants posaient beaucoup de questions.", "Alors que les adultes restaient silencieux, les enfants posaient beaucoup de questions."] },
      { id: "c2-08", type: "relier", donnee: ["Le public a suivi le projet.", "La dernière représentation était complète."], joint: "d'ailleurs", attendus: ["Le public a suivi le projet. D'ailleurs, la dernière représentation était complète."] },
      { id: "c2-09", type: "relier", donnee: ["Je connais bien le travail avec les écoles.", "Je parle plusieurs langues."], joint: "par ailleurs", attendus: ["Je connais bien le travail avec les écoles. Par ailleurs, je parle plusieurs langues."] },
      { id: "c2-10", type: "relier", donnee: ["Ce lieu est accessible en tram.", "Il est gratuit pour les lycéens."], joint: "de plus", attendus: ["Ce lieu est accessible en tram. De plus, il est gratuit pour les lycéens."] },
      { id: "c2-11", type: "relier", donnee: ["Ce projet fait venir les élèves.", "Il fait venir leurs familles."], joint: "non seulement… mais aussi", attendus: ["Ce projet fait venir non seulement les élèves, mais aussi leurs familles."] },
      { id: "c2-12", type: "relier", donnee: ["Je veux élargir les publics.", "Je veux fidéliser les spectateurs qui viennent déjà."], joint: "d'une part… d'autre part", attendus: ["D'une part, je veux élargir les publics. D'autre part, je veux fidéliser les spectateurs qui viennent déjà."] },
      { id: "c2-13", type: "relier", donnee: ["Je rencontre l'équipe.", "Je visite les écoles partenaires.", "Je propose un premier atelier."], joint: "d'abord… ensuite… enfin", attendus: ["D'abord, je rencontre l'équipe. Ensuite, je visite les écoles partenaires. Enfin, je propose un premier atelier."] },
      { id: "c2-14", type: "relier", donnee: ["Le public est nouveau, l'équipe est motivée, les partenaires suivent.", "Le projet est prêt."], joint: "en somme", attendus: ["Le public est nouveau, l'équipe est motivée, les partenaires suivent. En somme, le projet est prêt."] },
      { id: "c2-15", type: "relier", donnee: ["Nous avons eu peu de temps et peu d'argent, mais beaucoup de public.", "C'était une belle saison."], joint: "bref", attendus: ["Nous avons eu peu de temps et peu d'argent, mais beaucoup de public. Bref, c'était une belle saison."] },
      { id: "c2-16", type: "relier", donnee: ["Nous avons hésité longtemps.", "Nous avons choisi de jouer dehors."], joint: "finalement", attendus: ["Nous avons hésité longtemps. Finalement, nous avons choisi de jouer dehors."] },
      { id: "c2-17", type: "relier", donnee: ["Je retiens une chose de cette expérience.", "La confiance se construit en jouant ensemble."], joint: "pour conclure", attendus: ["Pour conclure, je retiens une chose de cette expérience : la confiance se construit en jouant ensemble."] },
    ],
  },
  {
    n: 3, titre: "Qui, que, où, dont", categorie: "pronom relatif", embleme: ["le projet", "dont", "je parle"],
    cartes: [
      { titre: "Qui ou que", texte: "{Qui} remplace le sujet du verbe qui suit : « Le comédien qui joue ce soir est mon ancien élève. » {Que} remplace le complément : « Le spectacle que j'ai vu hier m'a marqué. » Pour choisir : si le verbe qui suit a déjà un sujet (je, tu, il, nous…), c'est « que »." },
      { titre: "Où : un lieu ou un moment", texte: "{Où} remplace un lieu ou un moment : « la salle où nous répétons », « le jour où tout a changé ». On ne dit pas « le jour que » : on dit « le jour où »." },
      { titre: "Dont : tout ce qui se construit avec « de »", texte: "{Dont} remplace « de » suivi d'un nom. Parler de, avoir besoin de, se souvenir de, s'occuper de : « le projet dont je t'ai parlé », « le matériel dont nous avons besoin ». Piège fréquent : « le projet que je t'ai parlé ». On parle de quelque chose : c'est donc « dont »." },
      { titre: "Ce qui, ce que, ce dont", texte: "Sans nom devant, on ajoute « ce » : « {Ce qui} compte, c'est l'écoute. » « {Ce que} je propose est simple. » « {Ce dont} j'ai besoin, c'est du temps. » Ce sont de bonnes premières phrases pour répondre à un jury." },
    ],
    phrases: [
      { id: "r-01", type: "fusionner", donnee: ["J'ai un projet.", "Je parle souvent de ce projet."], joint: "dont", attendus: ["J'ai un projet dont je parle souvent."] },
      { id: "r-02", type: "fusionner", donnee: ["C'est le projet.", "Je t'ai parlé de ce projet."], joint: "dont", attendus: ["C'est le projet dont je t'ai parlé."] },
      { id: "r-03", type: "fusionner", donnee: ["Voici le matériel.", "Nous avons besoin de ce matériel."], joint: "dont", attendus: ["Voici le matériel dont nous avons besoin."] },
      { id: "r-04", type: "fusionner", donnee: ["C'est une rencontre.", "Je me souviens de cette rencontre."], joint: "dont", attendus: ["C'est une rencontre dont je me souviens."] },
      { id: "r-05", type: "fusionner", donnee: ["Je travaille avec une association.", "Le directeur de cette association est comédien."], joint: "dont", attendus: ["Je travaille avec une association dont le directeur est comédien."] },
      { id: "r-06", type: "fusionner", donnee: ["Le comédien joue ce soir.", "Ce comédien est mon ancien élève."], joint: "qui", attendus: ["Le comédien qui joue ce soir est mon ancien élève."] },
      { id: "r-07", type: "fusionner", donnee: ["J'ai vu un spectacle hier.", "Ce spectacle m'a marqué."], joint: "que", attendus: ["Le spectacle que j'ai vu hier m'a marqué."] },
      { id: "r-08", type: "fusionner", donnee: ["Voici la salle.", "Nous répétons dans cette salle."], joint: "où", attendus: ["Voici la salle où nous répétons."] },
      { id: "r-09", type: "fusionner", donnee: ["Je me souviens du jour.", "Ce jour-là, un élève a pris la parole pour la première fois."], joint: "où", attendus: ["Je me souviens du jour où un élève a pris la parole pour la première fois."] },
      { id: "r-10", type: "fusionner", donnee: ["Une chose compte pour moi.", "Cette chose, c'est l'écoute."], joint: "ce qui", attendus: ["Ce qui compte pour moi, c'est l'écoute."] },
      { id: "r-11", type: "fusionner", donnee: ["Je propose une chose.", "Cette chose, c'est un atelier par semaine."], joint: "ce que", attendus: ["Ce que je propose, c'est un atelier par semaine."] },
      { id: "r-12", type: "fusionner", donnee: ["J'ai besoin d'une chose.", "Cette chose, c'est du temps."], joint: "ce dont", attendus: ["Ce dont j'ai besoin, c'est du temps.", "Ce dont j'ai besoin, c'est de temps."] },
    ],
  },
  {
    n: 4, titre: "Celui, celle, ceux, celles", categorie: "pronom démonstratif", embleme: ["ce spectacle et", "celui", "que j'ai vu hier"],
    cartes: [
      { titre: "Ne pas répéter le nom", texte: "{Celui}, {celle}, {ceux} et {celles} remplacent un nom déjà dit. Ils prennent son genre et son nombre : le spectacle, celui ; la pièce, celle ; les élèves, ceux ; les familles, celles. Pour un groupe mixte, on dit « ceux »." },
      { titre: "Jamais seuls", texte: "Ces pronoms sont toujours suivis de quelque chose : {qui}, {que}, {dont}, {de}, ou {-ci} et {-là}. « Ce projet et celui de l'an dernier », « les élèves, surtout ceux qui parlent peu », « Quelle salle ? Celle-ci. »" },
      { titre: "Celui qui, celui que, celui dont", texte: "Le choix suit la fiche précédente : « celui qui joue » (sujet), « celui que je préfère » (complément), « celui dont je t'ai parlé » (parler de). Attention aux contractions : « au projet » devient « à celui », « du projet » devient « de celui »." },
      { titre: "Comparer avec -ci et -là", texte: "Pour comparer deux choses proches : « Deux options : celle-ci coûte moins cher, celle-là touche plus de monde. » À l'oral, « celle-là » suffit souvent pour montrer." },
    ],
    phrases: [
      { id: "d-01", type: "remplacer", donnee: ["Ce spectacle et le spectacle que j'ai vu hier parlent d'exil."], joint: "celui", attendus: ["Ce spectacle et celui que j'ai vu hier parlent d'exil."] },
      { id: "d-02", type: "remplacer", donnee: ["Ta proposition est bonne, mais la proposition de Claire est plus simple."], joint: "celle", attendus: ["Ta proposition est bonne, mais celle de Claire est plus simple."] },
      { id: "d-03", type: "remplacer", donnee: ["Les élèves qui parlent peu et les élèves qui parlent beaucoup ont des besoins différents."], joint: "ceux", attendus: ["Les élèves qui parlent peu et ceux qui parlent beaucoup ont des besoins différents."] },
      { id: "d-04", type: "remplacer", donnee: ["Parmi les familles, les familles qui sont venues une fois reviennent souvent."], joint: "celles", attendus: ["Parmi les familles, celles qui sont venues une fois reviennent souvent."] },
      { id: "d-05", type: "remplacer", donnee: ["Ce projet ressemble au projet dont je t'ai parlé."], joint: "celui", attendus: ["Ce projet ressemble à celui dont je t'ai parlé."] },
      { id: "d-06", type: "remplacer", donnee: ["Quel atelier as-tu préféré ?"], indice: "l'atelier de jeudi", joint: "celui", attendus: ["J'ai préféré celui de jeudi.", "Celui de jeudi."] },
      { id: "d-07", type: "remplacer", donnee: ["Les comédiens qui jouent ce soir et les comédiens qui jouaient hier sont les mêmes."], joint: "ceux", attendus: ["Les comédiens qui jouent ce soir et ceux qui jouaient hier sont les mêmes."] },
      { id: "d-08", type: "remplacer", donnee: ["Mon parcours est différent du parcours des autres candidats."], joint: "celui", attendus: ["Mon parcours est différent de celui des autres candidats."] },
      { id: "d-09", type: "remplacer", donnee: ["Entre ces deux affiches, cette affiche-ci est plus lisible."], joint: "celle-ci", attendus: ["Entre ces deux affiches, celle-ci est plus lisible."] },
      { id: "d-10", type: "remplacer", donnee: ["Je pense aux spectateurs, surtout aux spectateurs qui viennent pour la première fois."], joint: "ceux", attendus: ["Je pense aux spectateurs, surtout à ceux qui viennent pour la première fois."] },
    ],
  },
  {
    n: 5, titre: "« En » et « y »", categorie: "pronom en ou y", embleme: ["Oui,", "j'y", "vais"],
    cartes: [
      { titre: "« En » remplace « de » suivi d'une chose", texte: "{En} remplace un complément introduit par « de » : « Tu as besoin de matériel ? Oui, j'en ai besoin. » « Tu te souviens de cet atelier ? Je m'en souviens. » Il remplace aussi le lieu d'où l'on vient : « Tu reviens de la répétition ? J'en reviens. »" },
      { titre: "« En » et les quantités", texte: "{En} reprend aussi une quantité : « Combien d'élèves ? J'en ai vingt. » « Des idées, j'en ai plusieurs. » La quantité se place à la fin." },
      { titre: "« Y » remplace un lieu, ou « à » suivi d'une chose", texte: "{Y} remplace un lieu : « Tu vas au théâtre ? J'y vais ce soir. » Il remplace aussi « à » suivi d'une chose : « Tu penses à ton audition ? J'y pense. » « Tu tiens à ce projet ? J'y tiens. »" },
      { titre: "Pour une personne, ni « en » ni « y »", texte: "Avec une personne, on garde « à » ou « de » et on dit lui, elle, eux : « Tu penses à ta sœur ? Je pense à elle », pas « j'y pense ». « Tu parles de ton élève ? Je parle de lui », pas « j'en parle »." },
    ],
    phrases: [
      { id: "ey-01", type: "remplacer", donnee: ["Tu vas à la répétition ?"], joint: "y", attendus: ["Oui, j'y vais."] },
      { id: "ey-02", type: "remplacer", donnee: ["Tu as besoin de matériel ?"], joint: "en", attendus: ["Oui, j'en ai besoin."] },
      { id: "ey-03", type: "remplacer", donnee: ["Tu te souviens de ce premier atelier ?"], joint: "en", attendus: ["Oui, je m'en souviens."] },
      { id: "ey-04", type: "remplacer", donnee: ["Tu penses à ton audition ?"], joint: "y", attendus: ["Oui, j'y pense."] },
      { id: "ey-05", type: "remplacer", donnee: ["Tu as des idées pour l'ouverture ?"], indice: "plusieurs", joint: "en", attendus: ["Oui, j'en ai plusieurs."] },
      { id: "ey-06", type: "remplacer", donnee: ["Tu tiens à ce projet ?"], joint: "y", attendus: ["Oui, j'y tiens."] },
      { id: "ey-07", type: "remplacer", donnee: ["Tu parles du budget à la réunion ?"], joint: "en", attendus: ["Oui, j'en parle à la réunion."] },
      { id: "ey-08", type: "remplacer", donnee: ["Tu travailles au théâtre demain ?"], joint: "y", attendus: ["Oui, j'y travaille demain."] },
      { id: "ey-09", type: "remplacer", donnee: ["Tu reviens de la répétition ?"], joint: "en", attendus: ["Oui, j'en reviens."] },
      { id: "ey-10", type: "remplacer", donnee: ["Tu penses à ta sœur ?"], indice: "ta sœur est une personne", joint: "elle", attendus: ["Oui, je pense à elle."] },
      { id: "ey-11", type: "remplacer", donnee: ["Tu t'occupes des inscriptions ?"], joint: "en", attendus: ["Oui, je m'en occupe."] },
      { id: "ey-12", type: "remplacer", donnee: ["Tu t'intéresses au théâtre d'objets ?"], joint: "y", attendus: ["Oui, je m'y intéresse."] },
    ],
  },
  {
    n: 6, titre: "Le mot précis", categorie: "mot passe-partout", embleme: ["J'ai", "animé", "un atelier"],
    cartes: [
      { titre: "Les mots passe-partout", texte: "{Faire}, {mettre}, {avoir}, {il y a}, {chose} et {truc} vont partout, donc ils ne disent presque rien. Un jury retient les verbes précis : ils montrent ce que tu as réellement fait." },
      { titre: "Remplacer « faire »", texte: "Faire un atelier : {animer}, {conduire}. Faire un projet : {mener}, {concevoir}, {coordonner}. Faire un spectacle : {créer}, {monter}, {mettre en scène}. Faire un dossier : {rédiger}, {monter}. Faire une demande : {déposer}, {adresser}." },
      { titre: "Remplacer « chose », « truc » et « il y a »", texte: "« Il y a des élèves qui ne parlent pas » devient « {Certains} élèves ne parlent pas ». « C'est une chose importante » devient « C'est un {enjeu} important » ou « une {priorité} ». « Le truc, c'est que… » devient « Le {problème}, c'est que… ». Le mot précis est souvent le plus simple, pas le plus rare." },
    ],
    phrases: [
      { id: "mp-01", type: "preciser", donnee: ["J'ai fait un atelier avec des lycéens."], indice: "tu l'as conduit du début à la fin", joint: "animé|conduit", attendus: ["J'ai animé un atelier avec des lycéens.", "J'ai conduit un atelier avec des lycéens."] },
      { id: "mp-02", type: "preciser", donnee: ["J'ai fait ce projet de bout en bout."], indice: "tu l'as dirigé", joint: "mené|dirigé|coordonné", attendus: ["J'ai mené ce projet de bout en bout.", "J'ai dirigé ce projet de bout en bout.", "J'ai coordonné ce projet de bout en bout."] },
      { id: "mp-03", type: "preciser", donnee: ["J'ai fait le dossier de subvention."], indice: "tu l'as écrit", joint: "rédigé|monté|écrit", attendus: ["J'ai rédigé le dossier de subvention.", "J'ai monté le dossier de subvention.", "J'ai écrit le dossier de subvention."] },
      { id: "mp-04", type: "preciser", donnee: ["Il y a des élèves qui ne parlent jamais."], indice: "commence par un mot qui désigne une partie du groupe", joint: "certains", attendus: ["Certains élèves ne parlent jamais."] },
      { id: "mp-05", type: "preciser", donnee: ["C'est une chose importante pour la ville."], indice: "ce qui est en jeu", joint: "enjeu|priorité", attendus: ["C'est un enjeu important pour la ville.", "C'est une priorité pour la ville."] },
      { id: "mp-06", type: "preciser", donnee: ["J'ai mis des ateliers dans les écoles du quartier."], indice: "tu les as lancés", joint: "créé|lancé|organisé", attendus: ["J'ai créé des ateliers dans les écoles du quartier.", "J'ai lancé des ateliers dans les écoles du quartier.", "J'ai organisé des ateliers dans les écoles du quartier."] },
      { id: "mp-07", type: "preciser", donnee: ["J'ai fait une demande à la mairie."], indice: "une demande officielle", joint: "déposé|adressé", attendus: ["J'ai déposé une demande à la mairie.", "J'ai adressé une demande à la mairie."] },
      { id: "mp-08", type: "preciser", donnee: ["On a fait un spectacle avec les habitants."], indice: "vous l'avez fabriqué ensemble", joint: "créé|monté", attendus: ["On a créé un spectacle avec les habitants.", "On a monté un spectacle avec les habitants.", "Nous avons créé un spectacle avec les habitants."] },
      { id: "mp-09", type: "preciser", donnee: ["Le truc, c'est que les familles ne connaissent pas le lieu."], indice: "nomme la difficulté", joint: "problème|difficulté", attendus: ["Le problème, c'est que les familles ne connaissent pas le lieu.", "La difficulté, c'est que les familles ne connaissent pas le lieu."] },
      { id: "mp-10", type: "preciser", donnee: ["Le spectacle a eu un bon retour du public."], indice: "le public l'a bien reçu", joint: "accueilli|accueil", attendus: ["Le public a bien accueilli le spectacle.", "Le spectacle a reçu un bel accueil du public."] },
    ],
  },
  {
    n: 7, titre: "La phrase claire", categorie: "phrase trop longue", embleme: ["Une idée.", "Un point.", "On respire."],
    cartes: [
      { titre: "Une phrase, une idée", texte: "À l'oral, l'auditeur ne peut pas relire. Une phrase porte une idée. Si tu dis « et » trois fois dans la même phrase, coupe-la." },
      { titre: "Qui fait quoi", texte: "Commence par celui qui agit, puis ce qu'il fait : « L'équipe a choisi un nouveau lieu. » Évite les débuts lourds comme « au niveau de… », « par rapport au fait que… » ou « en ce qui concerne… »." },
      { titre: "Quinze mots au plus", texte: "Une phrase orale claire tient en quinze mots environ. Au-delà, ton auditeur perd le début. Mets le point, respire, repars. Le silence entre deux phrases courtes donne de l'autorité." },
    ],
    phrases: [
      { id: "pc-01", type: "couper", donnee: ["Au niveau des ateliers, ce qu'on a fait c'est qu'on a proposé aux élèves de venir le mercredi et ils sont venus de plus en plus nombreux et du coup on a ajouté une autre séance."], joint: null, attendus: [] },
      { id: "pc-02", type: "couper", donnee: ["Je pense que par rapport au projet il faudrait qu'on puisse peut-être revoir le calendrier parce que les écoles ont des contraintes et que nous aussi on a des contraintes avec la salle."], joint: null, attendus: [] },
      { id: "pc-03", type: "couper", donnee: ["Mon parcours, c'est un parcours qui a commencé sur scène et qui s'est ensuite ouvert à la médiation quand j'ai commencé à animer des ateliers et c'est là que j'ai compris que je voulais transmettre."], joint: null, attendus: [] },
      { id: "pc-04", type: "couper", donnee: ["Ce qui s'est passé c'est que la mairie nous a répondu tard et donc on a dû tout réorganiser en une semaine mais finalement le spectacle a eu lieu et les familles étaient là."], joint: null, attendus: [] },
      { id: "pc-05", type: "couper", donnee: ["Les partenaires, ce qu'ils attendent, je pense, c'est surtout qu'on leur donne des chiffres et des retours concrets sur ce que les élèves ont vécu pendant le projet."], joint: null, attendus: [] },
      { id: "pc-06", type: "couper", donnee: ["Le spectacle parle de l'exil mais il parle aussi de la joie et c'est ce mélange qui touche les publics et qui fait que les gens restent après pour discuter avec nous."], joint: null, attendus: [] },
      { id: "pc-07", type: "couper", donnee: ["J'aimerais vous dire que si je suis là aujourd'hui c'est parce que ce poste correspond exactement à ce que je fais depuis des années avec les publics éloignés de la culture."], joint: null, attendus: [] },
      { id: "pc-08", type: "couper", donnee: ["En ce qui concerne le budget on a eu une baisse et donc il a fallu trouver d'autres financeurs et c'est pour ça que j'ai monté un dossier pour la région qui a accepté."], joint: null, attendus: [] },
    ],
  },
];
```

- [ ] **Step 4 : vérifier**

Run : `node --test test/*.test.js`
Expected : PASS, 34 tests. Si le test des connecteurs ou du joint échoue, corriger la phrase signalée dans `fiches.js`, jamais le test.

- [ ] **Step 5 : commit**

```bash
git add fiches.js test/fiches.test.js
git -c user.email=291823819+holyactor-eng@users.noreply.github.com commit -m "Atelier langue : contenu des sept fiches

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3 : synchronisation de `langue` et `carnet`

**Files:**
- Modify: `sync.js` (fonction `fusion`)
- Test: `test/sync.test.js`

**Interfaces:**
- Consumes : forme des entrées du carnet (Task 1).
- Produces : `fusion()` additionne `langue.vus` et `langue.faits`, fusionne `carnet` par `id` (la `maj` la plus récente gagne).

- [ ] **Step 1 : écrire les tests qui échouent**

Ajouter à la fin de `test/sync.test.js` :

```js
test('atelier langue : phrases vues et faites additionnées entre appareils', () => {
  const r = fusion(
    { donnees: { langue: { vus: { a: '1' }, faits: { a: '1' } } }, majs: {} },
    { donnees: { langue: { vus: { b: '2' }, faits: {} } }, majs: {} },
  );
  assert.deepEqual(r.donnees.langue, { vus: { a: '1', b: '2' }, faits: { a: '1' } });
});

test('carnet : fusion par entrée, la plus récente gagne, une entrée sortie ne revient pas', () => {
  const e = (id, maj, o = {}) => ({ id, maj, sorti: null, ...o });
  const r = fusion(
    { donnees: { carnet: [e('a', '2026-10-13T10:00', { reussites: 1 }), e('b', '2026-10-12T10:00')] }, majs: {} },
    { donnees: { carnet: [e('a', '2026-10-12T10:00', { reussites: 0 }), e('b', '2026-10-13T10:00', { sorti: '2026-10-13T10:00' }), e('c', '2026-10-11T10:00')] }, majs: {} },
  );
  const par = Object.fromEntries(r.donnees.carnet.map((x) => [x.id, x]));
  assert.equal(par.a.reussites, 1);
  assert.equal(par.b.sorti, '2026-10-13T10:00');
  assert.ok(par.c);
  assert.equal(r.donnees.carnet.length, 3);
});
```

- [ ] **Step 2 : vérifier l'échec**

Run : `node --test test/sync.test.js`
Expected : FAIL sur les deux nouveaux tests (la clé modifiée en dernier gagne en entier).

- [ ] **Step 3 : modifier `fusion` dans `sync.js`**

Remplacer :

```js
  if (a.progress || b.progress) donnees.progress = { ...b.progress, ...a.progress, lecons: { ...b.progress?.lecons, ...a.progress?.lecons } };
  return { donnees, majs };
```

par :

```js
  if (a.progress || b.progress) donnees.progress = { ...b.progress, ...a.progress, lecons: { ...b.progress?.lecons, ...a.progress?.lecons } };
  // Atelier langue : phrases vues et faites additionnées ; carnet fusionné entrée par entrée, la plus récente gagne.
  if (a.langue || b.langue) donnees.langue = { vus: { ...b.langue?.vus, ...a.langue?.vus }, faits: { ...b.langue?.faits, ...a.langue?.faits } };
  if (a.carnet || b.carnet) {
    const entrees = new Map();
    for (const e of [...(b.carnet ?? []), ...(a.carnet ?? [])]) if (!entrees.has(e.id) || e.maj > entrees.get(e.id).maj) entrees.set(e.id, e);
    donnees.carnet = [...entrees.values()];
  }
  return { donnees, majs };
```

Mettre à jour le commentaire d'en-tête de `fusion` :

```js
// Séances : on additionne (même id : la version locale gagne). Leçons faites et phrases d'atelier : on additionne.
// Carnet : entrée par entrée, la plus récemment modifiée gagne.
// Le reste : la clé modifiée en dernier gagne ; à égalité ou sans valeur locale, le dépôt gagne.
```

- [ ] **Step 4 : vérifier**

Run : `node --test test/*.test.js`
Expected : PASS, 36 tests.

- [ ] **Step 5 : commit**

```bash
git add sync.js test/sync.test.js
git -c user.email=291823819+holyactor-eng@users.noreply.github.com commit -m "Synchro : fusion du carnet et des phrases d'atelier

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4 : PREP reçoit ses connecteurs ; tics cités entre guillemets permis

**Files:**
- Modify: `content.js` (leçon 14, carte « PREP » et exercice « Improvisation PREP » ; échauffement `impro-prep`)
- Test: `test/content.test.js`

**Interfaces:**
- Consumes : rien.
- Produces : textes PREP avec connecteurs ; le contrôle des tics ignore les passages entre « ».

- [ ] **Step 1 : écrire le test qui échoue et adapter le contrôle**

Dans `test/content.test.js`, remplacer :

```js
test('aucun tic IA ni corporate', () => {
  for (const s of all) for (const b of BANNIS) assert.ok(!s.toLowerCase().includes(b), `« ${b} » dans : ${s.slice(0, 80)}`);
});
```

par :

```js
// Un mot cité entre guillemets est enseigné, pas employé : « En effet » peut être étudié.
const horsGuillemets = (s) => s.replace(/«[^»]*»/g, '');

test('aucun tic IA ni corporate, sauf cité entre guillemets', () => {
  for (const s of all) for (const b of BANNIS) assert.ok(!horsGuillemets(s).toLowerCase().includes(b), `« ${b} » dans : ${s.slice(0, 80)}`);
});

test('un tic cité entre guillemets passe, hors guillemets il est repéré', () => {
  assert.ok(!horsGuillemets('Raison : « En effet, la salle était pleine. »').toLowerCase().includes('en effet'));
  assert.ok(horsGuillemets('En effet, la salle était pleine.').toLowerCase().includes('en effet'));
});

test('PREP enseigne ses connecteurs', () => {
  const prep = C.LECONS[13].cartes.find((c) => c.titre === 'PREP').texte;
  for (const m of ['« Je pense que… »', '« En effet', '« Par exemple', '« C\'est pourquoi']) assert.ok(prep.includes(m), m);
  assert.ok(C.ECHAUFFEMENTS.find((d) => d.id === 'impro-prep').criteres.toLowerCase().includes('connecteurs'));
});
```

- [ ] **Step 2 : vérifier l'échec**

Run : `node --test test/content.test.js`
Expected : FAIL sur « PREP enseigne ses connecteurs ».

- [ ] **Step 3 : modifier `content.js`**

Carte « PREP » de la leçon 14, remplacer le `texte` par :

```js
{ titre: "PREP", texte: "Point : ta réponse en une phrase, « Je pense que… ». Raison : pourquoi, avec « car… » ou « En effet, … ». Exemple : un fait vécu, « Par exemple, … ». Point : tu redis ta réponse autrement, « C'est pourquoi… ». Les connecteurs font entendre la structure. Quatre étapes qui tiennent en 45 secondes et qu'on retrouve même sous le stress." },
```

Exercice « Improvisation PREP » de la leçon 14, remplacer `criteres` par :

```js
criteres: "Structure PREP identifiable. Exemple concret et vécu. Retour au point à la fin. Connecteurs justes entre les étapes : « car », « en effet », « par exemple », « c'est pourquoi »."
```

Échauffement `impro-prep` (tableau `ECHAUFFEMENTS`), remplacer l'objet par :

```js
{ id: "impro-prep", titre: "Improvisation PREP", cible: "structure et blancs", consigne: "Sujet : « {sujet} » Réponds en PREP : point, raison, exemple, point. Relie les étapes : « car », « par exemple », « c'est pourquoi ».", prep: 15, duree: 60, criteres: "Structure PREP identifiable. Connecteurs justes entre les étapes, qui suivent la logique du propos." },
```

- [ ] **Step 4 : vérifier**

Run : `node --test test/*.test.js`
Expected : PASS, 38 tests.

- [ ] **Step 5 : commit**

```bash
git add content.js test/content.test.js
git -c user.email=291823819+holyactor-eng@users.noreply.github.com commit -m "PREP : connecteurs entre les étapes ; tics permis entre guillemets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5 : coach (six catégories, consignes de langue, `verifierPhrase`)

**Files:**
- Modify: `coach.js` (`RULES`, `COACH`, `CATEGORIES`, nouvelle fonction)
- Test: `test/langue.test.js`

**Interfaces:**
- Consumes : `CATEGORIES_CARNET`, `TYPES` (Task 1) ; phrase de séance `{ type, donnee, joint, attendus, indice? }`.
- Produces : `verifierPhrase(key, phrase, prise: { transcript }, audio|null): Promise<{ reussi: boolean, entendu: string, correction: string, regle: string, categorie: string }>`

- [ ] **Step 1 : écrire le test qui échoue**

Ajouter à la fin de `test/langue.test.js` (et ajouter `CATEGORIES_CARNET` à l'import de `../langue.js`) :

```js
test('les catégories du carnet existent toutes chez le coach', async () => {
  const { CATEGORIES, verifierPhrase } = await import('../coach.js');
  for (const c of CATEGORIES_CARNET) assert.ok(CATEGORIES.includes(c), c);
  assert.equal(typeof verifierPhrase, 'function');
});
```

- [ ] **Step 2 : vérifier l'échec**

Run : `node --test test/langue.test.js`
Expected : FAIL, `connecteur` absent de `CATEGORIES`.

- [ ] **Step 3 : modifier `coach.js`**

Dans `RULES`, remplacer la ligne :

```js
- Aucun tic d'IA ni langage corporate : pas de « il est important de noter », « en effet », « il convient de », « force est de constater », « synergie », « holistique », « incroyable », « extraordinaire », « révolutionnaire ».
```

par :

```js
- Aucun tic d'IA ni langage corporate : pas de « il est important de noter », « en effet », « il convient de », « force est de constater », « synergie », « holistique », « incroyable », « extraordinaire », « révolutionnaire ». Tu peux citer ces mots entre guillemets quand tu corriges l'orateur.
```

Dans `COACH`, après la ligne qui commence par `- Ne signale une erreur de langue que si`, ajouter :

```js
- Langue : relève aussi un connecteur qui ne suit pas la logique (« par conséquent » devant une cause, « en effet » employé pour « en fait »), une répétition qu'un pronom aurait évitée (dont, en, y, celui, celle), un mot passe-partout (faire, mettre, avoir, il y a, chose, truc) quand un mot précis existe, et une erreur de genre ou d'accord qui s'entend.
```

Remplacer `CATEGORIES` par :

```js
export const CATEGORIES = [
  'préposition ou élision', 'phrase incomplète', 'mot lourd ou rare', 'redondance', 'phrase trop longue', 'registre', 'tic de langage', 'structure',
  'connecteur', 'pronom relatif', 'pronom démonstratif', 'pronom en ou y', 'mot passe-partout', 'genre ou accord', 'autre',
];
```

Ajouter `import { TYPES } from './langue.js';` en tête, puis, après la fonction `intention` :

```js
const VERIF_SCHEMA = obj({
  reussi: { type: 'boolean' },
  entendu: { type: 'string', description: "La phrase dite, mot pour mot, d'après l'audio s'il est joint." },
  correction: { type: 'string', description: 'La phrase correcte la plus proche de ce qui a été dit. Vide si réussi.' },
  regle: { type: 'string', description: 'La règle, en une phrase. Vide si réussi.' },
  categorie: { type: 'string', enum: CATEGORIES },
});

// Atelier langue : une phrase dite à voix haute, jugée sur la tâche demandée.
export function verifierPhrase(key, phrase, prise, audio = null) {
  const system = `Tu es professeur de français oral. Tu vérifies une seule phrase dite à voix haute dans un exercice.
- Réussi si la phrase dite est correcte à l'oral, garde le sens de la donnée et remplit la tâche. Accepte toute variante correcte (ordre des mots, synonyme, autre découpage). Seul un connecteur imposé doit être présent tel quel.
- Si l'audio est joint, il fait foi. La dictée confond des mots qui se prononcent pareil (« dont » et « don », « en » et « an ») : ce n'est jamais une erreur de l'orateur.
- Ne juge ni l'accent ni la prononciation, sauf si elle change le mot (« que » au lieu de « dont »).
- Si c'est raté : correction est la phrase correcte la plus proche de ce qui a été dit, regle tient en une phrase, categorie nomme l'erreur.

${RULES}`;
  const user = `Tâche : ${TYPES[phrase.type].consigne}
Donnée : ${phrase.donnee.map((d) => `« ${d} »`).join(' ')}
${phrase.type === 'relier' ? `Connecteur imposé : « ${phrase.joint} »\n` : ''}${phrase.indice ? `Indice donné : ${phrase.indice}\n` : ''}${phrase.attendus.length ? `Réponses modèles : ${phrase.attendus.map((a) => `« ${a} »`).join(' ')}\n` : ''}${audio ? 'Audio joint ci-après.' : "Pas d'audio."}
Dictée du navigateur : « ${prise.transcript || '(vide)'} »`;
  return ask(key, system, [{ text: user }, ...audioPart(audio)], VERIF_SCHEMA, 'low');
}
```

- [ ] **Step 4 : vérifier**

Run : `node --test test/*.test.js`
Expected : PASS, 39 tests.

- [ ] **Step 5 : commit**

```bash
git add coach.js test/langue.test.js
git -c user.email=291823819+holyactor-eng@users.noreply.github.com commit -m "Coach : catégories de langue et vérification d'une phrase d'atelier

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6 : identité visuelle (turquoise, joint, cinquième onglet)

**Files:**
- Modify: `style.css`, `index.html`, `app.js` (`JOURS`, `MEMPHIS`, composants)

**Interfaces:**
- Consumes : `decouper` (Task 1) pour les chaînes.
- Produces (dans `app.js`, section « Composants ») :
  - `chaine(segments: { texte, joint }[]): string` (HTML)
  - `motsJoints(texte: string): string` (HTML, `{mot}` en bloc turquoise)
  - `compteur(n: number): string` (HTML, ■□□)
  - `embleme(fiche): string` (HTML)
  - Classes CSS : `.chaine`, `.joint`, `.block.langue`, `.mot-joint`, `.tag.langue`, `.correction.langue`, `.atelier`, `.bande`, `.avec`, `.compteur`, `.ma-langue`, `[data-p="langue"]`

- [ ] **Step 1 : couleurs réservées dans `app.js`**

Dans `JOURS`, remplacer `{ c: '#40e0d0', nom: 'firouzeh' },` par `{ c: '#f7a8b8', nom: 'golbehi' }, // le turquoise est réservé à l'atelier langue`.
Dans `MEMPHIS`, remplacer `'#40e0d0'` par `'#f7a8b8'`.

- [ ] **Step 2 : composants dans `app.js`**

Après la fonction `mesures(m)`, ajouter :

```js
// Atelier langue : des mots en blocs collés, le joint (le mot travaillé) en turquoise.
const chaine = (segments) => `<span class="chaine">${segments.map((s) => `<span class="${s.joint ? 'joint' : ''}">${t(s.texte)}</span>`).join('')}</span>`;
const motsJoints = (texte) => t(texte).replace(/\{(.+?)\}/g, '<b class="mot-joint">$1</b>');
const compteur = (n) => `<span class="compteur" role="img" aria-label="${n} réussite${n > 1 ? 's' : ''} sur 3">${[0, 1, 2].map((i) => `<i class="${i < n ? 'plein' : ''}"></i>`).join('')}</span>`;
const embleme = (f) => chaine([{ texte: f.embleme[0] }, { texte: f.embleme[1], joint: true }, { texte: f.embleme[2] }]);
```

- [ ] **Step 3 : CSS**

Dans `:root` de `style.css`, après `--pilier-pratique: #4b0082;`, ajouter `--langue: #40e0d0;`.

Dans `.tabs`, remplacer `grid-template-columns: repeat(4, 1fr);` par `grid-template-columns: repeat(5, 1fr);`.
Dans `.tabs a`, remplacer `padding: 0 4px;` par `padding: 0 2px;` et `font-size: .65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;` par `font-size: .6rem; font-weight: 600; text-transform: uppercase; letter-spacing: .5px;`.
Dans le bloc `@media (min-width: 900px)`, remplacer `grid-template-columns: repeat(5, auto);` par `grid-template-columns: repeat(6, auto);`.

Avant `/* Notes de Claude */`, ajouter :

```css
/* Atelier langue : le turquoise lui est réservé. Des mots en blocs collés ; le joint, le mot travaillé, en turquoise. */
[data-p="langue"] { --p: var(--langue); --pt: #000; }
.chaine { display: flex; flex-wrap: wrap; margin: 12px 0; padding-left: 3px; }
.chaine > span { max-width: 100%; margin: 0 0 -3px -3px; padding: 4px 10px; border: 3px solid var(--line); background: var(--surface); color: var(--ink); font-weight: 600; }
.chaine > .joint { background: var(--langue); color: #000; }
.block.langue { background: var(--langue); }
.block.langue h2 { margin: .2em 0 .3em; }
.block.langue .chaine > .joint { background: #000; color: var(--langue); }
.mot-joint { background: var(--langue); padding: 0 4px; font-weight: 600; }
.tag.langue { background: var(--langue); }
.correction.langue .prop { background: var(--langue); }
.atelier { border: 3px solid var(--line); padding: 0 20px 20px; margin: 16px 0; }
.atelier .bande { margin: 0 -20px 16px; padding: 8px 20px; background: var(--langue); border-bottom: 3px solid var(--line); font: 700 .8rem/1.2 var(--mono); text-transform: uppercase; letter-spacing: 2px; }
.atelier .avec { display: flex; flex-wrap: wrap; align-items: center; gap: 0 12px; }
.compteur { display: inline-flex; gap: 3px; margin-right: 8px; vertical-align: -1px; }
.compteur i { width: 12px; height: 12px; border: 2px solid var(--line); }
.compteur i.plein { background: var(--ink); }
.ma-langue .bar > i:not(.ref) { background: var(--langue); }
.tabs a[data-tab="langue"]:hover, .tabs a[data-tab="langue"][aria-current="page"] { background: var(--langue); color: #000; }
```

- [ ] **Step 4 : onglet dans `index.html`**

Entre `<a href="#/situations" data-tab="situations">Situations</a>` et `<a href="#/progres" data-tab="progres">Progrès</a>`, ajouter :

```html
    <a href="#/langue" data-tab="langue">Langue</a>
```

- [ ] **Step 5 : vérifier dans le navigateur (onglets à 360 px)**

Lancer le serveur `eloquence` (preview `.claude/launch.json` de `CODE/`), ouvrir `http://127.0.0.1:8000/`. Redimensionner à 360 × 800, puis à 412 × 915. Exécuter :

```js
[...document.querySelectorAll('.tabs a')].filter((a) => getComputedStyle(a).display !== 'none').map((a) => [a.textContent, a.scrollWidth <= a.clientWidth])
```

Expected : cinq onglets, tous `true`. Si « Aujourd'hui » déborde à 360 px, passer `.tabs a` à `letter-spacing: 0` et revérifier. Vérifier aussi à 1280 px : six onglets en barre du haut. Capture d'écran à 412 px. Les tests Node restent à 39.

- [ ] **Step 6 : commit**

```bash
git add style.css index.html app.js
git -c user.email=291823819+holyactor-eng@users.noreply.github.com commit -m "Atelier langue : turquoise réservé, motif du joint, onglet Langue

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7 : page de l'atelier, fiches, bloc sur Aujourd'hui

**Files:**
- Modify: `app.js` (imports, `DATA_KEYS`, routeur, `today()`, nouvelle section « Atelier langue », `synchroniser()`)

**Interfaces:**
- Consumes : `FICHES`, `CONNECTEURS` (Task 2) ; `aReviser`, `ficheCourante`, `etatFiches`, `retirer`, `seanceDuJour`, `TYPES` (Task 1) ; `chaine`, `motsJoints`, `compteur`, `embleme` (Task 6).
- Produces : routes `#/langue`, `#/langue/:n` ; `jourJ(): 'AAAA-MM-JJ'` ; fonction `langue(arg)` ; `seanceLangue()` reste à écrire (Task 8), donc `#/langue/seance` renvoie provisoirement vers la page.

- [ ] **Step 1 : imports et données**

En tête de `app.js`, ajouter après l'import de `content.js` :

```js
import { FICHES, CONNECTEURS } from './fiches.js';
import { TYPES, correspond, decouper, normaliser, ajouterAuCarnet, apresRevision, retirer, aReviser, versCarnet, noterPhrase, ficheCourante, etatFiches, seanceDuJour, erreursParCategorie, tauxAtelier } from './langue.js';
```

Remplacer `import { feedback, diagnose, speak, intention } from './coach.js';` par `import { feedback, diagnose, speak, intention, verifierPhrase } from './coach.js';`.

Remplacer :

```js
const DATA_KEYS = ['context', 'recit', 'profile', 'plan', 'progress', 'sessions', 'intonation', 'intentions', 'phrasePerso'];
```

par :

```js
const DATA_KEYS = ['context', 'recit', 'profile', 'plan', 'progress', 'sessions', 'intonation', 'intentions', 'phrasePerso', 'langue', 'carnet'];
```

Dans `dessiner()`, ajouter `langue` à l'objet `routes` : `const routes = { '': today, programme, lecon, exercice, objection, situations, progres, reglages, session: sessionView, test, intonation, intentions, langue };`.

- [ ] **Step 2 : section « Atelier langue »**

Juste avant `/* ---------- Réglages ---------- */`, ajouter :

```js
/* ---------- Atelier langue ---------- */

const jourJ = () => new Date().toLocaleDateString('sv');
const DUREE_PHRASE = 20; // secondes, arrêt automatique

function langue(arg) {
  if (arg === 'seance') return typeof seanceLangue === 'function' ? seanceLangue() : (location.hash = '#/langue');
  if (arg) return ficheLangue(Number(arg));
  const l = get('langue', {}), carnet = get('carnet', []);
  const nbRev = aReviser(carnet, jourJ()).length;
  const courante = ficheCourante(FICHES, l);
  const ouverts = carnet.filter((e) => !e.sorti).sort((a, b) => a.prochaine.localeCompare(b.prochaine));
  const sortis = carnet.filter((e) => e.sorti && !e.retire).length;
  show(`
    <h1>Atelier langue</h1>
    ${chaine([{ texte: 'les mots' }, { texte: 'et', joint: true }, { texte: 'les liens' }])}
    <section class="block langue">
      <p class="mono">SÉANCE DU JOUR · 5 MIN</p>
      <p>${nbRev ? `${nbRev} révision${nbRev > 1 ? 's' : ''} du carnet, puis ` : ''}3 phrases ${courante ? `de la fiche ${courante.n}` : 'au hasard parmi les fiches'}.</p>
      <a class="btn primary" href="#/langue/seance">Commencer</a>
    </section>
    <h2>Les fiches</h2>
    <ol class="mosaique">${etatFiches(FICHES, l).map((e) => `
      <li><a class="tuile ${e.statut === 'acquise' ? 'fait' : ''} ${e.statut === 'en cours' ? 'suivante' : ''}" data-p="langue" href="#/langue/${e.n}">
        <span class="tete-tuile"><b class="num">${String(e.n).padStart(2, '0')}</b></span>
        <span><span class="nom">${t(e.titre)}</span><span class="duree">${e.faites}/${e.total}${e.statut === 'vue' ? ' · au carnet' : ''}</span></span>
      </a></li>`).join('')}
    </ol>
    <h2>Le carnet</h2>
    <p class="mono muted">${ouverts.length} À REVOIR · ${sortis} SORTIE${sortis > 1 ? 'S' : ''}</p>
    ${ouverts.length ? ouverts.map((e) => `
      <div class="correction langue">
        <p class="dit">Tu as dit : « ${t(e.dit)} »</p>
        <p class="prop">${t(e.correct)}</p>
        ${e.regle ? `<p class="regle">${t(e.regle)}</p>` : ''}
        <p class="small">${compteur(e.reussites)}Prochaine révision : ${dateFr(`${e.prochaine}T12:00`)}. <button class="btn quiet" data-retirer="${e.id}">Retirer</button></p>
      </div>`).join('')
      : '<div class="vide"><p>Ton carnet est vide. Les erreurs relevées par le coach et celles de l\'atelier viendront s\'y ranger.</p></div>'}`).onclick = (ev) => {
    const id = ev.target.closest('[data-retirer]')?.dataset.retirer;
    if (!id || !confirm('Retirer cette entrée du carnet ?')) return;
    set('carnet', get('carnet', []).map((e) => (e.id === id ? retirer(e) : e)));
    langue();
  };
}

function ficheLangue(n) {
  const f = FICHES.find((x) => x.n === n);
  if (!f) return langue();
  const l = get('langue', {});
  show(`
    <a class="back" href="#/langue">Atelier langue</a>
    <p class="mono muted">FICHE ${String(f.n).padStart(2, '0')}/${FICHES.length}</p>
    <h1>${t(f.titre)}</h1>
    ${embleme(f)}
    ${f.cartes.map((c) => `<div class="carte"><h3>${t(c.titre)}</h3><p>${motsJoints(c.texte)}</p></div>`).join('')}
    ${CONNECTEURS.filter((c) => c.fiche === f.n).map((c) => `<div class="carte"><h3>${t(c.relation)}</h3>${chaine(c.mots.map((m) => ({ texte: m, joint: true })))}<p class="small">${t(c.piege)}</p></div>`).join('')}
    <h2>Les phrases</h2>
    <ul class="plain">${f.phrases.map((p) => `<li class="row-link"><span class="title">${t(p.donnee.join(' '))}</span><span class="meta">${l.faits?.[p.id] ? 'réussie' : l.vus?.[p.id] ? 'au carnet' : 'à venir'}</span></li>`).join('')}</ul>
    <div class="actions"><a class="btn primary" href="#/langue/seance">Commencer la séance</a></div>`);
}
```

- [ ] **Step 3 : bloc sur Aujourd'hui**

Dans `today()`, après `const n = streak();`, ajouter :

```js
  const ficheEnCours = ficheCourante(FICHES, get('langue', {}));
  const nbRev = aReviser(get('carnet', []), jourJ()).length;
```

Dans le gabarit de `today()`, remplacer :

```js
        <div class="sep" aria-hidden="true"></div>
        <h2>Échauffements du jour</h2>
```

par :

```js
        <section class="block langue">
          <p class="mono">ATELIER LANGUE · 5 MIN</p>
          <h2>${nbRev ? `${nbRev} révision${nbRev > 1 ? 's' : ''}, ` : ''}${ficheEnCours ? `fiche ${ficheEnCours.n}` : 'entretien'}</h2>
          ${embleme(ficheEnCours ?? FICHES[0])}
          <a class="btn primary" href="#/langue/seance">Commencer l'atelier</a>
        </section>
        <div class="sep" aria-hidden="true"></div>
        <h2>Échauffements du jour</h2>
```

- [ ] **Step 4 : la synchro ne redessine pas une séance en cours**

Dans `synchroniser()`, remplacer :

```js
      const route = location.hash.replace(/^#\/?/, '').split('/')[0];
      if (JSON.stringify(avant.donnees) !== JSON.stringify(fus.donnees) && ['', 'programme', 'lecon', 'progres', 'situations'].includes(route)) render();
```

par :

```js
      const [route, arg] = location.hash.replace(/^#\/?/, '').split('/');
      const calme = ['', 'programme', 'lecon', 'progres', 'situations'].includes(route) || (route === 'langue' && arg !== 'seance');
      if (JSON.stringify(avant.donnees) !== JSON.stringify(fus.donnees) && calme) render();
```

- [ ] **Step 5 : vérifier dans le navigateur**

Recharger `http://127.0.0.1:8000/`. Vérifier, console sans erreur :
- Aujourd'hui : bloc turquoise « ATELIER LANGUE · 5 MIN », titre « fiche 1 », chaîne « La salle était pleine | c'est pourquoi | on a ajouté une date » avec le joint noir sur turquoise.
- Onglet Langue actif en turquoise ; page avec 7 tuiles (01 en noir, les autres blanches), carnet vide.
- `#/langue/3` : cartes avec mots-joints, tableau de phrases « à venir ».
- `#/langue/1` : quatre cartes de connecteurs en chaînes turquoise.
- Revue de code de l'étape 4 : `calme` est faux pour `#/langue/seance`.
- Captures à 412 px de Aujourd'hui et de `#/langue`.

Run : `node --test test/*.test.js` (39 tests, PASS).

- [ ] **Step 6 : commit**

```bash
git add app.js
git -c user.email=291823819+holyactor-eng@users.noreply.github.com commit -m "Atelier langue : page, fiches, bloc sur Aujourd'hui

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8 : la séance d'atelier

**Files:**
- Modify: `app.js` (section « Atelier langue », `langue()`, `sessionView()`)

**Interfaces:**
- Consumes : `seanceDuJour`, `correspond`, `decouper`, `ajouterAuCarnet`, `apresRevision`, `noterPhrase`, `TYPES` (Task 1) ; `verifierPhrase` (Task 5) ; `startRecording`, `wav`, `attente`, `palier`, `errMsg`, `micErr`, `mmss`, `analyze`, `saveSession` (existants) ; `chaine` (Task 6).
- Produces : route `#/langue/seance` ; séance enregistrée `{ exId: 'atelier-langue', manuel: true, langue: [{ id, type, reussi, dit }] }`.

- [ ] **Step 1 : brancher la route**

Dans `langue(arg)`, remplacer la première ligne par :

```js
  if (arg === 'seance') return seanceLangue();
```

- [ ] **Step 2 : écrire `seanceLangue`**

Après `ficheLangue`, ajouter :

```js
// Une séance : chaque phrase se dit, se vérifie (réponse attendue, sinon coach, sinon toi), puis s'affiche en blocs.
function seanceLangue() {
  const jour = jourJ();
  const file = seanceDuJour(FICHES, get('langue', {}), get('carnet', []), jour);
  const resultats = [];
  let i = 0, rec = null, minuteur = null, prise = null;
  cleanup = () => { clearTimeout(minuteur); rec?.stop(); rec = null; };

  const cadre = (corps) => {
    const p = file[i];
    show(`
      <a class="back" href="#/langue">Atelier langue</a>
      <p class="mono muted">PHRASE ${i + 1}/${file.length} · ${p.type === 'corriger' ? 'CARNET' : `FICHE ${p.fiche}`}</p>
      <section class="atelier">
        <p class="bande">${t(TYPES[p.type].titre)}</p>
        <p class="didascalie">${t(TYPES[p.type].consigne)}</p>
        ${chaine(p.donnee.map((d) => ({ texte: d })))}
        ${p.type === 'relier' ? `<div class="avec"><span class="small">Avec</span>${chaine([{ texte: p.joint, joint: true }])}</div>` : ''}
        ${p.indice ? `<p class="small">Indice : ${t(p.indice)}</p>` : ''}
        ${corps}
      </section>`).onclick = agir;
  };

  const poser = () => {
    if (i >= file.length) return fin();
    prise = null;
    cadre('<div class="actions"><button class="btn primary" data-act="dire">Dire</button></div>');
  };

  const dire = async () => {
    cadre(`<p class="mono" id="chrono">0:00 / 0:${DUREE_PHRASE}</p><p class="small muted" id="dicte" aria-live="polite"></p>
      <div class="actions"><button class="btn primary" data-act="stop">Arrêter</button></div>`);
    try {
      rec = await startRecording({ onTranscript: (txt) => { const el = document.getElementById('dicte'); if (el) el.textContent = txt; } });
    } catch (err) {
      rec = null;
      return cadre(`<p class="error">${t(micErr(err))}</p><div class="actions"><button class="btn primary" data-act="dire">Réessayer</button></div>`);
    }
    const t0 = Date.now();
    const tic = () => {
      const s = (Date.now() - t0) / 1000;
      const el = document.getElementById('chrono');
      if (el) el.textContent = `${mmss(s)} / 0:${DUREE_PHRASE}`;
      if (s >= DUREE_PHRASE) arreter(); else minuteur = setTimeout(tic, 250);
    };
    tic();
  };

  const arreter = async () => {
    clearTimeout(minuteur);
    if (!rec) return;
    const r = rec;
    rec = null;
    cadre(attente('Je vérifie ta phrase.'));
    prise = await r.stop();
    juger();
  };

  const juger = async () => {
    const p = file[i];
    if (!prise.transcript && !prise.blob) return cadre(`<p class="error">Je n'ai rien entendu. Rapproche le téléphone et redis la phrase.</p><div class="actions"><button class="btn primary" data-act="dire">Redire</button></div>`);
    if (correspond(prise.transcript, p.attendus)) return resultat({ reussi: true, entendu: p.attendus[0] });
    const key = get('key');
    if (!key) return autoEval();
    try {
      resultat(await verifierPhrase(key, p, prise, await wav(prise.blob)));
    } catch (e) {
      cadre(`<p class="error">${t(errMsg(e))}</p><div class="actions"><button class="btn primary" data-act="auto">Juger moi-même</button><button class="btn" data-act="dire">Redire</button></div>`);
    }
  };

  const autoEval = () => {
    const p = file[i];
    cadre(`<p>Tu as dit : « ${t(prise.transcript || '(dictée vide)')} »</p>
      ${p.attendus.length ? `<p class="small">Réponse attendue :</p>${chaine(decouper(p.attendus[0], p.joint))}` : '<p class="small">Vérifie : deux ou trois phrases de quinze mots au plus, et le même sens.</p>'}
      <div class="actions"><button class="btn primary" data-act="oui">J'ai dit ça</button><button class="btn" data-act="non">Pas tout à fait</button></div>`);
  };

  const resultat = (v) => {
    const p = file[i], now = new Date().toISOString();
    const dit = v.entendu || prise?.transcript || '';
    const correct = v.correction || p.attendus[0] || '';
    resultats.push({ id: p.id, type: p.type, reussi: v.reussi, dit });
    let note = '';
    if (p.type === 'corriger') {
      const e = get('carnet', []).find((x) => x.id === p.carnet);
      if (e) {
        const apres = apresRevision(e, v.reussi, jour, now);
        set('carnet', get('carnet', []).map((x) => (x.id === e.id ? apres : x)));
        if (v.reussi && e.origine === 'atelier') set('langue', noterPhrase(get('langue', {}), e.source, true, now));
        note = apres.sorti ? 'Trois réussites de suite : elle sort du carnet.' : v.reussi ? `Prochaine révision : ${dateFr(`${apres.prochaine}T12:00`)}.` : 'Elle revient demain.';
      }
    } else {
      set('langue', noterPhrase(get('langue', {}), p.id, v.reussi, now));
      if (!v.reussi) {
        const avant = get('carnet', []);
        const apres = ajouterAuCarnet(avant, { categorie: v.categorie || p.categorie, dit, correct, regle: v.regle || `Fiche ${p.fiche} : ${FICHES[p.fiche - 1].titre}.`, origine: 'atelier', source: p.id }, jour, now);
        if (apres !== avant) { set('carnet', apres); note = 'Ajouté au carnet : elle revient demain.'; }
      }
    }
    const suite = `<div class="actions"><button class="btn primary" data-act="suite">${i + 1 < file.length ? 'Phrase suivante' : 'Terminer'}</button></div>`;
    if (v.reussi) return cadre(`${palier('OK', 'Juste.')}${chaine(decouper(dit, p.joint))}${note ? `<p class="small">${t(note)}</p>` : ''}${suite}`);
    cadre(`${palier('Répéter', 'À reprendre.')}
      <div class="correction langue">
        <p class="dit">Tu as dit : « ${t(dit || '(rien entendu)')} »</p>
        ${correct ? chaine(decouper(correct, p.joint)) : ''}
        ${v.regle ? `<p class="regle">${t(v.regle)}</p>` : ''}
      </div>
      ${note ? `<p class="small">${t(note)}</p>` : ''}${suite}`);
  };

  const fin = () => {
    if (!resultats.length) return (location.hash = '#/langue');
    const ok = resultats.filter((r) => r.reussi).length;
    saveSession({
      id: crypto.randomUUID(), date: new Date().toISOString(), exId: 'atelier-langue', titre: 'Atelier langue', origine: 'Atelier langue',
      retour: '#/langue', refaire: '#/langue/seance', consigne: '', transcript: '', metrics: analyze({}), feedback: null, manuel: true, langue: resultats,
    });
    const ouverts = get('carnet', []).filter((e) => !e.sorti).length;
    show(`
      <a class="back" href="#/langue">Atelier langue</a>
      <h1>${ok} sur ${resultats.length}.</h1>
      ${chaine(resultats.map((r) => ({ texte: r.reussi ? 'juste' : 'à reprendre', joint: r.reussi })))}
      <p>${ouverts} erreur${ouverts > 1 ? 's' : ''} dans ton carnet.</p>
      <div class="actions"><a class="btn primary" href="#/langue">Terminer</a></div>`);
  };

  function agir(e) {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'dire') dire();
    if (act === 'stop') arreter();
    if (act === 'auto') autoEval();
    if (act === 'oui') resultat({ reussi: true, entendu: prise.transcript || file[i].attendus[0] });
    if (act === 'non') resultat({ reussi: false, entendu: prise.transcript });
    if (act === 'suite') { i += 1; poser(); }
  }

  poser();
}
```

- [ ] **Step 3 : résultat d'atelier dans `sessionView`**

Dans le gabarit de `sessionView`, remplacer le début de l'expression `${s.souffle ? ` par :

```js
    ${s.langue ? `${chaine(s.langue.map((r) => ({ texte: r.reussi ? 'juste' : 'à reprendre', joint: r.reussi })))}<ul>${s.langue.map((r) => `<li>${r.reussi ? 'Juste' : 'À reprendre'} : « ${t(r.dit || '(rien entendu)')} »</li>`).join('')}</ul>` : s.souffle ? 
```

(la suite de l'expression ternaire reste identique).

- [ ] **Step 4 : vérifier dans le navigateur**

Le micro réel n'est pas disponible dans l'aperçu : piloter la séance en remplaçant temporairement `startRecording` depuis la console n'est pas possible (import de module). Vérifier donc ainsi :
1. Sans clé API (Réglages vide) : ouvrir `#/langue/seance`. Écran « PHRASE 1/3 · FICHE 1 », bande turquoise « RELIER », deux blocs blancs, « Avec » et le bloc turquoise « c'est pourquoi », bouton « Dire ». Capture à 412 px.
2. Toucher « Dire » : si le micro est refusé dans l'aperçu, l'écran affiche le message d'erreur et « Réessayer » (cas « micro muet » du Review Focus). Capture.
3. Sur le téléphone ou le Mac de l'utilisateur, plus tard (Task 10) : séance complète réelle.
4. Simuler une fin de séance : dans la console, `localStorage.setItem('eloq.sessions', JSON.stringify([{ id: 'x', date: new Date().toISOString(), exId: 'atelier-langue', titre: 'Atelier langue', origine: 'Atelier langue', retour: '#/langue', consigne: '', transcript: '', metrics: { durationSec: 0, wpm: 0, blanks: 0, longestPause: 0, fillers: {}, fillerCount: 0, targetSec: null }, feedback: null, manuel: true, langue: [{ id: 'c1-01', type: 'relier', reussi: true, dit: 'La salle était pleine, c\'est pourquoi nous avons ajouté une date.' }, { id: 'c1-02', type: 'relier', reussi: false, dit: 'je connais ces publics en fait' }] }]))`, puis ouvrir `#/session/x` : chaîne « juste | à reprendre », liste des deux phrases, pas de notes du coach. Remettre ensuite les séances d'origine (sauvegarder `localStorage.getItem('eloq.sessions')` avant).

Run : `node --test test/*.test.js` (39 tests, PASS).

- [ ] **Step 5 : commit**

```bash
git add app.js
git -c user.email=291823819+holyactor-eng@users.noreply.github.com commit -m "Atelier langue : séance phrase par phrase, vérification et carnet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9 : carnet alimenté par le coach, étiquettes, « Ma langue »

**Files:**
- Modify: `app.js` (`askFeedback`, `notes`, `progres`)

**Interfaces:**
- Consumes : `versCarnet`, `normaliser`, `erreursParCategorie`, `tauxAtelier` (Task 1) ; `jourJ` (Task 7).
- Produces : après chaque retour du coach, ses corrections de langue sûres entrent au carnet ; dans les notes, ces corrections portent l'étiquette turquoise et « Au carnet » ; section « Ma langue » dans Progrès.

- [ ] **Step 1 : `askFeedback`**

Dans `askFeedback`, remplacer :

```js
    s.error = null;
    // La transcription de Gemini garde les « euh » que la dictée efface : on recalcule les mesures avec elle.
```

par :

```js
    s.error = null;
    set('carnet', versCarnet(get('carnet', []), s.feedback.corrections, s.id, jourJ()));
    // La transcription de Gemini garde les « euh » que la dictée efface : on recalcule les mesures avec elle.
```

- [ ] **Step 2 : `notes`**

Dans `notes(f, sessionId)`, après `const s = f.scores;`, ajouter :

```js
  const auCarnet = new Set(get('carnet', []).filter((e) => !e.sorti).map((e) => normaliser(e.dit)));
```

Remplacer le gabarit d'une correction :

```js
      <div class="correction">
        <p class="dit">Tu as dit : « ${t(c.dit)} »${c.aVerifier ? ' <span class="tag">à vérifier à la réécoute</span>' : ''}</p>
        ${c.propositions.map((p) => `<p class="prop">${t(p)}</p>`).join('')}
        <p class="regle">${t(c.regle)}</p>
      </div>`).join('')}` : ''}
```

par :

```js
      <div class="correction ${auCarnet.has(normaliser(c.dit)) ? 'langue' : ''}">
        <p class="dit">Tu as dit : « ${t(c.dit)} »${c.aVerifier ? ' <span class="tag">à vérifier à la réécoute</span>' : ''}</p>
        ${c.propositions.map((p) => `<p class="prop">${t(p)}</p>`).join('')}
        <p class="regle">${t(c.regle)}</p>
        ${auCarnet.has(normaliser(c.dit)) ? `<p class="small"><span class="tag langue">${t(c.categorie)}</span>Au carnet</p>` : ''}
      </div>`).join('')}` : ''}
```

- [ ] **Step 3 : section « Ma langue » dans `progres`**

Dans `progres()`, après `const first = profile?.analysis, latest = profile?.bilans?.at(-1)?.analysis;`, ajouter :

```js
  const stats = erreursParCategorie(all, jourJ()), taux = tauxAtelier(all, jourJ());
  const ouverts = get('carnet', []).filter((e) => !e.sorti).length;
  const maxL = Math.max(1, ...stats.flatMap(([, v]) => [v.recent, v.avant]));
```

Dans le gabarit, juste avant `${cats.length ? \`<h2>Corrections qui reviennent</h2>`, ajouter :

```js
    <div class="sep" aria-hidden="true"></div>
    <section class="ma-langue">
      <h2>Ma langue</h2>
      <div class="mesures">
        <div class="mesure"><b>${taux.total ? `${taux.reussies}/${taux.total}` : '·'}</b><span>phrases justes à l'atelier, 14 jours</span></div>
        <div class="mesure"><b>${ouverts}</b><span>erreur${ouverts > 1 ? 's' : ''} au carnet</span></div>
      </div>
      ${stats.length
        ? `<div class="legend"><span><i style="background:var(--langue)"></i>14 derniers jours</span><span><i style="background:var(--modele)"></i>14 jours d'avant</span></div>${bars(stats.map(([k, v]) => [k, v.recent, v.avant]), maxL)}`
        : '<p class="muted">Aucune erreur de langue relevée ces quatre dernières semaines.</p>'}
    </section>
```

- [ ] **Step 4 : vérifier dans le navigateur**

Sauvegarder `localStorage.getItem('eloq.sessions')` et `localStorage.getItem('eloq.carnet')`. Injecter une séance avec un retour du coach :

```js
const fb = { note: 'Moyen', noteRaison: 'r', scores: { clarte: 6, structure: 6, impact: 6, fluidite: 6, langue: 5 }, verdict: 'v', forces: [], axes: [], gardeFous: [], recit: [], messageMaitre: { phrase: 'p', faits: [] }, objection: '', transcription: '', voix: '',
  corrections: [{ categorie: 'pronom relatif', dit: "le projet que je t'ai parlé", propositions: ["le projet dont je t'ai parlé"], regle: 'Parler de : dont.', aVerifier: false }, { categorie: 'tic de langage', dit: 'du coup', propositions: ['donc'], regle: 'r', aVerifier: false }] };
```

Puis appeler le même chemin que l'app : dans la console, il n'y a pas d'accès à `versCarnet` ; vérifier donc par une vraie séance de leçon avec la clé API de l'utilisateur au Task 10. Ici, vérifier l'affichage : écrire `eloq.carnet` avec une entrée dont `dit` vaut `"le projet que je t'ai parlé"` et `eloq.sessions` avec une séance portant `feedback: fb`, ouvrir `#/session/<id>` : la première correction a le fond turquoise sur la proposition et l'étiquette « pronom relatif · Au carnet », la seconde non. Ouvrir `#/progres` : section « Ma langue » avec barres turquoise. Captures à 412 px. Restaurer les valeurs sauvegardées.

Run : `node --test test/*.test.js` (39 tests, PASS).

- [ ] **Step 5 : commit**

```bash
git add app.js
git -c user.email=291823819+holyactor-eng@users.noreply.github.com commit -m "Atelier langue : carnet alimenté par le coach, section Ma langue

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10 : vérification finale et mise en ligne

**Files:** aucun nouveau.

- [ ] **Step 1 : tests**

Run : `node --test test/*.test.js`
Expected : 39 tests, PASS.

- [ ] **Step 2 : parcours complet dans l'aperçu**

À 412 px puis 1280 px : Aujourd'hui, Langue, une fiche, la séance jusqu'au bouton « Dire », Progrès. Console sans erreur. Vérifier qu'aucun turquoise ne reste dans la série du lundi ni dans les formes Memphis.

- [ ] **Step 3 : demander l'accord, puis pousser**

Demander à l'utilisateur l'accord pour pousser. Avec son accord :

```bash
git -c credential.helper= -c credential.helper='!gh auth git-credential' push
```

- [ ] **Step 4 : essai réel par l'utilisateur**

Sur le Galaxy S25 (Chrome) et sur le Mac, après le déploiement GitHub Pages : une séance d'atelier complète avec la clé API ; une phrase dite juste (validée sans coach), une phrase dite fausse (le coach tranche, elle entre au carnet) ; une séance de leçon dont le retour contient une correction de langue (elle apparaît au carnet, avec « Au carnet » dans les notes). Vérifier la synchro du carnet entre les deux appareils.
