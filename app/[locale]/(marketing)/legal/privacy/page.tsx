import { LegalPageShell } from "@/components/marketing/LegalPageShell";

export const metadata = { title: "Politique de confidentialité — CompliAI" };

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Politique de confidentialité">
      <p>
        <strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString("fr-FR")}
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        CompliAI — contact DPO / privacy : <a href="mailto:privacy@compliai.eu">privacy@compliai.eu</a>
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li>Identité et compte : nom, email, organisation (si renseignée).</li>
        <li>Usage : journaux techniques, consommation de crédits, historique des outils.</li>
        <li>Contenus : questions chat, documents générés, projets et audits que vous créez.</li>
        <li>Paiement : données gérées par Stripe (nous ne stockons pas vos numéros de carte).</li>
      </ul>

      <h2>3. Finalités</h2>
      <ul>
        <li>Fourniture du service et facturation.</li>
        <li>Amélioration produit, sécurité et support.</li>
        <li>Respect des obligations légales.</li>
      </ul>

      <h2>4. Bases légales (RGPD)</h2>
      <p>Exécution du contrat, intérêt légitime (sécurité, amélioration), et consentement lorsque requis.</p>

      <h2>5. Sous-traitants</h2>
      <p>
        Hébergement (Vercel), base de données et auth (Supabase), IA (Anthropic), paiement (Stripe), emails
        transactionnels le cas échéant. Des garanties contractuelles (DPA / clauses types) sont mises en place lorsque
        applicable.
      </p>

      <h2>6. Durée de conservation</h2>
      <p>
        Données de compte : durée de la relation contractuelle + délais légaux. Vous pouvez demander la suppression de
        votre compte via <a href="mailto:privacy@compliai.eu">privacy@compliai.eu</a>.
      </p>

      <h2>7. Vos droits</h2>
      <p>
        Accès, rectification, effacement, limitation, portabilité, opposition — en écrivant à{" "}
        <a href="mailto:privacy@compliai.eu">privacy@compliai.eu</a>. Réclamation possible auprès de la CNIL.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Cookies essentiels (session, authentification). Pas de publicité tierce. Les préférences peuvent évoluer ; cette
        page sera mise à jour en conséquence.
      </p>
    </LegalPageShell>
  );
}
