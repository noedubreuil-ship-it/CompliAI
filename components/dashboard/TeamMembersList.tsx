"use client";

import { useEffect, useState } from "react";
import { Users, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Member = {
  user_id: string;
  role: string;
  joined_at: string;
  full_name: string;
  company: string | null;
  is_you: boolean;
};

export function TeamMembersList({ organizationId }: { organizationId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [yourRole, setYourRole] = useState<string>("member");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/organizations/${organizationId}/members`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        if (!cancelled) {
          setMembers(data.members ?? []);
          setYourRole(data.your_role ?? "member");
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement des membres…
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Users className="h-3.5 w-3.5" />
        {members.length} membre{members.length > 1 ? "s" : ""}
        {yourRole === "admin" ? " · vous êtes administrateur" : ""}
      </p>
      <ul className="divide-y border rounded-lg bg-white">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-slate-900">
                {m.full_name}
                {m.is_you && (
                  <span className="text-muted-foreground font-normal ml-1">(vous)</span>
                )}
              </p>
              {m.company && <p className="text-xs text-muted-foreground">{m.company}</p>}
            </div>
            <Badge variant={m.role === "admin" ? "default" : "outline"}>
              {m.role === "admin" ? "Admin" : "Membre"}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
