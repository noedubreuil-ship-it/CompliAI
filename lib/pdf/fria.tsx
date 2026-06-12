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

const DEPLOY_REC_LABEL: Record<string, string> = {
  recommended_as_is: "Déploiement recommandé en l’état",
  conditional: "Déploiement conditionnel",
  not_recommended: "Déploiement non recommandé en l’état",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: C.navy, paddingTop: 40, paddingBottom: 60, paddingHorizontal: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: C.navy },
  logo: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  logoSub: { fontSize: 8, color: C.mid, marginTop: 2 },
  docType: { fontSize: 9, color: C.dark },
  dateText: { fontSize: 8, color: C.mid, marginTop: 2 },
  titleBox: { backgroundColor: "#4c1d95", borderRadius: 6, padding: 16, marginBottom: 16 },
  titleText: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.white, marginBottom: 4 },
  titleSub: { fontSize: 9, color: "#c4b5fd" },
  summaryBox: { backgroundColor: C.pale, borderRadius: 6, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.light },
  summaryLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.mid, marginBottom: 4 },
  summaryText: { fontSize: 9, color: C.dark, lineHeight: 1.55 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.navy, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.light },
  rightCard: { borderRadius: 4, padding: 10, marginBottom: 8, borderWidth: 1 },
  rightHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  rightName: { fontSize: 10, fontFamily: "Helvetica-Bold", flex: 1 },
  rightArticle: { fontSize: 8, color: C.mid },
  impactBadge: { borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  impactText: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  fieldLabel: { fontSize: 8, color: C.mid, marginBottom: 2 },
  fieldText: { fontSize: 9, color: C.dark, lineHeight: 1.45, marginBottom: 6 },
  row2: { flexDirection: "row", gap: 8, marginBottom: 8 },
  metaCard: { flex: 1, backgroundColor: C.pale, borderRadius: 4, padding: 8, borderWidth: 1, borderColor: C.light },
  metaLabel: { fontSize: 8, color: C.mid },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 2 },
  actionItem: { flexDirection: "row", gap: 6, marginBottom: 5 },
  bullet: { fontSize: 9, color: C.purple, width: 8 },
  actionText: { flex: 1, fontSize: 9, color: C.dark, lineHeight: 1.5 },
  deployBanner: { backgroundColor: "#faf5ff", borderWidth: 1, borderColor: C.purple, borderRadius: 4, padding: 10, marginBottom: 12 },
  synthRow: { fontSize: 7, color: C.dark, lineHeight: 1.35, marginBottom: 3 },
  disclaimer: { position: "absolute", bottom: 30, left: 50, right: 50, fontSize: 7, color: C.mid, lineHeight: 1.35, borderTopWidth: 1, borderTopColor: C.light, paddingTop: 8 },
  pageNumber: { position: "absolute", bottom: 18, right: 50, fontSize: 8, color: C.mid },
});

export interface FRIARightRow {
  right: string;
  charter_article?: string;
  impact_level: string;
  description?: string;
  mitigation?: string;
  probability_1_to_5?: number;
  gravity_1_to_5?: number;
  score_px_g?: number;
}

/** JSON FRIA étendu (Art. 27 CompliAI) + champs legacy. */
export interface FRIAData {
  title: string;
  executive_summary?: string;
  /** Ancien + nouveau schéma : peut être vide si le modèle n’a rempli que §3 détaillée. */
  rights_assessment?: FRIARightRow[];
  affected_groups?: Array<{ group: string; specific_risks: string; protections: string }>;
  overall_risk_level?: string;
  conclusion?: string;
  required_actions?: string[];
  consultation_required?: boolean;

  honesty_notes?: string[];
  deployment_recommendation?: string;
  deployment_conditions?: string[];
  professional_disclaimer?: string;
  identification?: Record<string, string | undefined | null>;
  section6_motivated_conclusion?: { motivated_conclusion_text?: string };
  section3_fundamental_rights?: {
    synthesis_rows?: Array<{ fundamental_right?: string; raw_score_aggregate?: string; residual_score?: string; level_indicator?: string }>;
  };
}

