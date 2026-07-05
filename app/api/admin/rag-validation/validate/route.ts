/**
 * POST /api/admin/rag-validation/validate
 *
 * Valide, rejette ou corrige un ou plusieurs chunks de staging.
 * Trace toutes les actions dans validation_log.
 *
 * Body JSON :
 * {
 *   documentId: string,
 *   chunkIds: string[],                    // chunks concernés
 *   action: "approved" | "rejected" | "corrected" | "bulk_approved",
 *   reason?: string,                       // requis pour action = "rejected"
 *   corrections?: Record<string, {        // requis pour action = "corrected"
 *     content?: string;
 *     article_number?: string;
 *     paragraph_number?: string;
 *     point_letter?: string;
 *     article_title?: string;
 *     chapter?: string;
 *   }>
 * }
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import { getAuthUser } from "@/lib/admin";

export const runtime = "nodejs";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

const CorrectionSchema = z.object({
  content: z.string().min(10).optional(),
  article_number: z.string().nullable().optional(),
  paragraph_number: z.string().nullable().optional(),
  point_letter: z.string().nullable().optional(),
  article_title: z.string().nullable().optional(),
  chapter: z.string().nullable().optional(),
});

const ValidateBodySchema = z.object({
  documentId: z.string().uuid(),
  chunkIds: z.array(z.string().uuid()).max(200).optional(),
  action: z.enum(["approved", "rejected", "corrected", "bulk_approved", "approve_document", "reject_document"]),
  reason: z.string().optional(),
  corrections: z.record(z.string(), CorrectionSchema).optional(),
});

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = ValidateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { documentId, chunkIds, action, reason, corrections } = parsed.data;

  if ((action === "rejected" || action === "reject_document") && !reason?.trim()) {
    return NextResponse.json(
      { error: "Un motif est requis pour l'action 'rejected'" },
      { status: 422 }
    );
  }

  const admin = getAdmin();

  // Actions document-level : approve/reject tous les chunks pending sans passer de chunkIds
  if (action === "approve_document" || action === "reject_document") {
    const newStatus = action === "approve_document" ? "approved" : "rejected";
    const now = new Date().toISOString();

    const { data: pendingChunks, error: fetchErr } = await admin
      .from("staging_chunks")
      .select("id, chunk_hash, validation_status")
      .eq("document_id", documentId)
      .eq("validation_status", "pending");

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    const pending = pendingChunks ?? [];

    if (pending.length > 0) {
      const { error: updateErr } = await admin
        .from("staging_chunks")
        .update({
          validation_status: newStatus,
          rejection_reason: action === "reject_document" ? (reason ?? null) : null,
          validated_at: now,
          validated_by: user.id,
        })
        .eq("document_id", documentId)
        .eq("validation_status", "pending");

      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

      const logEntries = pending.map((c) => ({
        document_id: documentId,
        chunk_id: c.id,
        performed_by: user.id,
        performed_at: now,
        action,
        reason: reason ?? null,
        before_hash: c.chunk_hash ?? null,
        after_hash: null,
        metadata: { previous_status: c.validation_status },
      }));
      await admin.from("validation_log").insert(logEntries);
    }

    // Vérifier si le document est entièrement validé
    const { data: allChunks } = await admin
      .from("staging_chunks")
      .select("validation_status")
      .eq("document_id", documentId);

    const hasRejected = (allChunks ?? []).some((c) => c.validation_status === "rejected");
    const allDone = (allChunks ?? []).every(
      (c) => c.validation_status === "approved" || c.validation_status === "rejected"
    );

    if (allDone) {
      await admin.from("pending_documents").update({
        status: hasRejected ? "rejected" : "approved",
        updated_at: now,
      }).eq("id", documentId);
    }

    return NextResponse.json({
      success: true,
      processed: pending.length,
      document_fully_validated: allDone,
      document_status: allDone ? (hasRejected ? "rejected" : "approved") : "staged",
    });
  }

  if (!chunkIds || chunkIds.length === 0) {
    return NextResponse.json({ error: "chunkIds requis pour cette action" }, { status: 422 });
  }

  // Récupérer les chunks actuels pour traçabilité (before_hash)
  const { data: currentChunks, error: fetchError } = await admin
    .from("staging_chunks")
    .select("id, content, chunk_hash, validation_status")
    .in("id", chunkIds)
    .eq("document_id", documentId);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const chunkMap = new Map(
    (currentChunks ?? []).map((c) => [c.id, c])
  );

  const now = new Date().toISOString();
  const logEntries: Array<{
    document_id: string;
    chunk_id: string;
    performed_by: string;
    performed_at: string;
    action: string;
    reason: string | null;
    before_hash: string | null;
    after_hash: string | null;
    metadata: Record<string, unknown>;
  }> = [];

  // Traiter chaque chunk
  for (const chunkId of chunkIds) {
    const current = chunkMap.get(chunkId);
    if (!current) continue;

    let newStatus: string;
    let afterHash: string | null = null;
    const updatePayload: Record<string, unknown> = {
      validated_at: now,
      validated_by: user.id,
    };

    if (action === "approved" || action === "bulk_approved") {
      newStatus = "approved";
      updatePayload.validation_status = "approved";
      updatePayload.rejection_reason = null;
    } else if (action === "rejected") {
      newStatus = "rejected";
      updatePayload.validation_status = "rejected";
      updatePayload.rejection_reason = reason ?? null;
    } else if (action === "corrected") {
      const correction = corrections?.[chunkId];
      newStatus = "approved";
      updatePayload.validation_status = "approved";
      updatePayload.rejection_reason = null;
      if (correction) {
        if (correction.content !== undefined) {
          updatePayload.content = correction.content;
          updatePayload.chunk_hash = sha256(correction.content);
          afterHash = sha256(correction.content);
        }
        if (correction.article_number !== undefined) updatePayload.article_number = correction.article_number;
        if (correction.paragraph_number !== undefined) updatePayload.paragraph_number = correction.paragraph_number;
        if (correction.point_letter !== undefined) updatePayload.point_letter = correction.point_letter;
        if (correction.article_title !== undefined) updatePayload.article_title = correction.article_title;
        if (correction.chapter !== undefined) updatePayload.chapter = correction.chapter;
      }
    } else {
      continue;
    }

    const { error: updateError } = await admin
      .from("staging_chunks")
      .update(updatePayload)
      .eq("id", chunkId);

    if (updateError) {
      return NextResponse.json(
        { error: `Erreur mise à jour chunk ${chunkId}: ${updateError.message}` },
        { status: 500 }
      );
    }

    logEntries.push({
      document_id: documentId,
      chunk_id: chunkId,
      performed_by: user.id,
      performed_at: now,
      action,
      reason: reason ?? null,
      before_hash: current.chunk_hash ?? null,
      after_hash: afterHash,
      metadata: { previous_status: current.validation_status },
    });
  }

  // Insérer toutes les entrées de log en une seule fois
  if (logEntries.length > 0) {
    const { error: logError } = await admin
      .from("validation_log")
      .insert(logEntries);

    if (logError) {
      console.error("[RAG Validate] Erreur validation_log:", logError.message);
      // Non-bloquant : les chunks sont déjà mis à jour
    }
  }

  // Si tous les chunks du document sont validés, mettre à jour le statut du document
  const { data: allChunks } = await admin
    .from("staging_chunks")
    .select("validation_status")
    .eq("document_id", documentId);

  const hasRejected = (allChunks ?? []).some((c) => c.validation_status === "rejected");
  const allDone = (allChunks ?? []).every(
    (c) => c.validation_status === "approved" || c.validation_status === "rejected"
  );

  if (allDone) {
    await admin
      .from("pending_documents")
      .update({
        status: hasRejected ? "rejected" : "approved",
        updated_at: now,
      })
      .eq("id", documentId);
  }

  return NextResponse.json({
    success: true,
    processed: logEntries.length,
    document_fully_validated: allDone,
    document_status: allDone ? (hasRejected ? "rejected" : "approved") : "staged",
  });
}
