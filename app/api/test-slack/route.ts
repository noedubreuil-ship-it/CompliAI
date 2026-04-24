import { NextResponse } from "next/server";
import { sendSlackNotification } from "@/lib/slack";

export async function POST(request: Request) {
  const { webhook_url } = await request.json();
  if (!webhook_url) return NextResponse.json({ error: "webhook_url requis" }, { status: 400 });

  await sendSlackNotification(webhook_url, {
    title: "Test de connexion",
    text: "✓ CompliAI est bien connecté à votre workspace. Vous recevrez les alertes de conformité ici.",
    color: "#16a34a",
  });

  return NextResponse.json({ ok: true });
}