function synthLevelColor(ind: string | undefined): string {
  const x = (ind || "").toLowerCase();
  if (x.includes("red") || x.includes("🔴")) return C.red;
  if (x.includes("yellow") || x.includes("🟡")) return C.amber;
  if (x.includes("green") || x.includes("🟢")) return C.green;
  return C.mid;
}

function FRIAPDF({ data, systemName }: { data: FRIAData; systemName: string }) {
  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const overall = data.overall_risk_level ?? "medium";
  const riskBg = IMPACT_BG[overall] ?? C.pale;
  const riskColor = IMPACT_COLOR[overall] ?? C.navy;
  const synthesis = data.section3_fundamental_rights?.synthesis_rows ?? [];
  const conclusionBody =
    data.conclusion ?? data.section6_motivated_conclusion?.motivated_conclusion_text ?? "";
  const deployKey = data.deployment_recommendation ?? "";

  const idLines: string[] = [];
  const id = data.identification ?? {};
  for (const k of [
    "deployer_organisation",
    "legal_nature",
    "deployment_country",
    "system_evaluated",
    "ai_act_classification",
    "responsible_name_function_contact",
  ]) {
    const v = id[k];
    if (typeof v === "string" && v.trim()) idLines.push(`${k}: ${v}`);
  }

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

        {deployKey ?
          <View style={s.deployBanner}>
            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: C.navy }}>
              Avis déploiement : {DEPLOY_REC_LABEL[deployKey] ?? deployKey}
            </Text>
          </View>
        : null}

        <View style={s.row2}>
          <View style={[s.metaCard, { borderColor: riskColor, backgroundColor: riskBg }]}>
            <Text style={s.metaLabel}>Niveau de risque global (synthèse modèle)</Text>
            <Text style={[s.metaValue, { color: riskColor }]}>{IMPACT_LABEL[overall] ?? overall}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaLabel}>Consultation parties prenantes</Text>
            <Text style={s.metaValue}>{data.consultation_required ? "Requise / à confirmer" : "Non signalée"}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaLabel}>Droits — entrées tableau</Text>
            <Text style={s.metaValue}>{data.rights_assessment?.length ?? 0}</Text>
          </View>
        </View>

        {idLines.length > 0 ?
          <View style={s.summaryBox}>
            <Text style={s.summaryLabel}>Identification (extrait JSON)</Text>
            {idLines.map((ln, i) => <Text key={i} style={s.summaryText}>{ln}</Text>)}
          </View>
        : null}

        {data.deployment_conditions && data.deployment_conditions.length > 0 ?
          (
            <View style={s.summaryBox}>
              <Text style={s.summaryLabel}>Conditions déploiement (si conditionnel)</Text>
              {data.deployment_conditions.map((c, i) => (
                <Text key={i} style={s.summaryText}>• {c}</Text>
              ))}
            </View>
          )
        : null}

        {data.honesty_notes && data.honesty_notes.length > 0 ?
          (
            <View style={[s.summaryBox, { borderColor: C.amber, backgroundColor: "#fffbeb" }]}>
              <Text style={[s.summaryLabel, { color: C.amber }]}>Hypothèses / limites d&apos;analyse</Text>
              {data.honesty_notes.map((n, i) => <Text key={i} style={s.summaryText}>• {n}</Text>)}
            </View>
          )
        : null}

        {data.executive_summary ?
          (
            <View style={s.summaryBox}>
              <Text style={s.summaryLabel}>RÉSUMÉ EXÉCUTIF</Text>
              <Text style={s.summaryText}>{data.executive_summary}</Text>
            </View>
          )
        : null}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Synthèse matrice §3 — droits (si présente dans JSON)</Text>
          {synthesis.length ?
            synthesis.slice(0, 14).map((row, i) => {
              const lvl = synthLevelColor(row.level_indicator);
              const line = `${(row.fundamental_right ?? "").slice(0, 90)} — brut ${row.raw_score_aggregate ?? "—"} / résidu ${row.residual_score ?? "—"}`;
              return <Text key={i} style={[s.synthRow, { color: lvl }]}>• {line}</Text>;
            })
          : <Text style={s.fieldText}>Voir détail sous « Évaluation par droit fondamental » (page suivante).</Text>}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Évaluation synthétique par droit</Text>
          {(data.rights_assessment ?? []).slice(0, 7).map((r, i) => {
            const bg = IMPACT_BG[r.impact_level] ?? C.pale;
            const color = IMPACT_COLOR[r.impact_level] ?? C.navy;
            const extras =
              typeof r.score_px_g === "number" ? `Score P×G : ${r.score_px_g}` : "";
            return (
              <View key={i} style={[s.rightCard, { backgroundColor: bg, borderColor: color }]}>
                <View style={s.rightHeader}>
                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <Text style={s.rightName}>{r.right}</Text>
                    <Text style={s.rightArticle}>{r.charter_article ?? ""}</Text>
                  </View>
                  <View style={[s.impactBadge, { backgroundColor: color }]}>
                    <Text style={[s.impactText, { color: C.white }]}>{IMPACT_LABEL[r.impact_level] ?? r.impact_level}</Text>
                  </View>
                </View>
                {extras ? <Text style={{ fontSize: 7, color: C.mid, marginBottom: 4 }}>{extras}</Text> : null}
                <Text style={s.fieldLabel}>Analyse</Text>
                <Text style={s.fieldText}>{r.description ?? "—"}</Text>
                <Text style={s.fieldLabel}>Mesure(s) de mitigation</Text>
                <Text style={[s.fieldText, { marginBottom: 0 }]}>{r.mitigation ?? "—"}</Text>
              </View>
            );
          })}
        </View>

        <Text style={s.disclaimer}>
          {data.professional_disclaimer ?
            `${data.professional_disclaimer}\n\n`
          : ""}
          Document d&apos;aide généré par CompliAI. Ne dispense pas d&apos;avis juridique ni de validation institutionnelle. Système : {systemName} — {now}
        </Text>
        <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.logo}>CompliAI</Text>
          <Text style={s.docType}>FRIA — PERSONNES IMPACTÉES & CONCLUSION</Text>
        </View>

        {(data.affected_groups ?? []).length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Groupes concernés — Section 2 (extrait)</Text>
            {(data.affected_groups ?? []).map((g, i) => (
              <View key={i} style={[s.rightCard, { backgroundColor: C.pale, borderColor: C.light }]}>
                <Text style={[s.rightName, { marginBottom: 6 }]}>{g.group}</Text>
                <Text style={s.fieldLabel}>Risques</Text>
                <Text style={s.fieldText}>{g.specific_risks}</Text>
                <Text style={s.fieldLabel}>Mesures attentives prévues</Text>
                <Text style={[s.fieldText, { marginBottom: 0 }]}>{g.protections}</Text>
              </View>
            ))}
          </View>
        )}

        {(data.rights_assessment ?? []).length > 7 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Droits fondamentaux (suite)</Text>
            {(data.rights_assessment ?? []).slice(7).map((r, i) => (
              <View key={i} style={[s.rightCard, { backgroundColor: C.pale, borderColor: C.light }]}>
                <Text style={s.rightName}>{r.right}</Text>
                <Text style={s.fieldText}>{r.description}</Text>
                <Text style={s.fieldLabel}>Mitigation</Text>
                <Text style={[s.fieldText, { marginBottom: 0 }]}>{r.mitigation}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Conclusion motivée §6 — avis juridico-opérationnel</Text>
          <Text style={s.summaryText}>{conclusionBody || "—"}</Text>
        </View>

        {(data.required_actions ?? []).length > 0 ?
          (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Actions requises / conditions</Text>
              {(data.required_actions ?? []).map((action, i) => (
                <View key={i} style={s.actionItem}>
                  <Text style={s.bullet}>•</Text>
                  <Text style={s.actionText}>{action}</Text>
                </View>
              ))}
            </View>
          )
        : null}

        <Text style={s.disclaimer}>CompliAI — FRIA Art. 27 · {systemName} — {now}</Text>
        <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

export async function generateFRIAPDF(data: FRIAData, systemName: string): Promise<Buffer> {
  return (await renderToBuffer(React.createElement(FRIAPDF, { data, systemName }) as any)) as Buffer;
}
