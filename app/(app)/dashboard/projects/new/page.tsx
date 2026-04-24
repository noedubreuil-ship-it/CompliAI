import ProjectScannerForm from "@/components/audit/ProjectScannerForm";

export const metadata = {
  title: "Nouvel audit de conformité — CompliAI",
};

export default function NewProjectPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit de conformité</h1>
        <p className="text-muted-foreground mt-1">
          Décrivez votre projet IA pour obtenir un verdict de conformité AI Act, RGPD et DSA.
        </p>
      </div>
      <ProjectScannerForm />
    </div>
  );
}
