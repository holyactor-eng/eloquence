// Contenu de l'app. Règles : pas de tiret cadratin, guillemets français, tutoiement (vérifié par test/content.test.js).
// {sujet}, {phrase} et {mot} sont remplacés au hasard à l'affichage.

export const PILIERS = {
  mental: { lettre: "M", nom: "Mental", desc: "Réduire le trac, dépersonnaliser le regard des autres, accepter l'imperfection." },
  physique: { lettre: "P", nom: "Physique", desc: "Regard, posture, gestes, souffle et voix." },
  rhetorique: { lettre: "R", nom: "Rhétorique et improvisation", desc: "Structurer un message clair, partir d'une conviction, l'étayer par des faits." },
  assertivite: { lettre: "A", nom: "Assertivité et écoute", desc: "S'affirmer, écouter, s'adapter au public plutôt que chercher à performer." },
  pratique: { lettre: "F", nom: "Pratique et feedback", desc: "Exercices, mises en situation, retours réguliers." },
};

const VIRELANGUES = "Les chaussettes de l'archiduchesse sont-elles sèches, archi-sèches ? Un chasseur sachant chasser doit savoir chasser sans son chien. Si six scies scient six cyprès, six cent six scies scient six cent six cyprès. Panier, piano, panier, piano.";

const TEXTE_PAUSES = "Le théâtre m'a appris une chose. / Ce n'est pas celui qui parle le plus fort qu'on écoute. // C'est celui qui sait se taire au bon moment. / Sur scène, le silence n'est pas un vide. // C'est l'instant où le public se penche en avant.";

const CRITERES_VIRELANGUES = "Compare ce que tu entends au texte attendu : mots avalés, syllabes escamotées, sons confondus. OK si tout reste net jusqu'à la lecture la plus rapide, Moyen si quelques accrocs, Répéter si plusieurs mots sont déformés.";
const AVEUGLE_CONSIGNE = "Écoute les trois modèles. Choisis une intention en secret, dis la phrase : le coach dit ce qu'il a entendu.";
const FINS_CONSIGNE = "Écoute la voix qui lâche, puis la voix portée. Répète la phrase et compare ta courbe à celle du modèle.";

