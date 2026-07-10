import ProjectScannerForm from "@/components/audit/ProjectScannerForm";

export const metadata = {
  title: "Nouvel audit de conformité — CompliAI",
};

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const { org } = await searchParams;
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit de conformité</h1>
        <p className="text-muted-foreground mt-1">
          Décrivez votre projet IA pour obtenir un verdict de conformité AI Act, RGPD et DSA.
        </p>
      </div>
      <ProjectScannerForm organizationId={org ?? undefined} />
    </div>
  );
}
