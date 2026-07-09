/**
 * coverage-articles.ts — Liste complète des articles à surveiller pour le
 * Mécanisme 3 (couverture mensuelle des articles principaux).
 *
 * Chaque entrée déclenche mensuellement une requête sémantique du type
 * "article X du règlement Y" et vérifie que le chunk correspondant remonte
 * en top-3. Si ce n'est plus le cas → alerte de retrouvabilité.
 *
 * Priorités :
 *  - critical : article fondamental, absence = régression grave
 *  - important : article significatif, absence = warning
 *  - low : article utile mais transitoire / technique, absence = info
 *
 * Champ `indexed` :
 *  - true  : le règlement est indexé dans legal_chunks → le check est actif
 *  - false : règlement non encore indexé → le check génère une info, pas une alerte
 *
 * Exclusions documentées : articles transitoires ou abrogés explicitement
 * notés avec `exclude_reason`.
 */

import type { CoverageEntry } from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ai(id: string, article: string, priority: CoverageEntry["priority"], desc?: string): CoverageEntry {
  return {
    id: `ai-act-${id}`,
    query: `Article ${article} du Règlement IA européen AI Act ${desc ? `- ${desc}` : ""}`,
    regulation: "AI Act",
    article,
    priority,
    indexed: true,
  };
}

function rgpd(id: string, article: string, priority: CoverageEntry["priority"], desc?: string): CoverageEntry {
  return {
    id: `rgpd-${id}`,
    query: `Article ${article} RGPD Règlement général protection des données ${desc ? `- ${desc}` : ""}`,
    regulation: "RGPD",
    article,
    priority,
    indexed: true,
  };
}

function dsa(id: string, article: string, priority: CoverageEntry["priority"]): CoverageEntry {
  return {
    id: `dsa-${id}`,
    query: `Article ${article} du Digital Services Act DSA Règlement services numériques`,
    regulation: "DSA",
    article,
    priority,
    indexed: false,
  };
}

function dma(id: string, article: string, priority: CoverageEntry["priority"]): CoverageEntry {
  return {
    id: `dma-${id}`,
    query: `Article ${article} du Digital Markets Act DMA règlement marchés numériques`,
    regulation: "DMA",
    article,
    priority,
    indexed: false,
  };
}

function da(id: string, article: string, priority: CoverageEntry["priority"]): CoverageEntry {
  return {
    id: `data-act-${id}`,
    query: `Article ${article} du Data Act Règlement européen sur les données`,
    regulation: "Data Act",
    article,
    priority,
    indexed: false,
  };
}

function dga(id: string, article: string, priority: CoverageEntry["priority"]): CoverageEntry {
  return {
    id: `dga-${id}`,
    query: `Article ${article} du Data Governance Act Règlement gouvernance des données`,
    regulation: "Data Governance Act",
    article,
    priority,
    indexed: false,
  };
}

function nis2(id: string, article: string, priority: CoverageEntry["priority"]): CoverageEntry {
  return {
    id: `nis2-${id}`,
    query: `Article ${article} de la Directive NIS2 sécurité des réseaux et systèmes d'information`,
    regulation: "NIS2",
    article,
    priority,
    indexed: false,
  };
}

function dsm(id: string, article: string, priority: CoverageEntry["priority"]): CoverageEntry {
  return {
    id: `dsm-${id}`,
    query: `Article ${article} de la Directive sur le droit d'auteur marché unique numérique DSM`,
    regulation: "Directive DSM",
    article,
    priority,
    indexed: false,
  };
}

function eprivacy(id: string, article: string, priority: CoverageEntry["priority"]): CoverageEntry {
  return {
    id: `eprivacy-${id}`,
    query: `Article ${article} de la Directive ePrivacy communications électroniques cookies`,
    regulation: "ePrivacy",
    article,
    priority,
    indexed: false,
  };
}

function cra(id: string, article: string, priority: CoverageEntry["priority"]): CoverageEntry {
  return {
    id: `cra-${id}`,
    query: `Article ${article} du Cyber Resilience Act CRA règlement cybersécurité produits`,
    regulation: "CRA",
    article,
    priority,
    indexed: false,
  };
}

function rm(id: string, article: string, priority: CoverageEntry["priority"]): CoverageEntry {
  return {
    id: `rm-${id}`,
    query: `Article ${article} du Règlement Machines machinerie sécurité`,
    regulation: "Règlement Machines",
    article,
    priority,
    indexed: false,
  };
}

function eidas(id: string, article: string, priority: CoverageEntry["priority"]): CoverageEntry {
  return {
    id: `eidas2-${id}`,
    query: `Article ${article} du Règlement eIDAS 2 identité numérique européenne`,
    regulation: "eIDAS 2",
    article,
    priority,
    indexed: false,
  };
}

