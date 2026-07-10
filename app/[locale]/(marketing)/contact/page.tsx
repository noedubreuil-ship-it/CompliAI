import { LegalPageShell } from "@/components/marketing/LegalPageShell";

export const metadata = { title: "Contact — CompliAI" };

export default function ContactPage() {
  return (
    <LegalPageShell title="Contact">
      <p>Une question produit, commerciale ou juridique ? Écrivez-nous.</p>

      <h2>Support</h2>
      <p>
        <a href="mailto:support@compliai.eu">support@compliai.eu</a> — assistance technique et compte.
      </p>

      <h2>Entreprises &amp; Enterprise</h2>
      <p>
        <a href="mailto:enterprise@compliai.eu">enterprise@compliai.eu</a> — devis, SSO, déploiement dédié.
      </p>

      <h2>Juridique &amp; confidentialité</h2>
      <p>
        <a href="mailto:legal@compliai.eu">legal@compliai.eu</a> — CGU, conformité.
        <br />
        <a href="mailto:privacy@compliai.eu">privacy@compliai.eu</a> — données personnelles (RGPD).
      </p>

      <h2>Déjà client ?</h2>
      <p>
        Connectez-vous à votre espace : <a href="/auth/login">Connexion</a> — ou consultez la{" "}
        <a href="/dashboard/support">page support</a> une fois connecté.
      </p>
    </LegalPageShell>
  );
}
