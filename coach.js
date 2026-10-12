import { enteteWav } from './recorder.js';

// Appels à Gemini (Google AI Studio, offre gratuite) : diagnostic d'entrée et feedback d'exercice.
// Réponses en JSON structuré. L'audio est joint quand il existe.

// Le second modèle prend le relais si le premier est saturé, hors quota (429), introuvable (404) ou trop lent.
const MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
const ENDPOINT = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const TIMEOUT_MS = 90_000;

export const GARDE_FOUS = [
  'idée centrale noyée',
  'sur-justification',
  'autocritique ou excuse',
  'ego avant le message',
  'formulation floue',
  'objectif perdu',
  'texte récité',
  'ton moralisateur',
  'slogan',
  'réponse pas en premier',
  'durée hors cible',
  'trop de pistes',
];

const RULES = `Règles d'écriture de tes réponses :
- Français, tutoiement, phrases courtes et concrètes.
- Jamais de tiret cadratin. Guillemets français « ».
- Aucun tic d'IA ni langage corporate : pas de « il est important de noter », « en effet », « il convient de », « force est de constater », « synergie », « holistique », « incroyable », « extraordinaire », « révolutionnaire ».
- Pas de compliment creux. Un point fort n'est cité que s'il est précis et cite ce qui a été dit.`;

const COACH = `Tu es le coach de prise de parole de la personne qui s'entraîne (son contexte suit, s'il est fourni). Tu agis en partenaire exigeant, en mode contradicteur : tu signales les angles morts et tu privilégies la justesse à l'effet.

Objectif visé : un impact juste. Une idée centrale nette, de la présence, de la nuance tenue jusqu'au bout. Pas un charisme de vendeur, pas de surjeu.

Tu reçois une prise de parole : l'enregistrement audio quand il existe, et la transcription de la dictée automatique du navigateur.
- Si l'audio est joint, il fait foi. Écoute-le en entier. Juge aussi la voix : intonation (les fins de phrase qui montent sonnent comme des doutes), débit, pauses, souffle, articulation, hésitations et reprises. Donne une transcription fidèle de l'audio, avec les « euh », les « du coup » et les reprises.
- Sans audio, la transcription de la dictée est ta seule source. Elle efface souvent les « euh », coupe mal les phrases et peut remplacer un mot par un mot proche. Laisse alors transcription et voix vides.
- Ne juge ni la ponctuation, ni les majuscules, ni l'orthographe, ni les accords qui ne s'entendent pas à l'oral.
- Une différence entre la dictée et ce qui a été dit est une erreur de la dictée, jamais une correction. La dictée déforme surtout les noms propres (prénom, nom, lieux, titres d'œuvres) : ne les corrige jamais.
- Ne signale une erreur de langue que si elle est plausiblement de l'orateur (préposition ou élision manquante, phrase sans verbe, mot lourd ou rare, redondance, phrase trop longue). Mets aVerifier à true si tu n'en es pas sûr.

Principes de coaching (méthode A. Zakhnouf et N. Mel), à appliquer sans les réciter :
- La légitimité est une situation, pas un titre : un public est là, une invitation ou un message existe.
- Aucune excuse ni autodénigrement (« désolé pour mes slides », « je me suis préparé hier ») : cela donne des armes aux détracteurs. L'autodérision légère reste permise.
- Le message, le projet ou la mission passent avant la personne. S'effacer derrière la mission protège du trac.
- Un débat est une conversation, pas une joute : être contredit révèle une faille à corriger, c'est un gain.
- Pas de par cœur : une structure de mots-clés, pas un texte. Une syntaxe d'écrit récitée se repère.
- La fin compte plus que le début : chaque phrase et chaque intervention doivent atterrir.
- Le mot juste est le mot simple pour ce public.
- Registres et accent assumés, sans se lisser par peur des stéréotypes.
- Face à une question qui dévie, réponse brève puis pont vers le message maître. Exception : en jury de recrutement, une question factuelle appelle d'abord une réponse complète.
- L'ambition est d'avoir un effet utile sur le public, sans tomber dans le ton moralisateur.

Note : dis si la tâche de l'exercice est réussie, au regard de la consigne et des critères, pas du talent général. OK : réussie, on peut passer à la suite. Moyen : réussie en partie, une reprise aiderait. Répéter : la tâche n'est pas remplie. Donne la raison en une phrase.

Message maître : formule en une phrase le message central que cette prise de parole aurait dû porter, en partant de ce qui a été dit (pas un nouveau discours), avec deux ou trois faits concrets tirés de la transcription.

Objection : propose une objection ou une question de recadrage réaliste qu'un jury, un journaliste ou un contradicteur pourrait poser juste après. Elle servira d'exercice de simulation.

Corrections : tu corriges, tu ne réécris jamais tout le discours. Chaque correction cite la phrase dite (d'après l'audio s'il est joint, pas d'après la dictée), propose une ou deux formulations (deux pour les formulations délicates) et explique la règle en une phrase.

Garde-fous à traquer, en citant le passage : ${GARDE_FOUS.join(', ')}.

Si une fiche « Mon récit » est fournie, compare chaque fait dit sur le parcours avec la fiche et relève toute incohérence (nom d'école, durées, chiffres, titres). Sans audio, ne relève que les écarts nets, pas un nom déformé par la dictée.

${RULES}`;

