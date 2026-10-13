import { LECONS, ECHAUFFEMENTS, SITUATIONS, QUESTIONNAIRE, TEST, PILIERS, SUJETS, PHRASES, MOTS, FINS_DE_PHRASE, INTENTIONS, PHRASES_INTENTION } from './content.js';
import { FICHES, CONNECTEURS } from './fiches.js';
import { TYPES, correspond, decouper, normaliser, ajouterAuCarnet, apresRevision, retirer, aReviser, versCarnet, noterPhrase, ficheCourante, etatFiches, seanceDuJour, erreursParCategorie, tauxAtelier } from './langue.js';
import { analyze, dureeSouffle, noteSouffle } from './metrics.js';
import { startRecording, canTranscribe, toWavBase64, decodeMono, wavOctets, SILENCE_RMS } from './recorder.js';
import { feedback, diagnose, speak, intention, verifierPhrase } from './coach.js';
import { contour, finDePhrase, hauteurTrame, noteFin } from './pitch.js';
import { fusion, verifier, lire, ecrire } from './sync.js';

/* ---------- Stockage (sur l'appareil uniquement) ---------- */

const get = (k, d = null) => { try { return JSON.parse(localStorage.getItem('eloq.' + k)) ?? d; } catch { return d; } };
// Données de l'utilisateur : exportées, importées et synchronisées. La clé API et le jeton de synchro n'en font pas partie.
const DATA_KEYS = ['context', 'recit', 'profile', 'plan', 'progress', 'sessions', 'intonation', 'intentions', 'phrasePerso', 'langue', 'carnet'];
function set(k, v) {
  localStorage.setItem('eloq.' + k, JSON.stringify(v));
  if (!DATA_KEYS.includes(k)) return;
  localStorage.setItem('eloq.majs', JSON.stringify({ ...get('majs', {}), [k]: new Date().toISOString() }));
  planifier();
}
const perso = () => ({ context: get('context', ''), recit: get('recit', []) });
const sessions = () => get('sessions', []);
function saveSession(s) {
  const all = sessions();
  const i = all.findIndex((x) => x.id === s.id);
  if (i < 0) all.unshift(s); else all[i] = s;
  set('sessions', all);
}

/* ---------- Texte ---------- */

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Espaces insécables de la typographie française.
const typo = (s) => s.replace(/« /g, '« ').replace(/ »/g, ' »').replace(/ ([:;!?])/g, ' $1');
const t = (s) => typo(esc(s));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const fill = (s) => s.replace('{sujet}', pick(SUJETS)).replace('{phrase}', pick(PHRASES));
const day = (iso) => new Date(iso).toLocaleDateString('sv');
const dateFr = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const nf = (n) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 1 });

/* ---------- Index des exercices ---------- */

const EX = {};
for (const l of LECONS) for (const e of l.exercices) EX[e.id] = { ...e, retour: `#/lecon/${l.n}`, origine: `Leçon ${l.n}` };
for (const s of SITUATIONS) for (const e of s.exercices) EX[e.id] = { ...e, retour: '#/situations', origine: s.titre };
for (const d of ECHAUFFEMENTS) EX[d.id] = { ...d, cible: d.duree, retour: '#/', origine: 'Échauffement' };
for (const x of TEST) EX[x.id] = { ...x, retour: '#/', origine: 'Test' };

/* ---------- Routeur ---------- */

const app = document.getElementById('app');
let cleanup = null; // arrête un enregistrement ou un minuteur en cours quand on quitte l'écran
const audios = new Map(); // id de séance -> { url, blob } : l'audio n'est gardé qu'en mémoire, jamais stocké

// Audio prêt à envoyer à Gemini, ou null si absent ou illisible (on retombe alors sur la transcription seule).
async function wav(blob) {
  if (!blob) return null;
  try { return { mimeType: 'audio/wav', data: await toWavBase64(blob) }; } catch { return null; }
}

function show(html) {
  app.innerHTML = html;
  app.onclick = app.onsubmit = app.onchange = app.oninput = null;
  return app;
}

const render = dessiner;

function dessiner() {
  cleanup?.();
  cleanup = null;
  const [name = '', arg] = location.hash.replace(/^#\/?/, '').split('/');
  const routes = { '': today, programme, lecon, exercice, objection, situations, progres, reglages, session: sessionView, test, intonation, intentions, langue };
  (routes[name] ?? today)(arg && decodeURIComponent(arg));
  for (const a of document.querySelectorAll('[data-tab]')) {
    a.toggleAttribute('aria-current', a.dataset.tab === name);
    if (a.dataset.tab === name) a.setAttribute('aria-current', 'page');
  }
  window.scrollTo(0, 0);
}

/* ---------- Dessins : pictos des piliers, formes Memphis ---------- */

// Un aplat, un trait épais : currentColor, donc blanc ou noir selon la pastille du pilier.
const PICTOS = {
  physique: '<circle cx="36" cy="16" r="9"/><path d="M18 32H54M36 28V50M36 50L24 66M36 50L48 66" fill="none" stroke="currentColor" stroke-width="7"/>',
  rhetorique: '<path fill-rule="evenodd" d="M10 12h52v34H38L22 62V46H10ZM18 22h36v5H18ZM18 32h24v5H18Z"/>',
  mental: '<g fill="none" stroke="currentColor" stroke-width="6"><circle cx="36" cy="36" r="26"/><circle cx="36" cy="36" r="13"/></g><circle cx="36" cy="36" r="4"/>',
  assertivite: '<polygon points="10,28 30,28 58,12 58,60 30,44 10,44"/><rect x="16" y="44" width="12" height="18"/>',
  pratique: '<path d="M14 38L30 54L58 18" fill="none" stroke="currentColor" stroke-width="8"/>',
};
const picto = (k, s = 20) => `<svg class="picto" viewBox="0 0 72 72" width="${s}" height="${s}" fill="currentColor" aria-hidden="true">${PICTOS[k] ?? ''}</svg>`;

// Composition géométrique : les couleurs tournent avec n, chaque leçon a la sienne.
const MEMPHIS = ['#0047ab', '#f4c430', '#900020', '#00a86b', '#f7a8b8', '#4b0082'];
const memphis = (n = 0, grand = false) => {
  const c = (i) => MEMPHIS[(n + i) % MEMPHIS.length];
  return `<svg class="memphis${grand ? ' grand' : ''}" viewBox="0 0 360 160" aria-hidden="true">
    <path class="f" d="M0 160V36A124 124 0 0 1 124 160Z" fill="${c(0)}"/>
    <path class="f" d="M126 160A62 62 0 0 1 250 160Z" fill="${c(1)}"/>
    <polygon class="f" points="262,160 300,66 340,160" fill="${c(2)}"/>
    <circle class="f" cx="318" cy="40" r="17" fill="${c(3)}"/>
    <rect x="170" y="24" width="46" height="46" fill="none" stroke="#000" stroke-width="5"/>
    <polyline points="22,26 42,8 62,26 82,8 102,26 122,8 142,26" fill="none" stroke="#000" stroke-width="5"/>
    <g fill="#000"><circle cx="240" cy="22" r="4"/><circle cx="258" cy="22" r="4"/><circle cx="276" cy="22" r="4"/><circle cx="240" cy="40" r="4"/><circle cx="258" cy="40" r="4"/><circle cx="276" cy="40" r="4"/></g>
  </svg>`;
};

/* ---------- Composants ---------- */

function bars(rows, max) {
  return `<div class="bars">${rows.map(([label, v, ref, icone]) => `
    <span class="lib">${icone ?? ''}${t(label)}</span>
    <span class="bar" role="img" aria-label="${esc(label)} : ${v} sur ${max}">
      <i ${ref != null ? `class="glisse" style="width:${(100 * v) / max}%;--de:${(100 * ref) / max}%"` : `style="width:${(100 * v) / max}%"`}></i>${ref != null ? `<i class="ref" style="width:${(100 * ref) / max}%"></i>` : ''}
    </span>
    <span class="val">${v}</span>`).join('')}</div>`;
}

function piliersBars(p, ref) {
  return bars(Object.entries(PILIERS).map(([k, v]) => [v.nom, p?.[k] ?? 0, ref?.[k], picto(k, 18)]), 100);
}

function mesures(m) {
  const tics = Object.entries(m.fillers).map(([k, n]) => `« ${k} » × ${n}`).join(', ');
  return `<div class="mesures">
    <div class="mesure"><b class="${m.overTargetSec > 10 ? 'over' : ''}">${mmss(m.durationSec)}</b><span>durée${m.targetSec ? `, cible ${mmss(m.targetSec)}` : ''}</span></div>
    <div class="mesure"><b>${m.wpm}</b><span>mots par minute (130 à 160)</span></div>
    <div class="mesure"><b>${m.blanks}</b><span>blanc${m.blanks > 1 ? 's' : ''} de 2 s ou plus</span></div>
    <div class="mesure"><b>${nf(m.longestPause)} s</b><span>plus long silence</span></div>
  </div>
  <p class="small muted">${m.fillerCount ? `Tics repérés par la dictée : ${t(tics)}.` : 'Aucun tic repéré par la dictée (elle en efface souvent).'}</p>`;
}

// Atelier langue : des mots en blocs collés, le joint (le mot travaillé) en turquoise.
const chaine = (segments) => `<span class="chaine">${segments.map((s) => `<span class="${s.joint ? 'joint' : ''}">${t(s.texte)}</span>`).join('')}</span>`;
const motsJoints = (texte) => t(texte).replace(/\{(.+?)\}/g, '<b class="mot-joint">$1</b>');
const compteur = (n) => `<span class="compteur" role="img" aria-label="${n} réussite${n > 1 ? 's' : ''} sur 3">${[0, 1, 2].map((i) => `<i class="${i < n ? 'plein' : ''}"></i>`).join('')}</span>`;
const embleme = (f) => chaine([{ texte: f.embleme[0] }, { texte: f.embleme[1], joint: true }, { texte: f.embleme[2] }]);

function notes(f, sessionId) {
  const s = f.scores;
  const auCarnet = new Set(get('carnet', []).filter((e) => !e.sorti).map((e) => normaliser(e.dit)));
  return `
    ${palier(f.note, f.noteRaison)}
    <p class="verdict">${t(f.verdict)}</p>
    ${f.voix ? `<p class="note">${t(f.voix)}</p>` : ''}
    ${f.messageMaitre ? `<div class="technique"><h3>Ton message maître</h3><p>${t(f.messageMaitre.phrase)}</p>${f.messageMaitre.faits.length ? `<ul>${f.messageMaitre.faits.map((x) => `<li>${t(x)}</li>`).join('')}</ul>` : ''}</div>` : ''}
    ${bars([["Clarté de l'idée", s.clarte], ['Structure', s.structure], ['Impact juste', s.impact], ['Fluidité', s.fluidite], ['Langue', s.langue]], 10)}
    ${f.recit.length ? `<h3>Ton récit</h3>${f.recit.map((r) => `<p class="error">Tu as dit « ${t(r.dit)} ». La fiche dit : ${t(r.fiche)}</p>`).join('')}` : ''}
    ${f.forces.length ? `<h3>Ce qui tient</h3><ul>${f.forces.map((x) => `<li>${t(x)}</li>`).join('')}</ul>` : ''}
    ${f.axes.length ? `<h3>À travailler</h3><ul>${f.axes.map((x) => `<li>${t(x)}</li>`).join('')}</ul>` : ''}
    ${f.gardeFous.length ? `<h3>Garde-fous</h3>${f.gardeFous.map((g) => `<p><span class="tag">${t(g.type)}</span><i>« ${t(g.citation)} »</i></p>`).join('')}` : ''}
    ${f.corrections.length ? `<h3>Corrections</h3>${f.corrections.map((c) => `
      <div class="correction ${auCarnet.has(normaliser(c.dit)) ? 'langue' : ''}">
        <p class="dit">Tu as dit : « ${t(c.dit)} »${c.aVerifier ? ' <span class="tag">à vérifier à la réécoute</span>' : ''}</p>
        ${c.propositions.map((p) => `<p class="prop">${t(p)}</p>`).join('')}
        <p class="regle">${t(c.regle)}</p>
        ${auCarnet.has(normaliser(c.dit)) ? `<p class="small"><span class="tag langue">${t(c.categorie)}</span>Au carnet</p>` : ''}
      </div>`).join('')}` : ''}
    ${f.objection && sessionId ? `<h3>L'objection</h3><p class="didascalie">« ${t(f.objection)} »</p><a class="btn primary" href="#/objection/${sessionId}">Répondre à l'objection</a>` : ''}`;
}

// Repère de réussite d'un exercice : OK, Moyen ou Répéter, avec sa raison.
function palier(note, raison) {
  if (!note) return '';
  const cls = { OK: 'ok', Moyen: 'moyen', 'Répéter': 'repeter' }[note];
  return `<p class="palier ${cls}"><b>${note}</b>${raison ? `<span>${t(raison)}</span>` : ''}</p>`;
}

function attente(texte) {
  return `<div class="attente" role="status"><div class="servante"></div><p>${t(texte)}</p><p class="small muted" aria-hidden="true" data-depuis="${Date.now()}"></p></div>`;
}

// Révélation d'un résultat : les blocs entrent l'un après l'autre (CSS), les scores défilent jusqu'à leur valeur.
function cascade(el) {
  if (!el) return;
  [...el.children].forEach((c, i) => c.style.setProperty('--i', i));
  el.querySelectorAll('.bar').forEach((b, j) => b.style.setProperty('--j', j));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const v of el.querySelectorAll('.val')) {
    const fin = Number(v.textContent), t0 = performance.now() + 400;
    const pas = (now) => {
      const k = Math.min(1, Math.max(0, (now - t0) / 900));
      v.textContent = Math.round(fin * (1 - (1 - k) ** 3));
      if (k < 1) requestAnimationFrame(pas);
    };
    v.textContent = 0;
    requestAnimationFrame(pas);
  }
}

