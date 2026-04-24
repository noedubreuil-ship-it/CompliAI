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
  disclaimer: { position: "absolute", bottom: 30, left: 50, right: 50, fontSize: 7, color: C.mid, lineHeight: 1.4, borderTopWidth: 1, borderTopColor: C.light, paddingTop: 8 },
  pageNumber: { position: "absolute", bottom: 18, right: 50, fontSize: 8, color: C.mid },
});

interface ContractData {
  provider: string;
  risk_score: number;
  overall_assessment: string;
  findings: Array<{ category: string; type: string; title: string; description: string; regulation_ref: string; severity: string }>;
  missing_clauses: string[];
  recommended_amendments: string[];
  gdpr_compliant: boolean;
  ai_act_compliant: boolean;
}

function ContractPDF({ data }: { data: ContractData }) {
  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const scoreColor = data.risk_score >= 70 ? C.green : data.risk_score >= 40 ? C.amber : C.red;
  const scoreBg = data.risk_score >= 70 ? C.greenBg : data.risk_score >= 40 ? C.amberBg : C.redBg;

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
          <Text style={s.titleSub}>AI Act UE 2024/1689 · RGPD UE 2016/679 · Analyse par IA (Claude)</Text>
        </View>

        <View style={s.scoreRow}>
          <View style={[s.scoreCard, { backgroundColor: scoreBg, borderColor: scoreColor }]}>
            <Text style={s.scoreLabel}>Score de conformité</Text>
            <Text style={[s.scoreValue, { color: scoreColor }]}>{data.risk_score}/100</Text>
          </View>
          <View style={[s.scoreCard, { backgroundColor: data.gdpr_compliant ? C.greenBg : C.redBg, borderColor: data.gdpr_compliant ? C.green : C.red }]}>
            <Text style={s.scoreLabel}>RGPD</Text>
            <Text style={[s.scoreValue, { color: data.gdpr_compliant ? C.green : C.red }]}>{data.gdpr_compliant ? "Conforme" : "Non-conforme"}</Text>
          </View>
          <View style={[s.scoreCard, { backgroundColor: data.ai_act_compliant ? C.greenBg : C.redBg, borderColor: data.ai_act_compliant ? C.green : C.red }]}>
            <Text style={s.scoreLabel}>AI Act</Text>
            <Text style={[s.scoreValue, { color: data.ai_act_compliant ? C.green : C.red }]}>{data.ai_act_compliant ? "Conforme" : "Non-conforme"}</Text>
          </View>
        </View>

        <View style={s.summaryBox}>
          <Text style={s.summaryText}>{data.overall_assessment}</Text>
        </View>

        <Text style={s.sectionTitle}>Points d&apos;analyse ({data.findings?.length ?? 0})</Text>
        {data.findings?.map((f, i) => (
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
          Analyse générée par CompliAI. Ne constitue pas un avis juridique. Faites valider par un avocat avant signature. Fournisseur : {data.provider} — {now}
        </Text>
        <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {(data.missing_clauses?.length > 0 || data.recommended_amendments?.length > 0) && (
        <Page size="A4" style={s.page}>
          <View style={s.header}>
            <Text style={s.logo}>CompliAI</Text>
            <Text style={s.docType}>CLAUSES MANQUANTES & AMENDEMENTS — {data.provider.toUpperCase()}</Text>
          </View>

          {data.missing_clauses?.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={s.sectionTitle}>Clauses obligatoires manquantes</Text>
              {data.missing_clauses.map((clause, i) => (
                <View key={i} style={s.listItem}>
                  <Text style={s.bullet}>✗</Text>
                  <Text style={s.listText}>{clause}</Text>
                </View>
              ))}
            </View>
          )}

          {data.recommended_amendments?.length > 0 && (
            <View>
              <Text style={s.sectionTitle}>Amendements recommandés</Text>
              {data.recommended_amendments.map((amend, i) => (
                <View key={i} style={s.listItem}>
                  <Text style={[s.bullet, { color: C.blue }]}>→</Text>
                  <Text style={s.listText}>{amend}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={s.disclaimer}>CompliAI — Analyse contrat · {data.provider} — {now}</Text>
          <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}
    </Document>
  );
}

export async function generateContractPDF(data: ContractData): Promise<Buffer> {
  return (await renderToBuffer(React.createElement(ContractPDF, { data }))) as Buffer;
}
