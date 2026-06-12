# CompliAI — Les fonctionnalités IA qui rendent la plateforme incontournable

> Document stratégique — vision produit IA · v1 · 13 mai 2026

## TL;DR

CompliAI n'est ni un nième outil de gouvernance IA pour Chief Risk Officer américain, ni un Doctrine.fr saupoudré d'AI Act : c'est **l'IA du juriste parisien exigeant**, celui qui ne tolère ni hallucination, ni vernis, ni couverture superficielle d'un seul pays. Le pari différenciant tient en une phrase : **transformer chaque livrable IA en pièce juridiquement vérifiable, multi-juridiction (27 États membres) et vivante** — ce que Naaia ne sait pas faire, ce que Doctrine ne veut pas faire, ce qu'un cabinet ne peut pas faire à ce prix. À 12 mois, la promesse opérationnelle : « ouvrez votre dashboard le lundi matin, votre registre IA a passé un procès la nuit, vous avez 3 décisions motivées, 7 alertes ciblées par juridiction, et un mémoire vivant à jour au 12 mai 2026 — tout est citable, tout est horodaté, rien n'est inventé ».

## Cadre d'évaluation

Chaque fonctionnalité de cette note est filtrée par six critères. Ils servent de grille de tri quand il faudra arbitrer.

1. **Valeur DPO** — Aide le DPO à survivre à un contrôle CNIL/EDPB ou à un sinistre AI Act. Réduit le temps de réponse à une demande d'autorité.
2. **Valeur avocat** — Produit un livrable que l'avocat ose signer ou qu'il fait signer à son client. Citations vérifiables, raisonnement opposable.
3. **Valeur fondateur start-up IA** — Permet de répondre à une due diligence VC en moins de 48 h, sans cabinet à 50 k€.
4. **Défensibilité technique** — Combine plusieurs assets propriétaires (RAG, calendrier EU, master prompt, registre, sources 27 États) — non clonable en un week-end.
5. **« Wow » en démo** — Démontrable en 30 secondes avec un effet « tiens je n'ai jamais vu ça », pas un score qui clignote.
6. **Coût d'inférence et coût opérationnel** — Compatible avec le pricing premium juste (≈ 200-400 €/mois solo, 800-1 500 €/mois cabinet, 2 000-5 000 €/mois ETI).

## Les 7 features signatures (les « must build »)

### 1. Le Procès Permanent

**Promesse en une phrase.** Chaque système IA enregistré dans CompliAI passe en continu un « procès » contradictoire contre l'ensemble du droit EU applicable, et reçoit chaque matin une décision motivée rédigée comme un arrêt.

**Scénario utilisateur.** Marc, DPO d'une fintech parisienne, ouvre CompliAI le mardi 12 mai 2026 à 9 h 02. Bandeau en haut : « 3 décisions motivées rendues cette nuit ». Il clique sur la première : « Système : *credit-scoring-v3* — Décision motivée n° 217 du 12 mai 2026 ». Le document est structuré comme un arrêt CJUE : qualification (haut risque, annexe III, point 5, sous-paragraphe a), fondement textuel (articles 6, 9, 14, 27 AI Act), nuances (l'orientation 04/2025 de l'AI Office publiée le 9 mai 2026 ajuste la lecture du considérant 96), implications opérationnelles (FRIA à mettre à jour avant le 2 juin 2026), recommandation hiérarchisée. En bas, la signature : « Décision rendue sur la base de la version consolidée de l'AI Act au 10 mai 2026, du considérant 96, et de l'orientation 04/2025 de l'AI Office du 9 mai 2026 ». Marc transmet la décision à son avocat en un clic — l'avocat reçoit un PDF style mémoire et la chaîne complète de citations vérifiables.

**Comment ça marche techniquement.**
- Cron quotidien (déjà ébauché dans `app/api/cron/regulatory-watch/route.ts`) qui itère sur `ai_system_register`.
- Pour chaque système, on construit le contexte : audits passés, FRIA, Art. 11, classification, déploiement (`deployment_countries`), données traitées.
- On y injecte le **delta** réglementaire des 24 dernières heures : nouvelles entrées EU-Lex (RSS), nouvelles lignes directrices AI Office, décisions DPA (RSS CNIL/Garante/BfDI/DPC), votes Parlement EU, arrêts CJUE (calendrier EU).
- Claude (Opus 4.5) avec `MASTER_SYSTEM_PROMPT` + un prompt « juge rapporteur » génère la décision motivée au format JSON structuré (qualification, motifs, dispositif, recommandation, citations).
- Chaque citation est vérifiée par le module « Second Œil » (cf. feature n° 2) — pas de citation non vérifiée n'arrive à l'utilisateur.
- Stockage : nouvelle table `compliance_rulings(id, system_id, date, regulation_versions[], ruling_json, signature_hash)`. Hashable et exportable (cf. feature n° 6).
- UI : timeline dans le dashboard, PDF style arrêt téléchargeable, partage par lien signé.

