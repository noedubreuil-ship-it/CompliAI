import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, KeyRound, Building2 } from "lucide-react";
import JoinOrgForm from "./JoinOrgForm";
import CreateOrganizationForm from "./CreateOrganizationForm";
import { TeamMembersList } from "@/components/dashboard/TeamMembersList";

export const metadata = { title: "Équipe — CompliAI" };

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: rows, error } = await supabase
    .from("organization_members")
    .select("role, joined_at, organizations (id, name, invite_code, created_by)")
    .eq("user_id", user.id);

  const memberships =
    rows?.map((r) => {
      const raw = r.organizations as unknown;
      const org = (
        Array.isArray(raw)
          ? (raw[0] as Record<string, string> | undefined)
          : (raw as Record<string, string> | null | undefined)
      ) as { id: string; name: string; invite_code: string; created_by: string } | null | undefined;
      return {
        role: r.role as string,
        joined_at: r.joined_at,
        organization:
          org && org.id
            ? {
                id: org.id,
                name: String(org.name ?? ""),
                invite_code: String(org.invite_code ?? ""),
                created_by: String(org.created_by ?? ""),
              }
            : null,
      };
    }) ?? [];

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-7 w-7 text-slate-600" /> Équipe & organisation
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Partagez projets et audits avec vos collègues DPO ou Legal. Invitez avec le code d&apos;invitation.
        </p>
      </div>

      {error && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          Base en cours de mise à jour : appliquez la migration{" "}
          <code className="text-xs">009_organizations_webhooks.sql</code>.
        </p>
      )}

      <JoinOrgForm />

      {!error && memberships.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Créer mon organisation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>Vous n&apos;appartenez à aucune équipe pour l&apos;instant.</p>
            <CreateOrganizationForm />
          </CardContent>
        </Card>
      )}

      {memberships.map((m) =>
        m.organization ? (
          <Card key={m.organization.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5" /> {m.organization.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Votre rôle :{" "}
                <span className="font-semibold">{m.role === "admin" ? "Administrateur" : "Membre"}</span>
              </p>
              {m.role === "admin" && (
                <div className="rounded-lg bg-slate-50 border px-4 py-3 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <KeyRound className="h-3.5 w-3.5" /> Code d&apos;invitation
                  </p>
                  <code className="text-sm font-mono break-all select-all">{m.organization.invite_code}</code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Les collègues entrent ce code dans le bloc « Rejoindre une équipe » ci-dessus.
                  </p>
                </div>
              )}
              <p>
                Nouvel audit équipe :{" "}
                <Link href={`/dashboard/projects/new?org=${m.organization.id}`} className="text-blue-600 hover:underline">
                  Créer un projet sous cette organisation →
                </Link>
              </p>
              <TeamMembersList organizationId={m.organization.id} />
            </CardContent>
          </Card>
        ) : null
      )}

      <Link href="/dashboard/integrations">
        <Button variant="outline" size="sm">
          Webhooks & intégrations →
        </Button>
      </Link>
    </div>
  );
}