export const LECONS = [
  {
    n: 1, titre: "Réussir la première impression", duree: 15, piliers: ["physique", "rhetorique"],
    technique: "Les 7 premières secondes : ancrage, regard, première phrase préparée.",
    cartes: [
      { titre: "Avant le premier mot", texte: "On te juge avant que tu parles : ta façon d'entrer, de te poser, de regarder. Prends deux secondes pour t'ancrer : pieds au sol, épaules basses, regard posé sur une personne. Ce silence te donne de l'autorité, il ne t'en retire pas." },
      { titre: "Une première phrase préparée", texte: "Le blanc arrive surtout au début. Prépare ta première phrase mot pour mot, et seulement elle. Une fois lancé, le reste vient plus facilement." },
      { titre: "Un positionnement en une phrase", texte: "Un parcours pluriel se résume mal en liste de métiers. Cherche le fil : ce que tu fais pour les autres, et avec quels outils. Par exemple : « Je conçois des ateliers où des publics éloignés de la culture prennent la parole, avec les outils du théâtre. » Les détails viendront si on te les demande." },
      { titre: "Finir net", texte: "Une présentation se termine sur un point final, pas sur « voilà » ni sur « enfin, bref ». Descends la voix sur le dernier mot et tais-toi. Le silence qui suit appartient à ton interlocuteur." },
      { titre: "Un fil, trois portes d'entrée", texte: "Un jury veut des preuves, une soirée pro veut une image, un atelier veut de la chaleur. Le fond ne change pas ; seul l'exemple choisi change." },
    ],
    exercices: [
      { titre: "« Que faites-vous ? » face à un jury", consigne: "Un membre du jury te demande : « Que faites-vous, en une phrase ? » Réponds en 30 secondes maximum. Une idée, une preuve, un point final.", prep: 20, cible: 30, criteres: "Une seule idée centrale en première phrase. Une preuve concrète. Fin nette, sans « voilà »." },
      { titre: "« Que faites-vous ? » en soirée pro", consigne: "Quelqu'un te demande ce que tu fais, un verre à la main. Réponds en 30 secondes avec une image concrète plutôt qu'une liste de métiers.", prep: 20, cible: 30, criteres: "Image concrète. Pas de liste. Donne envie de poser une question." },
      { titre: "« Que faites-vous ? » en atelier", consigne: "Tu te présentes à un groupe d'adolescents au début d'un atelier. 30 secondes, simple et chaleureux, sans jargon.", prep: 20, cible: 30, criteres: "Vocabulaire simple. Chaleur sans familiarité forcée. Une phrase qui donne envie de commencer." },
    ],
    defi: "Cette semaine, présente-toi au moins une fois avec ta phrase de positionnement, sans liste de métiers. Note la question qu'on te pose ensuite : c'est elle qui te dit si ta phrase a ouvert une porte.",
  },
  {
    n: 2, titre: "Bâtir la confiance par la voix", duree: 11, piliers: ["physique"],
    technique: "Voix posée, souffle, fins de phrase qui ne descendent que sur la dernière syllabe.",
    cartes: [
      { titre: "La mélodie trahit le doute", texte: "Une phrase qui monte à la fin sonne comme une question, même quand c'est une affirmation. L'oreille entend : « je ne suis pas sûr ». Fais descendre la voix à la fin de chaque affirmation, mais sur la dernière syllabe seulement." },
      { titre: "Tenir jusqu'au point final", texte: "Une voix qui retombe trop tôt avale les derniers mots, souvent les plus importants. En français, l'accent tombe sur la dernière syllabe du groupe de mots. Chaque groupe finit par une légère montée qui annonce la suite ; seule la dernière syllabe de la phrase descend, un peu allongée. Garde le fond de la salle en ligne de mire jusqu'au point." },
      { titre: "Parler depuis le souffle", texte: "Une voix qui tient vient du ventre, pas de la gorge. Inspire par le nez en gonflant le ventre, parle sur l'expiration. Quand la voix serre, c'est que le souffle manque : reprends de l'air plutôt que de forcer." },
      { titre: "Le volume juste", texte: "Vise la personne la plus éloignée de la pièce. Parler un peu plus fort que nécessaire donne l'impression d'être à sa place. Parler trop bas oblige l'auditoire à faire l'effort, et il décroche." },
      { titre: "L'intention avant le ton", texte: "Ne cherche pas « une voix assurée ». Décide ce que tu veux produire chez l'autre : rassurer, convaincre, alerter. Le ton suit l'intention. C'est le travail de l'acteur, et tu le connais." },
      { titre: "Ta voix entière", texte: "Ton accent, tes langues, tes références font partie de ta voix. Ne les gomme pas pour paraître inoffensif ou pour éviter un stéréotype. Change de registre quand ton interlocuteur le demande, pas par peur d'être jugé." },
    ],
    exercices: [
      { titre: "Une phrase, trois intentions", consigne: "Dis trois fois la phrase « Ce projet mérite qu'on lui donne du temps. » D'abord pour rassurer, puis pour convaincre, puis pour alerter. Laisse un silence entre chaque version.", prep: 10, cible: 30, criteres: "Juge à l'oreille si les trois intentions se distinguent : débit, hauteur, volume, accents d'insistance, pauses. Pour chaque version, dis laquelle tu entends." },
      { titre: "Lecture affirmée", consigne: "Lis ce texte à voix haute comme si tu l'avais écrit et que tu y croyais. Chaque phrase tient jusqu'à sa dernière syllabe, puis descend.", texte: "Une salle de spectacle n'est pas seulement un lieu où l'on regarde. C'est un lieu où l'on apprend à être ensemble sans se connaître. Quand les lumières baissent, chacun laisse un peu de lui-même à la porte. Pendant une heure, on accepte de ressentir la même chose que des inconnus. C'est rare. Et c'est pour cela qu'il faut ouvrir ces portes à celles et ceux qui ne les ont jamais franchies.", prep: 15, cible: 30 },
      { titre: "Fins de phrase", consigne: FINS_CONSIGNE, cible: 120, intonation: true },
      { titre: "Trois intentions à l'aveugle", consigne: AVEUGLE_CONSIGNE, cible: 120, aveugle: true },
    ],
    defi: "En réunion cette semaine, surveille tes fins de phrase. À chaque affirmation importante, tiens la voix jusqu'à la dernière syllabe, fais-la descendre, puis marque un temps.",
  },
  {
    n: 3, titre: "La confiance gagne", duree: 10, piliers: ["mental"],
    technique: "Dépersonnaliser le regard des autres, droit à l'imperfection : utile, pas parfait.",
    cartes: [
      { titre: "Le public n'est pas un tribunal", texte: "Le trac vient de l'idée qu'on est évalué comme personne. En réalité, l'auditoire attend quelque chose pour lui : une information, une idée, un moment. Déplace ton attention de « comment je parais » vers « avec quoi vont-ils repartir »." },
      { titre: "La légitimité est une situation", texte: "La légitimité n'est pas un titre. Elle naît de la situation : on t'a invité, un public est là pour t'écouter, tu as un message à porter. Tu n'as pas besoin d'être le meilleur spécialiste de la salle ; tu as besoin d'avoir quelque chose d'utile à dire." },
      { titre: "La mission avant toi", texte: "Quand tu parles d'un projet, d'une structure, d'une œuvre, mets-les devant toi. Ce n'est pas ta personne qu'on juge, c'est le message que tu portes. S'effacer derrière la mission réduit le trac et donne du poids à ce que tu dis." },
      { titre: "L'erreur est invisible", texte: "Un mot raté, une phrase reprise : l'auditoire l'oublie en quelques secondes, sauf si tu t'excuses. Ne commente jamais ton erreur. Reprends, et continue." },
      { titre: "Aucune excuse", texte: "« Désolé pour mes slides », « je me suis préparé hier soir », « je ne suis pas vraiment… », « j'ai juste fait… » : chaque excuse réduit ce que tu as fait et donne un argument à qui veut te contredire. Énonce les faits. La modestie s'entend dans le ton, pas dans l'autodépréciation." },
      { titre: "Autodérision, pas autodénigrement", texte: "Rire de la situation détend la salle ; rabaisser ton travail la fait douter de toi. L'humour sert d'intercalaire, pour relâcher la tension entre deux idées fortes. Jamais de bouclier quand on te met en difficulté." },
      { titre: "Recadrer à voix haute", texte: "Quand une pensée négative arrive (« ils vont voir que je ne sais pas »), dis-la, puis reformule-la en fait vérifiable : « je connais ce sujet par l'expérience ; je dirai ce que je ne sais pas ». On croit davantage ce qu'on s'entend dire." },
    ],
    exercices: [
      { titre: "Ma légitimité en 60 secondes", consigne: "Explique en 60 secondes pourquoi tu as ta place pour parler de ton métier. Uniquement des faits : ce que tu as fait, avec qui, ce que ça a produit. Aucune excuse, aucun « juste ».", prep: 20, cible: 60, criteres: "Garde-fou autocritique : relève toute formule qui minimise (« juste », « un peu », « pas grand-chose », « j'essaie de »). Faits concrets et chiffrés, cohérents avec la fiche récit." },
      { titre: "Recadrer une pensée", consigne: "Dis à voix haute une pensée qui te freine avant de parler en public. Puis reformule-la en trois phrases factuelles et apaisées.", prep: 15, cible: 45, criteres: "Pensée nommée clairement. Reformulation factuelle, sans déni ni pensée magique." },
    ],
    defi: "Cette semaine, chaque fois que tu t'apprêtes à dire « je ne suis pas expert, mais », supprime la première moitié et commence directement par ce que tu sais.",
  },
  {
    n: 4, titre: "Prendre la parole partout", duree: 10, piliers: ["mental", "assertivite"],
    technique: "Rebondir puis apporter, règle des 3 secondes.",
    cartes: [
      { titre: "La règle des 3 secondes", texte: "Plus tu attends pour intervenir, plus la barrière monte. Quand tu as quelque chose à dire, lance-toi dans les trois secondes. La première phrase peut être simple : l'important est d'entrer." },
      { titre: "Rebondir puis apporter", texte: "Pour entrer dans une discussion, reprends ce qui vient d'être dit (« Ce que dit Claire sur les publics scolaires me fait penser à… »), puis apporte une chose nouvelle. Tu montres que tu écoutes, et tu fais avancer." },
      { titre: "Une idée par intervention", texte: "En table ronde, on retient une idée par prise de parole. Si tu en as trois, garde la plus forte et réserve les autres pour plus tard." },
      { titre: "Prendre position avec nuance", texte: "La nuance n'est pas l'hésitation. Annonce ta position clairement, puis montre sa limite : « Je pense que…, et je vois bien que… ». Tu restes ferme sans fermer le débat." },
      { titre: "Être contredit, c'est gagner", texte: "Un débat n'est pas un combat avec un gagnant et un perdant, c'est une conversation. Quand on te contredit, on te montre une faille de ton argument : tu repars avec un argument plus solide. Accueille l'objection, réponds sur le fond." },
    ],
    exercices: [
      { titre: "Entrer dans une table ronde", consigne: "Table ronde sur la culture dans les quartiers. L'intervenant précédent conclut : « Les jeunes ne viennent plus au théâtre, c'est un fait. » Rebondis et prends position avec nuance, en 45 secondes.", prep: 15, cible: 45, criteres: "Reprise explicite de ce qui précède. Une seule idée apportée. Position claire, nuance assumée, pas de slogan final." },
      { titre: "Rebond spontané", consigne: "Quelqu'un vient de dire : « {phrase} » Rebondis en 30 secondes.", prep: 5, cible: 30, criteres: "Entrée rapide. Reprise de la phrase. Une idée apportée." },
    ],
    defi: "Lors de ta prochaine réunion, fais ta première intervention dans les cinq premières minutes, même courte.",
  },
  {
    n: 5, titre: "Secrets du storytelling", duree: 13, piliers: ["rhetorique"],
    technique: "Partir d'une scène vécue, aller du particulier au collectif, finir ouvert.",
    cartes: [
      { titre: "Une scène, pas un résumé", texte: "« J'ai beaucoup travaillé avec des jeunes » ne reste pas en mémoire. « Un mardi, un garçon de quatorze ans a refusé de monter sur scène, puis a demandé à passer en dernier » reste. Commence par un moment précis : un lieu, une heure, un geste." },
      { titre: "La structure en quatre temps", texte: "Situation, complication, résolution, sens. Où on est, ce qui coince, ce qui se passe, ce que ça dit de plus large. Le quatrième temps est court : une phrase suffit." },
      { titre: "Du particulier au collectif", texte: "Le détail vécu ouvre sur une question plus large. Ne la démontre pas : pose-la, et laisse l'auditoire faire le chemin." },
      { titre: "Finir ouvert", texte: "Une histoire qui se termine par une morale ferme perd l'auditoire. Termine par une image ou une question. Évite la formule de combat : elle transforme un récit en slogan." },
      { titre: "Couper ce qui ne sert pas", texte: "Chaque détail doit porter le sens. Si tu peux l'enlever sans que l'histoire change, enlève-le. Un récit de 90 secondes contient trois ou quatre détails, pas dix. Et le mot juste est le mot simple : celui que ton public comprend sans effort." },
    ],
    exercices: [
      { titre: "Anecdote de 90 secondes", consigne: "Raconte un moment précis de ton travail où quelque chose a basculé chez quelqu'un. Commence par la scène (lieu, moment, geste). Termine par une question ou une image, pas par une morale.", prep: 30, cible: 90, criteres: "Ouverture sur une scène concrète. Structure situation, complication, résolution, sens. Fin ouverte, pas de slogan." },
      { titre: "Un objet, une histoire", consigne: "Choisis un objet autour de toi et raconte en 60 secondes un souvenir qu'il évoque, en allant du détail vers une idée plus large.", prep: 20, cible: 60, criteres: "Détail concret de départ. Passage naturel vers une idée plus large. Pas de grandiloquence." },
    ],
    defi: "Cette semaine, quand on te demande comment ça va au travail, réponds par une scène précise plutôt que par un résumé.",
  },
  {
    n: 6, titre: "Langage corporel", duree: 15, piliers: ["physique"],
    technique: "Ancrage, gestes ouverts, regard qui balaie.",
    cartes: [
      { titre: "L'ancrage", texte: "Pieds à largeur de hanches, poids réparti, genoux souples. Un corps ancré ne se balance pas et ne recule pas. Si tu bouges, c'est pour aller vers ton auditoire, pas pour le fuir." },
      { titre: "Les mains au service du propos", texte: "Garde tes mains visibles, à hauteur de taille. Un geste accompagne une idée et s'arrête avec elle. Les mains dans les poches ou les bras croisés ferment la communication." },
      { titre: "Le regard qui balaie", texte: "Pose ton regard sur une personne le temps d'une idée, puis passe à une autre. Face à un jury de deux, alterne, et regarde d'abord la personne qui a posé la question." },
      { titre: "Le corps pendant le blanc", texte: "Quand le blanc arrive, le corps se fige ou s'agite. Ralentis la respiration, repose les pieds, regarde quelqu'un. Un corps calme rappelle la pensée." },
      { titre: "Le trac devient focalisation", texte: "Le stress de la préparation est de l'énergie. Juste avant d'entrer, rétrécis ton attention : ta première phrase, la première personne que tu regarderas, ta phrase d'atterrissage. Sur scène, plus rien d'autre. C'est l'entrée en scène, et tu la connais." },
      { titre: "Ce que l'audio ne voit pas", texte: "L'app enregistre seulement le son. Filme-toi aussi avec ton téléphone si tu peux, puis coche la grille d'auto-évaluation en regardant la vidéo." },
    ],
    exercices: [
      { titre: "Discours ancré", consigne: "Debout, présente en 60 secondes un spectacle que tu aimes à un groupe qui ne le connaît pas. Applique l'ancrage, les gestes et le regard. Filme-toi si possible.", prep: 20, cible: 60, criteres: "Le corps n'est pas visible : juge le contenu et la clarté." },
    ],
    defi: "À ta prochaine prise de parole, choisis trois personnes dans la salle et adresse-leur tour à tour une idée entière.",
  },
  {
    n: 7, titre: "Lire les gens comme un pro", duree: 15, piliers: ["assertivite"],
    technique: "Écoute active, lecture des signaux, reformulation.",
    cartes: [
      { titre: "Écouter pour comprendre", texte: "Pendant que l'autre parle, on prépare souvent sa réponse. Résultat : on répond à côté. Écoute jusqu'au bout, puis prends une seconde avant de parler." },
      { titre: "Les signaux d'un groupe", texte: "Regards qui fuient, chaises qui bougent, rires nerveux, téléphones : un groupe te dit en permanence s'il est avec toi. Ce n'est pas une attaque, c'est une information." },
      { titre: "La reformulation", texte: "Redis en une phrase ce que tu as compris, avec tes mots : « Si je comprends bien, tu trouves que… ». La personne se sent entendue, et tu vérifies que tu as bien compris." },
      { titre: "L'émotion et le besoin", texte: "Derrière une réaction, il y a une émotion et un besoin. « Tu as l'air agacé ; tu as besoin qu'on avance plus vite ? » Une hypothèse posée avec douceur ouvre plus qu'une consigne." },
      { titre: "Réengager avant de recadrer", texte: "Face à un groupe qui décroche, change le format avant de hausser le ton : une question, un mouvement, une tâche à deux. Le recadrage vient en dernier." },
    ],
    exercices: [
      { titre: "Groupe scolaire agité", consigne: "Tu présentes un spectacle à une classe de quatrième. Au fond, trois élèves rient et parlent fort. Dis à voix haute ce que tu observes, puis ce que tu dis au groupe pour le réengager, en 60 secondes.", prep: 20, cible: 60, criteres: "Observation sans jugement. Hypothèse sur l'émotion et le besoin. Action pour réengager avant tout recadrage. Pas de ton moralisateur." },
      { titre: "Reformuler un partenaire", consigne: "Un partenaire te dit : « J'ai l'impression qu'on me consulte toujours au dernier moment, et après on s'étonne que je ne sois pas motivé. » Reformule ce que tu comprends (émotion et besoin) en 30 secondes, sans te justifier.", prep: 10, cible: 30, criteres: "Reformulation fidèle. Émotion et besoin nommés. Aucune justification." },
    ],
    defi: "Cette semaine, dans une conversation tendue, reformule au moins une fois avant de répondre.",
  },
  {
    n: 8, titre: "Donner un feedback difficile vite", duree: 17, piliers: ["assertivite"],
    technique: "SCI : Situation, Comportement, Impact, puis une demande.",
    cartes: [
      { titre: "Vite, mais pas à chaud", texte: "Un feedback difficile perd sa force avec le temps. Donne-le dans les 48 heures, en privé, quand tu es calme." },
      { titre: "Situation", texte: "Commence par un moment précis : « Jeudi, pendant la réunion avec la mairie… ». Pas de « toujours », pas de « jamais »." },
      { titre: "Comportement", texte: "Décris ce qui s'est vu ou entendu, pas une intention : « tu as présenté le budget sans les chiffres de fréquentation », pas « tu n'as pas préparé »." },
      { titre: "Impact", texte: "Dis la conséquence concrète, pour le projet ou pour toi : « la mairie nous demande de revenir avec un dossier complet, on perd trois semaines »." },
      { titre: "Puis une demande", texte: "Termine par une demande claire et une question ouverte : « La prochaine fois, peut-on relire ensemble la veille ? Qu'est-ce qui t'aiderait ? » Puis écoute. Le feedback devient une conversation." },
      { titre: "Ne pas noyer le message", texte: "La tentation est d'entourer la critique de compliments et de justifications. Le message se perd. Une situation, un comportement, un impact, une demande : moins d'une minute." },
    ],
    exercices: [
      { titre: "Feedback à un partenaire", consigne: "Un partenaire de projet a envoyé le dossier de subvention sans te le faire relire, avec une erreur dans le budget. Donne-lui ton feedback avec la méthode SCI, en 45 secondes.", prep: 20, cible: 45, criteres: "Situation datée. Comportement observable, sans intention prêtée. Impact concret. Demande claire et question ouverte. Pas de sur-justification ni de ton moralisateur." },
      { titre: "Feedback à un comédien", consigne: "Pendant une répétition, un comédien arrive en retard pour la troisième fois. Donne-lui ton feedback en 45 secondes, avec la méthode SCI.", prep: 20, cible: 45, criteres: "Méthode SCI complète. Ton ferme et respectueux. Moins d'une minute." },
    ],
    defi: "Identifie un feedback que tu repousses. Écris-le en SCI, puis donne-le cette semaine.",
  },
  {
    n: 9, titre: "Gérer les gens difficiles finement", duree: 13, piliers: ["assertivite", "mental"],
    technique: "Technique du brouillard, disque rayé, réponse courte et calme.",
    cartes: [
      { titre: "Ne pas mordre à l'hameçon", texte: "Une remarque piquante cherche souvent une réaction. Si tu te défends longuement, tu confirmes qu'elle a touché. Respire, ralentis, réponds court." },
      { titre: "La technique du brouillard", texte: "Accorde la part de vrai sans te soumettre : « C'est vrai que mon parcours est surtout artistique. » Puis reviens à ton point. Le brouillard absorbe l'attaque sans la renvoyer." },
      { titre: "Le disque rayé", texte: "Face à quelqu'un qui insiste, redis calmement la même idée avec presque les mêmes mots. Pas besoin de nouveaux arguments : la constance suffit." },
      { titre: "La question qui recadre", texte: "« Qu'est-ce qui vous ferait douter, concrètement ? » Une question sincère transforme une objection floue en point précis, auquel tu peux répondre." },
      { titre: "Répondre court", texte: "Une objection hostile appelle une réponse plus courte que d'habitude, pas plus longue. Trois temps : j'entends, je réponds, je relance." },
      { titre: "Garder ton objectif", texte: "Quand une question t'éloigne de ton message, réponds-y brièvement, puis fais le pont : « … et ce qui compte vraiment ici, c'est… ». Attention en jury de recrutement : les questions factuelles appellent une réponse complète d'abord. Le pont vient après, jamais à la place." },
    ],
    exercices: [
      { titre: "Membre de jury hostile", consigne: "Un membre du jury lance : « Votre profil est très artistique. Vous n'allez pas vous ennuyer derrière un guichet ? » Réponds en 45 secondes maximum : brouillard, réponse, relance.", prep: 15, cible: 45, criteres: "Pas de défense longue ni de sur-justification. Part de vrai accordée. Réponse concrète. Relance ou fin nette. Ton calme, sans autocritique." },
      { titre: "Interlocuteur qui insiste", consigne: "Un élu te répète : « La médiation, c'est bien, mais ça ne remplit pas les salles. » Réponds deux fois de suite avec la technique du disque rayé, en 45 secondes au total.", prep: 15, cible: 45, criteres: "Même idée tenue deux fois, calmement. Pas de nouvel argument à chaque relance." },
    ],
    defi: "À la prochaine remarque désagréable, réponds en trois phrases maximum, puis observe ce qui se passe.",
  },
  {
    n: 10, titre: "Dire « non » en restant apprécié", duree: 10, piliers: ["assertivite"],
    technique: "Le non positif : ce que tu protèges, un non clair, une alternative. Refus court.",
    cartes: [
      { titre: "Ce que protège ton non", texte: "Un bon refus protège quelque chose : ton temps, un projet, une priorité. Commence par le savoir, pour toi : « Je tiens à finir ce dossier correctement. »" },
      { titre: "Le non clair", texte: "Dis non en une phrase, sans conditionnel ni « je ne sais pas si ». « Je ne pourrai pas prendre cet atelier. »" },
      { titre: "L'alternative", texte: "Propose autre chose si c'est possible : une date, une personne, une version réduite. Ce n'est pas obligatoire. Un non sans alternative reste un non respectable." },
      { titre: "Moins tu justifies, mieux c'est reçu", texte: "Chaque justification ouvre une négociation. Une raison suffit, deux au maximum. « Pas disponible ce week-end. Désolé. » est une réponse complète." },
    ],
    exercices: [
      { titre: "Trois refus", consigne: "Refuse ces trois demandes, en une ou deux phrases chacune, avec une pause entre elles. Un : un collègue te demande d'animer un atelier samedi. Deux : un ami te demande de jouer gratuitement dans son court-métrage. Trois : ta responsable te demande de reprendre un dossier en plus des tiens cette semaine.", prep: 20, cible: 60, criteres: "Pour chaque refus : une à deux phrases, non clair, pas de sur-justification, alternative si pertinente. Ton cordial." },
    ],
    defi: "Cette semaine, refuse une demande en deux phrases maximum, sans t'excuser plus d'une fois.",
  },
  {
    n: 11, titre: "Interrompre avec fluidité", duree: 10, piliers: ["assertivite"],
    technique: "Prénom, reconnaissance, pivot.",
    cartes: [
      { titre: "Interrompre rend service", texte: "Quand quelqu'un monopolise la parole, le groupe attend souvent qu'on intervienne. Le faire avec tact rend service à tout le monde." },
      { titre: "Le prénom d'abord", texte: "Dire le prénom de la personne attire son attention sans agressivité. Elle s'arrête presque toujours pour écouter." },
      { titre: "Reconnaître, puis pivoter", texte: "« Ce que tu dis sur le budget est important… », puis le pivot : « …et j'aimerais qu'on entende aussi Samir, qui n'a pas encore parlé. » Tu valides et tu redistribues la parole." },
      { titre: "Le geste et le ton", texte: "Une main légèrement levée, une voix posée et un peu plus forte que la sienne. Pas de reproche dans le ton : tu organises la discussion, tu ne punis personne." },
    ],
    exercices: [
      { titre: "Table ronde monopolisée", consigne: "Tu animes une table ronde. Un intervenant parle depuis quatre minutes et déborde du sujet. Interromps-le et redonne la parole à une autre intervenante, en 30 secondes.", prep: 10, cible: 30, criteres: "Prénom, reconnaissance, pivot. Ton sans reproche. Concision." },
      { titre: "Recentrer une réunion", consigne: "En réunion d'équipe, la discussion part sur un sujet hors ordre du jour. Interromps et ramène le groupe au point prévu, en 30 secondes.", prep: 10, cible: 30, criteres: "Interruption nette et respectueuse. Proposition pour traiter le sujet plus tard." },
    ],
    defi: "À ta prochaine réunion, pratique une interruption avec prénom, reconnaissance et pivot.",
  },
  {
    n: 12, titre: "Désamorcer tout conflit", duree: 15, piliers: ["assertivite"],
    technique: "Accueillir l'émotion, chercher le besoin, construire la solution ensemble.",
    cartes: [
      { titre: "Faire baisser avant de résoudre", texte: "Une personne en colère n'entend pas les solutions. Il faut d'abord faire baisser l'émotion. Parle plus lentement et plus bas qu'elle." },
      { titre: "Accueillir l'émotion", texte: "« Je comprends que vous soyez furieux, vous avez fait le trajet pour rien. » Accueillir n'est pas donner raison : c'est reconnaître ce que l'autre vit." },
      { titre: "Chercher le besoin", texte: "Derrière « c'est inadmissible », il y a un besoin : être respecté, être informé, ne pas perdre son argent. Pose une question pour le trouver." },
      { titre: "Construire ensemble", texte: "Propose une solution, ou demande : « Qu'est-ce qui vous conviendrait ? » Une personne qui participe à la solution l'accepte plus facilement." },
      { titre: "Les mots qui rallument", texte: "« Calmez-vous », « ce n'est pas de ma faute », « c'est le règlement » rallument le conflit. Remplace-les par ce que tu peux faire." },
    ],
    exercices: [
      { titre: "Spectateur furieux au guichet", consigne: "Un spectateur arrive au guichet : le spectacle est complet alors qu'il avait réservé par téléphone, et sa réservation n'apparaît pas. Il hausse le ton. Réponds-lui en 60 secondes.", prep: 15, cible: 60, criteres: "Émotion accueillie en premier. Aucun « calmez-vous » ni « c'est le règlement ». Question sur le besoin. Solution concrète ou construite ensemble." },
      { titre: "Deux partenaires en conflit", consigne: "Deux partenaires d'un projet se disputent devant toi sur le partage du budget. Interviens pour faire baisser la tension et proposer une suite, en 60 secondes.", prep: 15, cible: 60, criteres: "Neutralité. Émotions des deux reconnues. Proposition de méthode plutôt que de verdict." },
    ],
    defi: "À la prochaine tension, accueille l'émotion de l'autre en une phrase avant de répondre sur le fond.",
  },
  {
    n: 13, titre: "Ta voix, ton instrument", duree: 11, piliers: ["physique"],
    technique: "Souffle, débit de 130 à 160 mots par minute, articulation.",
    cartes: [
      { titre: "Le souffle", texte: "Inspire par le nez en trois temps, le ventre se gonfle ; expire sur un « sss » le plus long possible. Cinq fois avant chaque prise de parole importante." },
      { titre: "Le débit", texte: "En public, un débit de 130 à 160 mots par minute laisse le temps de comprendre. Le stress accélère. L'app mesure ton débit à chaque exercice : vise cette zone." },
      { titre: "L'articulation", texte: "Les consonnes portent le sens. Échauffe ta bouche avant de parler : virelangues, puis une phrase lue avec un stylo entre les dents, puis la même sans le stylo." },
      { titre: "La variété", texte: "Une voix monotone endort, même avec un bon contenu. Varie la vitesse, le volume et la hauteur. Ralentis sur l'idée importante." },
    ],
    exercices: [
      { titre: "Virelangues", consigne: "Lis chaque virelangue trois fois, de plus en plus vite, sans perdre la netteté.", texte: VIRELANGUES, prep: 5, cible: 45, criteres: CRITERES_VIRELANGUES },
      { titre: "Lecture à rythme mesuré", consigne: "Lis ce texte en visant 140 mots par minute. Ralentis sur les phrases importantes.", texte: "Il y a des métiers qui ne se voient pas. Celui de la personne qui accueille le public, par exemple. Elle est là avant le spectacle, quand la salle est encore vide et que les techniciens règlent les dernières lumières. Elle connaît les places difficiles, les spectateurs qui viennent seuls, les enfants qui ont peur du noir. Elle sait qu'un sourire au guichet change la façon dont on regarde une pièce. Personne ne l'applaudit à la fin. Pourtant, sans elle, une partie du spectacle n'aurait pas lieu. On parle souvent des artistes et des œuvres. On parle moins de celles et ceux qui ouvrent la porte. C'est peut-être là que la culture commence : dans le premier regard échangé avant le lever du rideau.", prep: 10, cible: 60, criteres: "Débit entre 130 et 160 mots par minute." },
    ],
    defi: "Avant chaque prise de parole importante cette semaine, fais cinq respirations et un virelangue.",
  },
  {
    n: 14, titre: "Structurer sa pensée et vaincre le blanc", duree: 12, piliers: ["rhetorique", "mental"],
    technique: "PREP, la réponse d'abord, trois blocs et trois respirations, le kit anti-blanc.",
    cartes: [
      { titre: "Pourquoi le blanc arrive", texte: "Le blanc vient rarement d'un manque d'idées. Il vient d'une mémoire qui cherche un texte appris par cœur au lieu de suivre une structure. Ne rédige pas tout : écris quelques mots-clés, une ligne par bloc, comme les pièces d'un palais que tu traverses. Mémorise le chemin, pas les phrases." },
      { titre: "Soigner l'atterrissage", texte: "On retient la fin d'une phrase plus que son début, et la dernière phrase d'une intervention plus que tout le reste. Prépare ton point d'atterrissage avant le reste : si le milieu flotte, tu sais toujours où tu vas." },
      { titre: "PREP", texte: "Point : ta réponse en une phrase, « Je pense que… ». Raison : pourquoi, avec « car… » ou « En effet, … ». Exemple : un fait vécu, « Par exemple, … ». Point : tu redis ta réponse autrement, « C'est pourquoi… ». Les connecteurs font entendre la structure. Quatre étapes qui tiennent en 45 secondes et qu'on retrouve même sous le stress." },
      { titre: "La réponse d'abord", texte: "Face à un jury, la réponse arrive en première phrase, la justification ensuite. Si tu commences par le contexte, le jury attend et décroche. 45 à 60 secondes, puis tu t'arrêtes." },
      { titre: "Trois blocs, trois respirations", texte: "Pour présenter ton parcours, trois blocs suffisent : d'où tu viens, ce que tu fais aujourd'hui, ce que tu viens faire ici. Une vraie respiration entre chaque bloc. Retiens les blocs et les chiffres, pas les phrases." },
      { titre: "Une réponse par interlocuteur", texte: "Devant un jury de deux, la même question n'appelle pas la même réponse. La direction culturelle veut ta méthode ; les ressources humaines veulent ta disponibilité et ta posture. Regarde la personne qui a posé la question et réponds sur son terrain." },
      { titre: "Le kit anti-blanc", texte: "Si le blanc arrive : un, respire et laisse le silence durer, il paraît plus court qu'il n'est. Deux, reformule ta dernière idée. Trois, dis « Ce qui compte ici, c'est… » et donne ton point principal. Quatre, pose une question à l'auditoire. Tu retombes toujours sur ta structure." },
    ],
    exercices: [
      { titre: "« Parlez-nous de votre parcours »", consigne: "Un jury te dit : « Parlez-nous de votre parcours. » Réponds en 90 secondes, en trois blocs séparés par une vraie respiration. Ne récite pas un texte : suis tes trois blocs et tes chiffres.", prep: 30, cible: 90, criteres: "Trois blocs identifiables. Chiffres et faits exacts, comparés à la fiche récit. Pas de liste chronologique de CV. Fin qui ouvre sur le poste ou le projet." },
      { titre: "Une question, deux réponses", consigne: "Question du jury : « Comment voyez-vous vos premiers mois dans ce poste ? » Réponds deux fois, en 45 secondes chacune. D'abord à la directrice de l'action culturelle (méthode, publics, projets), puis à la directrice des ressources humaines (disponibilité, posture, intégration dans l'équipe).", prep: 30, cible: 90, criteres: "Deux réponses réellement différentes, adaptées à chaque interlocutrice. La réponse en première phrase à chaque fois. Environ 45 secondes chacune." },
      { titre: "Improvisation PREP", consigne: "Sujet : « {sujet} » Réponds en 60 secondes avec PREP : point, raison, exemple, point.", prep: 15, cible: 60, criteres: "Structure PREP identifiable. Exemple concret et vécu. Retour au point à la fin. Connecteurs justes entre les étapes : « car », « en effet », « par exemple », « c'est pourquoi »." },
    ],
    defi: "Prépare trois questions qu'on pourrait te poser cette semaine. Pour chacune, écris seulement le point et l'exemple, puis réponds à voix haute.",
  },
  {
    n: 15, titre: "Le pouvoir de la pause", duree: 10, piliers: ["physique", "rhetorique"],
    technique: "Une pause avant l'idée clé ; le silence remplace le « euh ».",
    cartes: [
      { titre: "Le « euh » est un silence qui a peur", texte: "On dit « euh » pour garder la parole pendant qu'on cherche. Mais personne ne va te la prendre. Remplace-le par un silence : tu gagnes en autorité, et tu as le temps de penser." },
      { titre: "La pause avant l'idée clé", texte: "Une seconde de silence avant une idée importante dit à l'auditoire : écoute. Une seconde après lui laisse le temps de la recevoir." },
      { titre: "Le silence paraît plus long de l'intérieur", texte: "Trois secondes de silence te semblent une éternité. Pour l'auditoire, c'est une respiration. L'app mesure tes silences : compare ce que tu as ressenti à ce qui s'est passé." },
      { titre: "Le blanc devient une pause", texte: "Un blanc assumé, regard posé et souffle calme, ressemble à une pause choisie. Ce qui trahit le blanc, ce n'est pas le silence, c'est la panique visible." },
    ],
    exercices: [
      { titre: "Texte avec pauses marquées", consigne: "Lis ce texte : une barre égale une seconde de silence, deux barres égalent deux secondes. Garde le regard posé pendant les silences.", texte: TEXTE_PAUSES, prep: 10, cible: 30, criteres: "Les pauses mesurées doivent correspondre aux barres du texte." },
      { titre: "60 secondes sans « euh »", consigne: "Sujet : « {sujet} » Parle 60 secondes sans un seul « euh ». Quand tu cherches tes mots, tais-toi une seconde.", prep: 15, cible: 60, criteres: "Tics de langage. Silences utilisés comme respirations plutôt que comblés." },
    ],
    defi: "Cette semaine, à chaque prise de parole, marque une pause volontaire avant ton idée principale.",
  },
];

