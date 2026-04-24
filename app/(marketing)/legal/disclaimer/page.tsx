import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export const metadata = { title: "Avertissement légal — CompliAI" };

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Shield className="h-5 w-5" />
          CompliAI
        </Link>
      </nav>
      <div className="max-w-2xl mx-auto px-6 py-12 prose prose-slate">
        <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 no-underline">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
        <h1>Avertissement légal</h1>
        <p><strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString("fr-FR")}</p>

        <h2>1. Nature des informations fournies</h2>
        <p>
          Les analyses, rapports, réponses et contenus générés par CompliAI constituent des <strong>informations juridiques générales</strong> 
          basées sur les textes de loi européens en vigueur, et non des <strong>conseils juridiques personnalisés</strong>.
        </p>
        <p>
          Une information juridique décrit le droit applicable de manière générale. Un conseil juridique implique une analyse 
          personnalisée de votre situation par un professionnel du droit qualifié, habilité à exercer dans votre juridiction.
        </p>

        <h2>2. Limitations de responsabilité</h2>
        <p>CompliAI ne peut être tenu responsable :</p>
        <ul>
          <li>Des décisions commerciales, techniques ou juridiques prises sur la base de nos analyses ;</li>
          <li>Des amendes, sanctions ou pénalités imposées par les autorités réglementaires ;</li>
          <li>Des erreurs, omissions ou inexactitudes dans les analyses générées par IA ;</li>
          <li>Des modifications réglementaires intervenues après la date de génération d&apos;un rapport ;</li>
          <li>De l&apos;interprétation donnée à nos analyses par des tiers.</li>
        </ul>

        <h2>3. Recommandation de validation juridique</h2>
        <p>
          Nous recommandons <strong>fortement</strong> de faire valider tout rapport CompliAI par un avocat spécialisé 
          en droit du numérique avant de prendre toute décision engageant la responsabilité de votre organisation.
        </p>
        <p>
          Pour trouver un avocat spécialisé, vous pouvez consulter le{" "}
          <a href="https://www.cnb.avocat.fr" target="_blank" rel="noopener">Conseil National des Barreaux</a>{" "}
          ou l&apos;<a href="https://www.edpb.europa.eu" target="_blank" rel="noopener">EDPB (European Data Protection Board)</a>.
        </p>

        <h2>4. Sources juridiques</h2>
        <p>
          Tous les textes légaux indexés par CompliAI proviennent d&apos;<a href="https://eur-lex.europa.eu" target="_blank" rel="noopener">EUR-Lex</a>, 
          le portail officiel du droit de l&apos;Union européenne.
        </p>

        <h2>5. Contact</h2>
        <p>Pour toute question relative à cet avertissement : <a href="mailto:legal@compliai.eu">legal@compliai.eu</a></p>
      </div>
    </div>
  );
}