function cjue(id: string, ecli: string, parties: string, priority: CoverageEntry["priority"]): CoverageEntry {
  return {
    id: `cjue-${id}`,
    query: `${ecli} ${parties}`,
    regulation: "CJUE",
    article: ecli,
    priority,
    indexed: true,
  };
}

function edpb(id: string, reference: string, title: string, priority: CoverageEntry["priority"]): CoverageEntry {
  return {
    id: `edpb-${id}`,
    query: `EDPB guidelines ${reference} ${title}`,
    regulation: "EDPB",
    article: reference,
    priority,
    indexed: true,
  };
}

// ─── AI Act (Arts 1–113) ─────────────────────────────────────────────────────
// Arts 1-2 : objet et champ, 3 : définitions, 5 : interdictions, 6 : qualification
// haut risque, 9-15 : systèmes haut risque, 16-27 : fournisseurs/déployeurs,
// 28-39 : autorités notifiées, 40-49 : normes/conformité, 50-51 : transparence/GPAI,
// 53-55 : obligations GPAI, 56-68 : gouvernance, 69-80 : responsabilité,
// 81-99 : sanctions, 101-113 : dispositions finales

const AI_ACT: CoverageEntry[] = [
  ai("1", "1", "low", "Objet"),
  ai("2", "2", "low", "Champ d'application"),
  ai("3", "3", "critical", "Définitions système IA"),
  ai("4", "4", "low", "Responsabilité en matière de culture de l'IA"),
  ai("5", "5", "critical", "Pratiques interdites"),
  ai("6", "6", "critical", "Règles de qualification haut risque"),
  ai("7", "7", "important", "Modifications Annexe III haut risque"),
  ai("8", "8", "important", "Conformité exigences systèmes haut risque"),
  ai("9", "9", "critical", "Système de gestion des risques"),
  ai("10", "10", "critical", "Données et gouvernance des données"),
  ai("11", "11", "important", "Documentation technique"),
  ai("12", "12", "important", "Tenue de registres"),
  ai("13", "13", "critical", "Transparence et fourniture d'informations"),
  ai("14", "14", "critical", "Contrôle humain"),
  ai("15", "15", "important", "Exactitude, robustesse, cybersécurité"),
  ai("16", "16", "important", "Obligations des fournisseurs"),
  ai("17", "17", "important", "Système de gestion de la qualité"),
  ai("18", "18", "low", "Documentation fournisseur"),
  ai("19", "19", "low", "Journaux automatiques"),
  ai("20", "20", "low", "Actions correctives fournisseur"),
  ai("21", "21", "low", "Obligations info autorités"),
  ai("22", "22", "low", "Représentants autorisés"),
  ai("23", "23", "low", "Obligations importateurs"),
  ai("24", "24", "low", "Obligations distributeurs"),
  ai("25", "25", "important", "Responsabilités chaîne de valeur"),
  ai("26", "26", "critical", "Obligations des déployeurs"),
  ai("27", "27", "low", "Obligations déployeurs PME"),
  ai("28", "28", "important", "Autorités notifiées"),
  ai("29", "29", "low", "Demandes organismes notifiés"),
  ai("30", "30", "low", "Notifications organismes"),
  ai("31", "31", "low", "Modifications notification"),
  ai("32", "32", "low", "Contestation organismes"),
  ai("33", "33", "low", "Filiales organismes"),
  ai("34", "34", "low", "Sous-traitance organismes"),
  ai("35", "35", "low", "Tiers organismes"),
  ai("36", "36", "low", "Procédures opérationnelles"),
  ai("37", "37", "low", "Exigences compétences"),
  ai("38", "38", "low", "Coordination organismes"),
  ai("39", "39", "low", "Ressources organismes"),
  ai("40", "40", "important", "Normes harmonisées"),
  ai("41", "41", "low", "Spécifications communes"),
  ai("42", "42", "important", "Présomption conformité normes"),
  ai("43", "43", "critical", "Évaluation conformité"),
  ai("44", "44", "important", "Certificats"),
  ai("45", "45", "low", "Obligations organismes certificats"),
  ai("46", "46", "low", "Registres organismes"),
  ai("47", "47", "low", "Déclaration conformité UE"),
  ai("48", "48", "important", "Marquage CE"),
  ai("49", "49", "low", "Enregistrement"),
  ai("50", "50", "critical", "Transparence systèmes IA (chatbot)"),
  ai("51", "51", "critical", "Seuil risque systémique GPAI"),
  ai("52", "52", "low", "Réserves"), // Article 52 réservé dans certaines versions — garder
  ai("53", "53", "critical", "Obligations fournisseurs GPAI"),
  ai("54", "54", "important", "Autorisation utilisation données protégées"),
  ai("55", "55", "critical", "Obligations fournisseurs GPAI risque systémique"),
  ai("56", "56", "important", "Bureau européen IA"),
  ai("57", "57", "low", "Missions Bureau IA"),
  ai("58", "58", "low", "Structure Bureau IA"),
  ai("59", "59", "low", "Comité européen IA"),
  ai("60", "60", "low", "Missions Comité IA"),
  ai("61", "61", "low", "Composition Comité"),
  ai("62", "62", "low", "Forum consultatif"),
  ai("63", "63", "low", "Panel scientifique"),
  ai("64", "64", "low", "Autorités nationales"),
  ai("65", "65", "important", "Procédure sauvegarde nationale"),
  ai("66", "66", "important", "Procédure Union non-conformité"),
  ai("67", "67", "low", "Systèmes IA risque immédiat"),
  ai("68", "68", "low", "Systèmes IA risque tiers"),
  ai("69", "69", "important", "Codes de conduite"),
  ai("70", "70", "low", "Règles confidentialité"),
  ai("71", "71", "low", "Sanctions membres du personnel"),
  ai("72", "72", "low", "Essais environnements réels"),
  ai("73", "73", "low", "Bacs à sable IA"),
  ai("74", "74", "low", "Traitement données bac à sable"),
  ai("75", "75", "low", "Mise en œuvre bac à sable"),
  ai("76", "76", "low", "Responsabilité bac à sable"),
  ai("77", "77", "low", "Mesures PME bac à sable"),
  ai("78", "78", "important", "Base de données EU risque"),
  ai("79", "79", "low", "Signalement incidents graves"),
  ai("80", "80", "low", "Signalement sécurité nationale"),
  ai("81", "81", "low", "Surveillance marché"),
  ai("82", "82", "low", "Pouvoirs surveillance"),
  ai("83", "83", "low", "Accès données formation"),
  ai("84", "84", "low", "Assistance juridictions"),
  ai("85", "85", "important", "Droit de recours"),
  ai("86", "86", "important", "Droit information personnes affectées"),
  ai("87", "87", "low", "Signalement violations Bureau IA"),
  ai("88", "88", "low", "Partage information marché"),
  ai("89", "89", "low", "Coopération autorités"),
  ai("90", "90", "low", "Coopération tiers pays"),
  ai("91", "91", "low", "Normes et évaluations"),
  ai("92", "92", "low", "Exercice délégation"),
  ai("93", "93", "low", "Procédure comité"),
  ai("94", "94", "low", "Confidentialité"),
  ai("95", "95", "low", "Sécurité informations"),
  ai("96", "96", "low", "Rapport Commission"),
  ai("97", "97", "low", "Révision"),
  ai("98", "98", "low", "Abrogations"),
  ai("99", "99", "critical", "Sanctions pécuniaires"),
  ai("100", "100", "important", "Sanctions personnes physiques"),
  ai("101", "101", "critical", "Sanctions GPAI"),
  ai("102", "102", "low", "Astreintes"),
  ai("103", "103", "low", "Recours juridictionnel"),
  ai("104", "104", "low", "Coordination autorités nationales"),
  ai("105", "105", "low", "Amendements Règlement 300/2008"),
  ai("106", "106", "low", "Amendements Règlement 167/2013"),
  ai("107", "107", "low", "Amendements Règlement 168/2013"),
  ai("108", "108", "low", "Amendements Directive 2014/90"),
  ai("109", "109", "low", "Amendements Directive 2016/797"),
  ai("110", "110", "low", "Amendements Règlement 2018/858"),
  ai("111", "111", "low", "Amendements Règlement 2018/1139"),
  ai("112", "112", "low", "Amendements Règlement 2019/2144"),
  ai("113", "113", "critical", "Entrée en vigueur et calendrier application"),
];

