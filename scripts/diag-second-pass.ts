import { createClient } from "@supabase/supabase-js";

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const question = "quelles sont les conditions du chapitre V du RGPD (articles 44 à 49)";

  // Simule la regex du second pass
  const rangeMatch = question.match(/articles?\s+(\d+)\s*(?:à|au|to|through)\s*(\d+)/i) ||
                     question.match(/art\.\s*(\d+)\s*(?:à|et|to)\s*(\d+)/i);
  console.log("rangeMatch:", rangeMatch);

  if (rangeMatch) {
    const from = parseInt(rangeMatch[1]);
    const to = parseInt(rangeMatch[2]);
    const articleNumbers = Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
    console.log("Articles à chercher:", articleNumbers);

    const { data, error } = await s
      .from("legal_chunks")
      .select("id, regulation, article_number, article_title, granularity")
      .in("article_number", articleNumbers)
      .in("granularity", ["article", "paragraph"])
      .order("article_number");

    console.log(`\nRésultats: ${data?.length ?? 0} chunks`);
    console.log("error:", error?.message);
    
    const byArticle = new Map<string, number>();
    for (const c of data ?? []) {
      byArticle.set(c.article_number, (byArticle.get(c.article_number) ?? 0) + 1);
    }
    console.log("\nPar article:");
    for (const [art, count] of byArticle) {
      console.log(`  Art.${art} (${data?.find(c => c.article_number === art)?.regulation}): ${count} chunks`);
    }
  }
}
void main();
