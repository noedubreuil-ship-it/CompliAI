# CompliAI — Roadmap stratégique

> *Document interne de travail. Initiatives pour faire de CompliAI la meilleure
> plateforme du marché européen de la conformité au droit du numérique.*
>
> Format : **Quick wins** (≤ 6 semaines) — **Moyen terme** (3 à 9 mois) —
> **Vision** (> 9 mois).
> Effort : S (≤ 1 sprint) — M (1 à 2 mois) — L (> 2 mois).

---

## A. Quick wins (≤ 6 semaines)

### 1. Citations EUR-Lex cliquables inline
- **Pourquoi.** Les utilisateurs (DPO, juristes internes) vérifient mentalement chaque article cité. Aujourd'hui, ils doivent copier-coller le CELEX dans EUR-Lex. C'est le premier frein à la confiance.
- **Quoi.** Post-traitement des réponses du consultant : détection des motifs `article X, paragraphe Y, du Règlement (UE) NNNN/MMM` → transformation en lien EUR-Lex profond. Idem pour les arrêts CJUE (ECLI).
- **Impact.** Rétention (chaque clic est une preuve de sérieux), différenciation vs. ChatGPT/Claude.fr/MyDPO.
- **Effort.** **S** — regex + lookup côté front, alimenté par `lib/data/legal-sources.ts`.

### 2. Feedback 👍 / 👎 par réponse + commentaire
- **Pourquoi.** On vient d'instaurer `ai_interaction_logs` : autant collecter le signal humain pour entraîner un fine-tuning futur et arbitrer les évolutions de prompts.
- **Quoi.** Petit bouton sous chaque message du consultant ; route `PATCH /api/ai/feedback/[log_id]` qui met à jour `feedback` et `feedback_note`.
- **Impact.** Rétention, qualité IA, base d'entraînement.
- **Effort.** **S**.

### 3. Mode "explique-moi comme à un client"
- **Pourquoi.** Le registre soutenu est non négociable face au juriste, mais les fondateurs non-juristes décrochent au-delà de 3 paragraphes. Beaucoup utilisent CompliAI pour préparer un comité de direction.
- **Quoi.** Switch dans le chat : `Détaillé (juriste)` / `Synthèse direction` / `Pédagogique`. En interne, post-prompt qui demande une reformulation en 5 lignes max + 3 puces actionnables, sans rejouer la recherche RAG.
- **Impact.** Acquisition (les founders parlent du produit à leur board), différenciation.
- **Effort.** **S**.

