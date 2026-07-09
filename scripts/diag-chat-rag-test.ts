import { searchLegalChunks } from "../lib/ai/rag";

async function main() {
  const question = "quelles sont les conditions du chapitre V du RGPD (articles 44 à 49)";
  
  // Simule la détection asksMultiArticle
  const asksMultiArticle =
    /chapitre\s+[IVX\d]+|articles?\s+\d+\s*(à|au|et)\s*\d+|art\.\s*\d+\s*(à|et)\s*\d+/i.test(question) ||
    /chapter\s+[IVX\d]+|articles?\s+\d+\s*(to|and|through)\s*\d+/i.test(question);

  const ragMatchCount = asksMultiArticle ? 20 : 8;
  const ragThreshold = asksMultiArticle ? 0.3 : 0.6;

  console.log(`asksMultiArticle: ${asksMultiArticle}`);
  console.log(`matchCount: ${ragMatchCount}, threshold: ${ragThreshold}`);

  const chunks = await searchLegalChunks(question, ragMatchCount, ragThreshold);
  const articles = [...new Set(chunks.map(c => `Art.${c.article_number} (${c.regulation})`))];
  console.log(`\nChunks retournés: ${chunks.length}`);
  console.log("Articles couverts:");
  articles.forEach(a => console.log(" -", a));

  const covered = [44,45,46,47,48,49].map(n => ({
    article: n,
    found: chunks.some(c => c.article_number === String(n))
  }));
  console.log("\nCouverture chapitre V:");
  covered.forEach(c => console.log(` Art.${c.article}: ${c.found ? "✅" : "❌"}`));
}

void main().catch(console.error);
