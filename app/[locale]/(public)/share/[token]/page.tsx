import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Shield, FileText, Clock, ExternalLink } from "lucide-react";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function SharedDocumentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: doc } = await admin
    .from("generated_documents")
    .select("id, doc_type, content, created_at, share_expires_at, share_enabled, user_id")
    .eq("share_token", token)
    .eq("share_enabled", true)
    .single();

  if (!doc) return notFound();

  // Vérifie l'expiration
  if (doc.share_expires_at && new Date(doc.share_expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <Clock className="h-10 w-10 text-gray-400 mx-auto" />
          <h1 className="text-xl font-semibold text-gray-700">Lien expiré</h1>
          <p className="text-sm text-gray-500">Ce lien de partage n&apos;est plus valide.</p>
        </div>
      </div>
    );
  }

  const docTypeLabel: Record<string, string> = {
    dpia: "DPIA — Analyse d'impact sur la protection des données",
    ropa: "RoPA — Registre des activités de traitement",
    fria: "FRIA — Évaluation des droits fondamentaux",
    policy: "Politique de confidentialité",
    contract: "Contrat IA",
    checklist: "Checklist de conformité",
    jurisprudence: "Analyse jurisprudentielle",
    audit: "Rapport d'audit",
  };

  const content = typeof doc.content === "string"
    ? JSON.parse(doc.content)
    : doc.content;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900">CompliAI</span>
            <span className="text-xs text-gray-400 ml-2">Document partagé</span>
          </div>
        </div>
        <Link
          href="/"
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          Découvrir CompliAI <ExternalLink className="h-3 w-3" />
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Titre du document */}
        <div className="bg-white rounded-xl border p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {docTypeLabel[doc.doc_type] ?? doc.doc_type}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Généré le {new Date(doc.created_at).toLocaleDateString("fr-FR", {
                day: "numeric", month: "long", year: "numeric"
              })}
              {doc.share_expires_at && (
                <> · Lien valide jusqu&apos;au{" "}
                  {new Date(doc.share_expires_at).toLocaleDateString("fr-FR")}</>
              )}
            </p>
          </div>
        </div>

        {/* Contenu */}
        <div className="bg-white rounded-xl border p-6">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed overflow-auto">
            {typeof content === "object"
              ? JSON.stringify(content, null, 2)
              : String(content ?? "(Contenu non disponible)")}
          </pre>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="text-xs text-amber-800">
            <strong>Avertissement :</strong> Ce document est fourni à titre d&apos;information. Il constitue une
            information juridique, non un conseil juridique. Consultez un avocat spécialisé pour valider votre
            situation spécifique. Généré automatiquement par CompliAI à partir des textes officiels de l&apos;Union européenne.
          </p>
        </div>
      </main>
    </div>
  );
}
