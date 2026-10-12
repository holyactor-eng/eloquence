// Courbe de hauteur et d'énergie d'une voix, et moment où elle retombe en fin de phrase.
// ponytail: autocorrélation simple, approximative avec un micro de téléphone ; passer à YIN si la hauteur saute d'octave.

const FRAME = 0.04, HOP = 0.01, FMIN = 70, FMAX = 400;

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// samples : Float32Array mono. Renvoie une trame toutes les 10 ms : { t (s), db, hz (0 si pas de voix) }.
export function contour(samples, rate) {
  const n = Math.round(rate * FRAME), hop = Math.round(rate * HOP);
  const maxLag = Math.ceil(rate / FMIN);
  const pts = [];
  for (let i = 0; i + n + maxLag <= samples.length; i += hop) {
    let e = 0;
    for (let j = 0; j < n; j++) e += samples[i + j] ** 2;
    pts.push({ i, e, t: i / rate, db: 10 * Math.log10(e / n + 1e-12), hz: 0 });
  }
  if (!pts.length) return pts;
  const top = Math.max(...pts.map((p) => p.db));
  for (const p of pts) if (p.db >= top - 35) p.hz = hauteur(samples, p.i, n, rate, p.e); // sinon silence ou bruit de fond
  return pts.map(({ t, db, hz }) => ({ t, db, hz }));
}

// Hauteur (Hz) de la trame x[i .. i+n], 0 si elle n'est pas assez périodique (consonne, souffle).
export function hauteur(x, i, n, rate, e) {
  const minLag = Math.floor(rate / FMAX), maxLag = Math.ceil(rate / FMIN);
  if (e === undefined) { e = 0; for (let j = 0; j < n; j++) e += x[i + j] ** 2; }
  const r = new Float32Array(maxLag + 2);
  let best = 0;
  for (let L = minLag; L <= maxLag + 1; L++) {
    let c = 0, eL = 0;
    for (let j = 0; j < n; j++) { const b = x[i + j + L] ?? 0; c += x[i + j] * b; eL += b * b; }
    r[L] = c / (Math.sqrt(e * eL) || 1);
    if (L <= maxLag && r[L] > best) best = r[L];
  }
  if (best < 0.6) return 0;
  // Premier pic proche du maximum : évite de tomber une octave trop bas.
  for (let L = minLag + 1; L <= maxLag; L++) if (r[L] >= 0.9 * best && r[L] >= r[L - 1] && r[L] >= r[L + 1]) return rate / L;
  return 0;
}

// Hauteur en direct sur le tampon du micro (souvent 48 kHz) : on ramène d'abord à environ 16 kHz.
export function hauteurTrame(buf, rate) {
  const pas = Math.max(1, Math.round(rate / 16000)), r = rate / pas;
  const d = new Float32Array(Math.floor(buf.length / pas));
  for (let k = 0; k < d.length; k++) d[k] = buf[k * pas];
  const n = d.length - Math.ceil(r / FMIN) - 2;
  return n > r * 0.02 ? hauteur(d, 0, n, r) : 0;
}

// Où la voix lâche-t-elle ? On part de la fin et on remonte tant que la voix reste basse :
// plus de 2,5 demi-tons sous sa hauteur médiane, ou plus de 9 dB sous son énergie médiane.
// Renvoie null s'il n'y a pas assez de voix pour juger.
export function finDePhrase(pts) {
  const voiced = pts.filter((p) => p.hz);
  if (voiced.length < 20) return null;
  const f0 = median(voiced.map((p) => p.hz)), e0 = median(voiced.map((p) => p.db));
  const st = (p) => 12 * Math.log2(p.hz / f0);
  const parole = pts.filter((p) => p.hz || p.db > e0 - 20);
  const start = parole[0].t, end = parole.at(-1).t + HOP;
  let debut = end;
  for (let k = pts.length - 1; k >= 0; k--) {
    const p = pts[k], rel = p.db - e0;
    if (p.t > end || p.t < start) continue;
    if (!p.hz && rel > -9) continue; // consonne sonore : ne tranche pas
    if (p.hz && rel >= -9 && st(p) >= -2.5) break;
    debut = p.t;
  }
  const fin = voiced.filter((p) => p.t > end - 0.25).map(st);
  const duree = end - start;
  return {
    start,
    duree,
    chute: end - debut, // secondes entre le début de la chute et la fin de la phrase
    part: (end - debut) / duree,
    monte: fin.length >= 3 && mean(fin) > 1.5,
    courbe: pts.filter((p) => p.t >= start && p.t <= end).map((p) => ({
      x: (p.t - start) / duree,
      st: p.hz ? st(p) : null,
      db: p.db - e0,
    })),
  };
}

// Note d'un essai. OK : la voix tient comme le modèle. Moyen : elle lâche un peu tôt. Répéter : trop tôt, ou elle monte.
// L'écart se mesure en part de la phrase (0,06 ≈ 0,2 s sur une phrase de 3 s), par rapport au modèle ou à une chute normale.
export function noteFin(toi, mod) {
  if (!toi || toi.monte) return 'Répéter';
  const ecart = toi.part - (mod?.part ?? 0.08);
  return ecart <= 0.06 ? 'OK' : ecart <= 0.15 ? 'Moyen' : 'Répéter';
}
