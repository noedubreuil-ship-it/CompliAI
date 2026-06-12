import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getCreditMetrics30d } from "@/lib/admin/credit-metrics";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const metrics = await getCreditMetrics30d();
    return NextResponse.json(metrics);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
