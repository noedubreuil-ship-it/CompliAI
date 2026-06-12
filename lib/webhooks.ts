/**
 * Déclenche les webhooks sortants configurés par l'utilisateur.
 */
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function deliverUserWebhooks(opts: {
  userId: string;
  event: string;
  payload: Record<string, unknown>;
}) {
  const svc = admin();
  const { data: endpoints } = await svc
    .from("webhook_endpoints")
    .select("id, url, signing_secret, events")
    .eq("user_id", opts.userId)
    .eq("is_active", true);

  const bodyObj = {
    event: opts.event,
    sent_at: new Date().toISOString(),
    data: opts.payload,
  };
  const body = JSON.stringify(bodyObj);

  for (const ep of endpoints ?? []) {
    const events = ep.events ?? ["blocking_issue.created"];
    if (!events.includes(opts.event)) continue;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "CompliAI-Webhooks/1.0",
      "X-CompliAI-Event": opts.event,
    };
    const secret = ep.signing_secret ?? process.env.WEBHOOK_SIGNING_FALLBACK_SECRET;
    if (secret) {
      const sig = createHmac("sha256", secret).update(body).digest("hex");
      headers["X-CompliAI-Signature"] = `sha256=${sig}`;
    }

    try {
      await fetch(ep.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });
    } catch (e) {
      console.error(JSON.stringify({ level: "warn", webhookId: ep.id, err: String(e) }));
    }
  }
}