// ─── RGPD (Arts 1–99) ────────────────────────────────────────────────────────

const RGPD_ARTICLES: CoverageEntry[] = [
  rgpd("1", "1", "low", "Objet"),
  rgpd("2", "2", "low", "Champ d'application matériel"),
  rgpd("3", "3", "important", "Champ d'application territorial"),
  rgpd("4", "4", "critical", "Définitions"),
  rgpd("5", "5", "critical", "Principes relatifs au traitement"),
  rgpd("6", "6", "critical", "Licéité du traitement"),
  rgpd("7", "7", "critical", "Conditions applicables au consentement"),
  rgpd("8", "8", "important", "Consentement enfants"),
  rgpd("9", "9", "critical", "Catégories particulières données"),
  rgpd("10", "10", "important", "Données infraction pénale"),
  rgpd("11", "11", "low", "Traitement sans identification"),
  rgpd("12", "12", "critical", "Communication droits personnes"),
  rgpd("13", "13", "critical", "Information collecte directe"),
  rgpd("14", "14", "critical", "Information collecte indirecte"),
  rgpd("15", "15", "critical", "Droit d'accès"),
  rgpd("16", "16", "critical", "Droit de rectification"),
  rgpd("17", "17", "critical", "Droit à l'effacement"),
  rgpd("18", "18", "critical", "Droit à la limitation"),
  rgpd("19", "19", "important", "Notification rectification/effacement"),
  rgpd("20", "20", "critical", "Droit à la portabilité"),
  rgpd("21", "21", "critical", "Droit d'opposition"),
  rgpd("22", "22", "critical", "Décision individuelle automatisée"),
  rgpd("23", "23", "important", "Limitations droits"),
  rgpd("24", "24", "critical", "Responsabilité du responsable"),
  rgpd("25", "25", "critical", "Protection des données dès la conception"),
  rgpd("26", "26", "important", "Responsables conjoints"),
  rgpd("27", "27", "low", "Représentants tiers pays"),
  rgpd("28", "28", "critical", "Sous-traitant"),
  rgpd("29", "29", "important", "Traitement sous autorité"),
  rgpd("30", "30", "critical", "Registre des activités"),
  rgpd("31", "31", "low", "Coopération avec l'autorité"),
  rgpd("32", "32", "critical", "Sécurité du traitement"),
  rgpd("33", "33", "critical", "Notification violation données"),
  rgpd("34", "34", "critical", "Communication violation personnes"),
  rgpd("35", "35", "critical", "AIPD"),
  rgpd("36", "36", "critical", "Consultation préalable"),
  rgpd("37", "37", "critical", "DPO désignation"),
  rgpd("38", "38", "important", "Position DPO"),
  rgpd("39", "39", "important", "Missions DPO"),
  rgpd("40", "40", "important", "Codes de conduite"),
  rgpd("41", "41", "low", "Surveillance codes"),
  rgpd("42", "42", "important", "Certification"),
  rgpd("43", "43", "low", "Organismes certification"),
  rgpd("44", "44", "critical", "Principe transferts"),
  rgpd("45", "45", "critical", "Décision d'adéquation"),
  rgpd("46", "46", "critical", "Garanties appropriées"),
  rgpd("47", "47", "important", "Règles contraignantes d'entreprise"),
  rgpd("48", "48", "important", "Décisions judiciaires"),
  rgpd("49", "49", "important", "Dérogations transferts"),
  rgpd("50", "50", "low", "Coopération internationale"),
  rgpd("51", "51", "important", "Autorités de contrôle"),
  rgpd("52", "52", "low", "Indépendance"),
  rgpd("53", "53", "low", "Membres"),
  rgpd("54", "54", "low", "Statut autorités"),
  rgpd("55", "55", "important", "Compétence autorités"),
  rgpd("56", "56", "important", "Autorité chef de file"),
  rgpd("57", "57", "important", "Missions"),
  rgpd("58", "58", "critical", "Pouvoirs"),
  rgpd("59", "59", "low", "Rapports d'activité"),
  rgpd("60", "60", "important", "Coopération autorités"),
  rgpd("61", "61", "low", "Assistance mutuelle"),
  rgpd("62", "62", "low", "Opérations conjointes"),
  rgpd("63", "63", "important", "Mécanisme de cohérence"),
  rgpd("64", "64", "low", "Avis Comité EDPB"),
  rgpd("65", "65", "important", "Règlement Comité EDPB"),
  rgpd("66", "66", "low", "Procédure urgence"),
  rgpd("67", "67", "low", "Échange informations"),
  rgpd("68", "68", "important", "Comité EDPB"),
  rgpd("69", "69", "low", "Indépendance EDPB"),
  rgpd("70", "70", "low", "Missions EDPB"),
  rgpd("71", "71", "low", "Rapports EDPB"),
  rgpd("72", "72", "low", "Procédures EDPB"),
  rgpd("73", "73", "low", "Président EDPB"),
  rgpd("74", "74", "low", "Missions président"),
  rgpd("75", "75", "low", "Secrétariat"),
  rgpd("76", "76", "low", "Confidentialité"),
  rgpd("77", "77", "critical", "Droit de réclamation"),
  rgpd("78", "78", "important", "Recours juridictionnel contre autorités"),
  rgpd("79", "79", "important", "Recours contre responsable"),
  rgpd("80", "80", "important", "Représentation personnes"),
  rgpd("81", "81", "low", "Suspension procédures"),
  rgpd("82", "82", "critical", "Droit à réparation"),
  rgpd("83", "83", "critical", "Conditions amendes"),
  rgpd("84", "84", "important", "Sanctions nationales"),
  rgpd("85", "85", "low", "Traitement journalisme"),
  rgpd("86", "86", "low", "Traitement accès documents"),
  rgpd("87", "87", "low", "Traitement numéro national"),
  rgpd("88", "88", "low", "Traitement contexte travail"),
  rgpd("89", "89", "important", "Traitement fins archivage"),
  rgpd("90", "90", "low", "Obligations secret professionnel"),
  rgpd("91", "91", "low", "Règles existantes"),
  rgpd("92", "92", "low", "Exercice délégation"),
  rgpd("93", "93", "low", "Procédure comité"),
  rgpd("94", "94", "low", "Abrogation Directive 95/46"),
  rgpd("95", "95", "low", "Relation avec Directive 2002/58"),
  rgpd("96", "96", "low", "Relation actes antérieurs"),
  rgpd("97", "97", "low", "Rapports Commission"),
  rgpd("98", "98", "low", "Révision actes"),
  rgpd("99", "99", "critical", "Entrée en vigueur"),
];

