import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

const C = {
  slate900: "#0f172a", slate700: "#334155", slate500: "#64748b",
  slate200: "#e2e8f0", slate50: "#f8fafc", blue600: "#2563eb",
  green600: "#16a34a", red600: "#dc2626", amber600: "#d97706",
};

const RISK_COLORS: Record<string, string> = {
  low: "#dcfce7", medium: "#fef9c3", high: "#ffedd5", critical: "#fee2e2",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: C.slate900, paddingTop: 40, paddingBottom: 60, paddingHorizontal: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: C.slate900 },
  logo: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  logoSub: { fontSize: 7, color: C.slate500, marginTop: 2 },
  docType: { fontSize: 8, color: C.slate700, marginTop: 2 },
  dateText: { fontSize: 7, color: C.slate500 },
  titleBox: { backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 5, padding: 12, marginBottom: 16 },
  titleMain: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.slate900, marginBottom: 4 },
  titleSub: { fontSize: 8, color: "#1d4ed8" },
  riskBadge: { borderRadius: 4, padding: 6, marginBottom: 12, flexDirection: "row", alignItems: "center" },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.slate900, marginBottom: 6, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: C.slate200 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 130, color: C.slate500, fontSize: 8 },
  value: { flex: 1, color: C.slate900, fontSize: 8, fontFamily: "Helvetica-Bold" },
  riskBox: { marginBottom: 6, padding: 7, borderRadius: 3, borderWidth: 1, borderColor: C.slate200 },
  riskTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  riskDesc: { fontSize: 8, color: C.slate700, lineHeight: 1.4 },
  measure: { marginBottom: 4, flexDirection: "row", gap: 6 },
  measureDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#2563eb", marginTop: 2 },
  measureText: { flex: 1, fontSize: 8, color: C.slate700 },
  rightItem: { marginBottom: 5, flexDirection: "row", gap: 6 },
  disclaimer: { position: "absolute", bottom: 28, left: 50, right: 50, fontSize: 7, color: C.slate500, lineHeight: 1.4, borderTopWidth: 1, borderTopColor: C.slate200, paddingTop: 6 },
  pageNum: { position: "absolute", bottom: 16, right: 50, fontSize: 7, color: C.slate500 },
});

function DPIADoc({ data, treatmentName }: { data: any; treatmentName: string }) {
  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const riskBg = RISK_COLORS[data.overall_risk_level] ?? "#f1f5f9";
  const RISK_LABELS: Record<string, string> = { low: "Faible", medium: "Modéré", high: "Élevé", critical: "Critique" };

  return (
    <Document title={`DPIA — ${treatmentName}`} author="CompliAI">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View><Text style={s.logo}>CompliAI</Text><Text style={s.logoSub}>Conformité réglementaire · compliai.eu</Text></View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.dateText}>Généré le {now}</Text>
            <Text style={s.docType}>DPIA — Art. 35 RGPD (UE 2016/679)</Text>
          </View>
        </View>

        <View style={s.titleBox}>
          <Text style={s.titleMain}>{data.title ?? `DPIA — ${treatmentName}`}</Text>
          <Text style={s.titleSub}>Analyse d&apos;Impact sur la Protection des Données · Lignes directrices EDPB WP248</Text>
        </View>

        <View style={[s.riskBadge, { backgroundColor: riskBg }]}>
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: C.slate900 }}>
            Niveau de risque global : {RISK_LABELS[data.overall_risk_level] ?? data.overall_risk_level}
            {data.dpia_required ? " · DPIA obligatoire" : ""}
            {data.consultation_required ? " · Consultation CNIL requise" : ""}
          </Text>
        </View>

        {data.executive_summary && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Résumé exécutif</Text>
            <Text style={{ fontSize: 8, color: C.slate700, lineHeight: 1.5 }}>{data.executive_summary}</Text>
          </View>
        )}

        {data.processing_description && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Évaluation du traitement</Text>
            {Object.entries(data.processing_description).map(([k, v], i) => (
              <View key={i} style={s.row}>
                <Text style={s.label}>{k === "legal_basis" ? "Base légale :" : k === "proportionality" ? "Proportionnalité :" : k === "necessity" ? "Nécessité :" : "Finalités :"}</Text>
                <Text style={{ flex: 1, fontSize: 8, color: C.slate700 }}>{v as string}</Text>
              </View>
            ))}
          </View>
        )}

        {data.risks?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Risques identifiés ({data.risks.length})</Text>
            {data.risks.map((r: any, i: number) => (
              <View key={i} style={[s.riskBox, { backgroundColor: RISK_COLORS[r.severity] ?? "#f8fafc" }]}>
                <Text style={s.riskTitle}>{r.risk}</Text>
                <Text style={[s.riskDesc, { marginBottom: 3 }]}>Menace : {r.threat}</Text>
                <Text style={s.riskDesc}>Mesures : {r.measures}</Text>
              </View>
            ))}
          </View>
        )}

        {data.measures?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Mesures de protection</Text>
            {data.measures.map((m: any, i: number) => (
              <View key={i} style={s.measure}>
                <View style={s.measureDot} />
                <Text style={s.measureText}>[{m.status?.toUpperCase()}] {m.measure} — {m.article_ref}</Text>
              </View>
            ))}
          </View>
        )}

        {data.action_plan?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Plan d&apos;action</Text>
            {data.action_plan.map((a: string, i: number) => (
              <View key={i} style={s.measure}>
                <Text style={{ fontSize: 8, color: "#2563eb", fontFamily: "Helvetica-Bold", width: 14 }}>{i + 1}.</Text>
                <Text style={s.measureText}>{a}</Text>
              </View>
            ))}
          </View>
        )}

        {data.consultation_required && (
          <View style={{ backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fca5a5", borderRadius: 4, padding: 8, marginBottom: 12 }}>
            <Text style={{ fontSize: 8, color: "#991b1b", fontFamily: "Helvetica-Bold" }}>
              ⚠️ Consultation CNIL requise avant déploiement (Art. 36 RGPD)
            </Text>
          </View>
        )}

        <Text style={s.disclaimer}>
          AVERTISSEMENT : Ce document est généré par IA à titre indicatif. Il ne constitue pas un avis juridique. Faites-le valider par votre DPO ou un avocat spécialisé avant tout dépôt officiel. RGPD Art. 35 — Généré le {now} par CompliAI (compliai.eu)
        </Text>
        <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

export async function generateDPIAPDF(data: any, treatmentName: string): Promise<Buffer> {
  const el = React.createElement(DPIADoc, { data, treatmentName });
  return renderToBuffer(el as any) as Promise<Buffer>;
}
