import { createClient as createAdminClient } from "@supabase/supabase-js";

const admin = () => createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function logAction(params: {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await admin().from("audit_trail").insert({
      user_id: params.user_id,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id ?? null,
      entity_name: params.entity_name ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    // Non-blocking — audit trail failure should never break the main flow
  }
}