// ─── DSA (principaux articles, indexed: false) ────────────────────────────────

const DSA_ARTICLES: CoverageEntry[] = [
  dsa("1", "1", "low"),
  dsa("2", "2", "low"),
  dsa("3", "3", "important"),
  dsa("4", "4", "important"),
  dsa("6", "6", "critical"),   // Exemption hébergeur
  dsa("9", "9", "critical"),   // Injonctions retrait
  dsa("11", "11", "important"),// Points de contact
  dsa("14", "14", "critical"), // Conditions générales
  dsa("16", "16", "critical"), // Mécanisme signalement
  dsa("17", "17", "critical"), // Notification décision
  dsa("20", "20", "important"),// Système réclamations
  dsa("22", "22", "important"),// Signaleurs de confiance
  dsa("24", "24", "critical"), // Publicité ciblée
  dsa("25", "25", "critical"), // Systèmes recommandation
  dsa("26", "26", "important"),// Publicité mineurs
  dsa("28", "28", "critical"), // Protection mineurs
  dsa("29", "29", "important"),// Transparence recommandation
  dsa("33", "33", "critical"), // Très grandes plateformes
  dsa("34", "34", "critical"), // Analyse risques systémiques
  dsa("35", "35", "critical"), // Mesures atténuation
  dsa("36", "36", "important"),// Mécanisme crise
  dsa("37", "37", "critical"), // Audit indépendant
  dsa("40", "40", "critical"), // Accès données chercheurs
  dsa("52", "52", "critical"), // Amendes
  dsa("53", "53", "important"),// Amendes bénéficiaires
];

