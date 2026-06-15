import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { confirmCreditPackBySessionId } from "@/lib/stripe/fulfill-credit-pack";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { session_id?: string };
  const sessionId = body.session_id?.trim();

  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "session_id invalide" }, { status: 400 });
  }

  try {
    const result = await confirmCreditPackBySessionId(sessionId, user.id);

    if (result.status === "forbidden_user") {
      return NextResponse.json({ error: "Session non autorisée" }, { status: 403 });
    }

    if (result.status === "not_paid") {
      return NextResponse.json({ error: "Paiement non finalisé" }, { status: 402 });
    }

    if (result.status === "not_applicable") {
      return NextResponse.json({ error: "Session non reconnue" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      alreadyFulfilled: result.status === "already_fulfilled",
      credits: result.credits,
      newBalance: result.newBalance,
    });
  } catch (err) {
    console.error("[confirm-credit-pack]", err);
    return NextResponse.json({ error: "Confirmation impossible" }, { status: 500 });
  }
}
