import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LegalPageShell } from "./LegalPageShell";

export function ComingSoonPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <LegalPageShell title={title}>
      <p>{description}</p>
      <p className="text-sm text-muted-foreground not-prose">
        Cette section arrive prochainement. En attendant, explorez le produit ou contactez-nous.
      </p>
      <div className="not-prose flex flex-wrap gap-3 mt-6">
        <Link href="/auth/login">
          <Button>Essai gratuit</Button>
        </Link>
        <Link href="/contact">
          <Button variant="outline">Nous contacter</Button>
        </Link>
      </div>
    </LegalPageShell>
  );
}
