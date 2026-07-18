/**
 * GET /api/admin/rag-validation/blocked
 *
 * Liste les documents détectés par le monitoring que le pipeline n'a PAS pu
 * ingérer automatiquement (statut `error`).
 *
 * Ces documents ne sont pas perdus : ils restent en base avec la raison de
 * l'échec, pour arbitrage manuel. Un document peut échouer parce que la page
 * cible est protégée par un anti-bot, parce qu'il n'a aucune valeur juridique
 * (communiqué de presse, annonce d'événement), ou parce que le parsing a
 * bute sur un cas non prévu.
 *
 * Route distincte de `/documents` : un document en erreur n'a pas de chunks,
 * donc aucune des statistiques de validation ne s'y applique.
 *
 * Query params :
 *   - type  : filtrer par document_type
 *   - page  : numéro de page (défaut 1)
 *   - limit : par page (défaut 20, max 50)
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

/** Familles d'échec, pour que l'admin sache quoi faire sans lire la stack. */
export type BlockedReason =
  | "acces_bloque"
  | "document_non_juridique"
  | "telechargement_impossible"
  | "trop_long"
  | "parsing_invalide"
  | "quota_api"
  | "autre";

export interface BlockedDocument {
  id: string;
  title: string | null;
  document_type: string;
  source_url: string;
  detected_at: string;
  language: string;
  country: string;
  error_message: string | null;
  reason: BlockedReason;
  /** Ce que l'admin peut faire concrètement. */
  hint: string;
}

/** Classe un message d'erreur brut en famille exploitable. */
export function classifyError(raw: string | null): {
  reason: BlockedReason;
  hint: string;
} {
  const m = (raw ?? "").toLowerCase();

  if (m.includes("anti-bot") || m.includes("page de blocage") || m.includes("captcha")) {
    return {
      reason: "acces_bloque",
      hint: "La page cible refuse l'accès automatisé. Récupérer le texte manuellement depuis la source officielle, ou écarter le document.",
    };
  }
  if (m.includes("n'est pas une décision") || m.includes("non pertinent") || m.includes("note de presse")) {
    return {
      reason: "document_non_juridique",
      hint: "Le document n'a pas de valeur juridique (communiqué, annonce, événement). À écarter — c'est le tri qualité qui a fonctionné.",
    };
  }
  if (m.includes("impossible de récupérer")) {
    return {
      reason: "telechargement_impossible",
      hint: "L'URL source est injoignable ou vide. Vérifier le lien, ou attendre que la source republie.",
    };
  }
  if (m.includes("tronquée")) {
    return {
      reason: "trop_long",
      hint: "Document trop long pour un seul appel. Relancer après avoir relevé le plafond de tokens, ou découper le document.",
    };
  }
  if (m.includes("credit balance") || m.includes("rate limit")) {
    return {
      reason: "quota_api",
      hint: "Échec de facturation ou de quota, sans rapport avec le document. Relancer une fois le crédit rétabli.",
    };
  }
  if (m.includes("non parseable") || m.includes("parsing json")) {
    return {
      reason: "parsing_invalide",
      hint: "La réponse du modèle n'était pas exploitable. Relancer une fois ; si l'échec persiste, le document sort du cadre du prompt.",
    };
  }
  return { reason: "autre", hint: "Cause non classée. Lire le message d'erreur complet." };
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "20"));
  const offset = (page - 1) * limit;

  const admin = getAdmin();

  let query = admin
    .from("pending_documents")
    .select(
      "id, title, document_type, source_url, detected_at, language, country, error_message",
      { count: "exact" }
    )
    .eq("status", "error")
    .order("detected_at", { ascending: false });

  if (type) query = query.eq("document_type", type);

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const documents: BlockedDocument[] = (data ?? []).map((d) => ({
    ...(d as Omit<BlockedDocument, "reason" | "hint">),
    ...classifyError((d as { error_message: string | null }).error_message),
  }));

  // Répartition par cause, pour l'en-tête de l'onglet.
  const { data: all } = await admin
    .from("pending_documents")
    .select("error_message")
    .eq("status", "error");

  const byReason: Record<string, number> = {};
  for (const row of (all ?? []) as { error_message: string | null }[]) {
    const { reason } = classifyError(row.error_message);
    byReason[reason] = (byReason[reason] ?? 0) + 1;
  }

  return NextResponse.json({
    documents,
    total: count ?? 0,
    page,
    limit,
    byReason,
  });
}