// Phrases pour les fins de phrase : « | » sépare les groupes (montée légère), {…} marque la dernière syllabe (descente).
export const FINS_DE_PHRASE = [
  { niveau: "Un groupe", phrases: [
    "Le public est là ce {soir}.",
    "Mon rôle est de créer du {lien}.",
    "La culture se par{tage}.",
    "Je travaille avec des é{coles}.",
  ] },
  { niveau: "Deux groupes", phrases: [
    "Quand j'entre dans une classe | je regarde d'abord les é{lèves}.",
    "Ce spectacle parle d'exil | mais il parle surtout de {joie}.",
    "Si vous me confiez ce poste | je commencerai par écou{ter}.",
    "Le théâtre m'a appris une chose | c'est la pa{tience}.",
  ] },
  { niveau: "Trois groupes", phrases: [
    "J'ai commencé sur scène | j'ai continué en atelier | et aujourd'hui je relie les {deux}.",
    "Avec les élèves | avec leurs familles | nous avons construit le pro{jet}.",
    "La médiation demande du temps | de la confiance | et beaucoup d'é{coute}.",
    "Mon parcours est pluriel | mais il a un fil | et ce fil, c'est la {scène}.",
  ] },
];

// Trois intentions : on joue le sous-texte, le ton suit.
export const INTENTIONS = {
  rassurer: { nom: "Rassurer", soustexte: "« Ça va aller, je suis là. »", reperes: "Débit lent, voix plus grave et douce, presque pas d'accent d'insistance, fin longue et descendante." },
  convaincre: { nom: "Convaincre", soustexte: "« C'est juste, et je vais te le prouver. »", reperes: "Débit régulier, voix pleine, accent sur le mot qui prouve, pause avant l'argument, descente nette sur la dernière syllabe." },
  alerter: { nom: "Alerter", soustexte: "« Attention, il faut agir maintenant. »", reperes: "Attaque nette, débit plus rapide, voix plus haute et plus forte, mots détachés, fin courte et ferme." },
};

