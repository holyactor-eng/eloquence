// Mesures locales d'une prise de parole. Fonctions pures, testées dans test/metrics.test.js.

// Tics de langage comptés. « quoi », « genre », « enfin » exclus : trop de faux positifs.
export const FILLERS = ['euh', 'heu', 'hum', 'bah', 'ben', 'du coup', 'en fait', 'tu vois', 'tu sais', 'voilà'];

// Un silence de 2 s ou plus au milieu du discours compte comme un blanc.
export const BLANK_SEC = 2;

const round1 = (n) => Math.round(n * 10) / 10;

export function countFillers(transcript) {
  const text = transcript.toLowerCase().replace(/[’]/g, "'");
  const found = {};
  for (const f of FILLERS) {
    const n = text.match(new RegExp(`(?<![\\p{L}])${f}(?![\\p{L}])`, 'gu'))?.length ?? 0;
    if (n) found[f] = n;
  }
  return found;
}

// recording : { transcript, durationSec, speechStart, speechEnd, pauses: [{start, end}] }
export function analyze({ transcript = '', durationSec = 0, speechStart = 0, speechEnd = durationSec, pauses = [] }, targetSec) {
  const words = transcript.match(/[\p{L}\p{N}'’-]+/gu)?.length ?? 0;
  const speakingMin = Math.max(speechEnd - speechStart, 1) / 60;
  const fillers = countFillers(transcript);
  const gaps = pauses.map((p) => p.end - p.start);
  return {
    words,
    durationSec: round1(durationSec),
    wpm: words ? Math.round(words / speakingMin) : 0,
    fillers,
    fillerCount: Object.values(fillers).reduce((a, b) => a + b, 0),
    blanks: gaps.filter((g) => g >= BLANK_SEC).length,
    longestPause: round1(Math.max(0, ...gaps)),
    targetSec: targetSec ?? null,
    overTargetSec: targetSec ? round1(durationSec - targetSec) : 0,
  };
}

// Souffle : durée de l'expiration sur « sss », d'après les niveaux du micro (un toutes les 50 ms).
// On garde la plus longue suite au-dessus du seuil, en tolérant des creux de 150 ms au plus.
export function dureeSouffle(niveaux, seuil, pas = 0.05) {
  let best = 0, run = 0, creux = 0;
  for (const v of niveaux) {
    if (v >= seuil) { run += 1 + creux; creux = 0; }
    else if (run && creux < 3) creux++;
    else { run = 0; creux = 0; }
    best = Math.max(best, run);
  }
  return round1(best * pas);
}

// Note de la respiration 4-4-6 : combien d'expirations tiennent 5 s ou plus sur les 6 s demandées.
export function noteSouffle(durees) {
  const tenues = durees.filter((d) => d >= 5).length;
  return tenues >= 5 ? 'OK' : tenues >= 3 ? 'Moyen' : 'Répéter';
}
