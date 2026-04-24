import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

const C = {
  navy: "#0f172a", dark: "#334155", mid: "#64748b", light: "#e2e8f0",
  pale: "#f8fafc", purple: "#7c3aed", white: "#ffffff",
  green: "#15803d", amber: "#b45309", orange: "#c2410c", red: "#b91c1c", blue: "#1d4ed8",
};

const IMPACT_BG: Record<string, string> = {
  none: "#f0fdf4", low: "#eff6ff", medium: "#fffbeb", high: "#fff7ed", critical: "#fef2f2",
};
const IMPACT_COLOR: Record<string, string> = {
  none: C.green, low: C.blue, medium: C.amber, high: C.orange, critical: C.red,
};
const IMPACT_LABEL: Record<string, string> = {
  none: "Aucun", low: "Faible", medium: "Modéré", high: "Élevé", critical: "Critique",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: C.navy, paddingTop: 40, paddingBottom: 60, paddingHorizontal: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: C.navy },
  logo: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  logoSub: { fontSize: 8, color: C.mid, marginTop: 2 },
  docType: { fontSize: 9, color: C.dark },
  dateText: { fontSize: 8, color: C.mid, marginTop: 2 },
  titleBox: { backgroundColor: "#4c1d95", borderRadius: 6, padding: 16, marginBottom: 16 },
  titleText: { fontSize: 15, fontFamily: "Helvetica-Bold", color: C.white, marginBottom: 4 },
  titleSub: { fontSize: 9, color: "#c4b5fd" },
  summaryBox: { backgroundColor: C.pale, borderRadius: 6, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: C.light },
  summaryLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.mid, marginBottom: 4 },
  summaryText: { fontSize: 9, color: C.dark, lineHeight: 1.6 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.navy, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.light },
  rightCard: { borderRadius: 4, padding: 10, marginBottom: 8, borderWidth: 1 },
  rightHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  rightName: { fontSize: 10, fontFamily: "Helvetica-Bold", flex: 1 },
  rightArticle: { fontSize: 8, color: C.mid },
  impactBadge: { borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  impactText: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  fieldLabel: { fontSize: 8, color: C.mid, marginBottom: 2 },
  fieldText: { fontSize: 9, color: C.dark, lineHeight: 1.5, marginBottom: 6 },
  row2: { flexDirection: "row", gap: 8, marginBottom: 8 },
  metaCard: { flex: 1, backgroundColor: C.pale, borderRadius: 4, padding: 8, borderWidth: 1, borderColor: C.light },
  metaLabel: { fontSize: 8, color: C.mid },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 2 },
  actionItem: { flexDirection: "row", gap: 6, marginBottom: 5 },
  bullet: { fontSize: 9, color: C.purple, width: 8 },
  actionText: { flex: 1, fontSize: 9, color: C.dark, lineHeight: 1.5 },
  disclaimer: { position: "absolute", bottom: 30, left: 50, right: 50, fontSize: 7, color: C.mid, lineHeight: 1.4, borderTopWidth: 1, borderTopColor: C.light, paddingTop: 8 },
  pageNumber: { position: "absolute", bottom: 18, right: 50, fontSize: 8, color: C.mid },
});

interface FRIAData {
  title: string;
  executive_summary: string;
  rights_assessment: Array<{ right: string; charter_article: string; impact_level: string; description: string; mitigation: string }>;
  affected_groups: Array<{ group: string; specific_risks: string; protections: string }>;
  overall_risk_level: string;
  conclusion: string;
  required_actions: string[];
  consultation_required: boolean;
}

