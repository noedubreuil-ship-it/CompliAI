import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowLeft, Clock, Calendar, Tag } from "lucide-react";
import { BLOG_ARTICLES, getArticleBySlug } from "@/lib/blog/articles";
import { MarketingSiteFooter } from "@/components/marketing/MarketingSiteFooter";
import { loginRedirectHref } from "@/lib/marketing/site-links";

export async function generateStaticParams() {
  return BLOG_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};
  return {
    title: `${article.title} — CompliAI`,
    description: article.description,
    alternates: { canonical: `https://www.compliai.eu/blog/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `https://www.compliai.eu/blog/${article.slug}`,
      type: "article",
      publishedTime: article.date,
    },
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Very minimal markdown to HTML renderer for the article content
function renderMarkdown(md: string): string {
  return md
    .trim()
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^---$/gm, "<hr />")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/^\| (.+)$/gm, (line) => {
      const cells = line
        .split("|")
        .filter((c) => c.trim())
        .map((c) => `<td>${c.trim()}</td>`);
      return `<tr>${cells.join("")}</tr>`;
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g, "<table>$&</table>")
    .replace(
      /<table><tr><td>(.+?)<\/td>(<td>-+<\/td>)+<\/tr>/g,
      (m) => m.replace(/<table>/, "<table>").replace(/<tr>/, "<thead><tr>").replace(/<\/tr>/, "</tr></thead><tbody>"),
    )
    .replace(/\n\n/g, "</p><p>")
    .replace(/^([^<\n].+)$/gm, "<p>$1</p>");
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const otherArticles = BLOG_ARTICLES.filter((a) => a.slug !== slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-white text-[#1D1D1F]">
      {/* Nav */}
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Shield className="h-5 w-5 text-[#003399]" />
          CompliAI
        </Link>
        <Link
          href={loginRedirectHref("/dashboard/tools/checklist")}
          className="text-sm font-medium px-4 py-2 rounded-full bg-[#003399] text-white hover:bg-[#0044cc] transition-colors"
        >
          Essai gratuit
        </Link>
      </nav>

      {/* Article */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Back */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-[#6E6E73] hover:text-[#003399] transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au blog
        </Link>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-[#003399]"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1D1D1F] mb-4 leading-tight">
          {article.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-[#6E6E73] mb-8 pb-8 border-b">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {formatDate(article.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {article.readMinutes} min de lecture
          </span>
          <span>Par {article.author}</span>
        </div>

        {/* Content */}
        <div
          className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-[#1D1D1F] prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-[#3D3D3D] prose-p:leading-relaxed prose-strong:text-[#1D1D1F] prose-a:text-[#003399] prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-[#003399] prose-blockquote:pl-4 prose-blockquote:text-[#3D3D3D] prose-blockquote:italic prose-li:text-[#3D3D3D] prose-table:text-sm prose-th:bg-[#F5F5F7] prose-th:p-2 prose-td:p-2 prose-td:border prose-hr:border-[#E5E5E7]"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
        />

        {/* CTA */}
        <div className="mt-12 p-6 rounded-2xl bg-[#003399] text-white text-center space-y-3">
          <p className="font-semibold text-lg">Prêt à automatiser votre conformité ?</p>
          <p className="text-blue-100 text-sm">CompliAI génère vos documents de conformité (DPIA, ROPA, checklist AI Act) en quelques minutes.</p>
          <Link
            href={loginRedirectHref("/dashboard")}
            className="inline-block mt-2 px-6 py-2.5 rounded-full bg-white text-[#003399] font-semibold text-sm hover:bg-blue-50 transition-colors"
          >
            Essayer gratuitement →
          </Link>
        </div>
      </div>

      {/* Related articles */}
      {otherArticles.length > 0 && (
        <div className="border-t bg-[#F5F5F7]">
          <div className="max-w-3xl mx-auto px-6 py-12">
            <h2 className="text-lg font-bold mb-6">Autres articles</h2>
            <div className="space-y-4">
              {otherArticles.map((a) => (
                <Link
                  key={a.slug}
                  href={`/blog/${a.slug}`}
                  className="block p-4 rounded-xl bg-white border border-[#E5E5E7] hover:border-[#003399]/30 hover:shadow-sm transition-all"
                >
                  <p className="font-semibold text-[#1D1D1F] text-sm mb-1">{a.title}</p>
                  <p className="text-xs text-[#6E6E73] line-clamp-2">{a.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <MarketingSiteFooter />
    </div>
  );
}
