import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Clock, Calendar, ArrowRight, Tag } from "lucide-react";
import { BLOG_ARTICLES } from "@/lib/blog/articles";
import { MarketingSiteFooter } from "@/components/marketing/MarketingSiteFooter";

export const metadata: Metadata = {
  title: "Blog — Conformité RGPD, AI Act, NIS2 | CompliAI",
  description:
    "Analyses, guides pratiques et actualités sur le droit européen du numérique : RGPD, AI Act, NIS2, DSA. Pour DPO, juristes et équipes de conformité.",
  alternates: { canonical: "https://www.compliai.eu/blog" },
  openGraph: {
    title: "Blog CompliAI — Conformité RGPD et AI Act",
    description: "Analyses et guides pratiques pour DPO, juristes et équipes de conformité.",
    url: "https://www.compliai.eu/blog",
  },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPage() {
  const sorted = [...BLOG_ARTICLES].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const [featured, ...rest] = sorted;

  return (
    <div className="min-h-screen bg-white text-[#1D1D1F]">
      {/* Nav */}
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Shield className="h-5 w-5 text-[#003399]" />
          CompliAI
        </Link>
        <Link
          href="/auth/login"
          className="text-sm font-medium px-4 py-2 rounded-full bg-[#003399] text-white hover:bg-[#0044cc] transition-colors"
        >
          Essai gratuit
        </Link>
      </nav>

      {/* Header */}
      <section className="bg-[#F5F5F7] py-16 px-6 text-center">
        <p className="text-xs font-semibold text-[#003399] tracking-widest uppercase mb-4">
          Blog CompliAI
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[#1D1D1F] mb-4">
          Conformité RGPD, AI Act & NIS2
        </h1>
        <p className="text-lg text-[#6E6E73] max-w-xl mx-auto">
          Analyses, guides pratiques et actualités pour DPO, juristes et équipes de conformité.
        </p>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Featured article */}
        {featured && (
          <Link
            href={`/blog/${featured.slug}`}
            className="block mb-12 rounded-2xl border border-[#E5E5E7] overflow-hidden hover:border-[#003399]/30 hover:shadow-md transition-all group"
          >
            <div className="p-8 md:p-10">
              <div className="flex flex-wrap gap-2 mb-4">
                {featured.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-[#003399]"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#1D1D1F] mb-3 group-hover:text-[#003399] transition-colors">
                {featured.title}
              </h2>
              <p className="text-[#6E6E73] mb-6 text-base leading-relaxed max-w-2xl">
                {featured.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-[#6E6E73]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {formatDate(featured.date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {featured.readMinutes} min
                  </span>
                </div>
                <span className="flex items-center gap-1 text-sm font-medium text-[#003399] group-hover:gap-2 transition-all">
                  Lire l&apos;article
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Article grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rest.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="block rounded-xl border border-[#E5E5E7] p-6 hover:border-[#003399]/30 hover:shadow-sm transition-all group"
            >
              <div className="flex flex-wrap gap-1.5 mb-3">
                {article.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#6E6E73]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="font-bold text-[#1D1D1F] mb-2 group-hover:text-[#003399] transition-colors leading-snug">
                {article.title}
              </h3>
              <p className="text-sm text-[#6E6E73] mb-4 line-clamp-2 leading-relaxed">
                {article.description}
              </p>
              <div className="flex items-center gap-3 text-xs text-[#6E6E73]">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(article.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {article.readMinutes} min
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <MarketingSiteFooter />
    </div>
  );
}