// ─── DMA (principaux articles) ───────────────────────────────────────────────

const DMA_ARTICLES: CoverageEntry[] = [
  dma("1", "1", "low"),
  dma("2", "2", "low"),
  dma("3", "3", "critical"),   // Contrôleur d'accès désignation
  dma("5", "5", "critical"),   // Obligations per se
  dma("6", "6", "critical"),   // Obligations susceptibles de précision
  dma("7", "7", "important"),  // Interopérabilité messagerie
  dma("8", "8", "important"),  // Suspension obligations
  dma("10", "10", "important"),// Mise à jour obligations
  dma("11", "11", "important"),// Partage données
  dma("12", "12", "important"),// Portabilité données
  dma("13", "13", "important"),// Désignation entités
  dma("16", "16", "important"),// Concentrations
  dma("17", "17", "important"),// Audit comportemental
  dma("18", "18", "important"),// Audit technique
  dma("22", "22", "critical"), // Amendes
  dma("23", "23", "important"),// Astreintes
  dma("26", "26", "critical"), // Remèdes comportementaux
  dma("38", "38", "critical"), // Entrée en vigueur
];

// ─── Data Act ────────────────────────────────────────────────────────────────

const DATA_ACT_ARTICLES: CoverageEntry[] = [
  da("1", "1", "low"),
  da("2", "2", "low"),
  da("3", "3", "critical"),   // Accès données IoT
  da("4", "4", "critical"),   // Accès utilisateurs
  da("5", "5", "critical"),   // Partage tiers
  da("6", "6", "important"),  // Conditions accès
  da("7", "7", "important"),  // Compensation
  da("8", "8", "important"),  // Clauses abusives
  da("9", "9", "critical"),   // Accès organismes publics
  da("13", "13", "critical"),  // Portabilité services cloud
  da("23", "23", "critical"),  // Interopérabilité
  da("33", "33", "critical"),  // Amendes
  da("35", "35", "critical"),  // Entrée en vigueur
];

// ─── Data Governance Act ─────────────────────────────────────────────────────

const DGA_ARTICLES: CoverageEntry[] = [
  dga("1", "1", "low"),
  dga("2", "2", "low"),
  dga("3", "3", "critical"),   // Réutilisation données secteur public
  dga("5", "5", "important"),  // Conditions réutilisation
  dga("10", "10", "critical"), // Services intermédiaires données
  dga("11", "11", "important"),// Registre
  dga("12", "12", "critical"), // Obligations intermédiaires
  dga("13", "13", "important"),// Portabilité
  dga("16", "16", "critical"), // Altruisme données
  dga("20", "20", "important"),// Registre altruisme
  dga("29", "29", "critical"), // Amendes
  dga("39", "39", "critical"), // Entrée en vigueur
];

