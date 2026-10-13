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
