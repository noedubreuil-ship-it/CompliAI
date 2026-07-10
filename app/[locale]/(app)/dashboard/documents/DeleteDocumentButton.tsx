"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function DeleteDocumentButton({ docId }: { docId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function deleteDoc() {
    if (!confirm("Supprimer ce document ?")) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("generated_documents").delete().eq("id", docId);
    router.refresh();
    setLoading(false);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
      onClick={deleteDoc}
      disabled={loading}
      title="Supprimer"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
    </Button>
  );
}
