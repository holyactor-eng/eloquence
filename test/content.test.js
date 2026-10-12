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

test('aucun tic IA ni corporate', () => {
  for (const s of all) for (const b of BANNIS) assert.ok(!s.toLowerCase().includes(b), `« ${b} » dans : ${s.slice(0, 80)}`);
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
