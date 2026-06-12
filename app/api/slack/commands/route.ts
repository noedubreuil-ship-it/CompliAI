import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** Commande Slash Slack — configurez `/compliai` pointant vers cette URL avec SLACK_SIGNING_SECRET. */

const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function verify(rawBody: string, ts: string | null, sig: string | null, secret: string) {
  if (!ts || !sig) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const base = `v0:${ts}:${rawBody}`;
  const h = `v0=${createHmac("sha256", secret).update(base).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(h), Buffer.from(sig));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "SLACK_SIGNING_SECRET manquant" }, { status: 501 });
  }

  const raw = await request.text();
  const signatureOk = verify(
    raw,
    request.headers.get("x-slack-request-timestamp"),
    request.headers.get("x-slack-signature"),
    secret
  );
  if (!signatureOk) return NextResponse.json({ error: "Signature invalide" }, { status: 401 });

  const params = new URLSearchParams(raw);
  const command = params.get("command");
  const userSlackId = params.get("user_id");

  if (command !== "/compliai") {
    return new NextResponse(JSON.stringify({ text: `Commande inconnue: ${command}` }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  let extra = "";
  const mapUser = process.env.SLACK_MAPPED_SUPABASE_USER_ID;
  if (mapUser) {
    try {
      const svc = admin();
      const { data } = await svc
        .from("audits")
        .select("id, verdict, compliance_score, created_at")
        .eq("user_id", mapUser)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        extra = `\n• Dernier audit : ${data.verdict}${data.compliance_score != null ? ` (${data.compliance_score}%)` : ""} (${data.created_at})`;
      }
    } catch {
      /* ignore */
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://compliai.eu";
  const text =
    `*CompliAI* — légal IA / UE\n\n` +
    `${userSlackId ? `<@${userSlackId}> ` : ""}Associez les alertes critiques via webhook (dashboard → Intégrations).\n\n` +
    `• Dashboard : ${appUrl}/dashboard\n• API Bearer : ${appUrl}/api/v1/me\n` +
    extra;

  return new NextResponse(
    JSON.stringify({
      response_type: "ephemeral",
      text,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
