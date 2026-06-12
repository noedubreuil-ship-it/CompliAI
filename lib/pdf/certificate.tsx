import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";

interface CertificateData {
  companyName: string;
  systemName: string;
  auditDate: string;
  complianceScore: number;
  verdict: string;
  aiActClassification: string;
  auditorRef: string;
  validUntil: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 60,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
    paddingBottom: 20,
    borderBottom: "2px solid #003399",
  },
  brandName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#003399",
  },
  brandTagline: {
    fontSize: 8,
    color: "#888",
    marginTop: 2,
  },
  refBlock: {
    alignItems: "flex-end",
  },
  refText: {
    fontSize: 8,
    color: "#888",
  },
  title: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    color: "#555",
    textAlign: "center",
    marginBottom: 36,
  },
  scoreBox: {
    alignSelf: "center",
    width: 120,
    height: 120,
    borderRadius: 60,
    border: "4px solid #003399",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  scoreValue: {
    fontSize: 40,
    fontFamily: "Helvetica-Bold",
    color: "#003399",
  },
  scoreLabel: {
    fontSize: 9,
    color: "#888",
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },
  infoCell: {
    width: "47%",
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    border: "1px solid #e5e7eb",
  },
  infoLabel: {
    fontSize: 8,
    color: "#888",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111",
  },
  verdictBadge: {
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 100,
    marginBottom: 24,
  },
  verdictText: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  disclaimer: {
    fontSize: 7,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 1.6,
    paddingHorizontal: 20,
    marginTop: 20,
    paddingTop: 16,
    borderTop: "1px solid #f0f0f0",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 60,
    right: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7,
    color: "#ccc",
  },
  seal: {
    width: 64,
    height: 64,
    borderRadius: 32,
    border: "2px solid #003399",
    justifyContent: "center",
    alignItems: "center",
  },
  sealText: {
    fontSize: 6,
    color: "#003399",
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
  },
});

function verdictStyle(verdict: string): { bg: string; color: string } {
  if (verdict.includes("conforme") && !verdict.includes("non")) return { bg: "#dcfce7", color: "#166534" };
  if (verdict.includes("non_conforme") || verdict.includes("non conforme")) return { bg: "#fee2e2", color: "#991b1b" };
  return { bg: "#fef3c7", color: "#92400e" };
}

export function CertificatePDF({ data }: { data: CertificateData }) {
  const vStyle = verdictStyle(data.verdict);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>CompliAI</Text>
            <Text style={styles.brandTagline}>Conformité IA pour les entreprises</Text>
          </View>
          <View style={styles.refBlock}>
            <Text style={styles.refText}>Réf. : {data.auditorRef}</Text>
            <Text style={styles.refText}>Émis le : {data.auditDate}</Text>
            <Text style={styles.refText}>Valide jusqu&apos;au : {data.validUntil}</Text>
          </View>
        </View>

        {/* Titre */}
        <Text style={styles.title}>Attestation de Conformité</Text>
        <Text style={styles.subtitle}>Cadre réglementaire : AI Act (UE 2024/1689) & RGPD (UE 2016/679)</Text>

        {/* Score */}
        <View style={styles.scoreBox}>
          <Text style={styles.scoreValue}>{data.complianceScore}%</Text>
          <Text style={styles.scoreLabel}>Score global</Text>
        </View>

        {/* Verdict badge */}
        <View style={[styles.verdictBadge, { backgroundColor: vStyle.bg }]}>
          <Text style={[styles.verdictText, { color: vStyle.color }]}>
            {data.verdict.replace(/_/g, " ")}
          </Text>
        </View>

        {/* Infos */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Entreprise</Text>
            <Text style={styles.infoValue}>{data.companyName}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Système IA audité</Text>
            <Text style={styles.infoValue}>{data.systemName}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Classification AI Act</Text>
            <Text style={styles.infoValue}>{data.aiActClassification}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Date d&apos;audit</Text>
            <Text style={styles.infoValue}>{data.auditDate}</Text>
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Cette attestation est générée automatiquement par la plateforme CompliAI sur la base des
          informations déclarées par l&apos;utilisateur. Elle constitue un outil d&apos;auto-évaluation et ne remplace
          pas un audit de conformité réalisé par un organisme accrédité ou un avocat spécialisé.
          Valide à la date d&apos;émission — toute modification du système IA ou évolution réglementaire peut
          invalider cette attestation.
        </Text>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>compliai.eu · support@compliai.eu</Text>
          <View style={styles.seal}>
            <Text style={styles.sealText}>{"GÉNÉRÉ\nPAR\nCOMPLIAI"}</Text>
          </View>
          <Text style={styles.footerText}>{data.auditorRef}</Text>
        </View>
      </Page>
    </Document>
  );
}