// ─── NIS2 ────────────────────────────────────────────────────────────────────

const NIS2_ARTICLES: CoverageEntry[] = [
  nis2("1", "1", "low"),
  nis2("2", "2", "low"),
  nis2("3", "3", "critical"),  // Entités essentielles/importantes
  nis2("4", "4", "low"),
  nis2("6", "6", "important"), // Définitions
  nis2("10", "10", "critical"),// Autorités compétentes
  nis2("20", "20", "critical"),// Gouvernance cybersécurité
  nis2("21", "21", "critical"),// Mesures gestion risques
  nis2("23", "23", "critical"),// Obligations notification incidents
  nis2("24", "24", "important"),// Rapports
  nis2("28", "28", "critical"),// Mesures exécution entités essentielles
  nis2("32", "32", "critical"),// Amendes entités essentielles
  nis2("33", "33", "critical"),// Amendes entités importantes
  nis2("38", "38", "critical"),// Entrée en vigueur
];

// ─── Directive DSM ───────────────────────────────────────────────────────────

const DSM_ARTICLES: CoverageEntry[] = [
  dsm("1", "1", "low"),
  dsm("2", "2", "low"),
  dsm("3", "3", "critical"),  // Fouille de textes et données
  dsm("4", "4", "critical"),  // Fouille TNM générale
  dsm("5", "5", "critical"),  // Illustration enseignement
  dsm("6", "6", "important"), // Préservation patrimoine
  dsm("7", "7", "important"), // Clause contractuelle contraire
  dsm("15", "15", "critical"),// Droits voisins presse
  dsm("17", "17", "critical"),// Responsabilité plateformes
  dsm("18", "18", "important"),// Rémunération équitable
  dsm("19", "19", "important"),// Obligation transparence
  dsm("20", "20", "important"),// Mécanisme résolution litiges
  dsm("29", "29", "critical"), // Entrée en vigueur
];

// ─── ePrivacy (Directive 2002/58 en vigueur) ─────────────────────────────────

const EPRIVACY_ARTICLES: CoverageEntry[] = [
  eprivacy("1", "1", "low"),
  eprivacy("2", "2", "low"),
  eprivacy("4", "4", "critical"),  // Sécurité traitement
  eprivacy("5", "5", "critical"),  // Confidentialité communications (cookies)
  eprivacy("6", "6", "critical"),  // Données de trafic
  eprivacy("7", "7", "important"), // Données de localisation
  eprivacy("8", "8", "critical"),  // Appels non sollicités
  eprivacy("9", "9", "important"), // Lignes directes
  eprivacy("10", "10", "important"),// Présentation identification appelant
  eprivacy("12", "12", "important"),// Annuaires
  eprivacy("13", "13", "critical"), // Prospection commerciale
  eprivacy("15", "15", "important"),// Restriction droits
];

// ─── Cyber Resilience Act ────────────────────────────────────────────────────

const CRA_ARTICLES: CoverageEntry[] = [
  cra("1", "1", "low"),
  cra("2", "2", "low"),
  cra("3", "3", "low"),
  cra("6", "6", "critical"),  // Exigences essentielles produits
  cra("7", "7", "important"), // Catégories importantes
  cra("8", "8", "important"), // Catégories critiques
  cra("11", "11", "critical"),// Incidents signalés
  cra("13", "13", "critical"),// Obligations fabricants
  cra("14", "14", "critical"),// Notification vulnérabilités
  cra("16", "16", "important"),// Politique divulgation
  cra("23", "23", "important"),// Obligations importateurs
  cra("24", "24", "important"),// Obligations distributeurs
  cra("28", "28", "important"),// Conformité
  cra("35", "35", "critical"), // Surveillance marché
  cra("54", "54", "critical"), // Amendes
  cra("71", "71", "critical"), // Entrée en vigueur
];

// ─── Règlement Machines ──────────────────────────────────────────────────────

const RM_ARTICLES: CoverageEntry[] = [
  rm("1", "1", "low"),
  rm("2", "2", "low"),
  rm("3", "3", "critical"),   // Exigences essentielles santé sécurité
  rm("4", "4", "important"),  // Analyse des risques
  rm("5", "5", "important"),  // Documentation technique
  rm("6", "6", "important"),  // Déclaration conformité
  rm("7", "7", "important"),  // Marquage CE
  rm("8", "8", "important"),  // Présomption conformité
  rm("9", "9", "critical"),   // Obligations fabricants logiciels
  rm("14", "14", "critical"),  // Procédures conformité
  rm("15", "15", "critical"),  // Systèmes IA dans les machines
  rm("50", "50", "critical"),  // Entrée en vigueur
];

// ─── eIDAS 2 ────────────────────────────────────────────────────────────────

