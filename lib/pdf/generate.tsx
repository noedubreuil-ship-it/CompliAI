import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer";
import React from "react";

// Register fonts (system fonts)
// Font.register({ ... }) — add custom fonts here for production

const COLORS = {
  slate900: "#0f172a",
  slate700: "#334155",
  slate500: "#64748b",
  slate200: "#e2e8f0",
  slate50: "#f8fafc",
  blue600: "#2563eb",
  green600: "#16a34a",
  orange600: "#ea580c",
  red600: "#dc2626",
  amber600: "#d97706",
  white: "#ffffff",
};

const VERDICT_BG: Record<string, string> = {
  Conforme: "#dcfce7",
  "Attention requise": "#fef9c3",
  "Risque élevé": "#ffedd5",
  "Non conforme": "#fee2e2",
};

const VERDICT_COLOR: Record<string, string> = {
  Conforme: "#166534",
  "Attention requise": "#854d0e",
  "Risque élevé": "#9a3412",
  "Non conforme": "#991b1b",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.slate900,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.slate900,
  },
  headerLeft: { flexDirection: "column" },
  logo: { fontSize: 18, fontFamily: "Helvetica-Bold", color: COLORS.slate900 },
  logoSub: { fontSize: 8, color: COLORS.slate500, marginTop: 2 },
  headerRight: { flexDirection: "column", alignItems: "flex-end" },
  dateText: { fontSize: 8, color: COLORS.slate500 },
  docType: { fontSize: 9, color: COLORS.slate700, marginTop: 2 },

  verdictBox: {
    borderRadius: 6,
    padding: 16,
    marginBottom: 20,
  },
  verdictTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  verdictClass: { fontSize: 10, color: COLORS.slate700, marginBottom: 8 },
  verdictSummary: { fontSize: 9, color: COLORS.slate700, lineHeight: 1.5 },

  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.slate900,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
  },

  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 140, color: COLORS.slate500, fontSize: 9 },
  value: { flex: 1, color: COLORS.slate900, fontSize: 9, fontFamily: "Helvetica-Bold" },

  phase: {
    marginBottom: 12,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.slate900,
  },
  phaseTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  action: {
    marginBottom: 5,
    paddingLeft: 8,
    paddingTop: 4,
    paddingBottom: 4,
    paddingRight: 8,
    backgroundColor: COLORS.slate50,
    borderRadius: 3,
  },
  actionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  actionDesc: { fontSize: 8, color: COLORS.slate700, lineHeight: 1.4 },
  actionMeta: { fontSize: 8, color: COLORS.blue600, marginTop: 2 },

  issueBox: {
    marginBottom: 6,
    padding: 8,
    borderRadius: 4,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  issueTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: COLORS.orange600 },
  issueDesc: { fontSize: 8, color: COLORS.slate700, marginTop: 2, lineHeight: 1.4 },

  costBox: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  costCard: {
    flex: 1,
    padding: 10,
    backgroundColor: COLORS.slate50,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  costLabel: { fontSize: 8, color: COLORS.slate500 },
  costValue: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 2 },

  disclaimer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    fontSize: 7,
    color: COLORS.slate500,
    lineHeight: 1.4,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    paddingTop: 8,
  },
  pageNumber: {
    position: "absolute",
    bottom: 18,
    right: 50,
    fontSize: 8,
    color: COLORS.slate500,
  },
});

interface PDFData {
  audit: {
    id: string;
    verdict: string;
    ai_act_classification: string;
    risk_level: string;
    roadmap: Array<{
      phase: string;
      duration?: string;
      actions: Array<{
        title: string;
        description: string;
        regulation?: string;
        article?: string;
        effort?: string;
        cost_estimate?: string;
      }>;
    }>;
    cost_estimate: { initial: string; recurring_annual: string; details: string };
    lawyer_needed: boolean;
    raw_response: string;
    created_at: string;
  };
  project: { name: string; sector: string; target_audience: string };
  companyName?: string;
}

