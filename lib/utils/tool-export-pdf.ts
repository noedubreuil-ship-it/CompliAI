export interface ToolPdfSection {
  heading: string;
  body: string;
}

export async function downloadToolExportPdf(opts: {
  title: string;
  subtitle?: string;
  sections: ToolPdfSection[];
  filename: string;
}): Promise<void> {
  const res = await fetch("/api/generate/export-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: opts.title,
      subtitle: opts.subtitle,
      sections: opts.sections,
      filename: opts.filename,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Erreur export PDF");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${opts.filename.replace(/[^\w.-]+/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