// Phrases neutres, qui peuvent porter les trois intentions. Mot d'insistance suggéré pour convaincre et pour alerter.
export const PHRASES_INTENTION = [
  { texte: "Il reste deux semaines avant l'ouverture.", convaincre: "deux", alerter: "ouverture" },
  { texte: "Ce projet mérite qu'on lui donne du temps.", convaincre: "mérite", alerter: "temps" },
  { texte: "Les familles attendent notre décision.", convaincre: "familles", alerter: "attendent" },
  { texte: "Le public sera différent cette année.", convaincre: "public", alerter: "différent" },
  { texte: "Nous avons reçu la réponse de la mairie.", convaincre: "réponse", alerter: "reçu" },
];

export const ECHAUFFEMENTS = [
  { id: "impro-prep", titre: "Improvisation PREP", cible: "structure et blancs", consigne: "Sujet : « {sujet} » Réponds en PREP : point, raison, exemple, point. Relie les étapes : « car », « par exemple », « c'est pourquoi ».", prep: 15, duree: 60, criteres: "Structure PREP identifiable. Connecteurs justes entre les étapes, qui suivent la logique du propos." },
  { id: "mot-impose", titre: "Mot imposé", cible: "blancs et agilité", consigne: "Sujet : « {sujet} » Toutes les 20 secondes, un nouveau mot apparaît : intègre-le à ton discours sans t'arrêter.", prep: 10, duree: 60, motsImposes: true },
  { id: "zero-euh", titre: "Zéro « euh »", cible: "hésitations", consigne: "Sujet : « {sujet} » Pas un seul « euh » : remplace-le par un silence.", prep: 10, duree: 60 },
  { id: "virelangues", titre: "Virelangues", cible: "articulation", consigne: "Lis chaque virelangue trois fois, de plus en plus vite, sans perdre la netteté.", texte: VIRELANGUES, prep: 5, duree: 45, criteres: CRITERES_VIRELANGUES },
  { id: "lecture-pauses", titre: "Lecture avec pauses", cible: "débit et pauses", consigne: "Une barre égale une seconde de silence, deux barres égalent deux secondes.", texte: TEXTE_PAUSES, prep: 5, duree: 30 },
  { id: "rebond", titre: "Rebond", cible: "prise de parole spontanée", consigne: "Quelqu'un vient de dire : « {phrase} » Rebondis tout de suite.", prep: 5, duree: 30 },
  { id: "fins-de-phrase", titre: "Fins de phrase", cible: "intonation", consigne: FINS_CONSIGNE, intonation: true, duree: 120 },
  { id: "trois-intentions", titre: "Trois intentions", cible: "ton et intention", consigne: AVEUGLE_CONSIGNE, aveugle: true, duree: 120 },
  { id: "souffle", titre: "Respiration 4-4-6", cible: "trac", consigne: "Inspire 4 secondes par le nez, retiens 4 secondes, puis expire 6 secondes sur un « sss » régulier, téléphone à 30 cm. Six cycles.", respiration: true, duree: 84 },
];

