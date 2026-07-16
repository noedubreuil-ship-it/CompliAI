"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Loader2, Download } from "lucide-react";
import Link from "next/link";

const SECTORS = ["Tech / SaaS", "Finance", "Santé", "RH & Recrutement", "Retail / E-commerce", "Industrie", "Consulting", "Éducation", "Autre"];
const EMPLOYEE_COUNTS = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

export default function PolicyPage() {
  const t = useTranslations("ToolPolicy");
  const locale = useLocale();
  const [form, setForm] = useState({
    company_name: "",
    sector: "Tech / SaaS",
    ai_tools_used: "",
    employee_count: "11-50",
    country: "France",
    cse_status: "non précisé",
    additional_context: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/generate/policy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.content);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    if (!result) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/generate/policy/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: result, companyName: form.company_name }),
      });
      if (!res.ok) throw new Error(t("pdfError"));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `politique-ia-${form.company_name.replace(/\s/g, "_")}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { setError(e.message); }
    finally { setDownloading(false); }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tools"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" /> {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {!result ? (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("formTitle")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">{t("companyName")}</label>
                <input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  placeholder={t("companyPlaceholder")}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">{t("sector")}</label>
                <select value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  {SECTORS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">{t("employeeCount")}</label>
                <select value={form.employee_count} onChange={e => setForm(f => ({ ...f, employee_count: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  {EMPLOYEE_COUNTS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">{t("country")}</label>
                <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="France">France</option>
                  <option value="Allemagne">Allemagne</option>
                  <option value="Belgique">Belgique</option>
                  <option value="Autre État membre UE">Autre État membre UE</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">{t("cse")}</label>
                <select value={form.cse_status} onChange={e => setForm(f => ({ ...f, cse_status: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="non précisé">{t("cseUnspecified")}</option>
                  <option value="Oui (CSE ou équivalent)">{t("cseYes")}</option>
                  <option value="Non — pas de CSE / sous seuils">{t("cseNo")}</option>
                  <option value="En cours de mise en place">{t("cseInProgress")}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">{t("aiTools")}</label>
              <textarea value={form.ai_tools_used} onChange={e => setForm(f => ({ ...f, ai_tools_used: e.target.value }))}
                placeholder={t("aiToolsPlaceholder")} rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">{t("details")}</label>
              <textarea value={form.additional_context} onChange={e => setForm(f => ({ ...f, additional_context: e.target.value }))}
                placeholder={t("detailsPlaceholder")}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={generate} disabled={loading || !form.company_name || !form.ai_tools_used} className="w-full bg-green-600 hover:bg-green-700">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("generating")}</> : t("generate")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{result.title}</h2>
              <p className="text-sm text-muted-foreground">
                {t("version")} {result.version}
                {result.effective_date ? ` · ${t("effectiveDate")} ${result.effective_date}` : ""}
                {result.estimated_incomplete_count != null && result.estimated_incomplete_count > 0 ?
                  ` · ${t("toComplete", { n: result.estimated_incomplete_count })}`
                : ""}
                {" "}· Art. 4 AI Act · RGPD
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setResult(null)}>{t("newPolicy")}</Button>
              <Button size="sm" onClick={downloadPdf} disabled={downloading} className="bg-green-600 hover:bg-green-700">
                {downloading ? <><Loader2 className="h-4 w-4 animate-spin" /> PDF…</> : <><Download className="h-4 w-4" /> {t("downloadPdf")}</>}
              </Button>
            </div>
          </div>

          {result.header_meta_note && (
            <Card className="border-slate-200 bg-slate-50">
              <CardHeader className="py-3"><CardTitle className="text-sm">{t("headerScope")}</CardTitle></CardHeader>
              <CardContent className="pt-0 text-sm text-slate-700 whitespace-pre-wrap">{result.header_meta_note}</CardContent>
            </Card>
          )}

          {result.key_rules?.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader><CardTitle className="text-sm text-green-800">{t("keyRules")}</CardTitle></CardHeader>
              <CardContent>
                <ol className="space-y-1">
                  {result.key_rules.map((rule: string, i: number) => (
                    <li key={i} className="text-sm text-green-800 flex gap-2">
                      <span className="font-bold flex-shrink-0">{i + 1}.</span> {rule}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {result.sections?.map((section: any) => (
            <Card key={section.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{section.id}. {section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate-800 prose prose-sm max-w-none
                  prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-li:my-0.5
                  prose-strong:text-slate-900 prose-table:text-xs prose-th:bg-slate-100 prose-th:p-2 prose-td:p-2">
                  <ReactMarkdown>{section.content}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          ))}

          {result.professional_footer && (
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-xs text-muted-foreground">{t("legalMention")}</CardTitle></CardHeader>
              <CardContent className="pt-0 prose prose-sm max-w-none text-slate-600">
                <ReactMarkdown>{result.professional_footer}</ReactMarkdown>
              </CardContent>
            </Card>
          )}

          <div className="bg-slate-50 border rounded-lg p-4 text-xs text-slate-500">
            {t("disclaimer")}
          </div>
        </div>
      )}
    </div>
  );
}
