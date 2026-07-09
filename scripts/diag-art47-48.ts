import { createClient } from "@supabase/supabase-js";

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data, error } = await s
    .from("legal_chunks")
    .select("id, regulation, article_number, article_title, granularity, content")
    .ilike("regulation", "%RGPD%")
    .in("article_number", ["47", "48"])
    .order("article_number");

  if (error) { console.error(error.message); process.exit(1); }
  
  console.log(`Total chunks Art.47+48: ${data?.length}`);
  for (const c of data ?? []) {
    console.log(`\n[${c.article_number}] ${c.article_title} | ${c.granularity}`);
    console.log(c.content.slice(0, 200));
  }
}
void main();