**Pourquoi personne d'autre ne le fait.** Naaia produit du « scoring » à plat (« 73 % conforme »), pas de décision motivée. Holistic AI fait des évaluations techniques (biais, robustesse), pas du raisonnement juridique. Credo AI fait du « policy mapping » statique. Aucun n'écrit comme un juge — parce qu'aucun n'a investi dans un master prompt de juriste parisien.

**KPI déplacé.** Rétention mensuelle (le procès devient un rituel matinal), NPS DPO (la décision motivée est ce qu'on rêvait d'avoir avant un contrôle), pricing (le procès permanent justifie à lui seul +50 % de tarif).

**Effort.** L · Dépend de : Second Œil (n° 2), Sentinelle 27 (n° 3), pipeline de delta réglementaire (déjà à 40 % dans `regulatory-watch`).

---

### 2. Le Second Œil

**Promesse en une phrase.** Aucune citation ne sort de CompliAI sans qu'un second modèle, indépendant du générateur, ait vérifié que l'article, le considérant, l'arrêt, l'ECLI et la date existent réellement et disent bien ce que l'IA prétend.

**Scénario utilisateur.** Élodie, avocate associée chez un cabinet parisien, génère une note FRIA pour un client public. Le document apparaît avec, dans la marge droite, un badge vert : « 47 citations · 47 vérifiées · dernière vérification 17 h 14 ». Elle survole une citation : popup avec l'extrait original EUR-Lex en français, l'URL CELEX, et la version consolidée de référence. Une citation passe au orange : « Article 27, paragraphe 4 : référence existante, mais le texte cité diffère de la version consolidée — voir EUR-Lex ». L'avocate corrige avant d'envoyer la note. Elle ose signer parce qu'elle a la preuve.

**Comment ça marche techniquement.**
- Tout livrable IA passe par un post-processeur `verifyCitations(content)` qui extrait les références (`article N`, `considérant M`, `ECLI:EU:C:YYYY:NNNN`, `C-NNN/YY`, décisions DPA datées).
- Pour chaque référence : lookup dans le RAG local (`legal_chunks`), fallback EUR-Lex (déjà présent dans `lib/ai/eurlex.ts`), fallback CURIA (déjà présent dans `lib/ai/doctrine-search.ts`).
- Pour chaque référence, un second modèle (Claude Sonnet, moins cher, indépendant) reçoit *uniquement* la citation + l'extrait officiel récupéré, et répond « cohérent / incohérent / hors champ » avec justification courte.
- Le résultat est attaché au document sous forme d'un volet « Preuve de citations » exportable en annexe.
- Les citations non vérifiables sont **automatiquement remplacées** par la formule de réserve du master prompt (§ 7) : « *Sous réserve de vérification du numéro d'article dans la version consolidée du Règlement,* … ».

**Pourquoi personne d'autre ne le fait.** Doctrine.fr a des citations mais pas de vérification IA-sur-IA. Lexbase idem. Naaia ne produit pas de mémoire rédigé. Les LLM grand public hallucinent sans garde-fou. L'anti-hallucination est *écrite* dans le master prompt CompliAI — il faut maintenant la **mécaniser** comme une assurance.

**KPI déplacé.** Taux de signature (l'avocat ose signer), prix premium (la garantie vaut un tarif d'usage juridique, pas un tarif SaaS), viralité (les avocats partagent les PDF « preuve de citations » à leurs clients).

**Effort.** M · Dépend de : RAG existant, EUR-Lex/CURIA déjà connectés, prompt de vérification à designer.

---

### 3. Sentinelle 27

**Promesse en une phrase.** Quand votre système IA est déployé en France + Allemagne + Italie, Sentinelle 27 surveille en continu les 27 autorités nationales (DPA, régulateurs sectoriels, cours suprêmes) et alerte uniquement sur ce qui touche votre projet, dans la langue de l'autorité émettrice.

