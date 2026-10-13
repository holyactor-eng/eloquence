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
