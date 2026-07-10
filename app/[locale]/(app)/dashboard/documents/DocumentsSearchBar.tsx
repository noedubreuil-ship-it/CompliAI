"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useState, useTransition } from "react";

export function DocumentsSearchBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(() => {
      const next = new URLSearchParams();
      const t = q.trim();
      if (t) next.set("q", t);
      router.push(`/dashboard/documents?${next.toString()}`);
    });
  }

  return (
    <form onSubmit={submit} className="flex gap-2 max-w-md flex-1">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Recherche sémantique (titres / contenus)…" className="pl-9" />
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        Rechercher
      </Button>
    </form>
  );
}
