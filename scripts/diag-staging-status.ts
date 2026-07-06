#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const DOC_IDS = {
  DATA_ACT: "bb3c01a2-6794-4d50-a1a1-4066f0643d92",
  MACHINE:  "44aa471d-9974-4a6e-aaa8-5eefbfa9ddd5",
};

void (async () => {
  for (const [reg, id] of Object.entries(DOC_IDS)) {
    const { data } = await sb.from("staging_chunks")
      .select("validation_status")
      .eq("document_id", id);
    const counts: Record<string, number> = {};
    for (const r of (data ?? [])) {
      const s = (r.validation_status as string) ?? "null";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    console.log(`${reg}: total=${data?.length ?? 0}`, JSON.stringify(counts));
  }
})();