// Compteur des écrans d'attente : montre que l'app travaille encore.
setInterval(() => {
  for (const el of document.querySelectorAll('[data-depuis]')) el.textContent = `${Math.round((Date.now() - el.dataset.depuis) / 1000)} s`;
}, 1000);

function errMsg(e) {
  if (e.name === 'TimeoutError') return "Gemini n'a pas répondu à temps. Réessaie dans un moment.";
  if (e.status === 401 || e.status === 403 || (e.status === 400 && /api key/i.test(e.message))) return 'Clé API refusée. Vérifie-la dans Réglages.';
  if (e.status === 429) return "Quota gratuit atteint (par minute ou pour la journée). Réessaie dans une minute ; si ça persiste, demain.";
  if (e.status >= 500) return 'Gemini ne répond pas. Réessaie dans un moment.';
  if (!navigator.onLine || e instanceof TypeError) return 'Connexion impossible avec Google. Vérifie ta connexion internet.';
  return e.message || 'Erreur inconnue.';
}

function streak() {
  const days = new Set(sessions().map((s) => day(s.date)));
  const d = new Date();
  if (!days.has(d.toLocaleDateString('sv'))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(d.toLocaleDateString('sv'))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// Une couleur par jour de la semaine (palette iranienne) : elle surligne la série. fonce : texte blanc dessus.
const JOURS = [
  { c: '#b87333', nom: 'mesi' }, // dimanche
  { c: '#f7a8b8', nom: 'golbehi' }, // le turquoise est réservé à l'atelier langue
  { c: '#0047ab', nom: 'lajvard', fonce: true },
  { c: '#f4c430', nom: 'zaferani' },
  { c: '#900020', nom: 'zereshki', fonce: true },
  { c: '#00a86b', nom: 'yashm' },
  { c: '#4b0082', nom: 'nili', fonce: true },
];

function quatorzeJours() {
  const faits = new Set(sessions().map((s) => day(s.date)));
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 13 + i);
    return { d, fait: faits.has(d.toLocaleDateString('sv')), ...JOURS[d.getDay()] };
  });
}

/* ---------- Aujourd'hui ---------- */

