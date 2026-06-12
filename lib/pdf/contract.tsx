import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

const C = {
  navy: "#0f172a", dark: "#334155", mid: "#64748b", light: "#e2e8f0",
  pale: "#f8fafc", white: "#ffffff",
  green: "#15803d", greenBg: "#f0fdf4",
  red: "#b91c1c", redBg: "#fef2f2",
  orange: "#c2410c", orangeBg: "#fff7ed",
  amber: "#b45309", amberBg: "#fffbeb",
  blue: "#1d4ed8", blueBg: "#eff6ff",
};

const SEVERITY_BG: Record<string, string> = { critical: C.redBg, high: C.orangeBg, medium: C.amberBg, low: C.blueBg };
const SEVERITY_COLOR: Record<string, string> = { critical: C.red, high: C.orange, medium: C.amber, low: C.blue };
const SEVERITY_LABEL: Record<string, string> = { critical: "CRITIQUE", high: "ÉLEVÉ", medium: "MODÉRÉ", low: "FAIBLE" };

const TYPE_COLOR: Record<string, string> = { compliant: C.green, risk: C.orange, missing: C.red, recommendation: C.blue };
const TYPE_LABEL: Record<string, string> = { compliant: "Conforme", risk: "Risque", missing: "Manquant", recommendation: "Recommandation" };

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: C.navy, paddingTop: 40, paddingBottom: 60, paddingHorizontal: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: C.navy },
  logo: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  logoSub: { fontSize: 8, color: C.mid, marginTop: 2 },
  docType: { fontSize: 9, color: C.dark },
  dateText: { fontSize: 8, color: C.mid, marginTop: 2 },
  titleBox: { backgroundColor: C.navy, borderRadius: 6, padding: 16, marginBottom: 16 },
  titleText: { fontSize: 15, fontFamily: "Helvetica-Bold", color: C.white, marginBottom: 4 },
  titleSub: { fontSize: 9, color: "#94a3b8" },
  scoreRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  scoreCard: { flex: 1, borderRadius: 4, padding: 10, borderWidth: 1 },
  scoreLabel: { fontSize: 8, color: C.mid },
  scoreValue: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 2 },
  summaryBox: { backgroundColor: C.pale, borderRadius: 4, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: C.light },
  summaryText: { fontSize: 9, color: C.dark, lineHeight: 1.6 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.navy, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.light },
  finding: { borderRadius: 4, padding: 10, marginBottom: 8, borderWidth: 1 },
  findingHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  findingTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", flex: 1 },
  badge: { borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.white },
  findingMeta: { flexDirection: "row", gap: 8, marginBottom: 4 },
  metaChip: { borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  metaText: { fontSize: 7 },
  findingDesc: { fontSize: 9, color: C.dark, lineHeight: 1.5 },
  findingRef: { fontSize: 8, color: C.mid, marginTop: 3 },
  listItem: { flexDirection: "row", gap: 6, marginBottom: 5 },
  bullet: { fontSize: 9, color: C.red, width: 10 },
  listText: { flex: 1, fontSize: 9, color: C.dark, lineHeight: 1.5 },
  gridHint: { fontSize: 7, color: C.mid, marginBottom: 6 },
  gapBlock: { marginBottom: 10, padding: 8, borderRadius: 4, borderWidth: 1, borderColor: C.red, backgroundColor: C.redBg },
  gapTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.red, marginBottom: 4 },
  gapBody: { fontSize: 8, color: C.dark, lineHeight: 1.45, marginBottom: 3 },
  clauseLine: { fontSize: 7, color: C.dark, lineHeight: 1.35, marginBottom: 2 },
  disclaimer: { position: "absolute", bottom: 30, left: 50, right: 50, fontSize: 7, color: C.mid, lineHeight: 1.4, borderTopWidth: 1, borderTopColor: C.light, paddingTop: 8 },
  pageNumber: { position: "absolute", bottom: 18, right: 50, fontSize: 8, color: C.mid },
});

interface ClauseGridRow {
  id: string;
  title?: string;
  status?: string;
  location?: string;
  evaluation?: string;
}

interface CriticalGap {
  title?: string;
  legal_basis?: string;
  finding?: string;
  risk?: string;
  clause_to_negotiate?: string;
}

interface ModeratePoint {
  title?: string;
  legal_basis?: string;
  finding?: string;
  recommendation?: string;
}

interface SanctionRef {
  foundation?: string;
  max_sanction?: string;
  probability_H_M_L?: string;
}

