import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

const C = {
  navy: "#0f172a",
  dark: "#334155",
  mid: "#64748b",
  light: "#e2e8f0",
  pale: "#f8fafc",
  green: "#15803d",
  greenBg: "#f0fdf4",
  greenLight: "#dcfce7",
  white: "#ffffff",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: C.navy, paddingTop: 40, paddingBottom: 60, paddingHorizontal: 50 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: C.navy,
  },
  logo: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  logoSub: { fontSize: 8, color: C.mid, marginTop: 2 },
  docType: { fontSize: 9, color: C.dark },
  dateText: { fontSize: 8, color: C.mid, marginTop: 2 },
  titleBox: { backgroundColor: "#14532d", borderRadius: 6, padding: 16, marginBottom: 16 },
  titleText: { fontSize: 15, fontFamily: "Helvetica-Bold", color: C.white, marginBottom: 4 },
  titleMeta: { fontSize: 9, color: "#86efac" },
  metaExtra: { fontSize: 8, color: "#bbf7d0", marginTop: 6, lineHeight: 1.45 },
  rulesBox: {
    backgroundColor: C.greenBg,
    borderWidth: 1,
    borderColor: C.greenLight,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  rulesTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.green, marginBottom: 8 },
  ruleRow: { flexDirection: "row", gap: 6, marginBottom: 5 },
  ruleNum: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.green, width: 14 },
  ruleText: { flex: 1, fontSize: 9, color: "#166534", lineHeight: 1.5 },
  sectionCard: {
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.light,
    backgroundColor: C.pale,
  },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.navy, marginBottom: 6 },
  sectionText: { fontSize: 9, color: C.dark, lineHeight: 1.6 },
  signBox: { borderWidth: 1, borderColor: C.light, borderRadius: 4, padding: 12, marginTop: 8 },
  signTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.navy, marginBottom: 12 },
  signRow: { flexDirection: "row", gap: 20, marginBottom: 20 },
  signField: { flex: 1 },
  signLabel: { fontSize: 8, color: C.mid, marginBottom: 20 },
  signLine: { borderBottomWidth: 1, borderBottomColor: C.navy, marginBottom: 4 },
  disclaimer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    fontSize: 7,
    color: C.mid,
    lineHeight: 1.4,
    borderTopWidth: 1,
    borderTopColor: C.light,
    paddingTop: 8,
  },
  pageNumber: { position: "absolute", bottom: 18, right: 50, fontSize: 8, color: C.mid },
  contHeader: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.mid, marginBottom: 14 },
});

function chunk<T>(items: readonly T[], size: number): T[][] {
  if (!items?.length) return [];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const SECTIONS_PER_PAGE = 2;

export interface PolicyData {
  title: string;
  version: string;
  effective_date?: string;
  header_meta_note?: string;
  professional_footer?: string;
  estimated_incomplete_count?: number;
  sections: Array<{ id: string; title: string; content: string }>;
  key_rules: string[];
}

function PdfHeader({
  subtitle,
}: {
  subtitle: string;
}) {
  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <View style={s.header}>
      <View>
        <Text style={s.logo}>CompliAI</Text>
        <Text style={s.logoSub}>Conformité réglementaire IA · compliai.eu</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={s.docType}>{subtitle}</Text>
        <Text style={s.dateText}>Généré le {now}</Text>
      </View>
    </View>
  );
}

function PolicyPDF({ data, companyName }: { data: PolicyData; companyName: string }) {
  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const sectionChunks =
    chunk(data.sections ?? [], SECTIONS_PER_PAGE).length > 0 ?
      chunk(data.sections ?? [], SECTIONS_PER_PAGE)
    : [[]];

  const titleMetaPieces = [`Version ${data.version}`, `Art. 4 AI Act · RGPD`, companyName];
  if (data.effective_date) titleMetaPieces.splice(2, 0, `Effet : ${data.effective_date}`);
  const titleMetaStr = titleMetaPieces.join(" · ");

  const baseDisclaimer =
    `Document généré par CompliAI sur la base de l’AI Act UE 2024/1689 (Art. 4) et du RGPD. ` +
    `Information générale — validation DPO/avocat recommandée. Entreprise : ${companyName} — ${now}.`;

  return (
    <Document title={data.title} author="CompliAI">
      {sectionChunks.map((sectionSlice, ci) => (
        <Page key={ci} size="A4" style={s.page} wrap>
          <PdfHeader subtitle={ci === 0 ? "POLITIQUE INTERNE — CONFIDENTIEL" : "POLITIQUE IA — SUITE DU DOCUMENT"} />

          {ci > 0 && <Text style={s.contHeader}>Suite — Politique IA · {companyName}</Text>}

          {ci === 0 && (
            <>
              <View style={s.titleBox}>
                <Text style={s.titleText}>{data.title}</Text>
                <Text style={s.titleMeta}>{titleMetaStr}</Text>
                {data.header_meta_note ?
                  <Text style={s.metaExtra}>{data.header_meta_note}</Text>
                : null}
              </View>

              {data.estimated_incomplete_count != null && data.estimated_incomplete_count > 0 ?
                <Text style={{ fontSize: 8, color: "#b45309", marginBottom: 10 }}>
                  Repères [À COMPLÉTER] estimés dans le corps : environ {data.estimated_incomplete_count}
                </Text>
              : null}

              {data.key_rules?.length > 0 && (
                <View style={s.rulesBox}>
                  <Text style={s.rulesTitle}>Règles clés à retenir</Text>
                  {data.key_rules.map((rule, i) => (
                    <View key={i} style={s.ruleRow}>
                      <Text style={s.ruleNum}>{i + 1}.</Text>
                      <Text style={s.ruleText}>{rule}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {sectionSlice.map(sec => (
            <View key={sec.id} style={s.sectionCard} wrap>
              <Text style={s.sectionTitle}>{sec.title}</Text>
              <Text style={s.sectionText}>{sec.content}</Text>
            </View>
          ))}

          {ci === sectionChunks.length - 1 && data.professional_footer ?
            <Text style={{ fontSize: 8, color: C.mid, marginTop: 8, lineHeight: 1.5 }}>{data.professional_footer}</Text>
          : null}

          <Text style={s.disclaimer}>{baseDisclaimer}</Text>
          <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      ))}

      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.logo}>CompliAI</Text>
          <Text style={s.docType}>PAGE DE SIGNATURE — {companyName.toUpperCase()}</Text>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 8 }}>Accusé de réception et engagement</Text>
          <Text style={{ fontSize: 9, color: C.dark, lineHeight: 1.6 }}>
            En signant ce document, l&apos;employé(e) reconnaît avoir pris connaissance de la Politique d&apos;Usage de
            l&apos;IA de {companyName} (version {data.version}), s&apos;engage à en respecter les dispositions et
            reconnaît avoir été informé(e) du dispositif de formation et de littératie IA de l&apos;entreprise, conforme
            aux exigences générales dérivées de l&apos;Article 4 du Règlement (UE) 2024/1689 lorsqu&apos;elles
            s&apos;appliquent à l&apos;organisation.
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
  return (await renderToBuffer(React.createElement(PolicyPDF, { data, companyName }) as any)) as Buffer;
}
