import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, countFillers, dureeSouffle, noteSouffle } from '../metrics.js';

test('compte les tics, y compris multi-mots, sans faux positifs', () => {
  const f = countFillers("Euh, du coup je pense que, euh, en fait c'est bien. Le benjamin parle de Coupole.");
  assert.deepEqual(f, { euh: 2, 'du coup': 1, 'en fait': 1 });
});

test('débit, blancs, plus long silence, dépassement de durée', () => {
  const m = analyze(
    {
      transcript: 'un deux trois quatre cinq six sept huit neuf dix',
      durationSec: 75,
      speechStart: 5,
      speechEnd: 65, // 60 s de parole
      pauses: [{ start: 10, end: 11 }, { start: 20, end: 23.4 }, { start: 40, end: 42 }],
    },
    60,
  );
  assert.equal(m.words, 10);
  assert.equal(m.wpm, 10);
  assert.equal(m.blanks, 2);
  assert.equal(m.longestPause, 3.4);
  assert.equal(m.overTargetSec, 15);
});

test('transcription vide : zéro partout, pas de division par zéro', () => {
  const m = analyze({ transcript: '', durationSec: 0 });
  assert.equal(m.wpm, 0);
  assert.equal(m.blanks, 0);
  assert.equal(m.longestPause, 0);
  assert.equal(m.targetSec, null);
});

test('souffle : plus longue expiration, petits creux tolérés, note sur six cycles', () => {
  const sss = (...parts) => parts.flatMap(([n, v]) => Array(n).fill(v));
  assert.equal(dureeSouffle(sss([5, 0], [100, 1], [20, 0]), 0.5), 5);
  assert.equal(dureeSouffle(sss([50, 1], [2, 0], [50, 1]), 0.5), 5.1);
  assert.equal(dureeSouffle(sss([50, 1], [10, 0], [50, 1]), 0.5), 2.5);
  assert.equal(noteSouffle([6, 6, 5.5, 5, 5.2, 3]), 'OK');
  assert.equal(noteSouffle([6, 6, 5, 2, 2, 2]), 'Moyen');
  assert.equal(noteSouffle([2, 3, 1, 0, 0, 0]), 'Répéter');
});