**Scénario utilisateur.** Sarah, DPO d'un éditeur SaaS B2B déployé dans 6 pays EU, voit dans son fil un encart : « Garante (IT) — provvedimento n. 264/2026 du 8 mai 2026 — opposable à votre système *hr-screening-v2* à cause du traitement biométrique : durée de conservation jugée disproportionnée. Voir extrait original en italien · traduction française · 3 actions correctives suggérées. » Aucune alerte CNIL n'apparaît car la CNIL n'a rien publié sur ce sujet ce jour. C'est ciblé, multilingue, opposable.

**Comment ça marche techniquement.**
- Le moteur exploite `lib/data/eu-national-sources.ts` (déjà : 27 États membres, DPA, régulateurs sectoriels) — actuellement sous-exploité.
- Ingestion RSS / scraping ciblé par autorité (HTML statique simple, déjà la convention dans `regulatory-watch`).
- Chaque document est embedded (`pgvector`), classifié (DPA / régulateur télécom / cour nationale), et tagué par juridiction.
- À l'inscription d'un projet, on capture `deployment_country[]` (déjà au schéma). Quand un nouveau document atterrit, on score sa pertinence projet × juridiction × secteur via un mini-prompt Claude (`analyzeImpactOnProject` déjà ébauché).
- Traduction à la volée par Claude vers la langue de l'utilisateur, mais le texte original reste accessible en un clic — exigence d'opposabilité.
- UI : chips colorés par État (drapeau + code ISO), filtres par autorité, vue « carte EU ».

**Pourquoi personne d'autre ne le fait.** Naaia se concentre sur la réglementation EU centrale + un peu de FR. Dastra et Witik sont FR/Belgique. Doctrine est FR-only. Aucun n'agrège **les 27 DPA** avec tagging sectoriel et alerting projet-aware. C'est un moat data construit dans le temps.

**KPI déplacé.** Couverture géographique du portefeuille client (ETI multi-pays = upsell évident), différentiel défensif vs. Naaia, image internationale.

**Effort.** M · Dépend de : `eu-national-sources.ts` (fait), pipeline d'ingestion (à industrialiser), worker de scoring (existant à étendre).

---

### 4. L'Avocat de l'Adversaire

**Promesse en une phrase.** À la demande, CompliAI prend votre dossier de conformité (audit, FRIA, Art. 11, ROPA) et le déchire comme le ferait un inspecteur CNIL hostile ou l'avocat de la partie adverse — en produisant une note de fragilité argumentée.

**Scénario utilisateur.** Avant de soumettre une FRIA à l'AI Office, Thomas, juriste interne d'un éditeur d'IA, clique sur « Stress-tester ce document ». 90 secondes plus tard : « 4 angles d'attaque identifiés ». Premier : « La qualification de risque limité retenue pour l'article 3, point 12, est fragile — un inspecteur CNIL s'appuierait sur le considérant 53 et l'arrêt CJUE C-634/21 *Schufa* pour requalifier en haut risque ; argumentaire et parade en pièce jointe ». Deuxième : « L'absence de consultation des parties prenantes au sens de l'article 27, paragraphe 3, est insuffisamment documentée ». Thomas corrige avant l'envoi.

**Comment ça marche techniquement.**
- Prompt « avocat adversaire » : `ADVERSARIAL_PROMPT` qui inverse le master prompt — ton sec, hostile, exigeant la preuve, citant systématiquement les considérants, doctrine et jurisprudence qui *fragilisent* la position.
- Le document à attaquer est injecté avec son contexte (registre, projet, audits passés) et le RAG complet.
- Sortie structurée : `[{angle_attaque, fondement_legal, argument_adversaire, force_estimee, parade_recommandee}]`.
- Génère un PDF « Note de fragilité » au ton clinique, sans concession, signé « *Stress-test contradictoire CompliAI, rendu le … sur la base de la version consolidée au …* ».

**Pourquoi personne d'autre ne le fait.** Tous les SaaS de conformité cherchent à rassurer l'utilisateur (« vous êtes à 73 % »). CompliAI est le seul à oser dire « voici ce que dirait l'inspecteur ». C'est philosophiquement aligné avec le master prompt (§ 1 — « ni complaisant, ni alarmiste »).