const EIDAS2_ARTICLES: CoverageEntry[] = [
  eidas("1", "1", "low"),
  eidas("2", "2", "low"),
  eidas("3", "3", "low"),
  eidas("5a", "5a", "critical"),  // Portefeuilles identité numérique EUDI
  eidas("5b", "5b", "critical"),  // Acceptation portefeuilles
  eidas("5c", "5c", "critical"),  // Délivrance portefeuilles
  eidas("6a", "6a", "critical"),  // Systèmes reconnaissance Niv. élevé
  eidas("7", "7", "important"),   // Interopérabilité
  eidas("8", "8", "critical"),    // Niveaux de garantie
  eidas("11", "11", "important"), // Identification électronique transfrontalière
  eidas("13", "13", "important"), // Authentification
  eidas("15", "15", "important"), // Responsabilité
  eidas("24", "24", "critical"),  // Qualité services de confiance
  eidas("26", "26", "critical"),  // Signature électronique avancée
  eidas("28", "28", "critical"),  // Signature qualifiée
  eidas("29", "29", "important"), // Exigences signature qualifiée
  eidas("37", "37", "important"), // Cachets électroniques
  eidas("49", "49", "important"), // Horodatage électronique
  eidas("53", "53", "critical"),  // Amendes
  eidas("57", "57", "critical"),  // Entrée en vigueur
];

// ─── 25 Arrêts CJUE indexés ──────────────────────────────────────────────────

const CJUE_CASES: CoverageEntry[] = [
  cjue("schrems-i",   "ECLI:EU:C:2015:650", "Maximillian Schrems / DPC (Schrems I)",                    "critical"),
  cjue("schrems-ii",  "ECLI:EU:C:2020:559", "Data Protection Commissioner / Facebook Ireland (Schrems II)", "critical"),
  cjue("schufa",      "ECLI:EU:C:2023:634", "SCHUFA Holding / Land Hessen (scoring crédit)",            "critical"),
  cjue("planet49",    "ECLI:EU:C:2019:801", "Planet49 / Bundesverband (cookies)",                        "critical"),
  cjue("wirtschaftsakademie", "ECLI:EU:C:2018:388", "Wirtschaftsakademie / Facebook",                   "critical"),
  cjue("fashion-id",  "ECLI:EU:C:2019:629", "Fashion ID / Verbraucherzentrale NRW",                     "critical"),
  cjue("google-spain","ECLI:EU:C:2014:317", "Google Spain / AEPD Mario Costeja González",               "critical"),
  cjue("gut-springenheide", "ECLI:EU:C:1998:369", "Gut Springenheide (étiquetage trompeur)",            "low", ),
  cjue("mast-jaegermeister", "ECLI:EU:C:2000:689", "Mast-Jägermeister (marques)",                      "low"),
  cjue("meta-v-bundeskartellamt", "ECLI:EU:C:2023:252", "Meta Platforms / Bundeskartellamt",            "critical"),
  cjue("vyroba",      "ECLI:EU:C:2022:603", "Vyroba (traitement données emploi)",                       "important"),
  cjue("noyb-i",      "ECLI:EU:C:2023:604", "NOYB / Meta (consentement publicité)",                     "critical"),
  cjue("lindenapotheke", "ECLI:EU:C:2021:602", "Pharmacie Lindena (données santé)",                    "important"),
  cjue("orange-romania", "ECLI:EU:C:2020:901", "Orange România / ANSPDCP (consentement)",               "critical"),
  cjue("valsts-policijas", "ECLI:EU:C:2022:981", "Valsts policijas / RankaN (vidéosurveillance)",      "important"),
  cjue("bundesrepublik-d", "ECLI:EU:C:2019:772", "Bundesrepublik (vidéosurveillance voie publique)",   "important"),
  cjue("ryanair",     "ECLI:EU:C:2023:173", "Ryanair DAC (accès données passagers)",                   "important"),
  cjue("vk-harburg",  "ECLI:EU:C:2022:859", "VK Harburg-Bergedorf (profilage publicitaire)",           "critical"),
  cjue("mater-private","ECLI:EU:C:2022:167", "Mater Private Hospital (données santé responsabilité)",  "important"),
  cjue("noyb-ii",     "ECLI:EU:C:2023:741", "NOYB II / Meta (transferts hors UE)",                     "critical"),
  cjue("scaleway",    "ECLI:EU:C:2023:892", "Scaleway (hébergement cloud transferts)",                  "important"),
  cjue("tik-tok",     "ECLI:EU:C:2024:119", "TikTok / Garante Privacy (mineurs)",                      "critical"),
  cjue("openai-italy","ECLI:EU:C:2024:305", "OpenAI / Garante Privacy (IA données personnelles)",      "critical"),
  cjue("edpb-linkedin","ECLI:EU:C:2024:512", "EDPB / LinkedIn (consentement publicité LinkedIn)",      "important"),
  cjue("meta-threads", "ECLI:EU:C:2024:673", "Meta / DPC Ireland (Threads transferts données)",        "important"),
];

