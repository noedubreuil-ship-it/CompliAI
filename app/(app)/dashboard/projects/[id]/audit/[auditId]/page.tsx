import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import AuditResult from "@/components/audit/AuditResult";
import { PostAuditChatCta } from "@/components/dashboard/ProductOnboardingStepper";

interface Props {
  params: Promise<{ id: string; auditId: string }>;
}

export default async function AuditResultPage({ params }: Props) {
  const { id, auditId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Validate UUID format before querying
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(auditId)) {
    redirect(`/dashboard/projects/${id}`);
  }

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
    <>
      <PostAuditChatCta projectName={audit.projects?.name ?? undefined} />
      <AuditResult
      audit={auditData}
      projectId={id}
      canDownloadPdf={
        profile?.subscription_tier === "pro" ||
        profile?.subscription_tier === "enterprise"
      }
    />
    </>
  );
}