**KPI déplacé.** Confiance avant contrôle (le dossier est durci), bouche-à-oreille (les avocats l'adorent — ils l'utilisent en interne avant de produire leurs notes), prix (c'est du conseil senior, pas du SaaS).

**Effort.** S · Dépend de : aucun. Réutilise tous les générateurs existants, ajoute un prompt adversarial.

---

### 5. Le Mémoire Vivant

**Promesse en une phrase.** Chaque note juridique ou mémoire généré sur CompliAI se ré-écrit automatiquement quand le droit change — l'utilisateur reçoit un « diff juridique » avec ce qui a évolué et pourquoi.

**Scénario utilisateur.** Caroline, DPO d'un hôpital, ouvre la FRIA rédigée en novembre 2025 sur son système de tri aux urgences. En haut : « À jour au 12 mai 2026 · 3 mises à jour depuis la dernière consultation ». Elle clique sur « Voir les évolutions » : (1) ajout d'une référence à l'orientation 04/2025 de l'AI Office, (2) intégration de la décision CJUE C-XXX/24 du 4 avril 2026, (3) actualisation de l'article 27, paragraphe 1, à la lumière du correctif publié au JO L du 1ᵉʳ avril 2026. Elle accepte les modifications, ré-exporte, archive l'ancienne version (toutes les versions restent horodatées et hashées, cf. n° 6).

**Comment ça marche techniquement.**
- Chaque livrable est stocké avec sa **chaîne de citations** structurée (articles, considérants, arrêts, lignes directrices) et la **version consolidée** des textes au moment de la rédaction.
- Un worker hebdomadaire compare la chaîne de citations avec l'état le plus récent du RAG + calendrier EU. Détection des deltas.
- Pour chaque delta significatif, un prompt « rédacteur reviseur » génère un patch minimal (paragraphes ré-écrits, citations ajoutées) — pas une régénération complète.
- Versionning façon Git : `documents.versions[]`, diff visuel inline (vert/rouge), historique consultable.
- Notification optionnelle (e-mail + Slack via `lib/data/eu-authorities.ts`).

**Pourquoi personne d'autre ne le fait.** Naaia génère un livrable statique à un moment T. Lexbase et Doctrine livrent de la recherche, pas du document vivant. C'est l'invention du document juridique « abonnement » au lieu du « one-shot ».

**KPI déplacé.** ARR, rétention 24 mois, conversion freemium → payant (« sans abonnement, votre FRIA est obsolète »).

**Effort.** L · Dépend de : Second Œil (extraction de citations structurée), pipeline de delta réglementaire, schema versionné.

---

### 6. Le Témoin Numérique

**Promesse en une phrase.** Chaque audit, génération, citation, prompt et réponse IA est horodaté et hashé dans un registre cryptographique exportable comme preuve juridiquement opposable en cas de contrôle.

**Scénario utilisateur.** La CNIL contacte une start-up santé un mardi matin : contrôle dans 10 jours, demande de communication des évaluations préalables au déploiement du système X. La fondatrice clique sur « Exporter la preuve de conformité » dans CompliAI. Sortie : un ZIP contenant (a) tous les audits et FRIA datés et hashés, (b) les chaînes de citations vérifiées, (c) la signature Merkle root publiée publiquement le jour J, (d) un PDF d'attestation horodatée par un tiers de confiance (RFC 3161 ou équivalent). Le dossier est transmis tel quel à l'autorité : impossible d'avoir falsifié rétroactivement quoi que ce soit.

**Comment ça marche techniquement.**
- Chaque écriture « importante » (audit, ruling, document généré, modification de registre) est hashée (SHA-256) et son hash est inclus dans une Merkle tree journalière.
- La racine Merkle est publiée quotidiennement sur un canal vérifiable (S3 public + ancrage léger : RFC 3161, eIDAS qualifié, ou *a minima* Ethereum L2 / OpenTimestamps gratuit).
- Export : ZIP signé avec le manifeste, les pièces, et la preuve d'inclusion Merkle.
- Schéma : `evidence_log(id, user_id, event_type, payload_hash, merkle_leaf, created_at)`. Coût d'infra négligeable.

**Pourquoi personne d'autre ne le fait.** C'est ce qui transforme CompliAI de « outil de productivité » en **infrastructure de preuve**. Naaia stocke, mais ne prouve pas l'antériorité. Aucune solution FR/EU ne propose un horodatage cryptographique de la conformité.

**KPI déplacé.** Différenciant pour les ETI/grands groupes en secteurs régulés (santé, finance, public), argument de vente cabinet d'avocats (« voici l'attestation que ton client a fait son audit le 4 février 2026, pas reconstitué hier »), réduction des risques en cas de contentieux.

