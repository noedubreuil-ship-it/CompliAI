import { LegalPageShell } from "@/components/marketing/LegalPageShell";

export const metadata = { title: "Mentions légales — CompliAI" };

export default function MentionsLegalesPage() {
  return (
    <LegalPageShell title="Mentions légales">
      <p>
        <strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString("fr-FR")}
      </p>

      <h2>Éditeur</h2>
      <p>
        <strong>CompliAI</strong>
        <br />
        Site : <a href="https://www.compliai.eu">https://www.compliai.eu</a>
        <br />
        Email : <a href="mailto:legal@compliai.eu">legal@compliai.eu</a>
      </p>

      <h2>Directeur de la publication</h2>
      <p>CompliAI — représentant légal (à compléter avec les informations société si besoin).</p>

      <h2>Hébergement</h2>
      <p>
        Vercel Inc. — 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
        <br />
        Infrastructure données : Supabase (région UE lorsque configurée).
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble du site (textes, graphismes, logo, logiciels) est protégé. Toute reproduction non autorisée est
        interdite.
      </p>

      <h2>Liens utiles</h2>
      <ul>
        <li>
          <a href="/legal/cgu">Conditions générales d&apos;utilisation</a>
        </li>
        <li>
          <a href="/legal/privacy">Politique de confidentialité</a>
        </li>
        <li>
          <a href="/legal/disclaimer">Avertissement juridique</a>
        </li>
        <li>
          <a href="/contact">Contact</a>
        </li>
      </ul>
    </LegalPageShell>
  );
}