function FRIAPDF({ data, systemName }: { data: FRIAData; systemName: string }) {
  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const riskBg = IMPACT_BG[data.overall_risk_level] ?? C.pale;
  const riskColor = IMPACT_COLOR[data.overall_risk_level] ?? C.navy;

  return (
    <Document title={data.title} author="CompliAI">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View><Text style={s.logo}>CompliAI</Text><Text style={s.logoSub}>Conformité réglementaire IA · compliai.eu</Text></View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docType}>FRIA — CONFIDENTIEL</Text>
            <Text style={s.dateText}>Généré le {now}</Text>
          </View>
        </View>

        <View style={s.titleBox}>
          <Text style={s.titleText}>{data.title}</Text>
          <Text style={s.titleSub}>Évaluation d&apos;Impact sur les Droits Fondamentaux · Article 27 AI Act UE 2024/1689</Text>
        </View>

        <View style={s.row2}>
          <View style={[s.metaCard, { borderColor: riskColor, backgroundColor: riskBg }]}>
            <Text style={s.metaLabel}>Niveau de risque global</Text>
            <Text style={[s.metaValue, { color: riskColor }]}>{IMPACT_LABEL[data.overall_risk_level] ?? data.overall_risk_level}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaLabel}>Consultation requise</Text>
            <Text style={s.metaValue}>{data.consultation_required ? "Oui" : "Non"}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaLabel}>Droits évalués</Text>
            <Text style={s.metaValue}>{data.rights_assessment?.length ?? 0}</Text>
          </View>
        </View>

        <View style={s.summaryBox}>
          <Text style={s.summaryLabel}>RÉSUMÉ EXÉCUTIF</Text>
          <Text style={s.summaryText}>{data.executive_summary}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Évaluation par droit fondamental</Text>
          {data.rights_assessment?.map((r, i) => {
            const bg = IMPACT_BG[r.impact_level] ?? C.pale;
            const color = IMPACT_COLOR[r.impact_level] ?? C.navy;
            return (
              <View key={i} style={[s.rightCard, { backgroundColor: bg, borderColor: color }]}>
                <View style={s.rightHeader}>
                  <Text style={s.rightName}>{r.right}</Text>
                  <Text style={s.rightArticle}>{r.charter_article}</Text>
                  <View style={[s.impactBadge, { backgroundColor: color }]}>
                    <Text style={[s.impactText, { color: C.white }]}>{IMPACT_LABEL[r.impact_level] ?? r.impact_level}</Text>
                  </View>
                </View>
                <Text style={s.fieldLabel}>Analyse d&apos;impact</Text>
                <Text style={s.fieldText}>{r.description}</Text>
                <Text style={s.fieldLabel}>Mesure de mitigation</Text>
                <Text style={[s.fieldText, { marginBottom: 0 }]}>{r.mitigation}</Text>
              </View>
            );
          })}
        </View>

        <Text style={s.disclaimer}>
          AVERTISSEMENT : Document généré par CompliAI sur la base de l&apos;AI Act UE 2024/1689. Ne constitue pas un avis juridique. Faites valider par un juriste spécialisé. Système : {systemName} — {now}
        </Text>
        <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.logo}>CompliAI</Text>
          <Text style={s.docType}>FRIA — GROUPES AFFECTÉS & ACTIONS</Text>
        </View>

        {data.affected_groups?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Groupes affectés</Text>
            {data.affected_groups.map((g, i) => (
              <View key={i} style={[s.rightCard, { backgroundColor: C.pale, borderColor: C.light }]}>
                <Text style={[s.rightName, { marginBottom: 6 }]}>{g.group}</Text>
                <Text style={s.fieldLabel}>Risques spécifiques</Text>
                <Text style={s.fieldText}>{g.specific_risks}</Text>
                <Text style={s.fieldLabel}>Protections prévues</Text>
                <Text style={[s.fieldText, { marginBottom: 0 }]}>{g.protections}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Conclusion</Text>
          <Text style={s.summaryText}>{data.conclusion}</Text>
        </View>

        {data.required_actions?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Actions requises</Text>
            {data.required_actions.map((action, i) => (
              <View key={i} style={s.actionItem}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.actionText}>{action}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.disclaimer}>CompliAI — FRIA Art. 27 · {systemName} — {now}</Text>
        <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

export async function generateFRIAPDF(data: FRIAData, systemName: string): Promise<Buffer> {
  return (await renderToBuffer(React.createElement(FRIAPDF, { data, systemName }))) as Buffer;
}