**Effort.** S · Dépend de : aucune dépendance critique. Mécanique simple, coût d'infra marginal, valeur perçue énorme.

---

### 7. Le Calendrier qui Parle

**Promesse en une phrase.** Le calendrier réglementaire EU ne se contente plus d'afficher des dates : il construit pour chaque projet un Gantt juridique inverse (« pour être conforme le 2 août 2026, vous devez avoir terminé X avant le 1ᵉʳ février 2026 »).

**Scénario utilisateur.** Antoine, fondateur d'une scale-up edtech, ouvre le calendrier. Sur la date du 2 août 2026, un pop-up : « Votre système *adaptive-learning-engine* devient pleinement applicable à cette date. 14 obligations à clore, 4 bloquantes : évaluation par organisme notifié (article 43, paragraphe 1), enregistrement EU (article 71), FRIA finalisée (article 27), littératie IA documentée (article 4). Délais glissants : pour tenir le 2 août 2026, démarrez le dossier d'organisme notifié avant le 1ᵉʳ février 2026 — sinon infraction prévisible. Voulez-vous générer le plan d'instruction ? » Un clic, Antoine a un Gantt PDF qu'il transmet à son COO.

**Comment ça marche techniquement.**
- Le calendrier EU existe déjà (`lib/data/eu-calendar.ts`, `lib/ai/calendar-context.ts`) avec dates clés et CJUE.
- On y branche une « bibliothèque d'obligations » : chaque date est associée à un set d'obligations avec leur durée typique (organisme notifié = 6 mois, FRIA = 2 mois, littératie IA = 1 mois…).
- Pour chaque projet, on calcule l'intersection : quelles obligations s'appliquent, quels délais, et on remonte dans le temps pour produire un Gantt inversé.
- Claude génère la note d'instruction au format mémoire (à la manière d'un *legal opinion* de cabinet) avec recommandation hiérarchisée — le calendrier devient prescriptif.
- Intégration ICS export (le DPO ajoute les jalons à son agenda Outlook/Google).

**Pourquoi personne d'autre ne le fait.** Naaia liste les obligations, Dastra fait du PM RGPD, mais aucun ne lie un calendrier officiel EU + un registre projet + un Gantt prescriptif. C'est le pont entre la veille et l'exécution.

**KPI déplacé.** Conversion fondateur start-up (« il me dit quoi faire, quand, dans quel ordre »), expansion sur les cabinets (un avocat suit 30 projets clients), valeur perçue de la veille (« non, ce n'est pas un RSS, c'est mon chef de projet juridique »).

**Effort.** M · Dépend de : `eu-calendar.ts` (fait), schéma d'obligations + durées (à construire, 1-2 semaines).

---

## 15 features tactiques (les « should build »)

### 🧠 IA juridique avancée

**1. Mode « Avocat / DPO / Board ».** Une même question peut être posée et reçoit trois rendus distincts : (a) note d'avocat (registre soutenu, citations longues, recommandation tranchée), (b) note DPO (procédure, autorités à saisir, délais à tenir), (c) note board (synthèse 3 paragraphes, risque, recommandation, coût). Un seul appel, trois rendus paramétrés via le prompt système. Démo : un toggle dans le chat fait basculer le ton sans relancer la requête. Coût marginal proche de zéro grâce au caching de prompt.

**2. Reasoning trace exposé.** Sous chaque réponse IA, un volet repliable « Voir le raisonnement » expose la chaîne d'inférence : « (1) question → qualification, (2) qualification → article applicable, (3) article → considérant, (4) considérant → jurisprudence, (5) jurisprudence → recommandation ». C'est ce qui transforme l'IA en outil pédagogique pour les juniors d'un cabinet. Implémentation : Claude expose le raisonnement, on le structure côté serveur, on l'affiche en accordéon.

**3. Considérant Explorer.** Champ de recherche dédié au considérant (ex. *considérant 96 AI Act*) qui retourne toutes les obligations qui s'y rattachent, toutes les lignes directrices qui le mobilisent, toutes les décisions qui s'y réfèrent. C'est l'outil qu'aucun moteur juridique français n'a jamais construit avec cette granularité — c'est pourtant la première chose qu'un juriste senior consulte. Coût : indexation des considérants comme entités first-class dans `legal_chunks`.

