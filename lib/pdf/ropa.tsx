import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

const C = {
  slate900: "#0f172a", slate700: "#334155", slate500: "#64748b",
  slate200: "#e2e8f0", slate50: "#f8fafc", green700: "#15803d",
  blue600: "#2563eb", red600: "#dc2626", amber600: "#d97706",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: C.slate900, paddingTop: 40, paddingBottom: 60, paddingHorizontal: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: C.slate900 },
  logo: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  logoSub: { fontSize: 7, color: C.slate500, marginTop: 2 },
  docType: { fontSize: 8, color: C.slate700, marginTop: 2 },
  dateText: { fontSize: 7, color: C.slate500 },
  titleBox: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: 5, padding: 12, marginBottom: 16 },
  titleMain: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.slate900, marginBottom: 4 },
  titleSub: { fontSize: 8, color: C.green700 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.slate900, marginBottom: 6, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: C.slate200 },
  infoRow: { flexDirection: "row", marginBottom: 3 },
  label: { width: 140, color: C.slate500, fontSize: 8 },
  value: { flex: 1, color: C.slate900, fontSize: 8 },
  treatmentCard: { marginBottom: 10, padding: 8, borderWidth: 1, borderColor: C.slate200, borderRadius: 4 },
  treatmentName: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 6, color: C.blue600 },
  tag: { fontSize: 7, backgroundColor: "#eff6ff", color: "#1e40af", borderRadius: 3, padding: "2 4", marginRight: 3 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 3, marginBottom: 4 },
  dpiaAlert: { backgroundColor: "#fef9c3", borderWidth: 1, borderColor: "#fde047", borderRadius: 3, padding: "3 6", marginTop: 4, fontSize: 7, color: "#713f12" },
  disclaimer: { position: "absolute", bottom: 28, left: 50, right: 50, fontSize: 7, color: C.slate500, lineHeight: 1.4, borderTopWidth: 1, borderTopColor: C.slate200, paddingTop: 6 },
  pageNum: { position: "absolute", bottom: 16, right: 50, fontSize: 7, color: C.slate500 },
  riskChip: { fontSize: 7, borderRadius: 3, padding: "2 5" },
});