const str = { type: 'string' };
const int = (description) => ({ type: 'integer', description });
const arr = (items) => ({ type: 'array', items });
const obj = (properties) => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties) });

export const CATEGORIES = ['préposition ou élision', 'phrase incomplète', 'mot lourd ou rare', 'redondance', 'phrase trop longue', 'registre', 'tic de langage', 'structure', 'autre'];

const RECIT = arr(obj({ dit: str, fiche: str }));
const GARDES = arr(obj({ type: { type: 'string', enum: GARDE_FOUS }, citation: str }));

export const NOTES = ['OK', 'Moyen', 'Répéter'];

export const FEEDBACK_SCHEMA = obj({
  note: { type: 'string', enum: NOTES, description: 'La tâche de cet exercice est-elle réussie ?' },
  noteRaison: { type: 'string', description: 'Pourquoi cette note, en une phrase.' },
  scores: obj({
    clarte: int("Clarté de l'idée centrale, 0 à 10"),
    structure: int('Structure, 0 à 10'),
    impact: int('Impact juste, 0 à 10'),
    fluidite: int('Fluidité, 0 à 10'),
    langue: int('Langue orale, 0 à 10'),
  }),
  verdict: { type: 'string', description: 'Le conseil principal, une phrase.' },
  forces: arr(str),
  axes: arr(str),
  corrections: arr(obj({ categorie: { type: 'string', enum: CATEGORIES }, dit: str, propositions: arr(str), regle: str, aVerifier: { type: 'boolean' } })),
  gardeFous: GARDES,
  recit: RECIT,
  messageMaitre: obj({ phrase: str, faits: arr(str) }),
  objection: { type: 'string', description: "Une objection ou question de recadrage, formulée comme on la poserait à l'oral." },
  transcription: { type: 'string', description: "Transcription fidèle de l'audio, hésitations comprises. Vide sans audio." },
  voix: { type: 'string', description: "Deux phrases sur la voix : intonation, débit, pauses, souffle. Vide sans audio." },
});

const diagnoseSchema = (drillIds) =>
  obj({
    piliers: obj({
      mental: int('Mental, 0 à 100'),
      physique: int('Physique : voix, souffle, débit, 0 à 100'),
      rhetorique: int('Rhétorique et improvisation, 0 à 100'),
      assertivite: int('Assertivité et écoute, 0 à 100'),
      pratique: int('Pratique régulière, 0 à 100'),
    }),
    synthese: { type: 'string', description: 'Trois phrases maximum.' },
    forces: arr(str),
    priorites: arr(str),
    echauffements: arr({ type: 'string', enum: drillIds }),
    rythme: int('Nombre de leçons par semaine, de 2 à 7'),
    conseils: arr(obj({ lecon: int('Numéro de leçon, 1 à 15'), conseil: str })),
    objectifs30j: arr(str),
    gardeFous: GARDES,
    recit: RECIT,
  });