**4. Auto-générateur de relances socratiques.** Après chaque réponse, CompliAI propose 3 questions de relance pertinentes (« Quelles preuves apporteriez-vous pour justifier la base légale article 6, paragraphe 1, sous-paragraphe f ? »). Inspire la réflexion, prolonge la session, double le temps utilisateur sur la plateforme. Coût marginal nul.

### 🔍 Surveillance & alertes

**5. Veille granulaire par système IA (pas par projet).** Le registre `ai_system_register` existe — l'alerting peut descendre au système individuel : « Cette nouvelle ligne directrice GPAI ne concerne que votre *chatbot-support-v2* parce que vous avez déclaré un usage GPAI ». Précision = confiance.

**6. Diff visuel des lignes directrices.** Quand l'AI Office publie une nouvelle version d'une orientation, CompliAI affiche un diff coloré (rouge/vert) entre l'ancienne et la nouvelle version, avec un résumé IA « 3 changements significatifs pour votre cas ». Marchent les pieds dans le wireframe Doctrine.

**7. Alertes par juridiction de déploiement.** Si un client déploie en FR+IT et qu'une décision Garante tombe, l'alerte est ciblée — la CNIL ne pollue pas le fil. Branchement direct sur Sentinelle 27.

### 📑 Documents & livrables

**8. Pack « Contrôle CNIL prêt à envoyer ».** En un clic, un dossier ZIP : ROPA + DPIA + politique IA + journaux de modifications + extracts de l'AI register + attestations de littératie IA, avec page de garde et sommaire formaté à la française. Inspire le sentiment « si la CNIL arrive demain, je clique ici ». Quasiment du marketing en plus du produit.

**9. Export « Cabinet » (Word + LaTeX avec gabarit mémoire d'avocat).** Tout document généré peut sortir au format mémoire d'avocat français : Word (pour le client final) ou LaTeX (pour les cabinets puristes), avec mise en page numérotée I — A — 1, bibliographie auto, ECLI en notes de bas de page. Différencie radicalement de la sortie « markdown générique » des autres outils.

**10. Réponse à demande d'autorité (article 31 RGPD / article 73 AI Act).** Un assistant pré-rempli pour formuler une réponse à la CNIL ou à un régulateur sectoriel : reprend l'historique du projet, les évaluations passées, les preuves cryptographiques (n° 6), structure la réponse en parties (faits / qualification / mesures prises / engagements). Sauve 8 h de travail à chaque demande.

### 👥 Collaboration & workflow

**11. Espace cabinet partagé.** Un avocat suit 30 clients dans un seul tableau de bord : score de risque agrégé, ranking par criticité, vue par juridiction. Le pricing cabinet (1 500-3 000 €/mois) finance les abonnements clients. Pivot business model possible.

**12. Annotation et fil de discussion sur livrables.** Chaque document généré devient annotable (DPO, avocat, COO, CTO) avec mentions, threads, statut (à valider / à corriger / signé). Évite le ping-pong par e-mail.

**13. Workflow de signature multi-rôles.** « DPO valide → Avocat externe conseille → Direction signe ». Chaque étape est journalisée et hashée (n° 6). Conforme à l'AI Act articles 14 et 17 sur la traçabilité du contrôle humain.

### 🌍 Multilangue & multi-pays

**14. Génération multilingue avec citations dans la langue de l'autorité.** Le client allemand reçoit un mémoire en français pour son cabinet parisien et une version allemande pour le BfDI, avec les citations BfDI en allemand et CJUE en français — convention canonique. Compatible avec les 4-5 langues EU principales (FR, DE, IT, ES, NL). Inférence : Claude Opus 4.5 gère nativement, pas de surcoût significatif.

### 🔐 Confiance & vérifiabilité

**15. Score d'explicabilité par réponse + export PDF avec preuve.** Chaque réponse IA reçoit un score 0-100 selon : densité de citations vérifiées, fraîcheur des sources, présence de jurisprudence, présence d'une recommandation hiérarchisée. Le score est affiché à l'utilisateur (« réponse à 87/100 d'explicabilité »). Export PDF inclut le score, les citations, le hash. Combine n° 2 + n° 6 + UX.

---

## Les 5 features « moonshots » (vision 2026-2027)

### A. CompliAI for GitHub — *« Le Snyk de la conformité IA »*

