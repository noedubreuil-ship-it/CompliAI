import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** Fusionne un template JSON sauvegardé dans le payload de génération (M3). */
export async function mergeDocumentTemplate(
  userId: string,
  templateId: string | undefined,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!templateId?.trim()) return payload;

  const { data: tpl } = await admin()
    .from("document_templates")
    .select("template, doc_type")
    .eq("id", templateId.trim())
    .eq("user_id", userId)
    .maybeSingle();

  if (!tpl?.template || typeof tpl.template !== "object") return payload;

  const base = tpl.template as Record<string, unknown>;
  return { ...base, ...payload, _template_id: templateId };
}