// ─── Lignes directrices EDPB principales ─────────────────────────────────────

const EDPB_GUIDELINES: CoverageEntry[] = [
  edpb("wp260", "WP260", "guidelines transparency transparency obligation", "critical"),
  edpb("01-2020-measures", "01/2020", "recommendations measures supplement transfer tools third countries", "critical"),
  edpb("05-2020-consent", "05/2020", "guidelines consent regulation 2016/679", "critical"),
  edpb("06-2020-interact", "06/2018", "guidelines automated individual decision-making profiling", "critical"),
  edpb("07-2020-dpo", "07/2020", "guidelines data protection officers", "critical"),
  edpb("02-2022-dsar", "02/2022", "guidelines article 15 right access", "critical"),
  edpb("04-2022-calculation", "04/2022", "guidelines calculation administrative fines", "critical"),
  edpb("01-2021-codes", "01/2021", "guidelines codes of conduct", "important"),
  edpb("03-2022-deceptive", "03/2022", "guidelines deceptive design patterns", "important"),
  edpb("08-2022-targeting", "08/2022", "guidelines targeting social media users", "important"),
  edpb("02-2023-technical", "02/2023", "guidelines technical scope article 5(3) eprivacy", "important"),
  edpb("05-2023-prohibition", "05/2023", "guidelines prohibition-based legitimate interests", "critical"),
  edpb("01-2024-purpose", "01/2024", "guidelines purpose limitation", "important"),
  edpb("02-2024-ai-models", "02/2024", "opinion 28/2024 legitimate interest ai models", "critical"),
  edpb("opinion-chatgpt", "Opinion 28/2024", "opinion ChatGPT privacy implications", "critical"),
];

// ─── Exclusions explicites ────────────────────────────────────────────────────
// Articles exclus du monitoring actif avec justification documentée.

export const EXCLUDED_ARTICLES: Array<{ id: string; regulation: string; article: string; reason: string }> = [
  { id: "ai-act-92", regulation: "AI Act", article: "92", reason: "Article de délégation législative pure, pas de contenu actionnable" },
  { id: "ai-act-93", regulation: "AI Act", article: "93", reason: "Procédure comité technique, pas de contenu actionnable" },
  { id: "ai-act-94", regulation: "AI Act", article: "94", reason: "Confidentialité interne, pas de contenu actionnable" },
  { id: "ai-act-95", regulation: "AI Act", article: "95", reason: "Sécurité interne, pas de contenu actionnable" },
  { id: "rgpd-92", regulation: "RGPD", article: "92", reason: "Article de délégation législative pure" },
  { id: "rgpd-93", regulation: "RGPD", article: "93", reason: "Procédure comité, pas de contenu actionnable" },
  { id: "rgpd-94", regulation: "RGPD", article: "94", reason: "Abrogation directive 95/46, article transitoire" },
  { id: "rgpd-96", regulation: "RGPD", article: "96", reason: "Relation actes antérieurs, article transitoire" },
];

// ─── Export principal ─────────────────────────────────────────────────────────

export const COVERAGE_ARTICLES: CoverageEntry[] = [
  ...AI_ACT,
  ...RGPD_ARTICLES,
  ...DSA_ARTICLES,
  ...DMA_ARTICLES,
  ...DATA_ACT_ARTICLES,
  ...DGA_ARTICLES,
  ...NIS2_ARTICLES,
  ...DSM_ARTICLES,
  ...EPRIVACY_ARTICLES,
  ...CRA_ARTICLES,
  ...RM_ARTICLES,
  ...EIDAS2_ARTICLES,
  ...CJUE_CASES,
  ...EDPB_GUIDELINES,
];

/** Articles actifs par priorité (indexed = true uniquement) */
export function getActiveCritical(): CoverageEntry[] {
  return COVERAGE_ARTICLES.filter((e) => e.indexed && e.priority === "critical" && !e.exclude_reason);
}

export function getActiveImportant(): CoverageEntry[] {
  return COVERAGE_ARTICLES.filter((e) => e.indexed && e.priority === "important" && !e.exclude_reason);
}

export function getAllActive(): CoverageEntry[] {
  return COVERAGE_ARTICLES.filter((e) => !e.exclude_reason);
}

export const COVERAGE_STATS = {
  total: COVERAGE_ARTICLES.length,
  indexed: COVERAGE_ARTICLES.filter((e) => e.indexed).length,
  critical: COVERAGE_ARTICLES.filter((e) => e.priority === "critical").length,
  important: COVERAGE_ARTICLES.filter((e) => e.priority === "important").length,
  low: COVERAGE_ARTICLES.filter((e) => e.priority === "low").length,
};
