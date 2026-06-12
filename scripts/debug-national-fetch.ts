import { fetchAllowlistedNationalHttpsPage } from "@/lib/ai/national-auto-ingest";
import { EU27 } from "@/lib/data/eu27-registry";

async function main() {
  const codes = process.argv.slice(2).length ? process.argv.slice(2) : ["DK", "EE", "GR", "HU", "LT", "LU", "PT", "RO", "SI", "SK"];
  for (const c of codes) {
    const row = EU27[c];
    if (!row) continue;
    const urls = [row.gdpr_law.fetch_url, row.gdpr_law.portal_url].filter(Boolean) as string[];
    let best = 0;
    for (const u of urls) {
      const r = await fetchAllowlistedNationalHttpsPage(u, c);
      const n = r?.text?.length ?? 0;
      console.log(`${c} ${n} ${u}`);
      if (n > best) best = n;
    }
    console.log(`${c} BEST=${best}\n`);
  }
}

main();
