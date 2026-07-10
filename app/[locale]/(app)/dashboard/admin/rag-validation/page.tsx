import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { RagValidationClient } from "./RagValidationClient";

export const metadata = {
  title: "RAG Validation — Admin | CompliAI",
  description: "Interface de validation des chunks RAG en staging",
};

/**
 * /dashboard/admin/rag-validation
 *
 * Page serveur : vérifie que l'utilisateur est admin, puis affiche
 * l'interface de validation des staging_chunks.
 */
export default async function RagValidationPage() {
  const adminOk = await isAdmin();
  if (!adminOk) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* En-tête de page */}
      <div className="shrink-0 px-6 pt-6 pb-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Validation RAG
            </h1>
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
              Revue des chunks parsés en staging avant mise en production dans la base juridique.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-400">
              Admin uniquement
            </span>
          </div>
        </div>
      </div>

      {/* Interface cliente */}
      <RagValidationClient />
    </div>
  );
}
