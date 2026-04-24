import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import AuditResult from "@/components/audit/AuditResult";

interface Props {
  params: Promise<{ id: string; auditId: string }>;
}

export default async function AuditResultPage({ params }: Props) {
  const { id, auditId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: audit } = await supabase
    .from("audits")
    .select("*, projects(name, sector)")
    .eq("id", auditId)
    .eq("user_id", user.id)
    .single();

  if (!audit) notFound();

  const { data: blockingIssues } = await supabase
    .from("blocking_issues")
    .select("*")
    .eq("audit_id", auditId)
    .order("severity", { ascending: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  const auditData = {
    ...audit,
    blocking_issues: blockingIssues ?? [],
  };

  return (
    <AuditResult
      audit={auditData}
      projectId={id}
      canDownloadPdf={
        profile?.subscription_tier === "pro" ||
        profile?.subscription_tier === "enterprise"
      }
    />
  );
}
