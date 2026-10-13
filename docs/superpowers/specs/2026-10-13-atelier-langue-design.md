# Atelier langue : design

Date : 2026-10-13. Statut : validé en conversation, spec à relire avant le plan.

## Objectif

Travailler la langue orale, à côté des quinze leçons : grammaire, vocabulaire, structure de pensée, phrases claires et concises. Cibles prioritaires : les connecteurs logiques, les pronoms relatifs (qui, que, où, dont), les pronoms démonstratifs (celui, celle, ceux, celles) et les pronoms « en » et « y ».

Principe pédagogique : une règle courte, puis beaucoup de production à voix haute. Les erreurs réelles de l'utilisateur reviennent en révision jusqu'à ce qu'elles disparaissent.

Critères de réussite :
- une séance quotidienne de 5 minutes au plus, faisable sur le téléphone ;
- chaque erreur de langue relevée par le coach revient en révision jusqu'à trois réussites de suite ;
- l'atelier se reconnaît au premier coup d'œil (turquoise et motif du joint) ;
- tout reste gratuit (offre gratuite de Gemini), sans nouvelle dépendance ni étape de build.

## Décisions prises

- Approche B : un atelier quotidien, parallèle aux leçons, avec un carnet d'erreurs. Pas de leçons 16 à 21, pas de cours par niveaux.
- Direction visuelle A, « le joint » : blocs de mots, le mot travaillé dans un bloc turquoise.
- Sept fiches : les connecteurs sont répartis sur deux fiches.
- « en effet » reste banni des textes de l'app comme tic, sauf entre guillemets, quand on cite l'expression pour l'étudier.

## Parcours

### Séance d'atelier (5 minutes)

1. Jusqu'à 4 révisions du carnet (les plus anciennes d'abord), puis 3 phrases de la fiche en cours.
2. Pour chaque phrase : la consigne s'affiche, l'utilisateur appuie sur « Dire », parle (20 s au plus, arrêt automatique), puis l'app vérifie.
3. Vérification :
   - correspondance locale : si la dictée, normalisée, est égale à l'une des réponses attendues, c'est réussi, sans appel au coach ;
   - sinon, avec une clé API : le coach écoute l'audio et la dictée, et tranche ;
   - sinon, sans clé : la réponse attendue s'affiche, l'utilisateur indique « J'ai dit ça » ou « Pas tout à fait ».
4. Réussi : la phrase s'affiche en blocs, le joint en turquoise. Raté : « Tu as dit / On dit / Règle », et l'erreur entre dans le carnet.
5. Fin : un résumé (« 5 sur 7 »), l'état du carnet, un bouton « Terminer ». La séance est enregistrée et compte pour la série.

### Fiches

- Sept fiches dans l'ordre ci-dessous. Chacune : 3 ou 4 cartes de règle, au moins 8 phrases à dire.
- Une phrase « vue » est une phrase tentée (réussie ou passée au carnet). La fiche suivante s'ouvre quand toutes les phrases de la fiche en cours sont vues.
- Une fiche est « acquise » quand chacune de ses phrases a été réussie au moins une fois, dans l'atelier ou en révision du carnet.
- Quand les sept fiches sont vues, la séance prend 3 phrases au hasard parmi les fiches, en entretien.

### Carnet d'erreurs

- Deux sources : les phrases ratées dans l'atelier, et les corrections du coach après n'importe quel exercice (leçons, situations, échauffements, objections), dans les catégories de langue (voir « Coach ») et sans la mention « à vérifier ».
- Révision : la phrase fautive s'affiche, l'utilisateur la redit correctement. Même vérification que pour les fiches.
- Rythme : entrée dans le carnet, révision le lendemain ; réussite, révision 3 jours après ; réussite, révision 7 jours après ; troisième réussite de suite, l'erreur sort du carnet. Un échec remet le compteur à zéro et la révision au lendemain.
- Doublons : une erreur déjà présente (même phrase normalisée, pas encore sortie) n'est pas ajoutée une deuxième fois ; son compteur revient à zéro et sa révision au lendemain.
- Un bouton « Retirer » sort une entrée du carnet (faux positif du coach ou erreur de la dictée).
- Le carnet se synchronise entre appareils, comme les séances.

### Coach

