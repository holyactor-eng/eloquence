// Synchronisation entre appareils via un fichier donnees.json dans un dépôt GitHub PRIVÉ de l'utilisateur.
// Un état = { donnees: { clé: valeur }, majs: { clé: date ISO de dernière modification } }.

// Fusion de l'état de cet appareil (local) et de celui du dépôt (distant).
// Séances : on additionne (même id : la version locale gagne). Leçons faites : on additionne.
// Le reste : la clé modifiée en dernier gagne ; à égalité ou sans valeur locale, le dépôt gagne.
export function fusion(local, distant) {
  const a = local.donnees, b = distant.donnees, donnees = {}, majs = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const ta = local.majs?.[k] ?? '', tb = distant.majs?.[k] ?? '';
    const prendLocal = a[k] != null && (b[k] == null || ta > tb);
    donnees[k] = prendLocal ? a[k] : b[k];
    if (ta || tb) majs[k] = ta > tb ? ta : tb;
  }
  const seances = new Map();
  for (const s of [...(b.sessions ?? []), ...(a.sessions ?? [])]) seances.set(s.id, s);
  if (seances.size) donnees.sessions = [...seances.values()].sort((x, y) => y.date.localeCompare(x.date));
  if (a.progress || b.progress) donnees.progress = { ...b.progress, ...a.progress, lecons: { ...b.progress?.lecons, ...a.progress?.lecons } };
  return { donnees, majs };
}

const b64 = (txt) => {
  const bytes = new TextEncoder().encode(txt);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const deb64 = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

const entetes = (jeton, accept = 'application/vnd.github+json') => ({ authorization: `Bearer ${jeton}`, accept, 'x-github-api-version': '2022-11-28' });
const erreur = async (r) => Object.assign(new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`), { status: r.status });

// Vérifie le jeton et refuse un dépôt public : tes données personnelles n'y vont jamais.
export async function verifier({ depot, jeton }) {
  const r = await fetch(`https://api.github.com/repos/${depot}`, { headers: entetes(jeton), cache: 'no-store' });
  if (!r.ok) throw await erreur(r);
  if (!(await r.json()).private) throw new Error('Ce dépôt est public. Choisis un dépôt privé.');
}

// Renvoie { etat, sha }, ou null si le fichier n'existe pas encore.
export async function lire({ depot, jeton }) {
  const url = `https://api.github.com/repos/${depot}/contents/donnees.json`;
  const r = await fetch(url, { headers: entetes(jeton), cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw await erreur(r);
  const j = await r.json();
  // Au-delà de 1 Mo, l'API ne renvoie pas le contenu : on le redemande brut.
  const txt = j.encoding === 'base64' && j.content
    ? deb64(j.content)
    : await (await fetch(url, { headers: entetes(jeton, 'application/vnd.github.raw+json'), cache: 'no-store' })).text();
  return { etat: JSON.parse(txt), sha: j.sha };
}

// Écrit l'état. Lève une erreur status 409 si le fichier a changé entre-temps (sha périmé).
export async function ecrire({ depot, jeton }, etat, sha) {
  const r = await fetch(`https://api.github.com/repos/${depot}/contents/donnees.json`, {
    method: 'PUT',
    headers: entetes(jeton),
    body: JSON.stringify({ message: `Synchro du ${new Date().toISOString()}`, content: b64(JSON.stringify(etat)), ...(sha && { sha }) }),
  });
  if (!r.ok) throw await erreur(r);
}