export const SUJETS = [
  "Faut-il rendre les musées gratuits pour tout le monde ?",
  "Le meilleur conseil qu'on t'ait donné",
  "Ce que la scène t'a appris sur la vie",
  "Faut-il enseigner le théâtre à l'école ?",
  "Ce qu'on perd et ce qu'on gagne en changeant de langue",
  "Le dernier spectacle qui t'a surpris",
  "Les réseaux sociaux nous rendent-ils plus seuls ?",
  "Un objet dont tu ne pourrais pas te passer",
  "Ce que tu ferais d'une année entièrement libre",
  "L'art doit-il être utile ?",
  "Le moment où tu as été le plus fier de ton travail",
  "Pourquoi les adolescents ont besoin de se tromper",
  "Ce qui fait un bon accueil",
  "La ponctualité est-elle une politesse ?",
  "Ce que tu aurais aimé savoir à vingt ans",
  "Faut-il se méfier des experts ?",
  "Un lieu qui t'a changé",
  "La place du silence dans une conversation",
  "Ce qu'on emporte quand on part",
  "La culture doit-elle sortir des théâtres ?",
  "Travailler en équipe ou seul ?",
  "Une habitude que tu voudrais changer",
  "Le rôle de l'humour dans les débats sérieux",
  "Ce qu'une mairie devrait financer en priorité",
];