- Six nouvelles catégories de correction : « connecteur », « pronom relatif », « pronom démonstratif », « pronom en ou y », « mot passe-partout », « genre ou accord ».
- Consigne ajoutée au prompt du coach : relever un connecteur qui ne suit pas la logique (« par conséquent » devant une cause, « en effet » employé pour « en fait »), une répétition qu'un pronom (dont, en, y, celui) aurait évitée, un verbe passe-partout (faire, mettre, avoir, il y a, chose) quand un mot précis existe.
- Règle d'écriture du coach : il n'emploie toujours pas « en effet » comme tic, mais il peut le citer entre guillemets.
- PREP (leçon 14, échauffement « Improvisation PREP ») reçoit ses connecteurs : Point, « Je pense que… » ; Raison, « En effet… » ou « car… » ; Exemple, « Par exemple… » ; Point, « C'est pourquoi… ». Critère ajouté : connecteurs justes entre les étapes.
- Nouvelle fonction de vérification d'une phrase d'atelier (voir « Modules »).

Catégories qui alimentent le carnet : préposition ou élision, phrase incomplète, mot lourd ou rare, redondance, phrase trop longue, registre, et les six nouvelles. Exclues : tic de langage (travaillé par « Zéro euh »), structure, autre.

## Contenu

### Connecteurs (fiches 1 et 2)

Choisis pour l'oral : 35 connecteurs. « et », « mais », « parce que », « alors » ne sont pas travaillés.

| Fiche | Relation | Connecteurs | Piège enseigné |
|---|---|---|---|
| 1 | Expliquer | car, puisque, en effet, comme, étant donné que | « en effet » justifie ce qui précède, « en fait » corrige ; « car » ne commence jamais une phrase |
| 1 | Conséquence | donc, c'est pourquoi, par conséquent, ainsi, si bien que | « du coup » est familier ; devant un jury, « donc » ou « c'est pourquoi » |
| 1 | Illustrer | par exemple, notamment, c'est le cas de | « notamment » introduit un exemple parmi d'autres |
| 1 | Reformuler | autrement dit, c'est-à-dire, plus précisément | « c'est-à-dire » précise, il ne sert pas à gagner du temps |
| 2 | Ajouter | de plus, d'ailleurs, par ailleurs, non seulement… mais aussi | « d'ailleurs » renforce ; « par ailleurs » aborde un autre aspect |
| 2 | Opposer, concéder | pourtant, cependant, en revanche, alors que, même si, bien que, certes… mais | « bien que » + subjonctif, « même si » + indicatif ; « en revanche » compare, « au contraire » contredit |
| 2 | Organiser | d'abord, ensuite, enfin, d'une part… d'autre part | « d'une part » appelle « d'autre part » |
| 2 | Conclure | bref, en somme, finalement, pour conclure | « enfin » annonce le dernier point, « finalement » donne le résultat |

### Les sept fiches

| N | Titre | Joint | Types de phrases | Exemple |
|---|---|---|---|---|
| 1 | Connecteurs : expliquer | le connecteur | relier | « La salle était pleine. » + « On a ajouté une date. » avec « c'est pourquoi » |
| 2 | Connecteurs : construire | le connecteur | relier | « Le projet a coûté cher. » + « Il a touché 300 élèves. » avec « certes… mais » |
| 3 | Qui, que, où, dont | le pronom | fusionner | « J'ai un projet. Je suis fier de ce projet. » donne « J'ai un projet dont je suis fier. » |
| 4 | Celui, celle, ceux, celles | le pronom | fusionner, remplacer | « Ce spectacle et le spectacle que j'ai vu hier » donne « Ce spectacle et celui que j'ai vu hier » |
| 5 | « En » et « y » | le pronom | remplacer | « Tu vas à la répétition ? » donne « Oui, j'y vais. » |
| 6 | Le mot précis | le verbe | préciser | « J'ai fait un atelier avec des lycéens » (indice : tu l'as conduit) donne « J'ai animé un atelier… » |
| 7 | La phrase claire | aucun | couper | une phrase de 35 mots à redire en deux ou trois phrases de 15 mots au plus |

Les phrases viennent de l'univers de l'utilisateur : scène, médiation, ateliers, jurys, partenaires, élus. Les cartes de règle donnent la règle en une ou deux phrases, deux exemples, et le piège.

