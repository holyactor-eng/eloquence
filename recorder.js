// Capture d'une prise de parole : audio (réécoute), silences (Web Audio), transcription (dictée du navigateur).

const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
export const canTranscribe = Boolean(SR);

// Seuil RMS sous lequel on considère qu'il y a silence.
// ponytail: seuil fixe, à rendre adaptatif (bruit de fond mesuré) si les blancs sont mal détectés.
export const SILENCE_RMS = 0.015;

// brut : sans traitement du navigateur (le gain automatique masquerait une voix qui faiblit) et sans dictée.
// onSamples(tampon, fréquence) : le son brut toutes les 50 ms, pour suivre la hauteur en direct.
export async function startRecording({ onTranscript, onLevel, onSamples, brut = false } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: brut ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false } : { echoCancellation: true, noiseSuppression: true } });
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;

  // Audio pour la réécoute.
  const chunks = [];
  const media = new MediaRecorder(stream);
  media.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  media.start();

  // Silences : un blanc ne compte qu'une fois la parole commencée.
  const ctx = new AudioContext();
  await ctx.resume();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  const pauses = [];
  let speechStart = null, speechEnd = 0, silentSince = null;
  const tick = setInterval(() => {
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    const t = now();
    const rms = Math.sqrt(sum / buf.length);
    onLevel?.(rms);
    onSamples?.(buf, ctx.sampleRate);
    if (rms >= SILENCE_RMS) {
      speechStart ??= t;
      if (silentSince !== null) pauses.push({ start: silentSince, end: t });
      silentSince = null;
      speechEnd = t;
    } else if (speechStart !== null) {
      silentSince ??= t;
    }
  }, 50);

  // Transcription. Safari coupe la dictée après un silence : on la relance tant qu'on n'a pas fini.
  let finalText = '', interim = '', stopping = false, sr = null, srError = null;
  if (SR && !brut) {
    sr = new SR();
    sr.lang = 'fr-FR';
    sr.continuous = true;
    sr.interimResults = true;
    sr.onresult = (e) => {
      interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript.trim() + ' ';
        else interim += r[0].transcript;
      }
      onTranscript?.((finalText + interim).trim());
    };
    // « no-speech » (long silence) et « aborted » se relancent ; toute autre erreur arrête la dictée, sinon boucle infinie.
    sr.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') srError = e.error;
    };
    sr.onend = () => {
      if (interim) { finalText += interim.trim() + ' '; interim = ''; }
      if (!stopping && !srError) try { sr.start(); } catch { /* déjà relancée */ }
    };
    sr.start();
  }

  return {
    async stop() {
      stopping = true;
      clearInterval(tick);
      if (sr) {
        const ended = new Promise((r) => sr.addEventListener('end', r, { once: true }));
        sr.stop();
        await Promise.race([ended, new Promise((r) => setTimeout(r, 1500))]);
      }
      const durationSec = now();
      const stopped = new Promise((r) => (media.onstop = r));
      media.stop();
      await stopped;
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      const blob = new Blob(chunks, { type: media.mimeType });
      return {
        transcript: (finalText + interim).trim(),
        durationSec,
        speechStart: speechStart ?? 0,
        speechEnd: speechStart === null ? 0 : speechEnd,
        pauses,
        audioUrl: blob.size ? URL.createObjectURL(blob) : null,
        blob: blob.size ? blob : null,
        srError,
      };
    },
  };
}

// Décode un enregistrement (webm sur Chrome, mp4 sur Safari, wav) en échantillons mono à la fréquence voulue.
export async function decodeMono(blob, rate = 16000) {
  // Décodage hors ligne : pas de contexte audio matériel, qui peut rester suspendu sur Safari.
  const decoded = await new OfflineAudioContext(1, 1, rate).decodeAudioData(await blob.arrayBuffer());
  const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  return (await off.startRendering()).getChannelData(0);
}

// Convertit l'enregistrement en WAV 16 kHz mono, encodé en base64.
// Le WAV est accepté partout ; 90 s pèsent environ 3 Mo, sous la limite de 20 Mo par requête.
export async function toWavBase64(blob, rate = 16000) {
  const bytes = wavOctets(await decodeMono(blob, rate), rate);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// En-tête WAV (PCM 16 bits mono) pour nOctets de données.
export function enteteWav(nOctets, rate) {
  const view = new DataView(new ArrayBuffer(44));
  const ascii = (at, txt) => [...txt].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  ascii(0, 'RIFF'); view.setUint32(4, 36 + nOctets, true); ascii(8, 'WAVEfmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  ascii(36, 'data'); view.setUint32(40, nOctets, true);
  return view.buffer;
}

// Échantillons mono en fichier WAV complet. Un WAV se rembobine partout, contrairement au webm du micro sur Chrome.
export function wavOctets(pcm, rate) {
  const out = new Uint8Array(44 + pcm.length * 2);
  out.set(new Uint8Array(enteteWav(pcm.length * 2, rate)));
  const view = new DataView(out.buffer);
  pcm.forEach((v, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 0x7fff, true));
  return out;
}