function RoPADoc({ data, companyName }: { data: any; companyName: string }) {
  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <Document title={`RoPA — ${companyName}`} author="CompliAI">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.logo}>CompliAI</Text>
            <Text style={s.logoSub}>Conformité réglementaire · compliai.eu</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.dateText}>Généré le {now}</Text>
            <Text style={s.docType}>RoPA — Art. 30 RGPD (UE 2016/679)</Text>
          </View>
        </View>

        {/* Title */}
        <View style={s.titleBox}>
          <Text style={s.titleMain}>Registre des activités de traitement</Text>
          <Text style={s.titleSub}>Record of Processing Activities (RoPA) — Art. 30 RGPD</Text>
        </View>

        {/* Company info */}
        {data.company_overview && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Informations sur le responsable de traitement</Text>
            <View style={s.infoRow}><Text style={s.label}>Organisation</Text><Text style={s.value}>{companyName}</Text></View>
            {data.company_overview.sector && <View style={s.infoRow}><Text style={s.label}>Secteur</Text><Text style={s.value}>{data.company_overview.sector}</Text></View>}
            {data.company_overview.applicable_regulations?.length > 0 && (
              <View style={s.infoRow}><Text style={s.label}>Réglementations applicables</Text><Text style={s.value}>{data.company_overview.applicable_regulations.join(", ")}</Text></View>
            )}
          </View>
        )}

        {/* DPO info */}
        {data.dpo_info && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Délégué à la Protection des Données (DPO)</Text>
            {data.dpo_info.name && <View style={s.infoRow}><Text style={s.label}>Nom</Text><Text style={s.value}>{data.dpo_info.name}</Text></View>}
            {data.dpo_info.email && <View style={s.infoRow}><Text style={s.label}>E-mail</Text><Text style={s.value}>{data.dpo_info.email}</Text></View>}
            {data.dpo_info.designation_required !== undefined && (
              <View style={s.infoRow}><Text style={s.label}>Désignation obligatoire</Text><Text style={s.value}>{data.dpo_info.designation_required ? "Oui" : "Non"}</Text></View>
            )}
            {data.dpo_info.reason && <View style={s.infoRow}><Text style={s.label}>Motif</Text><Text style={s.value}>{data.dpo_info.reason}</Text></View>}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>
            Activités de traitement ({data.treatments?.length ?? 0})
          </Text>
          {(data.treatments ?? []).map((t: any, i: number) => (
            <View key={i} style={s.treatmentCard} wrap={false}>
              <Text style={s.treatmentName}>{i + 1}. {t.name}</Text>

              <View style={s.infoRow}><Text style={s.label}>Finalité</Text><Text style={s.value}>{t.purpose}</Text></View>
              <View style={s.infoRow}><Text style={s.label}>Base légale</Text><Text style={s.value}>{t.legal_basis}</Text></View>
              <View style={s.infoRow}><Text style={s.label}>Personnes concernées</Text><Text style={s.value}>{t.data_subjects}</Text></View>
              <View style={s.infoRow}><Text style={s.label}>Durée de conservation</Text><Text style={s.value}>{t.retention}</Text></View>

              {t.categories?.length > 0 && (
                <View style={{ ...s.infoRow, marginTop: 3 }}>
                  <Text style={s.label}>Catégories de données</Text>
                  <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 3 }}>
                    {t.categories.map((c: string, j: number) => <Text key={j} style={s.tag}>{c}</Text>)}
                  </View>
                </View>
              )}

              {t.recipients?.length > 0 && (
                <View style={{ ...s.infoRow, marginTop: 3 }}>
                  <Text style={s.label}>Destinataires</Text>
                  <Text style={{ ...s.value, flex: 1 }}>{t.recipients.join(", ")}</Text>
                </View>
              )}

              {t.transfers_outside_eu && (
                <View style={s.infoRow}><Text style={s.label}>Transferts hors UE</Text><Text style={{ ...s.value, color: C.amber600 }}>⚠ Oui — {t.transfer_safeguards ?? "Garanties à documenter"}</Text></View>
              )}

              {t.dpia_required && (
                <Text style={s.dpiaAlert}>⚠ DPIA requise pour ce traitement (Art. 35 RGPD)</Text>
              )}
            </View>
          ))}
        </View>

        {/* Security measures */}
        {data.security_measures?.technical?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Mesures de sécurité</Text>
            <Text style={{ ...s.label, marginBottom: 4 }}>Techniques</Text>
            {data.security_measures.technical.map((m: string, i: number) => (
              <View key={i} style={{ flexDirection: "row", gap: 5, marginBottom: 2 }}>
                <Text style={{ color: C.green700, fontSize: 9 }}>•</Text>
                <Text style={{ fontSize: 8, color: C.slate700 }}>{m}</Text>
              </View>
            ))}
            {data.security_measures.organizational?.length > 0 && (
              <>
                <Text style={{ ...s.label, marginTop: 6, marginBottom: 4 }}>Organisationnelles</Text>
                {data.security_measures.organizational.map((m: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", gap: 5, marginBottom: 2 }}>
                    <Text style={{ color: C.blue600, fontSize: 9 }}>•</Text>
                    <Text style={{ fontSize: 8, color: C.slate700 }}>{m}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Disclaimer */}
        <Text style={s.disclaimer}>
          Document généré par CompliAI à titre d&apos;aide à la conformité. Ne constitue pas un avis juridique.
          Vérifiez ce document avec votre DPO ou un conseiller juridique spécialisé en droit des données.
          Généré le {now}.
        </Text>
        <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

export async function generateRoPAPDF(data: any, companyName: string): Promise<Buffer> {
  const element = React.createElement(RoPADoc, { data, companyName });
  return await renderToBuffer(element as any);
}