function today() {
  const profile = get('profile');
  if (!profile) {
    return show(`
      <h1>Avant de travailler, on écoute où tu en es.</h1>
      <p class="lead">Un test de six minutes : dix questions, puis deux prises de parole enregistrées. Il en sort un profil sur les cinq piliers et un plan pour les quinze leçons.</p>
      <div class="actions"><a class="btn primary" href="#/test">Passer le test</a></div>
      ${get('key') ? '' : `<p class="note">Sans clé API, l'app mesure ta voix (débit, blancs, silences) mais le coach ne peut pas analyser le fond. Ajoute ta clé Google AI Studio, gratuite, dans <a href="#/reglages">Réglages</a>.</p>`}
      ${get('context') ? '' : `<p class="note">Tu as un fichier perso (contexte et récit) ? Importe-le dans <a href="#/reglages">Réglages</a> avant le test.</p>`}`);
  }
  const plan = get('plan', {});
  const done = get('progress', {}).lecons ?? {};
  const next = LECONS.find((l) => !done[l.n]);
  const drills = (plan.echauffements ?? []).map((id) => EX[id]).filter(Boolean);
  const jour = drills.length ? drills : ECHAUFFEMENTS.slice(0, 3).map((d) => EX[d.id]);
  const ligne = (d) => `<li><a class="row-link" href="#/exercice/${d.id}"><span class="title">${t(d.titre)}</span><span class="meta">${d.duree} s</span></a></li>`;
  const conseil = next && plan.conseils?.find((c) => c.lecon === next.n)?.conseil;
  const last = profile.bilans?.at(-1) ?? profile;
  const bilanDue = (Date.now() - new Date(last.date)) / 864e5 >= 14;
  const nonAnalyse = !last.analysis && get('key') && last.takes?.some((x) => x.transcript);
  const n = streak();
  const ficheEnCours = ficheCourante(FICHES, get('langue', {}));
  const nbRev = aReviser(get('carnet', []), jourJ()).length;
  const auj = JOURS[new Date().getDay()];
  show(`
    <p class="mono muted">${new Date().toLocaleDateString('sv')}</p>
    ${n
      ? `<h1 class="serie-titre" style="--jour:${auj.c}"><span class="surligne ${auj.fonce ? 'fonce' : ''}">${n} jour${n > 1 ? 's' : ''}</span> d'affilée.</h1>`
      : "<h1>Aujourd'hui, une leçon et un échauffement.</h1>"}
    ${nonAnalyse ? `<div class="block"><h3>Ton ${profile.bilans?.length ? 'bilan' : 'test'} n'a pas été analysé</h3><p>Le coach peut l'analyser à partir des transcriptions. L'audio, lui, n'est pas gardé.</p><a class="btn primary" href="#/test/analyse">Lancer l'analyse</a></div>` : ''}
    ${bilanDue ? `<div class="block"><h3>C'est l'heure du bilan</h3><p>Deux semaines depuis ta dernière mesure. Les deux mêmes enregistrements, pour voir ce qui a bougé.</p><a class="btn primary" href="#/test">Faire le bilan</a></div>` : ''}
    <div class="duo">
      <div class="duo-a">
        ${next ? `
          <section class="block fort">
            <div class="entete-carte"><p class="mono muted">LEÇON ${String(next.n).padStart(2, '0')}/15 · ${next.duree} MIN</p>${memphis(next.n)}</div>
            <h2>${t(next.titre)}</h2>
            <p>${t(next.technique)}</p>
            ${conseil ? `<p class="note">${t(conseil)}</p>` : ''}
            <a class="btn primary" href="#/lecon/${next.n}">Ouvrir la leçon</a>
          </section>`
          : `<div class="vide">${memphis(0, true)}<h2>Les quinze leçons sont faites.</h2><p>Continue avec les <a href="#/situations">situations</a> et les échauffements.</p></div>`}
        <section class="block langue">
          <p class="mono">ATELIER LANGUE · 5 MIN</p>
          <h2>${nbRev ? `${nbRev} révision${nbRev > 1 ? 's' : ''}, ` : ''}${ficheEnCours ? `fiche ${ficheEnCours.n}` : 'entretien'}</h2>
          ${embleme(ficheEnCours ?? FICHES[0])}
          <a class="btn primary" href="#/langue/seance">Commencer l'atelier</a>
        </section>
        <div class="sep" aria-hidden="true"></div>
        <h2>Échauffements du jour</h2>
        <ul class="plain">${jour.map(ligne).join('')}</ul>
        <details><summary>Autres échauffements</summary><ul class="plain">${ECHAUFFEMENTS.map((d) => EX[d.id]).filter((d) => !jour.includes(d)).map(ligne).join('')}</ul></details>
      </div>
      ${profile.analysis ? `<aside class="duo-b"><h2>Tes piliers</h2>${piliersBars(last.analysis?.piliers ?? profile.analysis.piliers)}</aside>` : ''}
    </div>`);
}

/* ---------- Programme et leçon ---------- */

function programme() {
  const done = get('progress', {}).lecons ?? {};
  const next = LECONS.find((l) => !done[l.n]);
  const nb = Object.keys(done).length;
  const utilises = [...new Set(LECONS.map((l) => l.piliers[0]))];
  show(`
    <h1>${nb} sur 15.</h1>
    <p class="mono muted">${nb} FAITE${nb > 1 ? 'S' : ''} / ${next ? 1 : 0} SUIVANTE / ${15 - nb - (next ? 1 : 0)} À VENIR</p>
    <ul class="legende">${utilises.map((k) => `<li><i class="pastille" data-p="${k}">${picto(k, 18)}</i><span>${t(PILIERS[k].nom)}</span></li>`).join('')}</ul>
    <ol class="mosaique">${LECONS.map((l) => `
      <li><a class="tuile ${done[l.n] ? 'fait' : ''} ${l === next ? 'suivante' : ''}" data-p="${l.piliers[0]}" href="#/lecon/${l.n}">
        <span>
          <span class="tete-tuile"><b class="num">${String(l.n).padStart(2, '0')}</b><span class="piliers">${l.piliers.map((p) => picto(p, 20)).join('')}<span class="sr">${l.piliers.map((p) => t(PILIERS[p].nom)).join(', ')}</span></span></span>
          ${l === next ? '<span class="etiquette">Suivante</span>' : ''}
        </span>
        <span><span class="nom">${t(l.titre)}${done[l.n] ? '<span class="sr"> (faite)</span>' : ''}</span><span class="duree">${l.duree} min</span></span>
      </a></li>`).join('')}
    </ol>
    ${next ? `<p class="mono muted">${String(next.n).padStart(2, '0')} · ${t(next.titre)} · ${next.duree} MIN</p>
    <a class="btn primary" href="#/lecon/${next.n}">Ouvrir la leçon ${String(next.n).padStart(2, '0')}</a>` : ''}`);
}

function lastSessionFor(exId) {
  return sessions().find((s) => s.exId === exId);
}

function lecon(n) {
  const l = LECONS.find((x) => x.n === Number(n));
  if (!l) return today();
  const progress = get('progress', {});
  const done = progress.lecons?.[l.n];
  const conseil = get('plan', {}).conseils?.find((c) => c.lecon === l.n)?.conseil;
  show(`
    <div class="entete-carte"><a class="back" href="#/programme">Programme</a>${memphis(l.n)}</div>
    <h1>${l.n}. ${t(l.titre)}</h1>
    <p class="muted">${l.duree} min · ${l.piliers.map((p) => t(PILIERS[p].nom)).join(', ')}</p>
    ${conseil ? `<p class="note">${t(conseil)}</p>` : ''}
    ${l.cartes.map((c) => `<div class="carte"><h3>${t(c.titre)}</h3><p>${t(c.texte)}</p></div>`).join('')}
    <h2>La technique</h2>
    <p class="technique">${t(l.technique)}</p>
    <h2>Exercices</h2>
    <ul class="plain">${l.exercices.map((e) => {
      const s = lastSessionFor(e.id);
      const score = s?.feedback && nf(mean(Object.values(s.feedback.scores)));
      return `<li><a class="row-link" href="#/exercice/${e.id}"><span class="title">${t(e.titre)}</span><span class="meta">${s ? (s.feedback?.note ?? (score ? `${score}/10` : 'fait')) : `${e.cible} s`}</span></a></li>`;
    }).join('')}</ul>
    <h2>Défi de la semaine</h2>
    <p>${t(l.defi)}</p>
    <div class="actions">
      <button class="btn ${done ? '' : 'primary'}" data-act="done">${done ? `Faite le ${dateFr(done)}. Annuler` : 'Marquer la leçon comme faite'}</button>
    </div>`).onclick = (e) => {
    if (!e.target.closest('[data-act="done"]')) return;
    progress.lecons ??= {};
    if (done) delete progress.lecons[l.n]; else progress.lecons[l.n] = new Date().toISOString();
    set('progress', progress);
    lecon(n);
  };
}

/* ---------- Situations ---------- */

function situations() {
  show(`
    <h1>Mes situations</h1>
    <p class="muted">Les prises de parole qui t'attendent, à répéter quand tu veux.</p>
    ${SITUATIONS.map((s) => `
      <h2>${t(s.titre)}</h2>
      <p class="didascalie">${t(s.contexte)}</p>
      <ul class="plain">${s.exercices.map((e) => `<li><a class="row-link" href="#/exercice/${e.id}"><span class="title">${t(e.titre)}</span><span class="meta">${e.cible} s</span></a></li>`).join('')}</ul>`).join('')}`);
}

/* ---------- Enregistrement : consigne, préparation, plateau ---------- */

function texteLu(s) {
  return t(s).replace(/ (\/\/?) /g, (_, m) => ` <span class="pause" aria-label="pause de ${m.length} seconde${m.length > 1 ? 's' : ''}">${m}</span> `);
}

// Déroule une prise : consigne, préparation, enregistrement. Appelle onDone(prise) à la fin.
function prise(ex, consigne, onDone, { retour = ex.retour, etiquette = ex.origine } = {}) {
  let rec = null, timer = null;
  cleanup = () => { clearInterval(timer); rec?.stop(); rec = null; };

  const consigneView = () => {
    show(`
      <a class="back" href="${retour}">${t(etiquette)}</a>
      <h1>${t(ex.titre)}</h1>
      <p class="didascalie">${t(consigne)}</p>
      ${ex.texte ? `<p class="texte-lu">${texteLu(ex.texte)}</p>` : ''}
      <p class="muted">Durée visée : ${ex.cible} secondes.</p>
      ${canTranscribe ? '' : '<p class="note">Ce navigateur ne propose pas la dictée : pas de surtitres pendant que tu parles. Le coach écoutera quand même l\'enregistrement.</p>'}
      <div class="actions">
        ${ex.prep ? `<button class="btn primary" data-act="prep">Me préparer (${ex.prep} s)</button>` : ''}
        <button class="btn ${ex.prep ? '' : 'primary'}" data-act="go">Commencer${ex.prep ? ' sans préparation' : ''}</button>
      </div>`).onclick = (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'prep') prep();
      if (act === 'go') go();
    };
  };

  const prep = () => {
    let left = ex.prep;
    show(`<section class="stage lever">
      <p class="consigne-mini">${t(consigne)}</p>
      <div class="centre"><div class="compte" id="compte">${left}</div><p>Prépare ton chemin, pas tes phrases.</p></div>
      <div class="centre"><button class="btn primary" data-act="go">Commencer maintenant</button></div>
    </section>`).onclick = (e) => e.target.closest('[data-act="go"]') && go();
    timer = setInterval(() => {
      left -= 1;
      document.getElementById('compte').textContent = left;
      if (left <= 0) go();
    }, 1000);
  };

  const go = async () => {
    clearInterval(timer);
    show(`<section class="stage lever" id="stage">
      <div class="surtitres" id="surtitres" aria-live="polite"><span>${canTranscribe ? 'La transcription apparaît ici.' : ''}</span></div>
      <div class="centre">
        <div class="mot" id="mot"></div>
        <div class="anneau-zone">
          <svg class="anneau" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47" pathLength="1"/></svg>
          <div class="chrono" id="chrono">0:00 <small>/ ${mmss(ex.cible)}</small></div>
        </div>
        <p class="relance" aria-hidden="true">Respire. Reprends ta dernière idée.</p>
        ${ex.texte ? `<p class="consigne-mini">${texteLu(ex.texte)}</p>` : ''}
      </div>
      <div class="centre"><button class="rec-btn" data-act="stop" aria-label="Arrêter l'enregistrement"></button><p class="small">Touche pour arrêter</p></div>
    </section>`).onclick = (e) => e.target.closest('[data-act="stop"]') && stop();
    const stage = document.getElementById('stage');
    let parole = false, silence = null;
    try {
      rec = await startRecording({
        // Surtitres : les derniers mots en pleine lumière, les précédents s'estompent vers le haut.
        onTranscript: (txt) => {
          const el = document.getElementById('surtitres');
          const mots = txt.slice(-320).split(' ');
          if (el) el.innerHTML = `<span>${esc(mots.slice(0, -8).join(' '))} <b>${esc(mots.slice(-8).join(' '))}</b></span>`;
        },
        onLevel: (rms) => {
          stage.style.setProperty('--level', Math.min(1, rms * 12).toFixed(2));
          // Anneau de silence : il se remplit en 2 s, devient doré à 1 s (pause choisie), propose une relance à 3 s.
          if (rms >= SILENCE_RMS) { parole = true; silence = null; } else if (parole) silence ??= Date.now();
          const sec = silence ? (Date.now() - silence) / 1000 : 0;
          stage.style.setProperty('--silence', Math.min(1, sec / 2).toFixed(2));
          stage.classList.toggle('pause-choisie', sec >= 1);
          stage.classList.toggle('blanc', sec >= 3);
        },
      });
    } catch (err) {
      rec = null;
      const msg = err.name === 'NotAllowedError'
        ? "Micro refusé. Sur Android, dans Chrome : touche l'icône à gauche de l'adresse, puis Autorisations, et active le micro. Sur ordinateur : l'icône à gauche de l'adresse."
        : err.name === 'NotFoundError' ? 'Aucun micro détecté.' : `Impossible de démarrer le micro : ${err.message}`;
      return show(`<a class="back" href="${retour}">${t(etiquette)}</a><h1>${t(ex.titre)}</h1><p class="error">${t(msg)}</p><div class="actions"><button class="btn primary" onclick="location.reload()">Réessayer</button></div>`);
    }
    const t0 = Date.now();
    const max = Math.max(ex.cible * 2, ex.cible + 60);
    let slot = 0;
    timer = setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      const chrono = document.getElementById('chrono');
      chrono.firstChild.textContent = mmss(s) + ' ';
      chrono.classList.toggle('over', s > ex.cible);
      if (ex.motsImposes && Math.floor(s / 20) > slot) { slot = Math.floor(s / 20); document.getElementById('mot').textContent = pick(MOTS); }
      if (s >= max) stop();
    }, 1000);
  };

  const stop = async () => {
    clearInterval(timer);
    if (!rec) return;
    const r = rec;
    rec = null;
    const fini = r.stop(); // la lumière baisse pendant que l'enregistrement se termine
    document.getElementById('stage')?.classList.add('noir');
    await new Promise((ok) => setTimeout(ok, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600));
    show(attente('Je mesure ta prise de parole.'));
    const take = await fini;
    onDone({ ...take, metrics: analyze(take, ex.cible), consigne });
  };

  consigneView();
}

/* ---------- Exercice et retour ---------- */

function exercice(id) {
  const ex = EX[id];
  if (!ex) return today();
  if (ex.respiration) return respiration(ex);
  if (ex.intonation) return intonation();
  if (ex.aveugle) return intentions();
  lancer(ex, `#/exercice/${ex.id}`);
}

// Simulation : on répond à l'objection que le coach a soulevée après une prise de parole.
function objection(id) {
  const parent = sessions().find((x) => x.id === id);
  const f = parent?.feedback;
  if (!f?.objection) return today();
  lancer({
    id: 'objection', titre: "Répondre à l'objection", origine: parent.titre, retour: `#/session/${id}`, prep: 10, cible: 45,
    consigne: `On te répond : « ${f.objection} » Réponds en 45 secondes.`,
    criteres: `Débat comme conversation : objection accueillie, pas de contre-attaque. Réponse brève, puis retour au message maître${f.messageMaitre ? ` (« ${f.messageMaitre.phrase} »)` : ''}. Aucune excuse.`,
  }, `#/objection/${id}`);
}

function lancer(ex, refaire) {
  prise(ex, fill(ex.consigne), (take) => {
    const s = {
      id: crypto.randomUUID(), date: new Date().toISOString(), exId: ex.id, titre: ex.titre, origine: ex.origine,
      retour: ex.retour, refaire, criteres: ex.criteres,
      consigne: take.consigne, transcript: take.transcript, metrics: take.metrics, feedback: null, error: null,
      rec: { durationSec: take.durationSec, speechStart: take.speechStart, speechEnd: take.speechEnd, pauses: take.pauses },
    };
    saveSession(s);
    if (take.blob) audios.set(s.id, { url: take.audioUrl, blob: take.blob });
    location.hash = `#/session/${s.id}`;
  });
}

const pending = new Set();
let revele = null; // séance dont le retour vient d'arriver : on le révèle une fois

async function askFeedback(s) {
  if (pending.has(s.id)) return;
  pending.add(s.id);
  const ex = EX[s.exId] ?? {};
  try {
    const audio = await wav(audios.get(s.id)?.blob);
    s.feedback = await feedback(get('key'), { titre: s.titre, consigne: s.consigne, texte: ex.texte, criteres: s.criteres ?? ex.criteres }, s, perso(), audio);
    s.error = null;
    set('carnet', versCarnet(get('carnet', []), s.feedback.corrections, s.id, jourJ()));
    // La transcription de Gemini garde les « euh » que la dictée efface : on recalcule les mesures avec elle.
    if (s.feedback.transcription) {
      s.transcriptIA = s.feedback.transcription;
      if (s.rec) s.metrics = analyze({ ...s.rec, transcript: s.transcriptIA }, s.metrics.targetSec ?? undefined);
    }
  } catch (e) {
    s.error = errMsg(e);
  }
  pending.delete(s.id);
  saveSession(s);
  if (s.feedback) revele = s.id;
  if (location.hash === `#/session/${s.id}`) sessionView(s.id);
}

function sessionView(id) {
  const s = sessions().find((x) => x.id === id);
  if (!s) return today();
  const ex = EX[s.exId] ?? {};
  const key = get('key');
  const canAsk = key && (s.transcript || audios.has(s.id));
  if (canAsk && !s.feedback && !s.error && !s.manuel) askFeedback(s);

  const anim = revele === id;
  revele = null;
  let fb;
  if (s.feedback) fb = `<div class="${anim ? 'revele' : ''}">${notes(s.feedback, s.id)}</div>`;
  else if (!key) fb = '<p class="note">Ajoute ta clé Google AI Studio, gratuite, dans <a href="#/reglages">Réglages</a> pour que le coach analyse ta prise de parole.</p>';
  else if (!canAsk) fb = '<p class="note">Ni transcription ni audio pour cette séance : pas d\'analyse possible. Recommence l\'exercice.</p>';
  else if (s.error) fb = `<p class="error">${t(s.error)}</p><button class="btn" data-act="retry">Réessayer</button>`;
  else if (pending.has(s.id)) fb = attente("Le coach écoute ta prise de parole. Compte trente secondes à une minute.");
  else fb = '<button class="btn primary" data-act="retry">Obtenir le retour du coach</button>';

  show(`
    <a class="back" href="${s.retour ?? ex.retour ?? '#/progres'}">${t(s.origine)}</a>
    <h1>${t(s.titre)}</h1>
    <p class="muted">${dateFr(s.date)}</p>
    ${audios.has(s.id) ? `<p><audio controls src="${audios.get(s.id).url}" style="width:100%"></audio></p>` : ''}
    ${s.langue ? `${chaine(s.langue.map((r) => ({ texte: r.reussi ? 'juste' : 'à reprendre', joint: r.reussi })))}<ul>${s.langue.map((r) => `<li>${r.reussi ? 'Juste' : 'À reprendre'} : « ${t(r.dit || '(rien entendu)')} »</li>`).join('')}</ul>` : s.souffle ? `${palier(s.note)}<p>Expirations : ${s.souffle.map((d) => `${nf(d)} s`).join(', ')}.</p>` : s.aveugle ? `<ul>${s.aveugle.map((x) => `<li>${x.note ? `${x.note}. ` : ''}Voulu : ${t(nomIntention(x.voulu))}. Entendu : ${t(nomIntention(x.entendu))}.</li>`).join('')}</ul>`
      : s.intonation ? `<ul>${s.intonation.map((x) => (typeof x === 'number' ? { chute: x } : x)).map((x) => `<li>${x.note ? `${x.note}. ` : ''}Ta voix a commencé à descendre ${nf(x.chute)} s avant la fin.</li>`).join('')}</ul>`
      : mesures(s.metrics)}
    ${s.manuel && !s.transcript ? '' : `<h2>Notes du coach</h2>${fb}`}
    <details><summary>Consigne et transcription</summary><p class="didascalie">${t(s.consigne)}</p>${s.transcriptIA ? `<h3>Ce que le coach a entendu</h3><p>${t(s.transcriptIA)}</p><h3>Dictée du navigateur</h3>` : ''}<p>${t(s.transcript || '(vide)')}</p></details>
    <div class="actions">
      ${s.refaire || ex.id ? `<a class="btn" href="${s.refaire ?? `#/exercice/${ex.id}`}">Recommencer</a>` : ''}
      <a class="btn" href="${s.retour ?? ex.retour ?? '#/'}">Continuer</a>
    </div>`);
  if (anim) cascade(app.querySelector('.revele'));
  app.onclick = (e) => {
    if (!e.target.closest('[data-act="retry"]')) return;
    s.error = null;
    askFeedback(s);
    sessionView(id);
  };
}

/* ---------- Fins de phrase ---------- */

// Consignes de jeu données à la voix Gemini (en anglais, comme le recommande la doc).
const STYLES = {
  portee: 'Calm, assured native French speaker addressing a room. Keep pitch and energy up through every word. Slight rise at the end of each comma group. Fall only on the very last syllable, slightly lengthened and clearly audible.',
  avalee: 'Same speaker losing conviction: from the last three or four words, the voice drops too early, fades in volume and trails off, almost swallowed.',
};
const lecteur = new Audio();
const modeles = new Map(); // « version|texte » -> { url, fin } : voix modèle et sa courbe

const phraseTexte = (p) => p.replace(/[{}]/g, '').replace(/ \| /g, ', ');
// Phrase saisie : une virgule sépare deux groupes, le dernier mot porte la descente.
const marquer = (s) => s.trim().split(/\s*,\s*/).join(' | ').replace(/([\p{L}'’-]+)([^\p{L}]*)$/u, '{$1}$2');
const phraseVue = (p) => p.split(' | ').map((g, i, all) => i < all.length - 1
  ? `${t(g)} <span class="fleche" title="légère montée">↗</span>`
  : `${t(g).replace(/\{(.+?)\}/, '<b>$1</b>')} <span class="fleche" title="descente">↘</span>`).join(' ');

async function modele(texte, version, style = STYLES[version]) {
  const k = `${version}|${texte}`;
  if (modeles.has(k)) return modeles.get(k);
  // Chaque voix n'est générée qu'une fois, puis gardée sur l'appareil.
  const req = new Request(`voix-modele?${new URLSearchParams({ version, texte })}`);
  const cache = globalThis.caches ? await caches.open('eloq-voix').catch(() => null) : null;
  let blob = await (await cache?.match(req))?.blob();
  if (!blob) {
    blob = await speak(get('key'), texte, style);
    await cache?.put(req, new Response(blob)).catch(() => {});
  }
  const m = { url: URL.createObjectURL(blob), fin: finDePhrase(contour(await decodeMono(blob), 16000)) };
  modeles.set(k, m);
  return m;
}

function direNavigateur(texte) {
  const u = new SpeechSynthesisUtterance(texte);
  u.lang = 'fr-FR';
  u.rate = 0.9;
  u.voice = speechSynthesis.getVoices().find((v) => v.lang === 'fr-FR') ?? null;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function verdictFin(toi, mod, note) {
  if (!toi) return "Je n'entends pas assez ta voix. Rapproche le téléphone et recommence.";
  if (toi.monte) return "Ta voix monte à la fin : l'affirmation sonne comme une question. Fais descendre la dernière syllabe.";
  const ecart = `Ta voix descend ${nf(toi.chute)} s avant la fin${mod ? `, celle du modèle ${nf(mod.chute)} s` : ''}.`;
  if (note === 'Moyen') return `Presque. ${ecart} Tiens encore un peu.`;
  if (note === 'Répéter') return `${ecart} Tiens la hauteur et le volume jusqu'à la dernière syllabe.`;
  return `Tu tiens jusqu'au bout${mod ? ', comme le modèle' : ''} : ta voix ne descend que sur la fin.`;
}

const W = 300, H = 80, ST = [-8, 6];
const echelle = ([lo, hi]) => (v) => (H - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * H).toFixed(1);
// Médiane glissante sur 5 trames : enlève les sauts isolés de la mesure.
const lisse = (c, k) => c.map((p, i) => {
  if (p[k] == null) return { x: p.x, v: null };
  const w = c.slice(Math.max(0, i - 2), i + 3).map((q) => q[k]).filter((v) => v != null).sort((a, b) => a - b);
  return { x: p.x, v: w[Math.floor(w.length / 2)] };
});

// Réécoute : un curseur parcourt les courbes ; x (0 à 1) fait partir la lecture de ce point de la phrase.
let tete = 0;
async function jouer(url, fin, x = 0) {
  cancelAnimationFrame(tete);
  if (lecteur.src !== url) {
    lecteur.src = url;
    await new Promise((r) => lecteur.addEventListener('loadedmetadata', r, { once: true }));
  }
  lecteur.currentTime = fin ? Math.max(0, fin.start + x * fin.duree) : 0;
  await lecteur.play();
  const lignes = [...document.querySelectorAll('.fin .tete')];
  if (!fin || !lignes.length) return;
  const pas = () => {
    const pos = (lecteur.currentTime - fin.start) / fin.duree;
    const fini = lecteur.paused || pos > 1;
    for (const l of lignes) {
      l.style.visibility = !fini && pos >= 0 ? 'visible' : 'hidden';
      l.setAttribute('x1', (pos * W).toFixed(1));
      l.setAttribute('x2', (pos * W).toFixed(1));
    }
    if (!fini) tete = requestAnimationFrame(pas);
  };
  tete = requestAnimationFrame(pas);
}

// Deux petits graphiques côte à côte dans le temps : hauteur puis énergie, modèle en gris, toi en couleur.
// Ta courbe se dévoile de gauche à droite ; toucher un graphique réécoute ta voix à partir de ce point.
function courbesFin(toi, mod) {
  const graphe = (k, bornes, titre) => {
    const y = echelle(bornes);
    const traits = (fin, cls) => {
      if (!fin) return '';
      const segs = [[]];
      for (const p of lisse(fin.courbe, k)) {
        if (p.v == null) segs.push([]);
        else segs.at(-1).push(`${(p.x * W).toFixed(1)},${y(p.v)}`);
      }
      const xc = ((1 - fin.part) * W).toFixed(1);
      return segs.filter((s) => s.length > 1).map((s) => `<polyline class="${cls}" points="${s.join(' ')}"/>`).join('')
        + `<line class="${cls} marque" x1="${xc}" x2="${xc}" y1="0" y2="${H}"/>`;
    };
    return `<figure class="fin-fig"><figcaption class="small muted">${titre}</figcaption>
      <svg class="fin" viewBox="0 0 ${W} ${H}" data-act="seek" aria-hidden="true">
        <defs><clipPath id="voile-${k}"><rect class="voile" y="-6" width="${W}" height="${H + 12}"/></clipPath></defs>
        <line class="zero" x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}"/>${traits(mod, 'modele')}<g clip-path="url(#voile-${k})">${traits(toi, 'toi')}</g>
        <line class="tete" x1="0" x2="0" y1="-4" y2="${H + 4}"/>
      </svg></figure>`;
  };
  return `<div class="legend"><span><i style="background:var(--toi)"></i>Toi</span>${mod ? '<span><i style="background:var(--modele)"></i>Modèle</span>' : ''}</div>
    ${graphe('st', ST, 'Hauteur, autour de ta note moyenne')}
    ${graphe('db', [-30, 8], 'Énergie')}
    <p class="small muted">Le trait vertical marque le moment où la voix commence à descendre. Touche une courbe pour réécouter à partir de ce point.</p>`;
}

// Pendant que tu parles : ta hauteur se trace en direct sur la trace fantôme du modèle.
function traceDirecte(zone, mod) {
  const y = echelle(ST);
  zone.innerHTML = `<p class="small muted">${mod ? "Suis la trace grise du modèle jusqu'à la dernière syllabe." : "Ta hauteur de voix, en direct."}</p>
    <svg class="fin direct" viewBox="0 0 ${W} ${H}" aria-hidden="true"><line class="zero" x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}"/><polyline class="modele"/><polyline class="toi"/></svg>`;
  const [fantome, trace] = zone.querySelectorAll('polyline');
  const pts = [], ref = [];
  let t0 = null;
  return (buf, rate) => {
    const hz = hauteurTrame(buf, rate);
    if (!hz) return;
    const t = performance.now() / 1000;
    t0 ??= t;
    if (ref.length < 15) ref.push(hz); // ta note de référence : médiane de tes premières trames de voix
    pts.push([t - t0, 12 * Math.log2(hz / [...ref].sort((a, b) => a - b)[ref.length >> 1])]);
    const D = Math.max(mod?.duree ?? 3, t - t0);
    trace.setAttribute('points', pts.map(([u, v], i) => {
      const w = pts.slice(Math.max(0, i - 1), i + 2).map((q) => q[1]).sort((a, b) => a - b); // médiane sur 3
      return `${((u / D) * W).toFixed(1)},${y(w[w.length >> 1])}`;
    }).join(' '));
    if (mod) fantome.setAttribute('points', lisse(mod.courbe, 'st').filter((p) => p.v != null).map((p) => `${((p.x * mod.duree) / D * W).toFixed(1)},${y(p.v)}`).join(' '));
  };
}

const etat = (msg) => { const el = document.getElementById('etat'); if (el) el.textContent = msg; };
const micErr = (err) => (err.name === 'NotAllowedError' ? 'Micro refusé. Autorise-le pour ce site, puis recommence.' : `Micro indisponible : ${err.message}`);

// Prise d'une seule phrase, micro sans traitement : s'arrête seule après 1,2 s de silence, ou au bout de 15 s.
// fin() est appelée à l'arrêt automatique ; l'enregistreur renvoyé s'arrête aussi à la main avec stop().
async function prisePhrase({ onSamples, fin }) {
  let pic = 0, calme = null, fini = false;
  const seul = () => { if (!fini) { fini = true; fin(); } };
  const rec = await startRecording({
    brut: true,
    onSamples: (buf, rate) => pic > 0.01 && onSamples?.(buf, rate),
    onLevel: (rms) => {
      pic = Math.max(pic, rms);
      if (pic < 0.01) return; // pas encore de voix
      if (rms > pic * 0.2) calme = null;
      else if (Date.now() - (calme ??= Date.now()) > 1200) seul();
    },
  });
  setTimeout(seul, 15000);
  return { stop: () => { fini = true; return rec.stop(); } };
}

function intonation(id) {
  const liste = FINS_DE_PHRASE.flatMap((n, ni) => n.phrases.map((p, i) => ({ id: `n${ni + 1}-${i + 1}`, niveau: n.niveau, p })));
  const perso = get('phrasePerso', '');
  const resultats = get('intonation', {});
  const item = id === 'perso' ? (perso && { id, niveau: 'Ta phrase', p: marquer(perso) }) : liste.find((x) => x.id === id);

  if (!item) {
    show(`
      <a class="back" href="#/">Aujourd'hui</a>
      <h1>Fins de phrase</h1>
      <p class="lead">Ta voix tient jusqu'à la dernière syllabe, puis descend. Avant, chaque groupe de mots finit par une légère montée qui annonce la suite.</p>
      ${FINS_DE_PHRASE.map((n, ni) => `<h2>${t(n.niveau)}</h2><ul class="plain">${n.phrases.map((p, i) => {
        const r = resultats[`n${ni + 1}-${i + 1}`];
        return `<li><a class="row-link" href="#/intonation/n${ni + 1}-${i + 1}"><span class="title">${t(phraseTexte(p))}</span><span class="meta">${r ? `${r.note ? `${r.note}, ` : ''}${nf(r.chute)} s` : ''}</span></a></li>`;
      }).join('')}</ul>`).join('')}
      <h2>Ta phrase</h2>
      <form id="perso">
        <label class="small muted" for="phrase">Une phrase de ton récit ou de ton prochain entretien. Une virgule sépare deux groupes.</label>
        <textarea id="phrase" class="court" name="p" rows="3" required>${esc(perso)}</textarea>
        <div class="actions"><button class="btn primary">M'entraîner sur cette phrase</button></div>
      </form>
      <p class="small muted">À droite, ton dernier essai : sa note, puis le temps entre le début de la descente et la fin de ta phrase. Plus il est court, mieux tu tiens.</p>`).onsubmit = (e) => {
      e.preventDefault();
      set('phrasePerso', new FormData(e.target).get('p').trim());
      location.hash = '#/intonation/perso';
    };
    return;
  }

  const texte = phraseTexte(item.p);
  const key = get('key');
  const essais = [];
  let rec = null, toi = null, session = null;
  cleanup = () => { rec?.stop(); rec = null; lecteur.pause(); cancelAnimationFrame(tete); globalThis.speechSynthesis?.cancel(); };
  if (key) modele(texte, 'portee').catch(() => {}); // prêt pour la trace fantôme et la première écoute

  show(`
    <a class="back" href="#/intonation">Fins de phrase</a>
    <p class="muted">${t(item.niveau)}</p>
    <p class="phrase-ton">${phraseVue(item.p)}</p>
    <p class="didascalie">${key ? 'Écoute les deux versions, puis répète la version portée.' : 'Écoute le modèle, puis répète.'} L'enregistrement s'arrête seul quand tu te tais.</p>
    <div class="actions">
      ${key ? '<button class="btn" data-act="avalee">Écouter la voix qui lâche</button>' : ''}
      <button class="btn" data-act="portee">Écouter la voix portée</button>
      <button class="btn primary" data-act="rec" id="rec">Répéter</button>
    </div>
    ${key ? '' : '<p class="note">Sans clé Google AI Studio, le modèle est la voix du navigateur : pas de version qui lâche, pas de courbe du modèle.</p>'}
    <p class="small muted" id="etat" role="status"></p>
    <div id="resultat"></div>`).onclick = (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'avalee' || act === 'portee') ecouter(act);
    if (act === 'moi' && toi) jouer(toi.url, toi.fin);
    if (act === 'seek' && toi) {
      const b = e.target.closest('svg').getBoundingClientRect();
      jouer(toi.url, toi.fin, (e.clientX - b.left) / b.width);
    }
    if (act === 'rec') rec ? arreter() : enregistrer();
  };
  async function ecouter(version) {
    if (!key) return direNavigateur(texte);
    etat(modeles.has(`${version}|${texte}`) ? '' : 'Le modèle prépare sa voix, quelques secondes la première fois.');
    try {
      const m = await modele(texte, version);
      etat('');
      jouer(m.url, version === 'portee' ? m.fin : null);
    } catch (err) {
      etat(`${errMsg(err)} Voix du navigateur à la place.`);
      direNavigateur(texte);
    }
  }

  async function enregistrer() {
    lecteur.pause();
    const zone = document.getElementById('resultat');
    try {
      rec = await prisePhrase({ onSamples: traceDirecte(zone, modeles.get(`portee|${texte}`)?.fin), fin: arreter });
    } catch (err) {
      rec = null;
      zone.innerHTML = '';
      return etat(micErr(err));
    }
    document.getElementById('rec').textContent = 'Arrêter';
    etat("Je t'écoute.");
  }

  async function arreter() {
    const r = rec;
    rec = null;
    if (!r) return;
    const bouton = document.getElementById('rec');
    if (bouton) bouton.textContent = 'Répéter';
    etat('Je compare.');
    const take = await r.stop();
    const pcm = take.blob ? await decodeMono(take.blob) : null;
    const fin = pcm ? finDePhrase(contour(pcm, 16000)) : null;
    let mod = null;
    if (key) try { mod = (await modele(texte, 'portee')).fin; } catch { /* courbe du modèle indisponible : on montre la tienne seule */ }
    toi = { url: pcm ? URL.createObjectURL(new Blob([wavOctets(pcm, 16000)], { type: 'audio/wav' })) : take.audioUrl, fin };
    etat('');
    const note = noteFin(fin, mod);
    if (fin) {
      const chute = Math.round(fin.chute * 100) / 100;
      essais.push({ chute, note });
      resultats[item.id] = { chute, note, date: new Date().toISOString() };
      set('intonation', resultats);
      session ??= { id: crypto.randomUUID(), date: new Date().toISOString(), exId: 'fins-de-phrase', titre: 'Fins de phrase', origine: 'Échauffement', retour: '#/intonation', refaire: `#/intonation/${item.id}`, consigne: texte, transcript: '', metrics: analyze({}), feedback: null, manuel: true };
      saveSession({ ...session, intonation: essais });
    }
    const zone = document.getElementById('resultat');
    if (zone) zone.innerHTML = `
      ${palier(note)}
      <p class="verdict">${t(verdictFin(fin, mod, note))}</p>
      ${fin ? courbesFin(fin, mod) : ''}
      ${essais.length > 1 ? `<p class="small">Tes essais : ${essais.map((x) => `${x.note} (${nf(x.chute)} s)`).join(', puis ')}.</p>` : ''}
      <div class="actions"><button class="btn" data-act="moi">Réécouter ta voix</button><button class="btn" data-act="portee">Réécouter le modèle</button></div>`;
  }
}

/* ---------- Trois intentions, à l'aveugle ---------- */

Object.assign(STYLES, {
  rassurer: 'Warm, calm native French speaker reassuring a worried colleague: slow pace, lower soft voice, rounded melody, a smile in the voice, almost no emphasis, long gently descending ending.',
  convaincre: 'Confident native French speaker convincing a jury: steady pace, full projected voice, clear emphasis on the capitalized word, short pause before the key argument, firm clean fall on the last syllable.',
  alerter: 'Native French speaker raising an alarm without panicking: sharp attack, quicker pace, higher tenser and louder voice, detached words, strong emphasis on the capitalized word, short firm ending.',
});
const nomIntention = (k) => INTENTIONS[k]?.nom.toLowerCase() ?? 'aucune intention nette';
// Met en valeur le mot d'insistance (en gras à l'écran, en majuscules pour guider la voix Gemini).
const insiste = (texte, mot, fn) => (mot ? texte.replace(new RegExp(`(?<!\\p{L})${mot}(?!\\p{L})`, 'u'), fn) : texte);

function intentions(arg) {
  const i = (Number(arg) || 0) % PHRASES_INTENTION.length;
  const ph = PHRASES_INTENTION[i];
  const key = get('key');
  const bilan = get('intentions', {});
  const dire = (k) => insiste(ph.texte, ph[k], (m) => m.toUpperCase());
  const jeu = [];
  let rec = null, toi = null, voulu = null, session = null;
  cleanup = () => { rec?.stop(); rec = null; lecteur.pause(); };

  show(`
    <a class="back" href="#/">Aujourd'hui</a>
    <h1>Trois intentions</h1>
    <p class="lead">Joue le sous-texte, pas le ton. Écoute les trois modèles, puis dis la phrase avec une intention choisie en secret : le coach dit ce qu'il entend.</p>
    <p class="phrase-ton">${t(ph.texte)}</p>
    <div class="actions"><a class="btn" href="#/intentions/${i + 1}">Autre phrase</a></div>
    ${Object.entries(INTENTIONS).map(([k, v]) => `
      <div class="carte">
        <h3>${t(v.nom)}</h3>
        <p class="didascalie">${t(v.soustexte)}</p>
        <p>${insiste(t(ph.texte), ph[k], (m) => `<b>${m}</b>`)}</p>
        <p class="small muted">${t(v.reperes)}</p>
        <div class="actions">${key ? `<button class="btn" data-act="ecouter" data-k="${k}">Écouter</button>` : ''}${bilan[k] ? `<span class="small muted">Reconnue ${bilan[k].ok} fois sur ${bilan[k].n}</span>` : ''}</div>
      </div>`).join('')}
    <h2>À l'aveugle</h2>
    ${key ? `<form id="aveugle">
      <p>Choisis ton intention. Le coach ne la connaîtra pas.</p>
      <div class="choices">${Object.entries(INTENTIONS).map(([k, v]) => `<label><input type="radio" name="voulu" value="${k}" required><span>${t(v.nom)}</span></label>`).join('')}</div>
      <div class="actions"><button class="btn primary" id="rec">Dire la phrase</button></div>
    </form>
    <p class="small muted" id="etat" role="status"></p>
    <div id="resultat"></div>`
    : '<p class="note">Ajoute ta clé Google AI Studio dans <a href="#/reglages">Réglages</a> pour entendre les modèles et le verdict du coach.</p>'}`);
  app.onclick = (e) => {
    const b = e.target.closest('[data-act]');
    if (b?.dataset.act === 'ecouter') ecouter(b.dataset.k);
    if (b?.dataset.act === 'moi' && toi) jouer(toi, null);
  };
  app.onsubmit = (e) => {
    e.preventDefault();
    if (rec) return arreter();
    voulu = new FormData(e.target).get('voulu');
    enregistrer();
  };

  async function ecouter(k) {
    etat(modeles.has(`${k}|${dire(k)}`) ? '' : 'Le modèle prépare sa voix, quelques secondes la première fois.');
    try {
      const m = await modele(dire(k), k);
      etat('');
      jouer(m.url, null);
    } catch (err) {
      etat(errMsg(err));
    }
  }

  async function enregistrer() {
    lecteur.pause();
    try {
      rec = await prisePhrase({ fin: arreter });
    } catch (err) {
      rec = null;
      return etat(micErr(err));
    }
    document.getElementById('rec').textContent = 'Arrêter';
    etat("Je t'écoute.");
  }

  async function arreter() {
    const r = rec;
    rec = null;
    if (!r) return;
    const bouton = document.getElementById('rec');
    if (bouton) bouton.textContent = 'Dire la phrase';
    etat('Le coach écoute, sans savoir ce que tu as choisi.');
    const take = await r.stop();
    toi = take.audioUrl;
    let v;
    try {
      const audio = await wav(take.blob);
      if (!audio) throw new Error("Pas d'enregistrement à faire écouter. Recommence.");
      v = await intention(key, ph.texte, audio);
    } catch (err) {
      return etat(errMsg(err));
    }
    etat('');
    const ok = v.entendu === voulu;
    // OK : reconnue nettement. Moyen : reconnue faiblement, ou presque reconnue. Répéter : autre chose a été entendu.
    const note = ok && v.scores[voulu] >= 7 ? 'OK' : ok || v.scores[voulu] >= 5 ? 'Moyen' : 'Répéter';
    bilan[voulu] = { ok: (bilan[voulu]?.ok ?? 0) + (ok ? 1 : 0), n: (bilan[voulu]?.n ?? 0) + 1 };
    set('intentions', bilan);
    jeu.push({ voulu, entendu: v.entendu, note });
    session ??= { id: crypto.randomUUID(), date: new Date().toISOString(), exId: 'trois-intentions', titre: 'Trois intentions', origine: 'Échauffement', retour: '#/intentions', refaire: `#/intentions/${i}`, consigne: ph.texte, transcript: '', metrics: analyze({}), feedback: null, manuel: true };
    saveSession({ ...session, aveugle: jeu });
    const zone = document.getElementById('resultat');
    if (!zone) return;
    zone.innerHTML = `<div class="revele">
      ${palier(note)}
      <p class="verdict">${ok ? `Le coach a entendu : ${nomIntention(v.entendu)}. Ton intention passe.`
        : v.entendu === 'neutre' ? `Tu voulais ${nomIntention(voulu)}. Le coach n'a entendu aucune intention nette.`
        : `Tu voulais ${nomIntention(voulu)}. Le coach a entendu : ${nomIntention(v.entendu)}.`}</p>
      ${bars(Object.entries(INTENTIONS).map(([k, x]) => [x.nom, v.scores[k]]), 10)}
      <p>${t(v.indices)}</p>
      <p class="note">Pour ${nomIntention(voulu)} davantage : ${t(v.conseils[voulu])}</p>
      ${jeu.length > 1 ? `<p class="small">Tes essais : ${jeu.map((x) => x.note).join(', ')}.</p>` : ''}
      <div class="actions"><button class="btn" data-act="moi">Réécouter ta voix</button><button class="btn" data-act="ecouter" data-k="${voulu}">Écouter le modèle</button></div>
    </div>`;
    cascade(zone.querySelector('.revele'));
  }
}

/* ---------- Respiration guidée ---------- */

const CONSEIL_SOUFFLE = {
  OK: 'Le souffle est posé et régulier. Tu peux parler.',
  Moyen: "Certaines expirations s'arrêtent avant 5 s. Inspire plus bas, dans le ventre, et dose le « sss » pour qu'il dure.",
  'Répéter': "Le « sss » s'épuise trop tôt, ou je ne l'entends pas. Inspire dans le ventre, expire plus doucement, téléphone à 30 cm.",
};

// Respiration 4-4-6. L'expiration se fait sur « sss » : le micro en mesure la durée, cycle par cycle.
function respiration(ex) {
  const phases = [['Inspire', 4], ['Retiens', 4], ['Expire', 6]];
  let cycle = 0, i = 0, timeout = null, rec = null, quitte = false, phase = null;
  const fond = [], durees = [];
  let sss = [];
  // Seuil : trois fois le bruit de la pièce mesuré pendant les rétentions, silencieuses.
  const seuil = () => Math.max(0.003, 3 * ([...fond].sort((a, b) => a - b)[fond.length >> 1] ?? 0));
  cleanup = () => { quitte = true; clearTimeout(timeout); rec?.stop(); };
  startRecording({
    brut: true, // sans réduction de bruit : elle effacerait le « sss »
    onLevel: (rms) => {
      if (phase === 'Retiens') fond.push(rms);
      if (phase !== 'Expire') return;
      sss.push(rms);
      const el = document.getElementById('sss');
      if (el) el.textContent = `« sss » : ${nf(dureeSouffle(sss, seuil()))} s`;
    },
  }).then((r) => (quitte ? r.stop() : (rec = r))).catch(() => {}); // sans micro, l'exercice se fait sans note

  show(`<section class="stage souffle" id="stage">
    <p class="consigne-mini">${t(ex.consigne)}</p>
    <div class="centre"><div class="souffle-cercle" id="cercle"></div><p class="mot" id="phase">Prêt</p><p class="small" id="cycle"></p><p class="small" id="sss" aria-hidden="true"></p></div>
    <div class="centre"><a class="btn" href="#/">Arrêter</a></div>
  </section>`);
  const cercle = document.getElementById('cercle');
  const step = () => {
    if (phase === 'Expire' && rec) { durees.push(dureeSouffle(sss, seuil())); sss = []; }
    if (cycle === 6) {
      rec?.stop();
      rec = null;
      const note = durees.length === 6 ? noteSouffle(durees) : null;
      saveSession({ id: crypto.randomUUID(), date: new Date().toISOString(), exId: ex.id, titre: ex.titre, origine: ex.origine, consigne: ex.consigne, transcript: '', metrics: analyze({}), feedback: null, manuel: true, ...(note && { souffle: durees, note }) });
      show(`<h1>Six cycles faits.</h1>
        <div class="revele">
          ${note ? `${palier(note)}
          <p class="lead">${t(CONSEIL_SOUFFLE[note])}</p>
          <p>Expirations tenues 5 s ou plus : ${durees.filter((d) => d >= 5).length} sur 6.</p>
          <p class="small muted">Durée de chaque « sss » : ${durees.map((d) => `${nf(d)} s`).join(', ')}.</p>`
          : '<p class="lead">Le souffle est posé. Tu peux parler.</p><p class="note">Sans micro, pas de note : autorise-le pour mesurer ton « sss ».</p>'}
        </div>
        <div class="actions"><a class="btn primary" href="#/">Retour</a><button class="btn" data-act="encore">Recommencer</button></div>`).onclick = (e) => e.target.closest('[data-act="encore"]') && respiration(ex);
      return cascade(app.querySelector('.revele'));
    }
    const [nom, sec] = phases[i];
    phase = nom;
    document.getElementById('sss').textContent = '';
    document.getElementById('phase').textContent = nom === 'Expire' ? 'Expire sur « sss »' : nom;
    document.getElementById('cycle').textContent = `Cycle ${cycle + 1} sur 6`;
    cercle.style.transitionDuration = `${sec}s`;
    cercle.style.transform = nom === 'Expire' ? 'scale(.55)' : 'scale(1)';
    cercle.classList.toggle('plein', nom !== 'Expire');
    // La lumière du plateau monte à l'inspiration et baisse à l'expiration.
    const stage = document.getElementById('stage');
    stage.style.setProperty('--dur', `${sec}s`);
    stage.style.setProperty('--level', nom === 'Expire' ? '0' : '.8');
    i = (i + 1) % 3;
    if (i === 0) cycle++;
    timeout = setTimeout(step, sec * 1000);
  };
  timeout = setTimeout(step, 800);
}

/* ---------- Test d'entrée et bilan ---------- */

function test(mode) {
  let profile = get('profile');
  // Relance d'une analyse qui n'a pas abouti : on repart de la dernière mesure gardée (sans l'audio, perdu au rechargement).
  const relance = mode === 'analyse' && profile;
  const bilan = relance ? !!profile.bilans?.length : profile && mode !== 'complet';
  const takes = [];
  let answers = profile?.answers ?? [];
  if (relance) {
    takes.push(...((profile.bilans?.at(-1) ?? profile).takes ?? []));
    if (bilan) profile = { ...profile, bilans: profile.bilans.slice(0, -1) };
  }

  const intro = () => show(`
    <a class="back" href="#/">Aujourd'hui</a>
    <h1>${bilan ? 'Bilan' : "Test d'entrée"}</h1>
    <p class="lead">${bilan
      ? 'Les deux mêmes enregistrements que le test : ton parcours en 90 secondes, puis une improvisation. On compare avec la dernière mesure.'
      : 'Dix questions sur ta prise de parole, puis deux enregistrements : ton parcours face à un jury, et une improvisation sur un sujet tiré au hasard.'}</p>
    <p class="note">Installe-toi au calme, téléphone à 30 cm. Parle comme tu le ferais vraiment, sans chercher à bien faire.</p>
    <div class="actions"><button class="btn primary" data-act="start">Commencer</button></div>`).onclick = (e) => e.target.closest('[data-act]') && (bilan ? rec(0) : questions());

  const questions = () => {
    show(`
      <h1>Dix questions</h1>
      <form id="q">${QUESTIONNAIRE.map((q) => `
        <fieldset><legend>${t(q.question)}</legend>${
          q.type === 'echelle'
            ? `<div class="choices scale">${[1, 2, 3, 4, 5].map((v) => `<label><input type="radio" name="${q.id}" value="${v}" required><span>${v}</span></label>`).join('')}</div><div class="scale-ends"><span>faible</span><span>fort</span></div>`
            : `<div class="choices">${q.options.map((o) => `<label><input type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="${q.id}" value="${esc(o)}" ${q.type === 'choix' ? 'required' : ''}><span>${t(o)}</span></label>`).join('')}</div>`
        }</fieldset>`).join('')}
        <div class="actions"><button class="btn primary">Continuer</button></div>
      </form>`).onsubmit = (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      answers = QUESTIONNAIRE.map((q) => ({
        question: q.question,
        reponse: q.type === 'echelle' ? `${data.get(q.id)} sur 5` : data.getAll(q.id).join(', ') || 'aucune réponse',
      }));
      rec(0);
    };
  };

  const rec = (i) => {
    const ex = TEST[i];
    prise(ex, fill(ex.consigne), (take) => {
      takes.push({ titre: ex.titre, transcript: take.transcript, metrics: take.metrics, blob: take.blob });
      const id = crypto.randomUUID();
      saveSession({ id, date: new Date().toISOString(), exId: ex.id, titre: ex.titre, origine: bilan ? 'Bilan' : 'Test', consigne: take.consigne, transcript: take.transcript, metrics: take.metrics, feedback: null, manuel: true,
        rec: { durationSec: take.durationSec, speechStart: take.speechStart, speechEnd: take.speechEnd, pauses: take.pauses } });
      if (take.blob) audios.set(id, { url: take.audioUrl, blob: take.blob });
      if (i + 1 < TEST.length) rec(i + 1); else analyse();
    }, { retour: '#/', etiquette: `Enregistrement ${i + 1} sur ${TEST.length}` });
  };

  const analyse = async () => {
    const key = get('key');
    const date = new Date().toISOString();
    const enregistre = (analysis) => {
      const entry = { date, takes: takes.map(({ blob, ...x }) => x), analysis };
      set('profile', bilan ? { ...profile, bilans: [...(profile.bilans ?? []), entry] } : { ...entry, answers });
    };
    enregistre(null); // gardé avant l'appel : rien n'est perdu si l'analyse échoue ou si la page se recharge
    let analysis = null;
    if (key && takes.some((x) => x.transcript || x.blob)) {
      show(attente('Je prépare tes enregistrements.'));
      try {
        const withAudio = await Promise.all(takes.map(async (x) => ({ ...x, audio: await wav(x.blob) })));
        show(attente('Le coach écoute tes deux prises et établit ton profil. Compte une à deux minutes.'));
        analysis = await diagnose(key, answers, withAudio, ECHAUFFEMENTS.map((d) => ({ id: d.id, titre: d.titre, cible: d.cible })), perso());
      } catch (e) {
        return show(`<h1>L'analyse n'a pas abouti</h1><p class="error">${t(errMsg(e))}</p><p class="muted">Ton test est gardé. Tu pourras aussi relancer l'analyse depuis Aujourd'hui.</p>
          <div class="actions"><button class="btn primary" data-act="retry">Réessayer l'analyse</button><a class="btn" href="#/">Plus tard</a></div>`).onclick = (ev) => ev.target.closest('[data-act]') && analyse();
      }
    }
    if (analysis) enregistre(analysis);
    if (analysis) set('plan', { echauffements: analysis.echauffements, rythme: analysis.rythme, conseils: analysis.conseils, objectifs30j: analysis.objectifs30j });
    resultat(analysis, bilan ? (profile.bilans?.at(-1) ?? profile).analysis : null);
  };

  const resultat = (a, avant) => {
    if (!a) {
      return show(`<h1>Mesures enregistrées</h1>${takes.map((x) => `<h2>${t(x.titre)}</h2>${mesures(x.metrics)}`).join('')}
        <p class="note">Sans clé API${takes.some((x) => x.transcript) ? '' : ' et sans transcription'}, pas de profil ni de plan personnalisé. Tu peux suivre les leçons dans l'ordre et refaire le test plus tard.</p>
        <div class="actions"><a class="btn primary" href="#/lecon/1">Commencer la leçon 1</a></div>`);
    }
    show(`
      <h1>${bilan ? 'Ton bilan' : 'Ton profil'}</h1>
      <div class="revele">
      <p class="lead">${t(a.synthese)}</p>
      ${avant ? '<div class="legend"><span><i style="background:var(--toi)"></i>Maintenant</span><span><i style="background:var(--modele)"></i>Avant</span></div>' : ''}
      ${piliersBars(a.piliers, avant?.piliers)}
      ${a.recit.length ? `<h2>Ton récit</h2>${a.recit.map((r) => `<p class="error">Tu as dit « ${t(r.dit)} ». La fiche dit : ${t(r.fiche)}</p>`).join('')}` : ''}
      <h2>Ce qui tient</h2><ul>${a.forces.map((x) => `<li>${t(x)}</li>`).join('')}</ul>
      <h2>Tes priorités</h2><ul>${a.priorites.map((x) => `<li>${t(x)}</li>`).join('')}</ul>
      ${a.gardeFous.length ? `<h2>Garde-fous déclenchés</h2>${a.gardeFous.map((g) => `<p><span class="tag">${t(g.type)}</span><i>« ${t(g.citation)} »</i></p>`).join('')}` : ''}
      <h2>Ton plan</h2>
      <p>${a.rythme} leçons par semaine. Échauffements quotidiens : ${a.echauffements.map((id) => t(EX[id]?.titre ?? id)).join(', ')}.</p>
      <h3>Dans trente jours</h3><ul>${a.objectifs30j.map((x) => `<li>${t(x)}</li>`).join('')}</ul>
      ${takes.map((x) => `<h3>${t(x.titre)}</h3>${mesures(x.metrics)}`).join('')}
      </div>
      <div class="actions"><a class="btn primary" href="#/">Voir ma journée</a></div>`);
    cascade(app.querySelector('.revele'));
  };

  relance ? analyse() : intro();
}

/* ---------- Progrès ---------- */

function spark(values, { band, unit = '' } = {}) {
  if (values.length < 2) return '<p class="small muted">Il faut au moins deux séances.</p>';
  const w = 300, h = 56, pad = 6;
  const lo = Math.min(...values, band?.[0] ?? Infinity), hi = Math.max(...values, band?.[1] ?? -Infinity, lo + 1);
  const x = (i) => pad + (i * (w - 2 * pad)) / (values.length - 1);
  const y = (v) => h - pad - ((v - lo) * (h - 2 * pad)) / (hi - lo);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="Évolution : ${values.map(nf).join(' ; ')}${unit}">
    ${band ? `<rect class="band" x="0" width="${w}" y="${y(band[1])}" height="${y(band[0]) - y(band[1])}"/>` : ''}
    <polyline class="line" points="${pts}"/>
    ${values.map((v, i) => `<rect class="hit" x="${x(i) - 8}" y="0" width="16" height="${h}"><title>${nf(v)}${unit}</title></rect>`).join('')}
    <circle class="dot" cx="${x(values.length - 1)}" cy="${y(values.at(-1))}" r="4"/>
  </svg>`;
}

function progres() {
  const all = sessions();
  const parlees = all.filter((s) => s.transcript && s.metrics.durationSec >= 10).slice(0, 20).reverse();
  const profile = get('profile');
  const done = Object.keys(get('progress', {}).lecons ?? {}).length;
  const count = (list) => Object.entries(list.reduce((acc, k) => ({ ...acc, [k]: (acc[k] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const fbs = all.filter((s) => s.feedback).map((s) => s.feedback);
  const cats = count(fbs.flatMap((f) => f.corrections.map((c) => c.categorie)));
  const gardes = count(fbs.flatMap((f) => f.gardeFous.map((g) => g.type)));
  const tpm = (s) => Math.round((10 * s.metrics.fillerCount) / Math.max(s.metrics.durationSec / 60, 0.5)) / 10;
  const first = profile?.analysis, latest = profile?.bilans?.at(-1)?.analysis;
  const stats = erreursParCategorie(all, jourJ()), taux = tauxAtelier(all, jourJ());
  const ouverts = get('carnet', []).filter((e) => !e.sorti).length;
  const maxL = Math.max(1, ...stats.flatMap(([, v]) => [v.recent, v.avant]));

  const serie = (titre, values, opts) => `
    <div class="block"><div class="spark-head"><span>${t(titre)}</span><b>${values.length ? nf(values.at(-1)) + (opts?.unit ?? '') : ''}</b></div>${spark(values, opts)}</div>`;

  const jours = quatorzeJours();
  const faites = jours.filter((j) => j.fait).length;
  const demain = JOURS[(new Date().getDay() + 1) % 7];
  show(`
    <h1>Progrès</h1>
    <h2>14 jours.</h2>
    <div class="jours-tete" aria-hidden="true">${jours.slice(0, 7).map((j) => `<span>${j.d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3)}</span>`).join('')}</div>
    <ol class="jours">${jours.map((j, i) => `
      <li class="${j.fait ? 'fait' : ''} ${j.fonce ? 'fonce' : ''} ${i === 13 ? 'aujourdhui' : ''}" style="--jour:${j.c}">
        <span class="sr">${j.d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}, ${j.fait ? 'séance faite' : 'pas de séance'}</span>
        <span aria-hidden="true">${String(j.d.getDate()).padStart(2, '0')}</span>
      </li>`).join('')}
    </ol>
    <p class="mono muted">${faites} SÉANCE${faites > 1 ? 'S' : ''} SUR 14 JOURS. DEMAIN, LA CASE SERA ${demain.nom.toUpperCase()}.</p>
    <div class="mesures">
      <div class="mesure"><b>${all.length}</b><span>séances</span></div>
      <div class="mesure"><b>${streak()}</b><span>jours d'affilée</span></div>
      <div class="mesure"><b>${done}/15</b><span>leçons faites</span></div>
      <div class="mesure"><b>${fbs.length ? nf(mean(fbs.map((f) => mean(Object.values(f.scores))))) : '·'}</b><span>score moyen sur 10</span></div>
    </div>
    <h2>Sur tes vingt dernières prises</h2>
    ${serie('Blancs de 2 s ou plus', parlees.map((s) => s.metrics.blanks))}
    ${serie('Tics par minute', parlees.map(tpm))}
    ${serie('Mots par minute (zone visée : 130 à 160)', parlees.map((s) => s.metrics.wpm), { band: [130, 160] })}
    ${first ? `<div class="sep" aria-hidden="true"></div><h2>Piliers</h2>
      ${latest ? '<div class="legend"><span><i style="background:var(--toi)"></i>Dernier bilan</span><span><i style="background:var(--modele)"></i>Test d\'entrée</span></div>' : ''}
      ${piliersBars(latest?.piliers ?? first.piliers, latest ? first.piliers : null)}
      <p>${t((latest ?? first).synthese)}</p>
      <h3>Tes priorités</h3><ul>${(latest ?? first).priorites.map((x) => `<li>${t(x)}</li>`).join('')}</ul>
      <h3>Dans trente jours</h3><ul>${(latest ?? first).objectifs30j.map((x) => `<li>${t(x)}</li>`).join('')}</ul>` : ''}
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
    ${cats.length ? `<h2>Corrections qui reviennent</h2>${bars(cats.map(([k, n]) => [k, n]), cats[0][1])}` : ''}
    ${gardes.length ? `<h2>Garde-fous les plus fréquents</h2>${bars(gardes.map(([k, n]) => [k, n]), gardes[0][1])}` : ''}
    <div class="sep" aria-hidden="true"></div>
    <h2>Historique</h2>
    ${all.length ? `<ul class="plain">${all.slice(0, 40).map((s) => `<li><a class="row-link" href="#/session/${s.id}"><span class="title">${t(s.titre)}</span><span class="meta">${dateFr(s.date)}${s.feedback ? ` · ${nf(mean(Object.values(s.feedback.scores)))}/10` : ''}</span></a></li>`).join('')}</ul>`
      : `<div class="vide">${memphis(3, true)}<p class="muted">Aucune séance pour l'instant. Commence par <a href="#/">l'échauffement du jour</a>.</p></div>`}`);
}

/* ---------- Atelier langue ---------- */

const jourJ = () => new Date().toLocaleDateString('sv');
const DUREE_PHRASE = 20; // secondes, arrêt automatique

function langue(arg) {
  if (arg === 'seance') return seanceLangue();
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
        <span><span class="nom">${t(e.titre)}</span><span class="duree">${e.faites}/${e.total}${e.statut === 'vue' ? ' · à reprendre' : ''}</span></span>
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
    <ul class="plain">${f.phrases.map((p) => `<li class="row-link"><span class="title">${t(p.donnee.join(' '))}</span><span class="meta">${l.faits?.[p.id] ? 'réussie' : l.vus?.[p.id] ? 'à reprendre' : 'à venir'}</span></li>`).join('')}</ul>
    <div class="actions"><a class="btn primary" href="#/langue/seance">Commencer la séance</a></div>`);
}

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

/* ---------- Réglages ---------- */

/* ---------- Synchronisation entre appareils (dépôt GitHub privé) ---------- */

let synchro = null, minuteur = null;
const etatLocal = () => ({ donnees: Object.fromEntries(DATA_KEYS.map((k) => [k, get(k)])), majs: get('majs', {}) });

function errSync(e) {
  if (e.status === 401) return 'Jeton refusé ou expiré. Crée-en un nouveau.';
  if (e.status === 403) return "Le jeton n'a pas le droit d'écrire : coche Contents, Read and write.";
  if (e.status === 404) return "Dépôt introuvable, ou le jeton n'y a pas accès.";
  if (e instanceof TypeError) return 'Connexion impossible avec GitHub.';
  return e.message;
}

function texteSync() {
  const info = get('syncInfo', {});
  if (!get('sync')?.jeton) return 'Synchro désactivée : tes données restent sur cet appareil.';
  if (info.erreur) return `Synchro en échec : ${info.erreur}`;
  return info.date ? `Synchronisé le ${dateFr(info.date)} à ${new Date(info.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.` : 'Synchro active.';
}

function planifier() {
  if (!get('sync')?.jeton) return;
  clearTimeout(minuteur);
  minuteur = setTimeout(synchroniser, 3000);
}

// Lit le dépôt, fusionne avec cet appareil, écrit le résultat des deux côtés.
function synchroniser() {
  const cfg = get('sync');
  if (!cfg?.jeton) return Promise.resolve();
  if (synchro) return synchro.then(planifier);
  synchro = (async () => {
    for (let essai = 0; ; essai++) {
      const distant = await lire(cfg);
      const avant = etatLocal();
      const fus = distant ? fusion(avant, distant.etat) : avant;
      for (const k of DATA_KEYS) {
        if (fus.donnees[k] == null) localStorage.removeItem('eloq.' + k);
        else localStorage.setItem('eloq.' + k, JSON.stringify(fus.donnees[k]));
      }
      localStorage.setItem('eloq.majs', JSON.stringify(fus.majs));
      try {
        if (!distant || JSON.stringify(distant.etat) !== JSON.stringify(fus)) await ecrire(cfg, fus, distant?.sha);
      } catch (e) {
        if ((e.status === 409 || e.status === 422) && essai < 2) continue; // un autre appareil a écrit entre-temps
        throw e;
      }
      localStorage.setItem('eloq.syncInfo', JSON.stringify({ date: new Date().toISOString() }));
      // Nouveautés venues de l'autre appareil : on rafraîchit les écrans qui ne sont pas en plein exercice.
      const [route, arg] = location.hash.replace(/^#\/?/, '').split('/');
      const calme = ['', 'programme', 'lecon', 'progres', 'situations'].includes(route) || (route === 'langue' && arg !== 'seance');
      if (JSON.stringify(avant.donnees) !== JSON.stringify(fus.donnees) && calme) render();
      return;
    }
  })()
    .catch((e) => localStorage.setItem('eloq.syncInfo', JSON.stringify({ ...get('syncInfo', {}), erreur: errSync(e) })))
    .finally(() => {
      synchro = null;
      const el = document.getElementById('sync-etat');
      if (el) el.textContent = texteSync();
    });
  return synchro;
}
addEventListener('visibilitychange', () => document.visibilityState === 'visible' && synchroniser());

function reglages() {
  const cfg = get('sync');
  show(`
    <h1>Réglages</h1>
    <h2>Clé API Google AI Studio</h2>
    <p class="small muted">Gratuite, dans la limite d'un quota quotidien. Gardée seulement sur cet appareil. Crée-la sur <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com</a>, avec un compte Google.</p>
    <input type="password" id="key" autocomplete="off" spellcheck="false" placeholder="AIza…" value="${esc(get('key', ''))}">
    <p class="small muted">Chaque analyse envoie à Google ton enregistrement, sa transcription, ton contexte et ton récit.</p>
    <h2>Mon contexte</h2>
    <p class="small muted">Ce que le coach sait de toi : ton métier, tes principes, tes garde-fous, tes situations.</p>
    <textarea id="context">${esc(get('context', ''))}</textarea>
    <h2>Mon récit</h2>
    <p class="small muted">Les faits exacts de ton parcours, un par ligne. Le coach les compare à ce que tu dis.</p>
    <textarea id="recit">${esc(get('recit', []).join('\n'))}</textarea>
    <h2>Sauvegarde</h2>
    <p class="small muted">Tes données vivent dans ce navigateur. Exporte-les de temps en temps. L'export ne contient pas ta clé API.</p>
    <div class="actions">
      <button class="btn" data-act="export">Exporter mes données</button>
      <label class="btn">Importer un fichier<input type="file" id="import" accept="application/json,.json" hidden></label>
    </div>
    <p id="msg" role="status" class="note" hidden></p>
    <h2>Synchronisation entre appareils</h2>
    <p class="small muted">Tes données passent par un dépôt GitHub privé, à toi seul. La clé API et le jeton ne sont pas synchronisés : saisis-les sur chaque appareil.</p>
    <details><summary>Créer le jeton, une seule fois</summary><ol class="small">
      <li>Ouvre <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a>.</li>
      <li>Token name : Éloquence synchro. Expiration : un an.</li>
      <li>Repository access : Only select repositories, puis eloquence-donnees.</li>
      <li>Permissions, Repository permissions, Contents : Read and write.</li>
      <li>Generate token, puis copie-le : il ne s'affiche qu'une fois.</li>
    </ol></details>
    <label class="small muted" for="sync-depot">Dépôt privé</label>
    <input type="text" id="sync-depot" autocomplete="off" spellcheck="false" value="${esc(cfg?.depot ?? 'holyactor-eng/eloquence-donnees')}">
    <label class="small muted" for="sync-jeton">Jeton d'accès</label>
    <input type="password" id="sync-jeton" autocomplete="off" spellcheck="false" placeholder="github_pat_…" value="${esc(cfg?.jeton ?? '')}">
    <div class="actions">
      <button class="btn primary" data-act="sync-on">${cfg?.jeton ? 'Synchroniser maintenant' : 'Activer la synchro'}</button>
      ${cfg?.jeton ? '<button class="btn" data-act="sync-off">Désactiver</button>' : ''}
    </div>
    <p class="small muted" id="sync-etat" role="status">${t(texteSync())}</p>
    <h2>Recommencer</h2>
    <div class="actions">
      <a class="btn" href="#/test/complet">Refaire le test complet</a>
      <button class="btn danger" data-act="wipe">Effacer toutes les données</button>
    </div>`);
  const msg = (txt) => { const m = document.getElementById('msg'); m.hidden = false; m.textContent = typo(txt); };
  app.oninput = (e) => {
    if (e.target.id === 'key') set('key', e.target.value.trim());
    if (e.target.id === 'context') set('context', e.target.value);
    if (e.target.id === 'recit') set('recit', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean));
  };
  app.onchange = async (e) => {
    if (e.target.id !== 'import' || !e.target.files[0]) return;
    try {
      const data = JSON.parse(await e.target.files[0].text());
      const found = DATA_KEYS.filter((k) => k in data);
      if (!found.length) throw new Error('aucune donnée reconnue');
      for (const k of found) set(k, data[k]);
      reglages();
      msg(`Import terminé : ${found.join(', ')}.`);
    } catch (err) {
      msg(`Fichier illisible : ${err.message}.`);
    }
  };
  app.onclick = async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    const etatSync = (txt) => (document.getElementById('sync-etat').textContent = txt);
    if (act === 'sync-on') {
      const nouveau = { depot: document.getElementById('sync-depot').value.trim(), jeton: document.getElementById('sync-jeton').value.trim() };
      etatSync('Vérification du dépôt…');
      try {
        await verifier(nouveau);
      } catch (err) {
        return etatSync(errSync(err));
      }
      set('sync', nouveau);
      localStorage.removeItem('eloq.syncInfo');
      etatSync('Synchronisation…');
      await synchroniser();
      reglages();
    }
    if (act === 'sync-off') {
      localStorage.removeItem('eloq.sync');
      localStorage.removeItem('eloq.syncInfo');
      reglages();
    }
    if (act === 'export') {
      const data = { app: 'eloquence', exporte: new Date().toISOString(), ...Object.fromEntries(DATA_KEYS.map((k) => [k, get(k)])) };
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = `eloquence-${new Date().toLocaleDateString('sv')}.json`;
      a.click();
    }
    if (act === 'wipe' && cfg?.jeton) return alert('La synchro est active : tes données reviendraient depuis le dépôt. Désactive-la d\'abord.');
    if (act === 'wipe' && confirm('Effacer définitivement toutes tes séances, ton profil et ton plan ? Ta clé API est gardée.')) {
      for (const k of DATA_KEYS) localStorage.removeItem('eloq.' + k);
      location.hash = '#/';
    }
  };
}

// En dernier : tous les écrans et leurs constantes doivent exister avant le premier affichage.
addEventListener('hashchange', render);
render();
synchroniser();
