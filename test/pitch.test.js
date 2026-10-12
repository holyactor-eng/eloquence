import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contour, finDePhrase, hauteurTrame, noteFin } from '../pitch.js';

const RATE = 16000;
// Voix synthétique : segments [durée (s), hauteur (Hz, 0 = silence), amplitude], cinq harmoniques.
function voix(segments) {
  const out = [];
  let phase = 0;
  for (const [d, hz, amp] of segments) {
    for (let i = 0; i < d * RATE; i++) {
      phase += (2 * Math.PI * hz) / RATE;
      let v = 0;
      for (let k = 1; k <= 5; k++) v += Math.sin(k * phase) / k;
      out.push(hz ? amp * 0.5 * v : 0);
    }
  }
  return Float32Array.from(out);
}
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg} : ${a} au lieu de ${b} ± ${tol}`);

test('hauteur mesurée à quelques pour cent près', () => {
  const pts = contour(voix([[1, 160, 0.5], [1, 220, 0.5]]), RATE);
  const at = (t) => pts.find((p) => p.t >= t).hz;
  near(at(0.5), 160, 5, 'à 0,5 s');
  near(at(1.5), 220, 7, 'à 1,5 s');
});

test('voix qui lâche trop tôt : chute longue', () => {
  const r = finDePhrase(contour(voix([[0.2, 0, 0], [1.8, 160, 0.5], [0.8, 115, 0.2], [0.4, 0, 0]]), RATE));
  near(r.chute, 0.8, 0.12, 'chute');
  assert.equal(r.monte, false);
});

test('voix portée : chute sur la dernière syllabe seulement', () => {
  const r = finDePhrase(contour(voix([[0.2, 0, 0], [2.4, 160, 0.5], [0.2, 115, 0.4], [0.4, 0, 0]]), RATE));
  near(r.chute, 0.2, 0.08, 'chute');
});

test('fin qui monte : repérée comme une question', () => {
  const r = finDePhrase(contour(voix([[2, 160, 0.5], [0.4, 210, 0.5], [0.3, 0, 0]]), RATE));
  assert.equal(r.monte, true);
  assert.equal(r.chute < 0.05, true);
});

test('trop peu de voix : pas de verdict', () => {
  assert.equal(finDePhrase(contour(voix([[0.5, 0, 0]]), RATE)), null);
});

test('hauteur en direct sur un tampon de micro à 48 kHz', () => {
  const buf = Float32Array.from({ length: 2048 }, (_, i) => Math.sin((2 * Math.PI * 150 * i) / 48000) + 0.5 * Math.sin((4 * Math.PI * 150 * i) / 48000));
  near(hauteurTrame(buf, 48000), 150, 5, 'hauteur');
});

test('note : OK si la voix tient, Moyen si elle lâche un peu tôt, Répéter sinon', () => {
  const fin = (tenu, chute) => finDePhrase(contour(voix([[0.2, 0, 0], [tenu, 160, 0.5], [chute, 115, 0.3], [0.4, 0, 0]]), RATE));
  assert.equal(noteFin(fin(2.6, 0.2)), 'OK');
  assert.equal(noteFin(fin(2.35, 0.45)), 'Moyen');
  assert.equal(noteFin(fin(2.0, 0.8)), 'Répéter');
  assert.equal(noteFin(finDePhrase(contour(voix([[2, 160, 0.5], [0.4, 210, 0.5], [0.3, 0, 0]]), RATE))), 'Répéter');
  assert.equal(noteFin(null), 'Répéter');
});