Un GitHub App qui détecte qu'un commit déploie ou modifie un modèle IA (changement dans `model_card.yml`, `Hugging Face`, ou détection sémantique de code ML), déclenche un audit AI Act automatique et publie une CR-check « Compliance OK / Failed » sur la pull request. Si conformité bloquée, le merge est bloqué jusqu'à acquittement. Pour les éditeurs IA, c'est l'intégration native dans la chaîne CI — la conformité devient un test unitaire. Public papier de presse : « la première CI compliance pour l'AI Act ». Hooks à construire : GitHub App OAuth, parsing model card, prompt « auditeur AI Act minute », commentaire de PR structuré.

### B. Adversarial AI Act Testing — *« IA contre IA »*

Un pipeline qui prend un modèle IA (API endpoint), le soumet à 50-100 tests automatiques calqués sur les obligations AI Act : tests de biais (article 10, paragraphe 5 — gouvernance des données), tests de robustesse (article 15 — exactitude), tests de transparence (article 50 — divulgation), tests de contournement de garde-fous (article 5 — manipulation subliminale). Chaque test produit un verdict factuel et une référence article. C'est la conformité **prouvée** par benchmark, pas déclarée. La FRIA et l'Art. 11 sont remplis avec les résultats du benchmark, pas avec des prompts engineering. Le client peut commander un « passage de banc » avant mise sur le marché.

### C. Marketplace de jurisprudence prédite — *« Predict Court EU »*

