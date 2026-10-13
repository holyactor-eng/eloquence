import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../content.js';

const strings = (v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
const all = strings(C);

const BANNIS = ['il est important de noter', 'en effet', 'il convient de', 'force est de constater', 'synergie', 'disruptif', 'holistique', 'incroyable', 'extraordinaire', 'révolutionnaire', 'nous sommes ravis'];

test('typographie : ni tiret cadratin, ni demi-cadratin, ni guillemets droits', () => {
  for (const s of all) {
    assert.ok(!/[—–"]/.test(s), `Caractère interdit dans : ${s.slice(0, 80)}`);
    assert.equal((s.match(/«/g) ?? []).length, (s.match(/»/g) ?? []).length, `Guillemets déséquilibrés : ${s.slice(0, 80)}`);
  }
});

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
  for (const m of ['« Je pense que… »', '« En effet', '« Par exemple', "« C'est pourquoi"]) assert.ok(prep.includes(m), m);
  assert.ok(C.ECHAUFFEMENTS.find((d) => d.id === 'impro-prep').criteres.toLowerCase().includes('connecteurs'));
});

test('structure : 15 leçons dans l’ordre, piliers valides, exercices complets, ids uniques', () => {
  assert.deepEqual(C.LECONS.map((l) => l.n), Array.from({ length: 15 }, (_, i) => i + 1));
  const ids = [];
  for (const l of C.LECONS) {
    for (const p of l.piliers) assert.ok(C.PILIERS[p], `pilier inconnu ${p}`);
    assert.ok(l.cartes.length >= 4 && l.exercices.length >= 1 && l.defi);
  }
  for (const e of [...C.LECONS, ...C.SITUATIONS].flatMap((x) => x.exercices)) {
    assert.ok(e.titre && e.consigne && e.cible > 0, `exercice incomplet ${e.id}`);
    ids.push(e.id);
  }
  assert.equal(new Set(ids).size, ids.length);
});
