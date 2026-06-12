import { createElement } from "react";
import {
  Document,
  Page,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { stripConsultantMarkdownForPdf, chunkLongTextForPdf } from "@/lib/pdf/consultant-memo";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    paddingBottom: 56,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    color: "#0f172a",
  },
  meta: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
    marginTop: 10,
    fontFamily: "Helvetica-Bold",
  },
  paragraph: {
    fontSize: 9,
    lineHeight: 1.45,
    marginBottom: 8,
    textAlign: "justify",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    fontSize: 7,
    color: "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
  },
});

export interface ToolExportSection {
  heading: string;
  body: string;
}

export interface ToolExportPdfInput {
  title: string;
  subtitle?: string;
  sections: ToolExportSection[];
}

function ToolExportPDFDocument({ title, subtitle, sections }: ToolExportPdfInput) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.meta}>{subtitle}</Text> : null}
        {sections.map((sec, i) => {
          const plain = stripConsultantMarkdownForPdf(sec.body);
          const blocks = chunkLongTextForPdf(plain, 4600);
          return (
            <Text key={`sec-${i}`}>
              <Text style={styles.sectionLabel}>{sec.heading}</Text>
              {blocks.map((block, j) => (
                <Text key={`b-${i}-${j}`} wrap style={styles.paragraph}>
                  {block}
                </Text>
              ))}
            </Text>
          );
        })}
        <Text style={styles.footer} fixed>
          Export CompliAI — information juridique, à confronter aux textes authentiques. Ne se substitue pas à un
          avocat.
        </Text>
      </Page>
    </Document>
  );
}

export async function generateToolExportPdf(input: ToolExportPdfInput): Promise<Buffer> {
  const doc = createElement(ToolExportPDFDocument, input);
  return renderToBuffer(doc);
}