export const PHRASES = [
  "Les jeunes ne s'intéressent plus à la culture.",
  "De toute façon, l'art contemporain, personne n'y comprend rien.",
  "Le numérique va remplacer les salles de spectacle.",
  "On n'a pas le budget pour la médiation cette année.",
  "Les gens n'ont plus le temps de lire.",
  "Le télétravail a tué l'esprit d'équipe.",
  "Les artistes devraient tous se former à la gestion.",
  "La gratuité dévalorise les spectacles.",
];

export const MOTS = ["fenêtre", "valise", "horloge", "pont", "miroir", "orage", "clé", "lanterne", "marché", "boussole", "racine", "escalier", "plume", "rivière", "masque", "carte", "graine", "tambour", "nuage", "seuil"];

export const SITUATIONS = [
  {
    id: "jury", titre: "Jury de collectivité",
    contexte: "Jury à deux : une personne de la direction culturelle, une des ressources humaines. La réponse d'abord, 45 à 60 secondes, puis tu t'arrêtes.",
    exercices: [
      { titre: "Pourquoi ce poste ?", consigne: "« Pourquoi ce poste, et pourquoi notre structure ? » Réponds en 45 secondes, avec la réponse en première phrase.", prep: 20, cible: 45, criteres: "Réponse d'abord. Lien précis entre l'expérience et le poste. Pas de sur-justification." },
      { titre: "Le point faible", consigne: "« Vous n'avez jamais utilisé notre logiciel de billetterie. Qu'est-ce qui vous rassure ? » Réponds en 45 secondes, sans minimiser ni sur-justifier.", prep: 20, cible: 45, criteres: "Écart reconnu en une phrase. Compétence transférable concrète. Proposition d'action. Pas d'autocritique." },
      { titre: "Le désaccord", consigne: "« Que ferez-vous si la direction prend une orientation avec laquelle vous n'êtes pas d'accord ? » 45 secondes.", prep: 20, cible: 45, criteres: "Loyauté et franchise. Position claire. Pas de ton moralisateur." },
      { titre: "Dans cinq ans", consigne: "« Où vous voyez-vous dans cinq ans ? » 45 secondes.", prep: 20, cible: 45, criteres: "Projection crédible et liée au poste. Une seule piste, pas plusieurs." },
      { titre: "Soirs et week-ends", consigne: "La responsable des ressources humaines demande : « Comment gérez-vous les soirs et les week-ends ? » 45 secondes, avec des faits vérifiables.", prep: 20, cible: 45, criteres: "Faits précis et vérifiables. Réponse d'abord. Ton assuré, sans en rajouter." },
      { titre: "La recherche de financement", consigne: "« Avez-vous déjà monté une recherche de financement ? » Réponds honnêtement, même si ton expérience est partielle, sans t'excuser. 45 secondes.", prep: 20, cible: 45, criteres: "Honnêteté sur la limite, en une phrase. Ce qui existe déjà, concrètement. Pas d'autocritique." },
    ],
  },
  {
    id: "mediation", titre: "Médiation",
    contexte: "Groupes scolaires, publics en situation de handicap, bords de scène. Phrases simples, repères concrets, écoute.",
    exercices: [
      { titre: "Présenter un spectacle à une classe", consigne: "Présente en 60 secondes un spectacle de danse contemporaine à une classe de CM2, juste avant la représentation. Donne-leur des repères pour regarder, sans tout expliquer.", prep: 20, cible: 60, criteres: "Vocabulaire adapté à des enfants de dix ans. Deux ou trois repères concrets. Laisser la place à la surprise." },
      { titre: "Accueillir un groupe", consigne: "Tu accueilles un groupe d'adultes en situation de handicap mental et leurs accompagnateurs. Présente le déroulé de la visite en 45 secondes, avec des phrases simples.", prep: 20, cible: 45, criteres: "Phrases courtes. Étapes claires et ordonnées. Ton chaleureux, jamais infantilisant." },
      { titre: "Bord de scène", consigne: "Après le spectacle, un élève lance : « J'ai rien compris. » Réponds en 30 secondes pour ouvrir l'échange plutôt que le fermer.", prep: 10, cible: 30, criteres: "Accueil sans jugement. Question ouverte. Pas d'explication magistrale." },
    ],
  },
  {
    id: "table-ronde", titre: "Table ronde",
    contexte: "Prendre position avec nuance, tenir face à la contradiction, conclure sans slogan.",
    exercices: [
      { titre: "Prise de position nuancée", consigne: "Sujet : « Faut-il conditionner les subventions culturelles à des objectifs de fréquentation ? » Donne ta position en 60 secondes, avec nuance, sans formule de combat finale.", prep: 30, cible: 60, criteres: "Position claire dès le début. Nuance réelle. Exemple concret. Pas de slogan." },
      { titre: "Répondre à une contradiction", consigne: "Un intervenant te contredit : « Vous défendez une culture élitiste qui ne parle qu'aux convaincus. » Réponds en 45 secondes.", prep: 15, cible: 45, criteres: "Contradiction accueillie comme une conversation, pas comme une joute. Part de vrai reconnue. Réponse par un fait vécu. Calme, pas de contre-attaque." },
      { titre: "Conclure une table ronde", consigne: "Tu dois conclure une table ronde sur la culture et l'exil en 45 secondes. Termine sur une image ou une question, pas sur une morale.", prep: 30, cible: 45, criteres: "Synthèse courte. Fin ouverte. Ni slogan ni ton moralisateur." },
    ],
  },
  {
    id: "interview", titre: "Interview et médias",
    contexte: "Radio locale, journal, podcast. Un message maître, des faits, et le pont pour y revenir quand la question s'en éloigne.",
    exercices: [
      { titre: "La question qui dévie", consigne: "Tu viens présenter un projet de médiation dans un quartier. La journaliste demande : « Et vous, personnellement, qu'est-ce que l'exil vous a fait ? » Réponds brièvement et sincèrement, puis ramène l'échange vers le projet. 45 secondes.", prep: 15, cible: 45, criteres: "Réponse brève et sincère à la question. Pont explicite vers le message maître. Mission avant l'ego. Pas d'esquive sèche." },
      { titre: "La question piège", consigne: "« Votre projet coûte de l'argent public. Pourquoi financer ça plutôt qu'une crèche ? » Réponds en 45 secondes sans te laisser enfermer dans l'alternative.", prep: 15, cible: 45, criteres: "Fausse alternative nommée calmement. Faits concrets. Retour au message maître. Ni contre-attaque ni ton moralisateur." },
      { titre: "Le message maître en 20 secondes", consigne: "Dernière question de l'interview : « Un mot pour conclure ? » Donne ton message maître en 20 secondes, avec un seul fait.", prep: 10, cible: 20, criteres: "Une phrase de message maître. Un fait. Atterrissage net, sans formule de combat." },
    ],
  },
  {
    id: "soiree", titre: "Soirée pro",
    contexte: "Vernissages, rencontres professionnelles, festivals. Une image concrète, de la curiosité pour l'autre.",
    exercices: [
      { titre: "« Et vous, vous faites quoi ? »", consigne: "À un vernissage, quelqu'un te demande ce que tu fais. 20 secondes, une image concrète.", prep: 10, cible: 20, criteres: "Une phrase de positionnement. Une image. Fin qui laisse la place à l'autre." },
      { titre: "Créer un lien", consigne: "Ton interlocuteur te dit qu'il travaille pour une fondation d'entreprise. Rebondis en 30 secondes pour créer un lien, sans demander de financement.", prep: 10, cible: 30, criteres: "Curiosité réelle pour l'autre. Question ouverte. Aucune sollicitation." },
      { titre: "Présenter un projet", consigne: "Présente en 60 secondes un projet qui te tient à cœur à une personne qui pourrait devenir partenaire. Commence par une scène concrète.", prep: 30, cible: 60, criteres: "Ouverture sur une scène. Enjeu clair. Une seule demande, ou aucune." },
    ],
  },
];