### 4. Watchlist multi-pays alimentée par `EU_MEMBER_NATIONAL_SOURCES`
- **Pourquoi.** Les entreprises multinationales perdent un temps fou à pister les actes nationaux. La table nationale fraîchement ajoutée est sous-exploitée.
- **Quoi.** Sur chaque projet : sélection des pays de déploiement → alerting hebdomadaire (CNIL, BfDI, AEPD, Garante, DPC…). Bandeau \`Veille active sur 5 pays\` dans le dashboard.
- **Impact.** Rétention + montée en gamme (justification d'un plan Pro multi-pays).
- **Effort.** **M**.

### 5. Bibliothèque de templates DPIA / RoPA / FRIA versionnés
- **Pourquoi.** Les générateurs livrent un JSON unique. En réalité, les équipes itèrent (v1.0, v1.1, v1.2). Aucun outil concurrent ne version proprement les modèles.
- **Quoi.** Table `document_versions` (lien vers `generated_documents`), diff visuel inter-versions, export PDF signé (cf. initiative 12).
- **Impact.** Différenciation, monétisation Pro.
- **Effort.** **M**.

### 6. Page publique "Notre conformité"
- **Pourquoi.** CompliAI vend de la conformité IA. Tout client sérieux demandera "vous-mêmes, vous êtes conformes ?". Tant que la réponse n'est pas publique, le doute paralyse les deals enterprise.
- **Quoi.** Page `/conformite` qui affiche : auto-évaluation AI Act du système CompliAI, FRIA résumée, modèle utilisé (Claude Opus 4.5), traitements RGPD, sous-traitants (Anthropic, Supabase, Stripe, Resend, Sentry), localisation des données.
- **Impact.** Acquisition enterprise, crédibilité.
- **Effort.** **S**.

### 7. Anonymisation automatique des inputs sensibles
- **Pourquoi.** Les utilisateurs collent souvent des extraits de contrats avec noms, e-mails, numéros SIREN. Le RGPD et la prudence imposent que CompliAI ne stocke pas ces données.
- **Quoi.** Pipeline regex + détection NER côté serveur avant l'appel Claude (et avant le hashage `ai_interaction_logs`). Affichage à l'utilisateur d'un bandeau "5 entités personnelles ont été masquées avant analyse".
- **Impact.** Conformité, crédibilité, déblocage des DSI grands comptes.
- **Effort.** **M**.

### 8. Onboarding DPO en 5 étapes
- **Pourquoi.** L'inscription actuelle ouvre 110 pages d'un coup. Le DPO moyen ne sait pas par où commencer.
- **Quoi.** Wizard 5 étapes : *(1)* mon entreprise / *(2)* mes systèmes IA / *(3)* mes pays / *(4)* mes priorités (audit, registre, FRIA, contrats) / *(5)* invitation équipe. Termine sur un dashboard pré-rempli.
- **Impact.** Activation (taux de premier audit terminé), réduction du churn semaine 1.
- **Effort.** **M**.

---

## B. Moyen terme (3 à 9 mois)

### 9. Second avis IA — running de deux prompts adverses
- **Pourquoi.** Sur les sujets sensibles (haut risque AI Act, FRIA, transferts hors UE), une seule réponse Claude ne suffit pas. La meilleure technique anti-hallucination est de comparer deux raisonnements opposés.
- **Quoi.** Sur le consultant en mode \`Question structurante\`, on lance deux appels : un prompt orienté \`conseil prudent\` et un prompt \`avocat de la partie adverse\`. Si les conclusions divergent → bandeau "controverse identifiée, lecture des deux analyses recommandée".
- **Impact.** Différenciation forte ("le seul outil qui se contredit lui-même"), réduction du taux d'hallucination apparente.
- **Effort.** **M**.

### 10. Badge "vérifié par juriste"
- **Pourquoi.** L'utilisateur paie pour du juridique, pas pour de l'IA. Un vrai juriste qui valide quelques réponses sensibles vaut plus que 1000 tokens.
- **Quoi.** Workflow : un utilisateur peut soumettre une réponse à validation humaine (le réseau de juristes vérifiés — cf. initiative 17). Délai de 24-48 h, supplément de prix, badge persistant sur la réponse.
- **Impact.** Premiumisation, hausse de l'ARPU.
- **Effort.** **L**.

### 11. Comparateur de fournisseurs IA
- **Pourquoi.** Les entreprises demandent : \`OpenAI vs Anthropic vs Mistral, lequel est le plus conforme AI Act ?\`. Aujourd'hui, la réponse est éclatée dans des rapports.
- **Quoi.** Page dédiée + outil : grille comparative dynamique sur 20 critères (FRIA publique du modèle, données d'entraînement, transferts, sous-traitance, GPAI, transparence Article 53, etc.). Mise à jour mensuelle par le cron \`regulatory-watch\`.
- **Impact.** Acquisition (page SEO killer), différenciation.
- **Effort.** **M**.

### 12. Registre AI Act exportable WORM pour audit externe
- **Pourquoi.** L'AI Act exigera, à compter d'août 2026, la conservation de logs et de la documentation technique de manière inaltérable. Aucun concurrent ne le propose nativement.
- **Quoi.** Export PDF + manifeste signé (hash SHA-256 chaîné, ancrage périodique sur un timestamp authority RFC 3161 ou blockchain publique). Endpoint \`/api/register/export/[id]\` avec preuve d'intégrité.
- **Impact.** Différenciation enterprise, alignement avec les attentes des CAC et des organismes notifiés.
- **Effort.** **L**.

### 13. Multilingue EN / DE / IT / ES
- **Pourquoi.** Le marché français est étroit. Les DPO allemands et italiens cherchent un outil européen, pas américain.
- **Quoi.** Internationalisation de l'UI (i18n Next.js), prompts spécialisés en EN/DE/IT/ES (en gardant le master prompt comme source unique, traduit par juriste local). Le consultant détecte automatiquement la langue de la question.
- **Impact.** Acquisition européenne, levée de fonds (TAM ×4).
- **Effort.** **L**.

### 14. Intégrations Slack / Teams / Notion
- **Pourquoi.** Le DPO ne veut pas ouvrir un 18ᵉ onglet. La valeur vient quand CompliAI est là où le travail se fait déjà.
- **Quoi.** Bot Slack `/compliai` (déjà esquissé), bot Teams, intégration Notion (capture d'une décision DPO directement dans une page Notion du registre AI Act).
- **Impact.** Rétention, viralité B2B.
- **Effort.** **M**.

### 15. API publique tarifée
- **Pourquoi.** Les cabinets d'avocats et les éditeurs RH veulent appeler les outils CompliAI depuis leur stack. Aujourd'hui, seul \`/api/v1/me\` est documenté.
- **Quoi.** Routes versionnées `/api/v1/audit`, `/api/v1/generate/*`, `/api/v1/classifier`, avec quotas, clés API granulaires, dashboard usage. Tarification par crédit ou par appel.
- **Impact.** Pricing tier supérieur, nouveau canal de revenu B2B2B.
- **Effort.** **L**.

### 16. Mode "audit guidé" pas-à-pas
- **Pourquoi.** L'audit actuel est un formulaire d'un coup. Pour un système complexe (banque, RH, santé), l'utilisateur abandonne.
- **Quoi.** Tunnel conversationnel piloté par Claude : chaque étape pose 1 à 3 questions ciblées, propose des réponses pré-rédigées (taxonomie AI Act), récapitule avant lancement de l'audit. UI \`Type-form\` premium.
- **Impact.** Activation, premium feel.
- **Effort.** **M**.

### 17. Marketplace de juristes vérifiés
- **Pourquoi.** Le marché du conseil RGPD/AI Act manque de routage propre. CompliAI peut devenir la porte d'entrée vers le bon avocat.
- **Quoi.** Annuaire de juristes vérifiés (par barreau, par spécialité, par langue). Quand un utilisateur souhaite un \`avis vérifié\` (cf. initiative 10) ou un contentieux, on ouvre un ticket payant. Commission CompliAI.
- **Impact.** Diversification de revenu, fidélisation (l'utilisateur sait qu'il a un humain en relais).
- **Effort.** **L**.

---

## C. Vision (> 9 mois)

### 18. Offre cabinets d'avocats white-label
- **Pourquoi.** Les cabinets d'avocats parisiens et londoniens veulent un \`CompliAI\` à leur marque, sans construire l'IA en interne.
- **Quoi.** Tenant blanche-marque, branding personnalisé, contrat de sous-traitance RGPD avec le cabinet (qui devient responsable de traitement face à ses clients). Tarification : abonnement mensuel + per-seat.
- **Impact.** Pricing **5–10× supérieur** au B2C juriste, asseyement comme infrastructure du marché.
- **Effort.** **L**.

### 19. Interopérabilité native CNIL / ANSSI / ARCOM
- **Pourquoi.** Différenciation francophone forte. Aucun concurrent n'est calé sur les modèles exacts attendus par les autorités françaises.
- **Quoi.** Export direct au format CNIL (modèle officiel registre RGPD), au format ANSSI (déclaration NIS2), au format ARCOM (transparence DSA pour les très grandes plateformes). Pré-remplissage à partir des données déjà saisies.
- **Impact.** Différenciation FR, gain de temps pour le client (3 jours homme par déclaration).
- **Effort.** **L**.

### 20. Newsletter hebdomadaire automatisée et personnalisée
- **Pourquoi.** L'utilisateur reçoit déjà *Politico AI, Contexte, Tech Policy Press, IAPP*. CompliAI doit envoyer la sienne — mais **personnalisée par projet**.
- **Quoi.** Cron hebdo : pour chaque utilisateur actif, on agrège la veille EU pertinente vis-à-vis de ses projets (table déjà existante), on génère une newsletter HTML (Resend) avec actions recommandées. Pas de spam — un seul envoi/semaine.
- **Impact.** Rétention, top-of-mind, viralité (le DPO transfère à son DAF).
- **Effort.** **M**.

### 21. Jurisprudence-watch alerts par projet
- **Pourquoi.** Les arrêts CJUE / CEDH bougent les obligations chaque mois. Aujourd'hui, on les empile dans `lib/ai/calendar-context.ts` mais l'utilisateur ne sait pas qu'un arrêt rendu hier impacte son audit d'il y a 4 mois.
- **Quoi.** Pour chaque audit clos, le cron compare les nouvelles décisions à la classification : envoi d'un mail \`Votre audit "X" doit être révisé suite à l'arrêt Y\`.
- **Impact.** Rétention forte, justification d'un abonnement annuel.
- **Effort.** **M**.

### 22. Chiffrement at-rest des audits + clé client (BYOK)
- **Pourquoi.** Les grands comptes (banques, défense, santé) exigent que la plateforme ne puisse pas elle-même lire leurs audits.
- **Quoi.** AES-256 GCM côté serveur, clé maître par projet, option BYOK (Bring Your Own Key) Pro+ via KMS (AWS / Tresorit / Google Cloud KMS). Logs de déchiffrement.
- **Impact.** Déblocage des deals enterprise, **prérequis** pour certaines RFP.
- **Effort.** **L**.

### 23. Auto-évaluation AI Act publique de CompliAI lui-même
- **Pourquoi.** Cf. initiative 6 — étendre. Publier en open data l'évaluation AI Act du produit, mise à jour mensuellement, signée. Faire de l'exemplarité un argument marketing.
- **Quoi.** Page \`/conformite/ai-act\` : classification (risque minimal ? limité ?), justification, FRIA publique, logs anonymisés d'incidents. Premier vendor à le faire = positionnement de référence.
- **Impact.** Différenciation, presse spécialisée, **acquisition organique**.
- **Effort.** **M**.

### 24. Intégration Doctrine.fr / Lamyline / Dalloz
- **Pourquoi.** Le juriste français vit dans Dalloz + Lamyline. Si CompliAI peut puiser la doctrine française vérifiée (et payée), la barrière de confiance saute.
- **Quoi.** Partenariat éditorial avec un éditeur juridique français ; intégration des références complètes (RTD eur, Recueil Dalloz) dans les citations.
- **Impact.** Différenciation francophone forte, justification d'un tier \`Avocat\`.
- **Effort.** **L** + négociation contractuelle.

### 25. Communauté & événements (webinaires, journées DPO, Hubspot/Crisp)
- **Pourquoi.** Le marché DPO est petit et tribal. Un \`club CompliAI\` mensuel = canal d'acquisition + canal de rétention.
- **Quoi.** Webinaire mensuel (Crisp événement intégré au dashboard), Slack communauté, événement physique annuel (Journée AI Act parisienne).
- **Impact.** Brand love, NPS, acquisition par recommandation.
- **Effort.** **M** (récurrent).

---

## 🏁 Trois paris à 12 mois — choix éditoriaux recommandés

> *Si on doit choisir trois initiatives parmi les 25 ci-dessus pour faire de
> CompliAI **la** plateforme de référence dans 12 mois, ce sont celles-ci.*

### Pari n°1 — **Citations cliquables + Second avis IA (initiatives 1 & 9)**
> Ce sont les deux mécaniques qui transforment CompliAI de "ChatGPT thématique" en *infrastructure juridique*. La citation cliquable installe la confiance, le second avis IA est le seul moyen défendable de répondre à l'objection \`et si l'IA hallucinait ?\`. C'est ce qui fait passer le DPO du *trial* au *contrat annuel*.

### Pari n°2 — **Page "Notre conformité" + auto-évaluation AI Act publique (initiatives 6 & 23)**
> CompliAI vend de la conformité. Si on est exemplaires, on prend la pole position narrative : "le premier outil de conformité IA qui s'auto-applique ses propres règles". C'est gratuit, rapide, et c'est ce qui sera repris par Politico AI, *Les Échos*, *L'Usine Digitale*. La différenciation marketing la plus haute marge possible.

### Pari n°3 — **White-label cabinets d'avocats + interopérabilité CNIL/ANSSI/ARCOM (initiatives 18 & 19)**
> Le vrai gisement de revenu n'est pas le DPO solo : ce sont les 200 cabinets d'avocats français spécialisés en droit du numérique qui *cherchent un outil de cabinet*. Si CompliAI devient l'infrastructure derrière Cap Avocats, Bird & Bird, August Debouzy, etc., le ticket moyen passe de 200 €/mois à 2 000–10 000 €/mois et la base devient capital-defensible.

---

*Document maintenu par l'équipe produit CompliAI — version 1.0, mai 2026.*