function AuditPDF({ data }: { data: PDFData }) {
  const { audit, project, companyName } = data;
  const summary = (() => {
    try { return JSON.parse(audit.raw_response)?.summary ?? ""; } catch { return ""; }
  })();
  const blockingIssues = (() => {
    try { return JSON.parse(audit.raw_response)?.blocking_issues ?? []; } catch { return []; }
  })();

  const verdictBg = VERDICT_BG[audit.verdict] ?? "#f1f5f9";
  const verdictColor = VERDICT_COLOR[audit.verdict] ?? COLORS.slate900;
  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <Document title={`Rapport CompliAI — ${project.name}`} author="CompliAI">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logo}>🔒 CompliAI</Text>
            <Text style={styles.logoSub}>Conformité réglementaire IA · compliai.eu</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.dateText}>Généré le {now}</Text>
            <Text style={styles.docType}>RAPPORT DE CONFORMITÉ — CONFIDENTIEL</Text>
          </View>
        </View>

        {/* Project info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Projet analysé</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nom du projet :</Text>
            <Text style={styles.value}>{project.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Entreprise :</Text>
            <Text style={styles.value}>{companyName ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Secteur :</Text>
            <Text style={styles.value}>{project.sector}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Public cible :</Text>
            <Text style={styles.value}>{project.target_audience}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date d&apos;audit :</Text>
            <Text style={styles.value}>{new Date(audit.created_at).toLocaleDateString("fr-FR")}</Text>
          </View>
        </View>

        {/* Verdict */}
        <View style={[styles.verdictBox, { backgroundColor: verdictBg }]}>
          <Text style={[styles.verdictTitle, { color: verdictColor }]}>{audit.verdict}</Text>
          <Text style={styles.verdictClass}>
            {audit.ai_act_classification} · Risque {audit.risk_level}
          </Text>
          {summary ? <Text style={styles.verdictSummary}>{summary}</Text> : null}
        </View>

        {/* Blocking issues */}
        {blockingIssues.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Issues bloquantes ({blockingIssues.length})
            </Text>
            {blockingIssues.slice(0, 5).map((issue: { title: string; description: string; regulation?: string; article?: string }, i: number) => (
              <View key={i} style={styles.issueBox}>
                <Text style={styles.issueTitle}>{issue.title}</Text>
                <Text style={styles.issueDesc}>{issue.description}</Text>
                {issue.regulation && (
                  <Text style={[styles.issueDesc, { color: COLORS.slate500, marginTop: 3 }]}>
                    {issue.regulation}{issue.article ? ` — Art. ${issue.article}` : ""}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Cost estimate */}
        {audit.cost_estimate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estimation des coûts de conformité</Text>
            <View style={styles.costBox}>
              <View style={styles.costCard}>
                <Text style={styles.costLabel}>Coût initial</Text>
                <Text style={styles.costValue}>{audit.cost_estimate.initial}</Text>
              </View>
              <View style={styles.costCard}>
                <Text style={styles.costLabel}>Coût récurrent / an</Text>
                <Text style={styles.costValue}>{audit.cost_estimate.recurring_annual}</Text>
              </View>
            </View>
            {audit.cost_estimate.details && (
              <Text style={{ fontSize: 8, color: COLORS.slate700, lineHeight: 1.4 }}>
                {audit.cost_estimate.details}
              </Text>
            )}
          </View>
        )}

        {/* Roadmap */}
        {audit.roadmap && audit.roadmap.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Roadmap de mise en conformité</Text>
            {audit.roadmap.map((phase, pi) => (
              <View key={pi} style={styles.phase}>
                <Text style={styles.phaseTitle}>
                  Phase {pi + 1} — {phase.phase}
                  {phase.duration ? ` (${phase.duration})` : ""}
                </Text>
                {phase.actions?.slice(0, 4).map((action, ai) => (
                  <View key={ai} style={styles.action}>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionDesc}>{action.description}</Text>
                    {(action.regulation || action.cost_estimate) && (
                      <Text style={styles.actionMeta}>
                        {action.regulation && `${action.regulation}${action.article ? ` — Art. ${action.article}` : ""}`}
                        {action.cost_estimate && ` · ≈ ${action.cost_estimate}`}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Lawyer warning */}
        {audit.lawyer_needed && (
          <View style={{
            padding: 10, marginBottom: 12, backgroundColor: "#fffbeb",
            borderWidth: 1, borderColor: "#f59e0b", borderRadius: 4,
          }}>
            <Text style={{ fontSize: 9, color: "#92400e", fontFamily: "Helvetica-Bold", marginBottom: 3 }}>
              ⚠️ Validation juridique recommandée
            </Text>
            <Text style={{ fontSize: 8, color: "#78350f", lineHeight: 1.4 }}>
              Au vu du niveau de risque identifié, nous recommandons de faire valider ce rapport 
              par un avocat spécialisé en droit du numérique avant tout déploiement.
            </Text>
          </View>
        )}

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          AVERTISSEMENT LÉGAL : Ce rapport est généré par intelligence artificielle sur la base des textes juridiques européens en vigueur 
          (AI Act UE 2024/1689, RGPD UE 2016/679, DSA UE 2022/2065, DMA UE 2022/1925). Il constitue une information juridique générale 
          et non un conseil juridique personnalisé. CompliAI (compliai.eu) ne peut être tenu responsable des décisions prises sur la base 
          de ce rapport. Pour toute décision engageant la responsabilité de votre organisation, consultez un avocat qualifié. 
          Document généré le {now} — Réf. audit #{data.audit.id.slice(0, 8).toUpperCase()}
        </Text>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

export async function generateAuditPDF(data: PDFData): Promise<Buffer> {
  const element = React.createElement(AuditPDF, { data });
  const buffer = await renderToBuffer(element as any);
  return buffer as Buffer;
}
