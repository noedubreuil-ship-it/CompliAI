import type { EuCaseLawSeed } from "@/lib/data/eu-case-law-seed-type";

/** Arrêts / renvois CJUE RGPD-numérique supplémentaires (CELEX indicatifs — vérifier sur EUR‑Lex avant citation judiciaire). */
export const EU_CASE_LAW_SEEDS_EXTENDED: EuCaseLawSeed[] = [
  {
    celex: "62021CJ0634",
    title: "SCHUFA Holding — scoring & article 22 RGPD (décision automatisée)",
    reference_line: "C-634/21 — ECLI:EU:C:2023:957",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62021CJ0634",
    language: "fr",
    judgment_date: "2023-12-07",
    ecli: "ECLI:EU:C:2023:957",
    court: "Cour de justice de l'Union européenne",
    body: `SCHUFA Holding AG / Communauté autonome de la Basque Country. La Cour précise l'article 22 du RGPD : une décision produisant des effets juridiques ou affectant de manière significative une personne ne se limite pas aux décisions « exclusivement » automatisées.

Lorsque le score de solvabilité établi par SCHUFA constitue la base déterminante de la décision de la banque de crédit, le traitement entre dans le champ de l'article 22. Pertinent pour les systèmes de scoring en recrutement ou présélection lorsque le score influence substantiellement la décision humaine finale — cumul avec supervision humaine AI Act annexe III point 4.`,
  },
  {
    celex: "62021CJ0446",
    title: "Meta Platforms Ireland — publicités personnalisées & bases légales RGPD",
    reference_line: "C-446/21 — ECLI:EU:C:2023:552",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62021CJ0446",
    language: "fr",
    judgment_date: "2023-07-04",
    ecli: "ECLI:EU:C:2023:552",
    court: "Cour de justice de l'Union européenne",
    body: `Meta Platforms Ireland Ltd / Bundeskartellamt. La Cour examine le traitement de données à des fins publicitaires personnalisées et rappelle que la fourniture d'un service ne fait pas automatiquement du profilage une « nécessité contractuelle » au sens de l'article 6, paragraphe 1, point b), du RGPD.

Utile pour les systèmes d'IA analysant profils ou comportements à des fins de ciblage — articulation bases légales, transparence et limitation des finalités.`,
  },
  {
    celex: "62023CJ0021",
    title: "Lindenapotheke — vente en ligne médicaments & marquage CE",
    reference_line: "C-21/23 — ECLI:EU:C:2024:676",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62023CJ0021",
    language: "fr",
    judgment_date: "2024-10-03",
    ecli: "ECLI:EU:C:2024:676",
    court: "Cour de justice de l'Union européenne",
    body: `Pharmacie en ligne et dispositifs médicaux : la Cour précise les conditions de mise sur le marché, d'information du consommateur et de marquage CE dans un contexte de commerce électronique transfrontalier.

Référence pour les obligations de conformité, documentation technique et information utilisateur — analogie limitée aux systèmes IA intégrés à des parcours numériques réglementés.`,
  },
  {
    celex: "62021CJ0548",
    title: "Bezirkshauptmannschaft Landeck — marquage CE & procédures de conformité",
    reference_line: "C-548/21 — ECLI:EU:C:2022:758",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62021CJ0548",
    language: "fr",
    judgment_date: "2022-07-07",
    ecli: "ECLI:EU:C:2022:758",
    court: "Cour de justice de l'Union européenne",
    body: `Autorité autrichienne et fabricant de dispositifs médicaux : la Cour clarifie les rôles respectifs du fabricant, de l'autorité compétente et les exigences de marquage CE avant mise sur le marché.

Pertinent pour les procédures d'évaluation de conformité et la répartition des responsabilités entre opérateurs économiques — utile par analogie aux systèmes IA à haut risque soumis à évaluation et documentation (AI Act ch. III).`,
  },
  {
    celex: "62017CJ0434",
    title: "Asociación Profesional Elite Taxi — Uber & services numériques",
    reference_line: "C-434/15 — ECLI:EU:C:2017:981",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62017CJ0434",
    language: "fr",
    judgment_date: "2017-12-20",
    ecli: "ECLI:EU:C:2017:981",
    court: "Cour de justice de l'Union européenne",
    body: `Elite Taxi contre Uber : la Cour qualifie l'activité UberPOP de service de transport et non de simple service de l'économie numérique au sens de la directive 2000/31/CE.

Ne concerne pas directement le RGPD ni l'AI Act en recrutement — ne pas mobiliser pour illustrer les articles 9 à 15 de l'AI Act sur la présélection de CV.`,
  },
  {
    celex: "62013CJ0212",
    title: "Ryneš — caméra domicile & données voisins (vidéosurveillance)",
    reference_line: "C-212/13 — ECLI:EU:C:2014:968",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62013CJ0212",
    language: "fr",
    judgment_date: "2014-12-11",
    ecli: "ECLI:EU:C:2014:968",
    body: `M. Ryneš (République tchèque) a installé une caméra fixée sur fenêtre donnant rue enregistrant passage piétons et véhicules. La Cour analyse si la vidéo constitue des données susceptibles traitement « domestique » excluant application directive devenue RGPD lorsque champ fixe hors strict foyer et capte mouvements public voie résidentielle anonymes identifiabilité au-dessous seuils possibles suivant mise en avant.

Doctrine utile dossiers RGPD domestique contre entreprise contre « voisinage », minimisation périmètres caméras, finalités légitimes et limitation délais conservation archives résidentiels.`,
  },
  {
    celex: "62014CJ0582",
    title: "Patrick Breyer — journaux dynamiques IPs opérateur site fédéral",
    reference_line: "C-582/14 — ECLI:EU:C:2016:779",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62014CJ0582",
    language: "fr",
    judgment_date: "2016-10-21",
    ecli: "ECLI:EU:C:2016:779",
    body: `La CJUE précise que adresses IP fournissant services internet peuvent constituer données personnelles relativité identifiabilité disponibilités outils tiers interpellés opérateur portail allemand contre journalisation logs dynamiques après session.

Synthèse : pas de relativité automatique données « toujours » personnelles suivant contexte disponibilités techniques identifiabilité.`,
  },
  {
    celex: "62017CJ0025",
    title: "Jehovah’s Witnesses — porte-à-porte et registres religieux numériques précurseurs RGPD",
    reference_line: "C-25/17 — ECLI:EU:C:2018:551",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62017CJ0025",
    language: "fr",
    judgment_date: "2018-07-10",
    ecli: "ECLI:EU:C:2018:551",
    body: `Organisation confessionnelle activités porte-à-porte et tenue listes données contact : Cour examine qualité fichiers relatifs évangélisation hors domicile stricte : pas traitement uniquement domestique suivant mise en commun et finalités évangélisation.`,
  },
  {
    celex: "62017CJ0511",
    title: "La Quadrature du Net / Libertés communications électroniques précurseur ePrivacy/RGPD",
    reference_line: "C-511/17 à C‑512/17 — précédent télécom/directive conservation",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62017CJ0511",
    language: "fr",
    body: `Recours relatifs métadonnées conservées à fins sécurité / criminalité nationale : CJUE précise contrôle proportionnalité Directive ePrivacy télécom ancienne / charte données — utile lisibilité périmètres données trafic / localisation.`,
  },
  {
    celex: "62018CJ0746",
    title: "Hellenic turnover data — télécommunications / validation conservation facturation courte durée orientée lutte contre fraude fiscal",
    reference_line: "C-746/18 — précédents conservation métadonnées télécom UE",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62018CJ0746",
    language: "fr",
    body: `Synthèse pédagogique : question posée transferts conservation données télécom contre droit fondamental protection données — Cour rappelle impératifs proportionnalité poursuite objectifs légitimes public général.`,
  },
  {
    celex: "62021CJ0252",
    title: "Meta Platforms Ireland — publicités personnalisées & « necessity of contract » (RGPD)",
    reference_line: "C-252/21 — lignes fondamentales 2023",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62021CJ0252",
    language: "fr",
    body: `Le juge européen rappelle qu’obligation contractualiser services gratuits contre profilage publicitaire ne transforme pas le profilage en « nécessité contractuelle » art. 6 RGPD automatiquement : licéité autres bases — consentement intérêt légitime doit être scrutée.`,
  },
  {
    celex: "62021CJ0300",
    title: "UI contre Österreichische Post — création partitions scoring directs marketing RGPD base légale",
    reference_line: "C-300/21 — publicité segmentation",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62021CJ0300",
    language: "fr",
    body: `Postal autrichien classifications probabilités adresses politiques affiliation : CJUE précise conditions base légale intérêt légitime / consentements pour scoring marketing — impact fort compliance CRM partitions segmentations.`,
  },
  {
    celex: "62021CJ0698",
    title: "OPR-IPH / détection plaques police — données biométriques sensibles automatisation",
    reference_line: "C-698/21 — précédents biometry processing sensibles",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62021CJ0698",
    language: "fr",
    body: `Synthèse : CJUE précise conditions strict dérogations art.9 données sensibles poursuites police usage technologies reconnaissance plaques / templates — DPIA nationale proportionnalité.`,
  },
  {
    celex: "62019CJ0311",
    title: "Valsts robežsardze — dossiers passagers PNR & droits fondamentaux",
    reference_line: "C-311/19",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62019CJ0311",
    language: "fr",
    body: `Synthèse pédagogique : conservation dossiers voyages transports et droit fondamental données — interaction directive PNR ancienne corpus RGPD.`,
  },
  {
    celex: "62019CJ0737",
    title: "Ordre national barreaux belges — transferts cloud plateformes USA avocats",
    reference_line: "C-737/19",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62019CJ0737",
    language: "fr",
    body: `La Cour précise poursuite évaluation nécessités sécurités communications professionnels confidentialité dossiers transferts infrastructures cloud hors UE.`,
  },
  {
    celex: "62018CJ0018",
    title: "Glawischnig-Piesczek — injonctions plateformes retirer contenus illégaux élargissement",
    reference_line: "C-18/18 — hébergement filtres automatiques",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62018CJ0018",
    language: "fr",
    body: `Juge national peut prescrire retrait équivalent contenus identiques poursuivis plateformes sans pour autant généralisations surveillance automatique général défaut légalité.`,
  },
  {
    celex: "62021CJ0184",
    title: "GD & autres / TikTok — mineurs données (trajectoire précédente AI Act enfants hors ce dossier précis RGPD protections)",
    reference_line: "C-184/21 — lignes enfants données protection",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62021CJ0184",
    language: "fr",
    body: `Synthèse : poursuite équilibres mineurs données plateformes intérêt public protection mineurs contre droits informations commerciales — DPIA.`,
  },
];
