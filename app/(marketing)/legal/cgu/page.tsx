import { LegalPageShell } from "@/components/marketing/LegalPageShell";

export const metadata = { title: "Conditions générales d'utilisation — CompliAI" };

export default function CguPage() {
  return (
    <LegalPageShell title="Conditions générales d'utilisation (CGU)">
      <p>
        <strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString("fr-FR")}
      </p>

      <h2>1. Objet</h2>
      <p>
        Les présentes CGU régissent l&apos;accès et l&apos;utilisation de la plateforme CompliAI (SaaS de conformité
        réglementaire), accessible sur <strong>compliai.eu</strong>.
      </p>

      <h2>2. Nature du service</h2>
      <p>
        CompliAI fournit des <strong>informations juridiques générales</strong> et des outils d&apos;aide à la
        conformité (AI Act, RGPD, etc.). Le service ne constitue pas un conseil juridique personnalisé ni une relation
        avocat-client. Voir aussi notre{" "}
        <a href="/legal/disclaimer">avertissement juridique</a>.
      </p>

      <h2>3. Compte utilisateur</h2>
      <ul>
        <li>Vous êtes responsable de la confidentialité de vos identifiants.</li>
        <li>Vous vous engagez à fournir des informations exactes lors de l&apos;inscription.</li>
        <li>CompliAI peut suspendre un compte en cas d&apos;usage abusif ou frauduleux.</li>
      </ul>

      <h2>4. Abonnements et crédits</h2>
      <p>
        Les formules payantes et les packs de crédits sont facturés via Stripe. Les conditions tarifaires en vigueur
        sont affichées sur la page <a href="/pricing">Tarifs</a>. Sauf mention contraire, la facturation est mensuelle
        et résiliable à tout moment.
      </p>

      <h2>5. Propriété intellectuelle</h2>
      <p>
        La plateforme, ses interfaces et sa marque restent la propriété de CompliAI. Les contenus que vous générez vous
        appartiennent ; vous nous accordez une licence limitée pour les héberger et les traiter aux fins du service.
      </p>

      <h2>6. Données personnelles</h2>
      <p>
        Le traitement de vos données est décrit dans notre{" "}
        <a href="/legal/privacy">politique de confidentialité</a>.
      </p>

      <h2>7. Limitation de responsabilité</h2>
      <p>
        CompliAI ne garantit pas l&apos;absence d&apos;erreur dans les analyses IA. Vous restez seul responsable des
        décisions prises sur la base des livrables générés.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions légales : <a href="mailto:legal@compliai.eu">legal@compliai.eu</a> —{" "}
        <a href="/contact">formulaire de contact</a>.
      </p>
    </LegalPageShell>
  );
}