function personal({ context, recit }) {
  return [
    context && `Contexte personnel :\n${context}`,
    recit?.length && `Fiche « Mon récit » (faits exacts) :\n${recit.map((f) => `- ${f}`).join('\n')}`,
  ].filter(Boolean).join('\n\n');
}

function describe({ metrics, transcript }, audio) {
  const m = metrics;
  return `Mesures locales : ${m.durationSec} s, ${m.wpm} mots/min, ${m.blanks} blanc(s) de 2 s ou plus, plus long silence ${m.longestPause} s, tics comptés par la dictée : ${JSON.stringify(m.fillers)}${m.targetSec ? `, durée cible ${m.targetSec} s` : ''}.
${audio ? 'Audio joint ci-après.' : 'Pas d\'audio.'}
Transcription de la dictée :
« ${transcript || '(vide)'} »`;
}

const audioPart = (audio) => (audio ? [{ inlineData: { mimeType: audio.mimeType, data: audio.data } }] : []);

async function ask(key, system, parts, schema, thinkingLevel) {
  let lastError;
  for (const model of MODELS) {
    let res;
    try {
      res = await fetch(ENDPOINT(model), {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts }],
          generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, thinkingConfig: { thinkingLevel } },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      if (e.name !== 'TimeoutError') throw e;
      lastError = e;
      continue;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      lastError = Object.assign(new Error(data.error?.message ?? `Erreur ${res.status}`), { status: res.status });
      if (res.status === 429 || res.status === 404 || res.status >= 500) continue;
      throw lastError;
    }
    const cand = data.candidates?.[0];
    if (data.promptFeedback?.blockReason || !cand) throw new Error('Gemini a bloqué cette demande. Reformule ou réessaie.');
    if (cand.finishReason === 'MAX_TOKENS') throw new Error('Réponse tronquée. Réessaie.');
    if (cand.finishReason && cand.finishReason !== 'STOP') throw new Error(`Gemini s'est arrêté (${cand.finishReason}). Réessaie.`);
    const text = (cand.content?.parts ?? []).filter((p) => p.text && !p.thought).map((p) => p.text).join('');
    // Filet de sécurité : jamais de tiret cadratin à l'écran.
    return JSON.parse(text.replace(/\s*—\s*/g, ', '));
  }
  throw lastError;
}

// Voix modèle (Gemini TTS, offre gratuite). Renvoie un Blob WAV.
// Chaque modèle vocal a son propre quota gratuit : le second prend le relais quand le premier est épuisé.
const TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];

export async function speak(key, text, style, voice = 'Orus') {
  let data, lastError;
  for (const model of TTS_MODELS) {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        model,
        input: [{ type: 'user_input', content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style }] }] }],
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice }] },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const raw = await res.json().catch(() => ({}));
    data = Array.isArray(raw) ? raw[0] : raw; // les erreurs arrivent dans un tableau
    if (res.ok) break;
    lastError = Object.assign(new Error(data?.error?.message ?? `Erreur ${res.status}`), { status: res.status });
    if (!(res.status === 429 || res.status === 404 || res.status >= 500)) throw lastError;
    data = null;
  }
  if (!data) throw lastError;
  const audio = data.steps?.filter((s) => s.type === 'model_output').flatMap((s) => s.content ?? []).filter((c) => c.type === 'audio').at(-1);
  if (!audio?.data) throw new Error("Gemini n'a pas renvoyé de voix.");
  const bytes = Uint8Array.from(atob(audio.data), (c) => c.charCodeAt(0));
  // WAV attendu ; si c'est du PCM brut (24 kHz, 16 bits, mono), on ajoute l'en-tête.
  if (String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF') return new Blob([bytes], { type: 'audio/wav' });
  return new Blob([enteteWav(bytes.length, 24000), bytes], { type: 'audio/wav' });
}

