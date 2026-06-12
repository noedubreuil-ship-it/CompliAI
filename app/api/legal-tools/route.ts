import { NextResponse } from "next/server";

/** @deprecated Utilisez POST /api/generate/<outil> (v2). */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Endpoint déprécié. Utilisez les routes /api/generate/* (ex. /api/generate/resume-arret, /api/generate/quiz).",
      code: "deprecated_legal_tools",
    },
    { status: 410 },
  );
}