export const QUESTIONNAIRE = [
  { id: "contextes", question: "Où prends-tu la parole le plus souvent ?", type: "multi", options: ["Réunions", "Jurys et entretiens", "Ateliers et médiation", "Tables rondes et conférences", "Soirées et réseau", "Présentations et pitchs"] },
  { id: "frequence", question: "À quelle fréquence parles-tu devant un groupe ?", type: "choix", options: ["Rarement", "Une fois par mois", "Chaque semaine", "Presque tous les jours"] },
  { id: "trac", question: "Ton trac avant de parler en public", type: "echelle" },
  { id: "blancs", question: "La fréquence de tes blancs ou trous de mémoire", type: "echelle" },
  { id: "hesitations", question: "Tes hésitations (« euh », phrases reprises)", type: "echelle" },
  { id: "structure", question: "Ta difficulté à structurer tes idées à l'oral", type: "echelle" },
  { id: "legitimite", question: "Ton sentiment de ne pas être légitime quand tu parles", type: "echelle" },
  { id: "moment", question: "Le moment le plus difficile pour toi", type: "choix", options: ["Le début", "Une question imprévue", "Parler de moi", "Un désaccord", "La conclusion"] },
  { id: "objectifs", question: "Tes priorités", type: "multi", options: ["Clarté", "Structure", "Éloquence", "Confiance", "Présence et impact", "Gestion du blanc"] },
  { id: "minutes", question: "Combien de minutes par jour peux-tu y consacrer ?", type: "choix", options: ["10", "15", "20", "30"] },
];

export const TEST = [
  { id: "test-parcours", titre: "« Parlez-nous de votre parcours »", consigne: "Un jury te dit : « Parlez-nous de votre parcours. » Réponds comme tu le ferais aujourd'hui, sans préparation particulière.", prep: 10, cible: 90 },
  { id: "test-impro", titre: "Improvisation", consigne: "Sujet : « {sujet} » Parle pendant 60 secondes.", prep: 15, cible: 60 },
];

// Identifiants stables des exercices.
for (const l of LECONS) l.exercices.forEach((e, i) => (e.id = `l${l.n}-${i + 1}`));
for (const s of SITUATIONS) s.exercices.forEach((e, i) => (e.id = `${s.id}-${i + 1}`));
