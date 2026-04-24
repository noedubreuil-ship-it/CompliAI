import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

const C = {
  navy: "#0f172a", dark: "#334155", mid: "#64748b", light: "#e2e8f0",
  pale: "#f8fafc", blue: "#2563eb", white: "#ffffff", amber: "#d97706",
  green: "#16a34a",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: C.navy, paddingTop: 40, paddingBottom: 60, paddingHorizontal: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: C.navy },
  logo: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  logoSub: { fontSize: 8, color: C.mid, marginTop: 2 },
  headerRight: { flexDirection: "column", alignItems: "flex-end" },
  dateText: { fontSize: 8, color: C.mid },
  docType: { fontSize: 9, color: C.dark, marginTop: 2 },
  titleBox: { backgroundColor: C.navy, borderRadius: 6, padding: 16, marginBottom: 20 },
  titleText: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.white, marginBottom: 4 },
  titleSub: { fontSize: 9, color: "#94a3b8" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.navy, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.light },
  sectionRef: { fontSize: 8, color: C.blue },
  contentText: { fontSize: 9, color: C.dark, lineHeight: 1.6 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 5 },
  checkDot: { width: 12, fontSize: 9, color: C.amber },
  checkText: { flex: 1, fontSize: 9, color: C.dark },
  checkRef: { fontSize: 8, color: C.mid, width: 60, textAlign: "right" },
  stepRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  stepNum: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.navy, color: C.white, fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "center", paddingTop: 4 },
  stepText: { flex: 1, fontSize: 9, color: C.dark, lineHeight: 1.5 },
  disclaimer: { position: "absolute", bottom: 30, left: 50, right: 50, fontSize: 7, color: C.mid, lineHeight: 1.4, borderTopWidth: 1, borderTopColor: C.light, paddingTop: 8 },
  pageNumber: { position: "absolute", bottom: 18, right: 50, fontSize: 8, color: C.mid },
});

const STATUS_SYMBOLS: Record<string, string> = { compliant: "✓", to_do: "○", not_applicable: "—" };

interface Art11Data {
  title: string;
  sections: Array<{ id: string; title: string; content: string; article_ref: string }>;
  compliance_checklist: Array<{ item: string; status: string; ref: string }>;
  next_steps: string[];
}

function Art11PDF({ data, systemName }: { data: Art11Data; systemName: string }) {
  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <Document title={data.title} author="CompliAI">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.logo}>CompliAI</Text>
            <Text style={s.logoSub}>Conformité réglementaire IA · compliai.eu</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.dateText}>Généré le {now}</Text>
            <Text style={s.docType}>DOCUMENTATION TECHNIQUE — CONFIDENTIEL</Text>
          </View>
        </View>

        <View style={s.titleBox}>
          <Text style={s.titleText}>{data.title}</Text>
          <Text style={s.titleSub}>Documentation obligatoire · Article 11 & Annexe IV · AI Act UE 2024/1689</Text>
        </View>

        {data.sections?.map(sec => (
          <View key={sec.id} style={s.section}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.light }}>
              <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: C.navy }}>{sec.id}. {sec.title}</Text>
              <Text style={s.sectionRef}>{sec.article_ref}</Text>
            </View>
            <Text style={s.contentText}>{sec.content}</Text>
          </View>
        ))}

        <Text style={s.disclaimer}>
          AVERTISSEMENT : Ce document est généré par intelligence artificielle (CompliAI) sur la base de l&apos;AI Act UE 2024/1689 et ne constitue pas un conseil juridique. 
          Faites valider par un avocat spécialisé avant dépôt officiel. Système : {systemName} — Généré le {now}
        </Text>
        <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {(data.compliance_checklist?.length > 0 || data.next_steps?.length > 0) && (
        <Page size="A4" style={s.page}>
          <View style={s.header}>
            <Text style={s.logo}>CompliAI</Text>
            <Text style={s.docType}>CHECKLIST & PLAN D&apos;ACTION</Text>
          </View>

          {data.compliance_checklist?.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Checklist de conformité</Text>
              {data.compliance_checklist.map((item, i) => (
                <View key={i} style={s.checkRow}>
                  <Text style={s.checkDot}>{STATUS_SYMBOLS[item.status] ?? "○"}</Text>
                  <Text style={s.checkText}>{item.item}</Text>
                  <Text style={s.checkRef}>{item.ref}</Text>
                </View>
              ))}
            </View>
          )}

          {data.next_steps?.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Prochaines étapes prioritaires</Text>
              {data.next_steps.map((step, i) => (
                <View key={i} style={s.stepRow}>
                  <Text style={s.stepNum}>{i + 1}</Text>
                  <Text style={s.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={s.disclaimer}>
            CompliAI — Documentation Art. 11 · {systemName} — {now}
          </Text>
          <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}
    </Document>
  );
}

export async function generateArt11PDF(data: Art11Data, systemName: string): Promise<Buffer> {
  const el = React.createElement(Art11PDF, { data, systemName });
  return (await renderToBuffer(el)) as Buffer;
}
