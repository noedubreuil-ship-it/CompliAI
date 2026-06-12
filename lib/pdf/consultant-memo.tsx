import { createElement, type ReactElement } from "react";
import {
  Document,
  Page,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

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

/** Préparation texte Markdown → texte continu lisible dans le PDF */
export function stripConsultantMarkdownForPdf(raw: string): string {
  return raw
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\r/g, "")
    .trim();
}

/** Découpe en blocs compatibles `@react-pdf` (pas de saut de Page à l'intérieur d'un très long bloc). */
export function chunkLongTextForPdf(text: string, approxMax: number): string[] {
  const t = text.trim();
  if (!t.length) return [""];
  if (t.length <= approxMax) return [t];

  const out: string[] = [];
  let start = 0;
  while (start < t.length) {
    let end = Math.min(start + approxMax, t.length);
    if (end < t.length) {
      const slice = t.slice(start, end);
      const paraBreak = slice.lastIndexOf("\n\n");
      if (paraBreak > approxMax * 0.2) end = start + paraBreak + 2;
      else {
        const sp = slice.lastIndexOf("\n");
        if (sp > approxMax * 0.35) end = start + sp + 1;
        else {
          const ws = slice.lastIndexOf(" ");
          if (ws > approxMax * 0.5) end = start + ws + 1;
        }
      }
    }
    const block = t.slice(start, end).trim();
    if (block.length) out.push(block);
    start = end;
  }
  return out.length ? out : [""];
}

export interface ConsultantMemoPdfProps {
  question: string;
  answerPlain: string;
  generatedAtLabel: string;
}

export function ConsultantMemoPDFDocument({ question, answerPlain, generatedAtLabel }: ConsultantMemoPdfProps) {
  const blocks = chunkLongTextForPdf(answerPlain, 4600);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CompliAI — Note consultant juridique (export)</Text>
        <Text style={styles.meta}>{generatedAtLabel}</Text>
        <Text style={styles.sectionLabel}>Question</Text>
        <Text wrap style={[styles.paragraph, { marginBottom: 14 }]}>
          {question.trim()}
        </Text>
        <Text style={styles.sectionLabel}>Réponse</Text>
        <Text wrap style={styles.paragraph}>
          {blocks[0] ?? ""}
        </Text>
        <Text style={styles.footer} fixed>
          Information juridique établie à partir de sources indexées — à confronter aux textes authentiques. Ne se
          substitue pas à un avocat pour un dossier précis ou contentieux.
        </Text>
      </Page>

      {blocks.slice(1).map((chunk, idx) => (
        <Page key={idx + 1} size="A4" style={styles.page}>
          <Text style={styles.sectionLabel}>Réponse (suite)</Text>
          <Text wrap style={styles.paragraph}>
            {chunk}
          </Text>
          <Text style={styles.footer} fixed>
            CompliAI — page {idx + 2}
          </Text>
        </Page>
      ))}
    </Document>
  );
}

/** Génère le PDF comme buffer HTTP (routes API Next). */
export async function generateConsultantMemoPdf(props: ConsultantMemoPdfProps): Promise<Buffer> {
  const el = createElement(ConsultantMemoPDFDocument, props) as ReactElement;
  const buffer = await renderToBuffer(el);
  return buffer as Buffer;
}