export interface ContractData {
  provider: string;
  risk_score: number;
  overall_assessment: string;
  findings: Array<{
    category: string;
    type: string;
    title: string;
    description: string;
    regulation_ref: string;
    severity: string;
  }>;
  missing_clauses: string[];
  recommended_amendments: string[];
  gdpr_compliant: boolean;
  ai_act_compliant: boolean;
  /** Analyse contrat tiers CompliAI (Art. 28 + AI Act) — champs optionnels */
  score_rgpd_art28?: number;
  score_ai_act?: number;
  risk_level_global?: string;
  gdpr_art28_clauses?: ClauseGridRow[];
  ai_act_deployer_clauses?: ClauseGridRow[];
  critical_gaps?: CriticalGap[];
  moderate_attention_points?: ModeratePoint[];
  action_plan?: { immediate?: string[]; short_term_30_90_days?: string[]; at_next_renewal?: string[] };
  sanctions_reference?: SanctionRef[];
  professional_disclaimer?: string;
  sector_notes?: string;
}

function gridStatusFr(status: string | undefined): string {
  const z = (status || "").toLowerCase();
  if (z === "present") return "Prés.";
  if (z === "partial") return "Part.";
  if (z === "absent") return "Abs.";
  if (z === "na" || z === "n/a") return "n/a";
  return status || "—";
}

