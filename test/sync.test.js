import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fusion } from '../sync.js';

const s = (id, date) => ({ id, date });

test('séances additionnées, même séance : la version locale gagne', () => {
  const r = fusion(
    { donnees: { sessions: [s('a', '2026-10-12'), { ...s('b', '2026-10-11'), note: 'OK' }] }, majs: {} },
    { donnees: { sessions: [s('b', '2026-10-11'), s('c', '2026-10-13')] }, majs: {} },
  );
  assert.deepEqual(r.donnees.sessions.map((x) => x.id), ['c', 'a', 'b']);
  assert.equal(r.donnees.sessions.find((x) => x.id === 'b').note, 'OK');
});

test('clé modifiée en dernier gagne ; à égalité ou sans valeur locale, le dépôt gagne', () => {
  const r = fusion(
    { donnees: { context: 'nouveau', recit: ['local'], profile: null }, majs: { context: '2026-10-12T10:00' } },
    { donnees: { context: 'ancien', recit: ['dépôt'], profile: { analysis: 1 } }, majs: { context: '2026-10-11T10:00' } },
  );
  assert.equal(r.donnees.context, 'nouveau');
  assert.deepEqual(r.donnees.recit, ['dépôt']);
  assert.deepEqual(r.donnees.profile, { analysis: 1 });
  assert.equal(r.majs.context, '2026-10-12T10:00');
});

test('un appareil vierge récupère tout sans rien effacer', () => {
  const distant = { donnees: { profile: { analysis: 1 }, sessions: [s('a', '2026-10-12')], progress: { lecons: { 1: 'x' } } }, majs: {} };
  const r = fusion({ donnees: { profile: null, sessions: null, progress: null }, majs: {} }, distant);
  assert.deepEqual(r.donnees.profile, { analysis: 1 });
  assert.equal(r.donnees.sessions.length, 1);
  assert.deepEqual(r.donnees.progress.lecons, { 1: 'x' });
});

test('leçons faites additionnées entre appareils', () => {
  const r = fusion(
    { donnees: { progress: { lecons: { 1: 'a', 2: 'b' } } }, majs: {} },
    { donnees: { progress: { lecons: { 3: 'c' } } }, majs: {} },
  );
  assert.deepEqual(Object.keys(r.donnees.progress.lecons), ['1', '2', '3']);
});

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

test('carnet : une entrée retirée sur un appareil le reste, même si l\'autre la révise plus tard', () => {
  const r = fusion(
    { donnees: { carnet: [{ id: 'a', maj: '2026-10-13T12:00', sorti: null, reussites: 1 }] }, majs: {} },
    { donnees: { carnet: [{ id: 'a', maj: '2026-10-13T09:00', sorti: '2026-10-13T09:00', retire: true }] }, majs: {} },
  );
  assert.equal(r.donnees.carnet.length, 1);
  assert.deepEqual([r.donnees.carnet[0].retire, r.donnees.carnet[0].sorti], [true, '2026-10-13T09:00']);
  // dans l'autre sens aussi (la version retirée est la locale)
  const r2 = fusion(
    { donnees: { carnet: [{ id: 'a', maj: '2026-10-13T09:00', sorti: '2026-10-13T09:00', retire: true }] }, majs: {} },
    { donnees: { carnet: [{ id: 'a', maj: '2026-10-13T12:00', sorti: null, reussites: 1 }] }, majs: {} },
  );
  assert.equal(r2.donnees.carnet[0].retire, true);
});