### Types de phrases

| Type | Donnée affichée | Réussi si |
|---|---|---|
| relier | deux idées, et le connecteur imposé dans un bloc turquoise entre elles | une seule phrase correcte avec ce connecteur |
| fusionner | deux phrases | une seule phrase correcte avec le pronom attendu |
| remplacer | une question ou une phrase avec répétition | la réponse utilise le pronom attendu |
| préciser | une phrase avec un verbe passe-partout, et un indice | le verbe passe-partout est remplacé par un verbe précis accepté |
| couper | une phrase longue | deux ou trois phrases de 15 mots au plus, même sens ; toujours jugé par le coach, ou par l'utilisateur sans clé |
| corriger | une phrase fautive du carnet | la phrase corrigée, ou une variante correcte |

Format d'une phrase dans `fiches.js` :

```js
{ id: 'dont-03', type: 'fusionner', donnee: ["J'ai un projet.", 'Je suis fier de ce projet.'], joint: 'dont', attendus: ["J'ai un projet dont je suis fier."] }
```

Dans le texte des cartes, `{dont}` marque un mot à afficher en bloc turquoise (même convention d'accolades que les fins de phrase).

## Identité visuelle

- Couleur réservée : turquoise `#40e0d0` (`--langue`), texte noir dessus. Aucun pilier ne l'utilise.
- Le lundi de la série passe de firouzeh à golbehi (`#f7a8b8`), pour que le turquoise reste réservé à l'atelier. Les formes Memphis des leçons perdent aussi le turquoise, remplacé par golbehi.
- Motif du joint (`.chaine`) : une rangée de blocs bordés de 3 px, collés ; le mot travaillé (`.joint`) en turquoise. Sur un fond turquoise, le joint s'inverse : fond noir, texte turquoise.
- Bloc « Atelier langue » sur Aujourd'hui : fond turquoise, bordure 3 px, en-tête en Space Mono (« ATELIER LANGUE · 5 MIN »), titre (« 4 révisions, fiche 3 »), chaîne de l'emblème de la fiche en cours, bouton noir « Commencer l'atelier ».
- Onglet « Langue » : turquoise quand il est actif, au lieu du noir.
- Corrections de langue dans les notes du coach : étiquette turquoise de la catégorie et mention « Ajouté au carnet ».
- L'atelier n'utilise pas le plateau noir : l'enregistrement se fait dans la page, dans un cadre turquoise.

## Écrans et routes

| Route | Contenu |
|---|---|
| `#/` | bloc « Atelier langue » entre la leçon et les échauffements |
| `#/langue` | titre et motif ; séance du jour et bouton « Commencer » ; mosaïque des 7 fiches (acquise turquoise, en cours noire, à venir blanche) ; carnet : entrées à revoir, sorties, liste avec « Tu as dit / On dit », prochaine révision, compteur ■□□, bouton « Retirer » |
| `#/langue/n` | cartes de règle de la fiche, liste de ses phrases et leur état |
| `#/langue/seance` | la séance, phrase par phrase, puis le résumé |
| `#/progres` | section « Ma langue » : erreurs par catégorie sur les 14 derniers jours et les 14 précédents, taux de réussite de l'atelier, état du carnet |
| `#/session/:id` | pour une séance d'atelier : la liste des phrases et leur résultat |

Navigation : cinq onglets sur mobile (Aujourd'hui, Programme, Situations, Langue, Progrès), six sur grand écran (plus Réglages).

## Données et synchronisation

Deux nouvelles clés dans `DATA_KEYS`, donc exportées, importées et synchronisées :

- `langue` : `{ vus: { idPhrase: dateISO }, faits: { idPhrase: dateISO } }`. Fusion : union des deux tables, comme `progress.lecons`.
- `carnet` : tableau d'entrées. Fusion par `id`, la version dont `maj` est la plus récente gagne. Une entrée sortie garde `sorti` (jamais supprimée), pour qu'une fusion ne la fasse pas revenir.

```js
{ id, categorie, dit, correct, regle, origine: 'atelier' | 'seance', source, ajoute, prochaine: 'AAAA-MM-JJ', reussites: 0, sorti: null, maj }
```

Séance d'atelier enregistrée dans `sessions` : `{ exId: 'atelier-langue', titre: 'Atelier langue', origine: 'Atelier langue', manuel: true, transcript: '', langue: [{ id, type, reussi, dit }] }`. L'audio n'est jamais stocké.

## Modules et fichiers

| Fichier | Changement |
|---|---|
| `fiches.js` (nouveau) | contenu : `CONNECTEURS`, `FICHES` (cartes et phrases) |
| `langue.js` (nouveau) | logique pure, sans DOM : `normaliser`, `correspond`, `ajouterAuCarnet`, `apresRevision`, `aReviser`, `seanceDuJour`, `etatFiches` |
| `coach.js` | six catégories, consignes connecteurs et pronoms, nuance « en effet » entre guillemets, `verifierPhrase(key, phrase, prise, audio)` |
| `sync.js` | fusion de `langue` et `carnet` |
| `app.js` | `DATA_KEYS`, routes et vues `langue`, bloc sur Aujourd'hui, carnet alimenté après `askFeedback`, étiquettes dans `notes()`, section « Ma langue », résultat d'atelier dans `sessionView`, lundi golbehi |
| `style.css` | `--langue`, `.chaine`, `.joint`, `.block.langue`, onglet actif, étiquette turquoise |
| `index.html` | onglet « Langue » |
| `content.js` | connecteurs dans PREP (leçon 14, « Improvisation PREP ») |
| `test/content.test.js` | le contrôle des tics ignore les passages entre guillemets |

`verifierPhrase` renvoie, en JSON structuré, réflexion basse :

```js
{ reussi: boolean, entendu: string, correction: string, regle: string, categorie: CATEGORIES }
```

Consigne : juger seulement si la phrase est correcte à l'oral, garde le sens et utilise la structure demandée ; accepter toute variante correcte, sauf si la consigne impose un mot ; ne pas juger l'accent ni la prononciation, sauf si elle change le mot (« que » au lieu de « dont ») ; en cas d'échec, `correction` est la phrase correcte la plus proche de ce qui a été dit, et `regle` tient en une phrase. Audio joint quand il existe.

Normalisation locale : minuscules, apostrophe typographique ramenée à l'apostrophe droite, ponctuation et guillemets retirés, espaces compressées.

## Tests

- `test/langue.test.js` (nouveau) :
  - `normaliser` et `correspond` (casse, apostrophes, ponctuation) ;
  - `ajouterAuCarnet` : ajout, doublon, remise à zéro quand l'erreur revient ;
  - `apresRevision` : lendemain, puis J+3, puis J+7, puis sortie ; un échec ramène au lendemain ;
  - `aReviser` : 4 au plus, les plus anciennes d'abord, ignore les entrées sorties ;
  - `seanceDuJour` : révisions puis 3 phrases de la fiche en cours ; fiche suivante quand tout est vu ; entretien quand tout est vu ;
  - contenu : 7 fiches, au moins 3 cartes et 8 phrases chacune, ids uniques, joint présent dans chaque réponse attendue quand la phrase en a un, réponses attendues pour tous les types sauf « couper », typographie (ni tiret cadratin, ni demi-cadratin, ni guillemets droits, guillemets équilibrés).
- `test/sync.test.js` : fusion de `langue` (union) et de `carnet` (par id, `maj` la plus récente, sorties conservées).
- `test/content.test.js` : un tic cité entre guillemets passe, le même tic hors guillemets échoue.
- Vérification dans le navigateur : séance complète avec et sans clé, carnet alimenté par une séance de leçon, affichage à 412 px (Galaxy S25) et sur grand écran.

## Hors périmètre

- Exercices en anglais, jeu de rôle, niveaux de difficulté réglables.
- Saisie au clavier : l'atelier se fait à l'oral.
- Purge des entrées sorties du carnet : à ajouter si `donnees.json` grossit trop.

## Risques

- La dictée confond des homophones (« dont » et « don », « en » et « an ») : la correspondance locale échoue alors, et c'est le coach, avec l'audio, qui tranche. Pas d'échec sans son avis quand une clé existe.
- Quota gratuit de Gemini : 7 appels courts par séance au plus, moins grâce à la correspondance locale.
- Faux positifs du coach dans le carnet : bouton « Retirer ».