Un agent qui scrappe en continu les procédures pendantes (CJUE, CNIL, Garante, BfDI, AEPD…), construit des fiches « affaire en cours » et prédit l'issue probable (« 73 % CNIL retiendra une violation de l'article 6 »). Les cabinets paient pour suivre leurs dossiers et tester leurs stratégies. Optionnellement : un système de pronostic façon *prediction market* interne (les utilisateurs votent, l'IA arbitre, gagnants payés en crédits CompliAI). C'est un vrai produit dérivé qui peut devenir une marque (« CompliCourt »).

### D. AI Compliance CVE — *« Le bug bounty de la conformité IA »*

Programme public où des chercheurs et des avocats peuvent signaler des risques de conformité sur des produits IA grand public (ChatGPT, Mistral, Copilot…). CompliAI vérifie, qualifie juridiquement, publie un « Compliance CVE » avec référence d'article et estimation de sanction. Les éditeurs reçoivent un *responsible disclosure*. Devient une référence du secteur, génère des leads, et installe CompliAI comme l'autorité morale de la conformité IA en Europe.

### E. EU Compliance API — *« L'infrastructure compliance »*

Exposer la pile CompliAI (RAG + master prompt + Second Œil + 27 DPA + générateurs) en API B2B : Notion intègre une checkbox « est-ce que ce document RH passe l'AI Act ? », Lawvo branche son outil de contrats sur la doctrine CompliAI, les cabinets construisent leurs propres workflows. Stratégie : devenir le *Stripe de la compliance EU*. À 24 mois, le revenu API peut dépasser le revenu SaaS direct. Préparé via les générateurs JSON déjà existants (`generators.ts`).

---

## Anti-features (ce que CompliAI NE doit PAS devenir)

1. **Un Naaia bis qui se vend exclusivement aux Chief Risk Officers anglo-saxons.** Pas de pivot vers l'enterprise opaque sans pricing public — CompliAI doit rester accessible au cabinet parisien de 5 personnes et au DPO d'ETI de 200 salariés. Le sweet spot est là.
2. **Un ChatGPT générique avec un branding juridique.** Le public premium FR ne pardonne pas une réponse creuse. Si une fonctionnalité ne s'appuie pas sur le master prompt + RAG + vérification, elle ne sort pas.
3. **Une couverture mondiale superficielle (USA + Chine + EU).** Mieux vaut couvrir 27 États EU avec rigueur que 100 pays superficiellement. C'est notre moat.
4. **Un freemium qui dégrade l'IA pour fabriquer un funnel.** Mauvaise réputation chez les avocats. Le free tier doit être *limité en volume*, pas *limité en qualité*.
5. **Une gamification (badges, points, streaks).** Le public est sérieux. Le sérieux se vend cher.
6. **Une IA « agentique autonome » qui prend des décisions juridiques sans humain.** Contraire à l'article 14 AI Act, contraire à l'esprit du master prompt. Toujours *contrôle humain par construction*.
7. **Un outil qui veut faire fiscal + RH + contrats généraux + IP.** CompliAI reste *compliance IA et droit du numérique européen*. Tout débordement dilue le positionnement.

---

## Mise en scène — la démo 30 secondes par feature signature

| Feature | Geste démo | Effet « wow » |
|---|---|---|
| Le Procès Permanent | Ouvrir le dashboard → bandeau « 3 décisions motivées cette nuit » → cliquer → PDF style arrêt CJUE | Le DPO voit ce qu'il a toujours rêvé d'avoir avant un contrôle |
| Le Second Œil | Générer une note → badge « 47 citations · 47 vérifiées » → survoler une citation → extrait EUR-Lex inline | L'avocat voit qu'il peut signer sans peur |
| Sentinelle 27 | Toggle « déploiement Italie » dans un projet → 4 alertes Garante apparaissent en italien + traduction | L'ETI multi-pays comprend qu'aucun outil ne fait ça |
| L'Avocat de l'Adversaire | Clic « Stress-tester » sur un audit → 4 angles d'attaque, formulés comme un inspecteur | Le juriste senior dit « je veux ça pour moi » |
| Le Mémoire Vivant | Ouvrir un doc de novembre 2025 → badge « 3 mises à jour » → diff visuel | Le client comprend pourquoi il paie un abonnement, pas une licence |
| Le Témoin Numérique | Clic « Exporter preuve de conformité » → ZIP avec attestation horodatée | La fondatrice santé sait quoi envoyer à la CNIL |
| Le Calendrier qui Parle | Clic sur « 2 août 2026 » → pop-up Gantt inversé → « générer le plan d'instruction » | Le fondateur sait quoi faire dans quel ordre |

---

## Les 3 paris à signer en priorité

Si Noé n'a que 12 semaines de développement IA dédié, il ne fait pas une vingtaine de petites améliorations : il fait **trois paris ambitieux qui se renforcent mutuellement**.

### Pari 1 — Le Second Œil (effort M · 3-4 semaines)

C'est la **condition de signature** pour qu'un avocat ou un DPO sérieux utilise CompliAI. Sans vérification automatique des citations, tout livrable IA reste un objet de discussion en interne ; avec vérification, il devient un objet juridique. C'est aussi la pré-condition technique pour les paris 2 et 5 (Procès Permanent, Mémoire Vivant) — donc l'investissement amortit deux autres lignes de la roadmap. Le master prompt parle d'anti-hallucination depuis le premier jour ; il faut le *mécaniser*, pas seulement le *prononcer*.

### Pari 2 — Le Procès Permanent (effort L · 5-6 semaines)

C'est le **wow effect** et le rituel d'usage. Aucun concurrent ne le fait — ni Naaia (scoring statique), ni Holistic AI (tests techniques), ni Doctrine (recherche). C'est l'exploitation maximale du master prompt « juriste senior parisien » : on rend chaque matin une décision motivée, c'est ce qui transforme la plateforme en produit irremplaçable. KPI : rétention quotidienne et prix premium justifié.

### Pari 3 — Sentinelle 27 (effort M · 3-4 semaines)

C'est le **moat défensif** vs. les concurrents FR (Dastra, Witik) et internationaux (Naaia, Credo AI). Les 27 États membres sont *déjà* dans le code (`eu-national-sources.ts`) — sous-exploités. Industrialiser l'ingestion et le scoring projet × juridiction × secteur, c'est construire une base de données que personne ne rattrapera en moins de 18 mois. Et c'est l'argument commercial évident pour vendre aux ETI multi-pays et aux cabinets qui suivent des dossiers transfrontaliers.

**Pourquoi ces trois et pas les autres.** Le Témoin Numérique (n° 6) est petit et incontournable, mais il s'embarque comme *feature collatérale* du Procès Permanent (chaque décision motivée est hashée). L'Avocat de l'Adversaire (n° 4) est génial mais court (réutilise les générateurs existants — 1 semaine, à shipper en bonus). Le Mémoire Vivant et le Calendrier qui Parle sont stratégiquement majeurs mais arrivent *naturellement* dans les 6 mois suivants une fois que les trois paris sont posés.

Ces trois paris, ensemble, posent une thèse claire : **CompliAI rend chaque livrable IA juridiquement opposable, prescriptif et multi-juridiction** — c'est exactement ce que ni Naaia, ni Doctrine, ni un cabinet à 50 k€ ne peuvent offrir au DPO et à l'avocat parisien exigeant.