function ContractPDF({ data }: { data: ContractData }) {
  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const scoreNum =
    typeof data.risk_score === "number" && Number.isFinite(data.risk_score) ? data.risk_score : 0;
  const scoreColor = scoreNum >= 70 ? C.green : scoreNum >= 40 ? C.amber : C.red;
  const scoreBg = scoreNum >= 70 ? C.greenBg : scoreNum >= 40 ? C.amberBg : C.redBg;
  const g28 =
    typeof data.score_rgpd_art28 === "number" && Number.isFinite(data.score_rgpd_art28) ?
      Math.round(data.score_rgpd_art28)
    : null;
  const sa =
    typeof data.score_ai_act === "number" && Number.isFinite(data.score_ai_act) ? Math.round(data.score_ai_act)
    : null;
  const rgpdDetailColor = g28 === null ? C.mid : g28 >= 72 ? C.green : C.red;
  const aiDetailColor = sa === null ? C.mid : sa >= 72 ? C.green : C.red;

  const hasPlanPage =
    (data.missing_clauses?.length ?? 0) > 0 ||
    (data.recommended_amendments?.length ?? 0) > 0 ||
    (data.action_plan?.immediate?.length ?? 0) > 0 ||
    (data.action_plan?.short_term_30_90_days?.length ?? 0) > 0 ||
    (data.action_plan?.at_next_renewal?.length ?? 0) > 0;

  return (
    <Document title={`Analyse contrat — ${data.provider}`} author="CompliAI">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View><Text style={s.logo}>CompliAI</Text><Text style={s.logoSub}>Conformité réglementaire IA · compliai.eu</Text></View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docType}>ANALYSE CONTRAT — CONFIDENTIEL</Text>
            <Text style={s.dateText}>Généré le {now}</Text>
          </View>
        </View>

        <View style={s.titleBox}>
          <Text style={s.titleText}>Analyse de conformité — {data.provider}</Text>
          <Text style={s.titleSub}>Art. 28 RGPD (sous-traitance) · AI Act UE 2024/1689 (déployeur / chaîne) · analyse IA</Text>
        </View>

        <View style={s.scoreRow}>
          <View style={[s.scoreCard, { backgroundColor: scoreBg, borderColor: scoreColor }]}>
            <Text style={s.scoreLabel}>Score global</Text>
            <Text style={[s.scoreValue, { color: scoreColor }]}>{scoreNum}/100</Text>
          </View>
          <View style={[s.scoreCard, { backgroundColor: C.pale, borderColor: rgpdDetailColor }]}>
            <Text style={s.scoreLabel}>RGPD Art. 28</Text>
            <Text style={[s.scoreValue, { fontSize: 14, color: rgpdDetailColor }]}>
              {g28 !== null ? `${g28}/100` : "—"}
            </Text>
            <Text style={{ fontSize: 7, color: C.mid, marginTop: 2 }}>
              {data.gdpr_compliant ? "Indicateur favorable" : "Écarts probables"}
            </Text>
          </View>
          <View style={[s.scoreCard, { backgroundColor: C.pale, borderColor: aiDetailColor }]}>
            <Text style={s.scoreLabel}>AI Act (déployeur)</Text>
            <Text style={[s.scoreValue, { fontSize: 14, color: aiDetailColor }]}>
              {sa !== null ? `${sa}/100` : "—"}
            </Text>
            <Text style={{ fontSize: 7, color: C.mid, marginTop: 2 }}>
              {data.ai_act_compliant ? "Indicateur favorable" : "Écarts probables"}
            </Text>
          </View>
        </View>

        {data.risk_level_global ?
          <Text style={s.gridHint}>Niveau de risque (rapport) : {data.risk_level_global}</Text>
        : null}

        <View style={s.summaryBox}>
          <Text style={s.summaryText}>{data.overall_assessment}</Text>
        </View>

        {data.sector_notes ?
          <View style={[s.summaryBox, { marginBottom: 10 }]}>
            <Text style={[s.sectionTitle, { marginBottom: 6, borderBottomWidth: 0 }]}>Secteur / DORA / NIS2</Text>
            <Text style={s.summaryText}>{data.sector_notes}</Text>
          </View>
        : null}

        {data.gdpr_art28_clauses && data.gdpr_art28_clauses.length > 0 ?
          <View style={{ marginBottom: 12 }}>
            <Text style={s.sectionTitle}>Synthèse grille Art. 28 RGPD</Text>
            {data.gdpr_art28_clauses.map((row, i) => (
              <Text key={i} style={s.clauseLine}>
                {row.id}. {gridStatusFr(row.status)} — {(row.title || "").slice(0, 88)}
                {row.location ? ` · ${row.location.slice(0, 40)}` : ""}
              </Text>
            ))}
          </View>
        : null}

        {data.ai_act_deployer_clauses && data.ai_act_deployer_clauses.length > 0 ?
          <View style={{ marginBottom: 12 }}>
            <Text style={s.sectionTitle}>Synthèse grille AI Act (déployeur)</Text>
            {data.ai_act_deployer_clauses.map((row, i) => (
              <Text key={i} style={s.clauseLine}>
                {(row.id || "").toString()}. {gridStatusFr(row.status)} — {(row.title || "").slice(0, 88)}
                {row.location ? ` · ${row.location.slice(0, 40)}` : ""}
              </Text>
            ))}
          </View>
        : null}

        <Text style={s.sectionTitle}>Points d&apos;analyse ({data.findings?.length ?? 0})</Text>
        {data.findings?.slice(0, 8).map((f, i) => (
          <View key={i} style={[s.finding, { backgroundColor: SEVERITY_BG[f.severity] ?? C.pale, borderColor: SEVERITY_COLOR[f.severity] ?? C.light }]}>
            <View style={s.findingHeader}>
              <Text style={s.findingTitle}>{f.title}</Text>
              <View style={[s.badge, { backgroundColor: SEVERITY_COLOR[f.severity] ?? C.mid }]}>
                <Text style={s.badgeText}>{SEVERITY_LABEL[f.severity] ?? f.severity}</Text>
              </View>
            </View>
            <View style={s.findingMeta}>
              <View style={[s.metaChip, { backgroundColor: TYPE_COLOR[f.type] + "20" }]}>
                <Text style={[s.metaText, { color: TYPE_COLOR[f.type] ?? C.mid }]}>{TYPE_LABEL[f.type] ?? f.type}</Text>
              </View>
              <Text style={[s.metaText, { color: C.mid }]}>{f.category}</Text>
            </View>
            <Text style={s.findingDesc}>{f.description}</Text>
            {f.regulation_ref && <Text style={s.findingRef}>Réf. : {f.regulation_ref}</Text>}
          </View>
        ))}

        <Text style={s.disclaimer}>
          {data.professional_disclaimer ? `${data.professional_disclaimer}\n\n` : ""}
          Analyse générée par CompliAI. Ne constitue pas un avis juridique. Faites valider par un avocat ou un DPO avant engagement contractuel.
          Fournisseur : {data.provider} — {now}
        </Text>
        <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {(data.critical_gaps ?? []).length > 0 ?
        (
          <Page size="A4" style={s.page}>
            <View style={s.header}>
              <Text style={s.logo}>CompliAI</Text>
              <Text style={s.docType}>LACUNES CRITIQUES — {data.provider.toUpperCase()}</Text>
            </View>
            {data.critical_gaps!.map((g, i) => (
              <View key={i} style={s.gapBlock} wrap={false}>
                <Text style={s.gapTitle}>{g.title || `Lacune prioritaire ${i + 1}`}</Text>
                {g.legal_basis ? <Text style={s.gapBody}>Fondement : {g.legal_basis}</Text> : null}
                {g.finding ? <Text style={s.gapBody}>Constat : {g.finding}</Text> : null}
                {g.risk ? <Text style={s.gapBody}>Risque : {g.risk}</Text> : null}
                {g.clause_to_negotiate ?
                  <Text style={s.gapBody}>Clause type / négociation : {g.clause_to_negotiate}</Text>
                : null}
              </View>
            ))}
            <Text style={s.disclaimer}>CompliAI · {data.provider} — {now}</Text>
            <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
          </Page>
        )
      : null}

      {(data.sanctions_reference ?? []).length > 0 ?
        (
          <Page size="A4" style={s.page}>
            <View style={s.header}>
              <Text style={s.logo}>CompliAI</Text>
              <Text style={s.docType}>SANCTIONS — PLAFONDS THÉORIQUES MAXIMAUX</Text>
            </View>
            <Text style={s.gridHint}>
              Rappel de plafonds légaux théoriques ; aucun lien automatique avec les faits analysés ou la probabilité d&apos;un contrôle.
            </Text>
            {data.sanctions_reference!.map((r, i) => (
              <View key={i} style={[s.summaryBox, { marginBottom: 8 }]}>
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 4 }}>{r.foundation}</Text>
                <Text style={s.summaryText}>{r.max_sanction}</Text>
                <Text style={s.gridHint}>Fourchette probabilité (qualitative rapport) : {r.probability_H_M_L || "—"}</Text>
              </View>
            ))}
            <Text style={s.disclaimer}>CompliAI — {now}</Text>
            <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
          </Page>
        )
      : null}

      {hasPlanPage ?
        (
          <Page size="A4" style={s.page}>
            <View style={s.header}>
              <Text style={s.logo}>CompliAI</Text>
              <Text style={s.docType}>PLAN CLAUSES & ACTIONS — {data.provider.toUpperCase()}</Text>
            </View>

            {data.action_plan?.immediate && data.action_plan.immediate.length > 0 ?
              (
                <View style={{ marginBottom: 14 }}>
                  <Text style={s.sectionTitle}>Immédiat</Text>
                  {data.action_plan.immediate.map((line, i) => (
                    <View key={i} style={s.listItem}>
                      <Text style={[s.bullet, { color: C.red }]}>!</Text>
                      <Text style={s.listText}>{line}</Text>
                    </View>
                  ))}
                </View>
              )
            : null}

            {data.action_plan?.short_term_30_90_days && data.action_plan.short_term_30_90_days.length > 0 ?
              (
                <View style={{ marginBottom: 14 }}>
                  <Text style={s.sectionTitle}>Court terme (30–90 jours)</Text>
                  {data.action_plan.short_term_30_90_days.map((line, i) => (
                    <View key={i} style={s.listItem}>
                      <Text style={[s.bullet, { color: C.blue }]}>•</Text>
                      <Text style={s.listText}>{line}</Text>
                    </View>
                  ))}
                </View>
              )
            : null}

            {data.action_plan?.at_next_renewal && data.action_plan.at_next_renewal.length > 0 ?
              (
                <View style={{ marginBottom: 14 }}>
                  <Text style={s.sectionTitle}>Prochain renouvellement</Text>
                  {data.action_plan.at_next_renewal.map((line, i) => (
                    <View key={i} style={s.listItem}>
                      <Text style={[s.bullet, { color: C.amber }]}>↻</Text>
                      <Text style={s.listText}>{line}</Text>
                    </View>
                  ))}
                </View>
              )
            : null}

            {data.missing_clauses?.length ?
              (
                <View style={{ marginBottom: 16 }}>
                  <Text style={s.sectionTitle}>Clauses manquantes (synthèse)</Text>
                  {data.missing_clauses!.map((clause, i) => (
                    <View key={i} style={s.listItem}>
                      <Text style={s.bullet}>✗</Text>
                      <Text style={s.listText}>{clause}</Text>
                    </View>
                  ))}
                </View>
              )
            : null}

            {data.recommended_amendments?.length ?
              (
                <View>
                  <Text style={s.sectionTitle}>Amendements recommandés</Text>
                  {data.recommended_amendments!.map((amend, i) => (
                    <View key={i} style={s.listItem}>
                      <Text style={[s.bullet, { color: C.blue }]}>→</Text>
                      <Text style={s.listText}>{amend}</Text>
                    </View>
                  ))}
                </View>
              )
            : null}

            <Text style={s.disclaimer}>CompliAI — Analyse contrat · {data.provider} — {now}</Text>
            <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
          </Page>
        )
      : null}
    </Document>
  );
}

export async function generateContractPDF(data: ContractData): Promise<Buffer> {
  return (await renderToBuffer(React.createElement(ContractPDF, { data }) as any)) as Buffer;
}