// exercise : { titre, consigne, texte, criteres }, take : { transcript, metrics }, perso : { context, recit }
// audio : { mimeType, data (base64) } ou null
export function feedback(key, exercise, take, perso, audio = null) {
  const user = `Exercice : ${exercise.titre}
Consigne : ${exercise.consigne}
${exercise.texte ? `Texte à lire : « ${exercise.texte} »\n` : ''}${exercise.criteres ? `Critères spécifiques : ${exercise.criteres}\n` : ''}${describe(take, audio)}`;
  return ask(key, [COACH, personal(perso)].filter(Boolean).join('\n\n'), [{ text: user }, ...audioPart(audio)], FEEDBACK_SCHEMA, 'medium');
}

const INTENTION_SCHEMA = obj({
  entendu: { type: 'string', enum: ['rassurer', 'convaincre', 'alerter', 'neutre'] },
  scores: obj({ rassurer: int('Combien la voix rassure, 0 à 10'), convaincre: int('Combien elle convainc, 0 à 10'), alerter: int('Combien elle alerte, 0 à 10') }),
  indices: { type: 'string', description: "Ce qui t'a fait entendre cette intention, en deux phrases : débit, hauteur, volume, accents, pauses, fin de phrase." },
  conseils: obj({
    rassurer: { type: 'string', description: 'Une consigne concrète pour que cette prise rassure davantage.' },
    convaincre: { type: 'string', description: 'Une consigne concrète pour que cette prise convainque davantage.' },
    alerter: { type: 'string', description: 'Une consigne concrète pour que cette prise alerte davantage.' },
  }),
});

// Test à l'aveugle : le coach ne sait pas quelle intention a été jouée.
export function intention(key, phrase, audio) {
  const system = `Tu es coach vocal. Tu écoutes une phrase dite à voix haute et tu dis quelle intention tu entends : rassurer, convaincre ou alerter, ou neutre si aucune ne domine. On ne te dit pas l'intention voulue.
Juge la voix seulement, pas le sens des mots : débit, hauteur, volume, accents d'insistance, pauses, fin de phrase. Repères :
- rassurer : débit lent, voix plus grave et douce, peu d'accents, fin longue et descendante ;
- convaincre : débit régulier, voix pleine, accent sur le mot qui prouve, pause avant l'argument, descente nette à la fin ;
- alerter : attaque nette, débit plus rapide, voix plus haute et plus forte, mots détachés, fin courte et ferme.
Sois franc : une prise plate est « neutre ».

${RULES}`;
  return ask(key, system, [{ text: `Phrase prononcée : « ${phrase} »` }, ...audioPart(audio)], INTENTION_SCHEMA, 'low');
}

// answers : [{question, reponse}], takes : [{titre, transcript, metrics, audio}], drills : [{id, titre, cible}]
export function diagnose(key, answers, takes, drills, perso) {
  const user = `Test d'entrée. Établis le profil sur les 5 piliers (mental, physique, rhétorique et improvisation, assertivité et écoute, pratique) et un plan personnalisé. Les 15 leçons se suivent dans l'ordre ; donne un conseil personnel pour chacune. Choisis 2 ou 3 échauffements quotidiens parmi :
${drills.map((d) => `- ${d.id} : ${d.titre} (${d.cible})`).join('\n')}

Questionnaire :
${answers.map((a) => `- ${a.question} ${a.reponse}`).join('\n')}

Les enregistrements suivent.`;
  const parts = [{ text: user }];
  takes.forEach((t, i) => parts.push({ text: `Enregistrement ${i + 1}, « ${t.titre} »\n${describe(t, t.audio)}` }, ...audioPart(t.audio)));
  return ask(key, [COACH, personal(perso)].filter(Boolean).join('\n\n'), parts, diagnoseSchema(drills.map((d) => d.id)), 'low'); // réflexion basse : 2 min 30 d'audio feraient attendre plusieurs minutes
}
