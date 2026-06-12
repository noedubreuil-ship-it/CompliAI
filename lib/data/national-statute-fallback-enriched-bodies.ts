/**
 * Corps enrichis pour les synthèses nationales (secours RAG).
 * Les versions « deep » (multi-articles) priment lorsqu'elles existent.
 */

import { NATIONAL_STATUTE_FALLBACK_DEEP_BODIES } from "./national-statute-fallback-deep";

export const NATIONAL_STATUTE_FALLBACK_ENRICHED_BODIES: Record<string, string> = {
  DK: `La loi danoise sur la protection des données (Databeskyttelsesloven, LOV nr 502 af 23/05/2018) transpose le RGPD au Danemark sous contrôle du Datatilsynet.

Qualification SaaS B2B : l'éditeur agit en sous-traitant lorsque le client entreprise détermine finalités et moyens essentiels ; contrat art. 28 obligatoire (instructions, sécurité, sous-traitance ultérieure, audits).

Principes RGPD : licéité, transparence, minimisation, limitation conservation, sécurité. Bases légales art. 6. Droits des personnes : accès, rectification, effacement, limitation, opposition, portabilité — délai un mois.

Obligations sous-traitant : registre art. 30 § 2 ; notification violation au responsable ; DPIA si risque élevé ; DPO si critères art. 37.

Emploi et vidéosurveillance : doctrine Datatilsynet stricte sur proportionnalité. Cookies et marketing : consentement préalable.

Transferts hors EEE : SCC, adéquation, analyse Schrems II. Sanctions alignées art. 83 RGPD.

Source officielle : Retsinformation.dk. Synthèse CompliAI.`,

  EE: `L'Isikuandmete kaitse seadus (IKS, RT I 04.01.2019, 11) transpose le RGPD ; contrôle par l'AKI (Andmekaitse Inspektsioon).

SaaS B2B : sous-traitant par défaut si le client fixe les finalités (e-administration, CRM, RH). Contrats art. 28, registre, sécurité proportionnée.

Administration numérique estonienne (X-Road) : journalisation des accès inter-institutionnels, minimisation, séparation des rôles.

Droits des personnes, DPIA pour grands registres et biométrie, notification violations à l'AKI. Transferts US/cloud documentés post-Schrems II.

Sanctions AKI selon RGPD. Texte officiel : Riigi Teataja. Synthèse CompliAI.`,

  GR: `La loi 4624/2019 organise la HDPA et transpose le RGPD en droit grec.

Sous-traitant SaaS : obligations art. 28 (DPA, TOM, notification violation, assistance droits). Responsable propre pour facturation et marketing de l'éditeur.

Santé, employeurs, vidéosurveillance : contrôles HDPA fréquents. Registre RoPA, DPIA, DPO si requis.

Transferts internationaux chapitre V RGPD. Sanctions administratives et pénales.

Sources : e-nomothesia.gr, journal officiel grec. Synthèse CompliAI.`,

  HU: `La loi CXII/2011 (Info Act), amendée RGPD, encadre la protection des données sous contrôle de la NAIH.

SaaS B2B : qualification sous-traitant ; contrat avec instructions documentées ; sécurité art. 32.

Employeurs : caméras, pointage, fichiers RH — proportionnalité. Marketing et cookies : consentement explicite.

Registre, DPIA profilage/données sensibles, transferts hors EEE documentés. Sanctions NAIH.

Source : NJT.hu. Synthèse CompliAI.`,

  LT: `La loi lituanienne d'exécution du RGPD (BDAR, TAR 2018-06-30, Nr. 10932) complète le règlement ; VDAI contrôle.

Sous-traitant cloud/SaaS : art. 28, registre catégories de traitements, notification violations.

Dispositions nationales : âge du consentement, secteur public, vidéosurveillance. Cookies et IA : recommandations VDAI.

Transferts : SCC + analyse pays tiers. Sanctions alignées RGPD. Source : e-TAR. Synthèse CompliAI.`,

  LU: `Au Luxembourg, le RGPD s'applique directement, complété par la loi du 1er août 2018 (CNPD, Mémorial A n°724).

Hub financier : responsables et sous-traitants soumis à CNPD + exigences sectorielles CSSF si applicable.

SaaS B2B : DPA art. 28, registre, DPIA, DPO, notification violations. Information multilingue (FR/DE/LU).

Transferts Schrems II documentés. Sanctions CNPD plafonds RGPD. Sources : legilux.public.lu, cnpd.public.lu. Synthèse CompliAI.`,

  PT: `La Lei n.º 58/2019 du 8 août 2019 exécute le RGPD ; CNPD est l'autorité.

Art. 28 emploi : vidéosurveillance, biométrie employés, géolocalisation véhicules — proportionnalité. Art. 19 vidéosurveillance : finalité sécurité, information, conservation 30 jours, zones interdites (vestiaires).

SaaS B2B sous-traitant : registre, DPA, sécurité, notification 72 h. Marketing électronique : consentement préalable.

Transferts internationaux, sanctions (ex. Uber chauffeurs). Source : dre.pt. Synthèse CompliAI en complément du texte officiel indexé.`,

  RO: `La loi n° 190/2018 met en œuvre le RGPD ; ANSPDCP supervise.

Sous-traitants et cloud : contrats art. 28, registre, DPIA. Secteur public, vidéosurveillance, marketing encadrés nationalement.

Banques, télécoms, e-commerce : contrôles fréquents. Transferts hors UE post-Schrems II.

Qualification SaaS B2B : sous-traitant si le client fixe les finalités ; notification violation au responsable ; registre des catégories de traitements.

Texte officiel legislatie.just.ro (souvent JS) — synthèse CompliAI jusqu'à indexation complète du fac-similé roumain.`,

  SI: `Le ZVOP-2 (2022) remplace ZVOP-1 ; aligné RGPD ; autorité IP (Informacijski pooblaščenec).

Sous-traitant SaaS : instructions documentées, sécurité art. 32, sous-traitance ultérieure avec autorisation. e-Santé, emploi, vidéosurveillance municipale : vigilance proportionnalité.

Registre RoPA, DPIA risques élevés, DPO si critères art. 37, notification violations sous 72 h. Transferts chapitre V RGPD avec SCC.

Sanctions administratives IP. Source PISRS (pisrs.si). Synthèse CompliAI — texte slovène officiel prévaut.`,

  LV: `La Lettonie transpose le RGPD via sa loi sur la protection des données (consultable sur Likumi.lv) ; contrôle par la DVI (Datu valsts inspekcija).

SaaS B2B : sous-traitant si le client détermine les finalités ; contrat art. 28, registre, sécurité, notification violation au responsable.

Droits des personnes, DPIA, DPO si requis, transferts hors EEE avec SCC. Sanctions DVI selon RGPD.

Source officielle : Likumi.lv. Synthèse CompliAI lorsque le fetch automatique échoue (URL déplacée ou anti-bot).`,

  MT: `Malte transpose le RGPD via le Data Protection Act (Cap. 586) et le règlement délégué ; contrôle par l'IDPC (Information and Data Protection Commissioner).

Obligations responsable et sous-traitant : registre, DPA, sécurité art. 32, notification violations. Hub financier et iGaming : vigilance transferts et sous-traitants US.

SaaS B2B : qualification sous-traitant standard. Droits des personnes, DPIA si risque élevé.

Source : legislation.mt. Synthèse CompliAI — le site peut exiger JavaScript pour le texte intégral.`,

  PL: `La loi polonaise du 10 mai 2018 (Ustawa o ochronie danych osobowych) transpose le RGPD ; UODO contrôle.

Sous-traitant SaaS : art. 28, registre catégories de traitements, assistance droits, notification violation. Sanctions UODO significatives (secteur public et entreprises).

Marketing, cookies, profilage : consentement. Transferts hors EEE documentés. ISAP/Sejm peut bloquer les robots — synthèse CompliAI en secours.

Source officielle : isap.sejm.gov.pl. Texte polonais authentique prévaut pour citation.`,

  SK: `La loi n° 18/2018 Z. z. transpose le RGPD ; ÚOOÚ (Úrad na ochranu osobných údajov SR) contrôle.

SaaS B2B : qualification sous-traitant par défaut ; DPA art. 28 § 3 ; registre art. 30 § 2 pour catégories de traitements clients.

Secteur public, recherche, santé, emploi : dispositions nationales complémentaires. Marketing, cookies, profilage : consentement et information claire.

Transferts hors EEE : SCC et analyse pays tiers post-Schrems II. Sanctions ÚOOÚ alignées art. 83 RGPD. Source Slov-Lex.sk. Synthèse CompliAI.`,
};

export function applyEnrichedFallbackBodies<
  T extends { country_code: string; body: string },
>(seeds: T[]): T[] {
  return seeds.map((seed) => {
    const deep = NATIONAL_STATUTE_FALLBACK_DEEP_BODIES[seed.country_code];
    if (deep) return { ...seed, body: deep };
    const enriched = NATIONAL_STATUTE_FALLBACK_ENRICHED_BODIES[seed.country_code];
    if (!enriched) return seed;
    return { ...seed, body: enriched };
  });
}
