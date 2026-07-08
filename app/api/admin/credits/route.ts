import { NextResponse } from "next/server";
import { isAdmin, listUsersWithCredits, adminAdjustCredits, getAuthUser } from "@/lib/admin";
import { z } from "zod";
import { rateLimitUser, RATE_LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

// GET /api/admin/credits?page=1&pageSize=50&search=...
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user || !(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const limited = await rateLimitUser(user.id, "admin", RATE_LIMITS.admin);
  if (limited) return limited;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") ?? "50"), 200);
  const search = url.searchParams.get("search") ?? "";

  try {
    const result = await listUsersWithCredits({ page, pageSize, search: search || undefined });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/admin/credits — ajustement manuel
const AdjustSchema = z.object({
  targetUserId: z.string().uuid(),
  delta: z.number().int(),
  reason: z.string().min(3).max(200),
});

export async function POST(request: Request) {
  const adminUser = await getAuthUser();
  if (!adminUser || !(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const limited = await rateLimitUser(adminUser.id, "admin", RATE_LIMITS.admin);
  if (limited) return limited;

  const body = await request.json();
  const parsed = AdjustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await adminAdjustCredits({
      targetUserId: parsed.data.targetUserId,
      adminUserId: adminUser.id,
      delta: parsed.data.delta,
      reason: parsed.data.reason,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
