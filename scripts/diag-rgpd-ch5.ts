import { createClient } from "@supabase/supabase-js";

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await s.from('legal_chunks')
    .select('article_number, article_title, granularity')
    .ilike('regulation', '%RGPD%')
    .in('article_number', ['44','45','46','47','48','49'])
    .order('article_number');
  if (error) { console.error(error.message); process.exit(1); }
  console.log(JSON.stringify(data, null, 2));
}
void main();
