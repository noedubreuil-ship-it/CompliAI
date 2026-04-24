import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

const C = {
  navy: "#0f172a", dark: "#334155", mid: "#64748b", light: "#e2e8f0",
  pale: "#f8fafc", green: "#15803d", greenBg: "#f0fdf4", greenLight: "#dcfce7",
  white: "#ffffff",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: C.navy, paddingTop: 40, paddingBottom: 60, paddingHorizontal: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: C.navy },
  logo: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  logoSub: { fontSize: 8, color: C.mid, marginTop: 2 },
  docType: { fontSize: 9, color: C.dark },
  dateText: { fontSize: 8, color: C.mid, marginTop: 2 },
  titleBox: { backgroundColor: "#14532d", borderRadius: 6, padding: 16, marginBottom: 16 },
  titleText: { fontSize: 15, fontFamily: "Helvetica-Bold", color: C.white, marginBottom: 4 },
  titleMeta: { fontSize: 9, color: "#86efac" },
  rulesBox: { backgroundColor: C.greenBg, borderWidth: 1, borderColor: C.greenLight, borderRadius: 6, padding: 12, marginBottom: 16 },
  rulesTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.green, marginBottom: 8 },
  ruleRow: { flexDirection: "row", gap: 6, marginBottom: 5 },
  ruleNum: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.green, width: 14 },
  ruleText: { flex: 1, fontSize: 9, color: "#166534", lineHeight: 1.5 },
  section: { marginBottom: 14 },
  sectionCard: { borderRadius: 4, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: C.light, backgroundColor: C.pale },
  sectionNum: { fontSize: 9, color: C.mid, marginBottom: 3 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.navy, marginBottom: 6 },
  sectionText: { fontSize: 9, color: C.dark, lineHeight: 1.6 },
  signBox: { borderWidth: 1, borderColor: C.light, borderRadius: 4, padding: 12, marginTop: 8 },
  signTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.navy, marginBottom: 12 },
  signRow: { flexDirection: "row", gap: 20, marginBottom: 20 },
  signField: { flex: 1 },
  signLabel: { fontSize: 8, color: C.mid, marginBottom: 20 },
  signLine: { borderBottomWidth: 1, borderBottomColor: C.navy, marginBottom: 4 },
  disclaimer: { position: "absolute", bottom: 30, left: 50, right: 50, fontSize: 7, color: C.mid, lineHeight: 1.4, borderTopWidth: 1, borderTopColor: C.light, paddingTop: 8 },
  pageNumber: { position: "absolute", bottom: 18, right: 50, fontSize: 8, color: C.mid },
});

interface PolicyData {
  title: string;
  version: string;
  sections: Array<{ id: string; title: string; content: string }>;
  key_rules: string[];
}

function PolicyPDF({ data, companyName }: { data: PolicyData; companyName: string }) {
  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <Document title={data.title} author="CompliAI">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View><Text style={s.logo}>CompliAI</Text><Text style={s.logoSub}>Conformité réglementaire IA · compliai.eu</Text></View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docType}>POLITIQUE INTERNE — CONFIDENTIEL</Text>
            <Text style={s.dateText}>Généré le {now}</Text>
          </View>
        </View>

        <View style={s.titleBox}>
          <Text style={s.titleText}>{data.title}</Text>
          <Text style={s.titleMeta}>Version {data.version} · Art. 4 AI Act (littératie IA) + RGPD · {companyName}</Text>
        </View>

        {data.key_rules?.length > 0 && (
          <View style={s.rulesBox}>
            <Text style={s.rulesTitle}>5 règles clés à retenir par tous les employés</Text>
            {data.key_rules.map((rule, i) => (
              <View key={i} style={s.ruleRow}>
                <Text style={s.ruleNum}>{i + 1}.</Text>
                <Text style={s.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        )}

        {data.sections?.map(sec => (
          <View key={sec.id} style={s.sectionCard}>
            <Text style={s.sectionNum}>Article {sec.id}</Text>
            <Text style={s.sectionTitle}>{sec.title}</Text>
            <Text style={s.sectionText}>{sec.content}</Text>
          </View>
        ))}

        <Text style={s.disclaimer}>
          Document généré par CompliAI sur la base de l&apos;AI Act UE 2024/1689 (Art. 4) et du RGPD. Information juridique générale — faites valider par votre DPO ou un avocat avant diffusion. Entreprise : {companyName} — {now}
        </Text>
        <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.logo}>CompliAI</Text>
          <Text style={s.docType}>PAGE DE SIGNATURE — {companyName.toUpperCase()}</Text>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 8 }}>Accusé de réception et engagement</Text>
          <Text style={{ fontSize: 9, color: C.dark, lineHeight: 1.6 }}>
            En signant ce document, l&apos;employé(e) reconnaît avoir pris connaissance de la Politique d&apos;Usage de l&apos;IA de {companyName} 
            (version {data.version}), s&apos;engage à en respecter les dispositions et confirme avoir reçu la formation de littératie IA 
            conformément à l&apos;Article 4 de l&apos;AI Act UE 2024/1689.
          </Text>
        </View>

        <View style={s.signBox}>
          <Text style={s.signTitle}>Signature de l&apos;employé(e)</Text>
          <View style={s.signRow}>
            <View style={s.signField}>
              <View style={s.signLine} />
              <Text style={s.signLabel}>Nom et Prénom</Text>
            </View>
            <View style={s.signField}>
              <View style={s.signLine} />
              <Text style={s.signLabel}>Poste / Service</Text>
            </View>
          </View>
          <View style={s.signRow}>
            <View style={s.signField}>
              <View style={s.signLine} />
              <Text style={s.signLabel}>Date</Text>
            </View>
            <View style={s.signField}>
              <View style={s.signLine} />
              <Text style={s.signLabel}>Signature</Text>
            </View>
          </View>
        </View>

        <View style={[s.signBox, { marginTop: 20 }]}>
          <Text style={s.signTitle}>Validation par la Direction / DPO</Text>
          <View style={s.signRow}>
            <View style={s.signField}>
              <View style={s.signLine} />
              <Text style={s.signLabel}>Nom et Prénom (Responsable)</Text>
            </View>
            <View style={s.signField}>
              <View style={s.signLine} />
              <Text style={s.signLabel}>Date de validation</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 20 }}>
            <View style={{ flex: 1 }}>
              <View style={s.signLine} />
              <Text style={s.signLabel}>Signature</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.signLine} />
              <Text style={s.signLabel}>Cachet de l&apos;entreprise</Text>
            </View>
          </View>
        </View>

        <Text style={s.disclaimer}>CompliAI — Politique IA Employés v{data.version} · {companyName} — {now}</Text>
        <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

export async function generatePolicyPDF(data: PolicyData, companyName: string): Promise<Buffer> {
  return (await renderToBuffer(React.createElement(PolicyPDF, { data, companyName }))) as Buffer;
}
