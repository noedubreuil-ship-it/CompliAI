import { LegalPageShell } from "@/components/marketing/LegalPageShell";

export const metadata = {
  title: "Transparence IA — CompliAI",
  description:
    "Informations sur les systèmes d'intelligence artificielle utilisés par CompliAI, conformément à l'article 50 du Règlement IA (UE 2024/1689).",
};

export default function TransparenceIAPage() {
  return (
    <LegalPageShell title="Transparence — Intelligence artificielle">
      <p>
        <strong>Dernière mise à jour :</strong> 8 juillet 2026
      </p>
      <p>
        Conformément à l&apos;article 50, §1 du Règlement (UE) 2024/1689 sur l&apos;intelligence artificielle
        (« AI Act »), applicable depuis le 2 août 2025, CompliAI vous informe que vous interagissez avec
        un système d&apos;intelligence artificielle.
      </p>

      <h2>1. Systèmes IA utilisés</h2>
      <h3>Consultant juridique IA (assistant conversationnel)</h3>
      <ul>
        <li>
          <strong>Modèle :</strong> Claude Sonnet 4.6, développé par Anthropic PBC (San Francisco, USA).
        </li>
        <li>
          <strong>Usage :</strong> Réponses aux questions juridiques sur le RGPD, l&apos;AI Act et le droit
          numérique européen. Génération de documents de conformité (DPIA, FRIA, ROPA, etc.).
        </li>
        <li>
          <strong>Corpus :</strong> 14&nbsp;000+ chunks juridiques issus de textes officiels (Journal officiel
          de l&apos;UE, EDPB, CJUE, autorités nationales de protection des données EU-27).
        </li>
      </ul>

      <h3>Moteur d&apos;indexation sémantique</h3>
      <ul>
        <li>
          <strong>Modèle :</strong> text-embedding-3-small, développé par OpenAI (San Francisco, USA).
        </li>
        <li>
          <strong>Usage :</strong> Recherche vectorielle dans le corpus juridique pour retrouver les sources
          pertinentes à chaque question.
        </li>
      </ul>

      <h2>2. Nature des réponses générées</h2>
      <p>
        Les réponses fournies par le consultant IA de CompliAI sont générées automatiquement à partir de
        sources juridiques officielles. Elles constituent une <strong>information juridique</strong> et non
        un <strong>avis juridique professionnel</strong> au sens des réglementations sur les professions
        réglementées.
      </p>
      <p>
        Elles ne se substituent pas à la consultation d&apos;un avocat, d&apos;un juriste qualifié ou d&apos;un
        délégué à la protection des données (DPO) pour toute décision ayant des conséquences juridiques ou
        financières.
      </p>

      <h2>3. Limitations connues</h2>
      <ul>
        <li>
          Le modèle peut produire des informations inexactes, incomplètes ou périmées — toujours vérifier
          les sources primaires avant utilisation.
        </li>
        <li>
          Le corpus couvre principalement le droit de l&apos;UE et les 27 États membres. Les droits nationaux
          hors UE ne sont pas couverts.
        </li>
        <li>
          Les actes délégués, actes d&apos;exécution et guidelines publiés après la date d&apos;indexation peuvent
          ne pas être reflétés.
        </li>
        <li>
          Le modèle ne mémorise pas les conversations d&apos;une session à l&apos;autre (sauf via la fonctionnalité
          Cerveau, qui stocke les informations explicitement enregistrées par l&apos;utilisateur).
        </li>
      </ul>

      <h2>4. Mécanismes de contrôle humain</h2>
      <ul>
        <li>
          Toutes les sources juridiques indexées proviennent de publications officielles vérifiées
          (Journal officiel UE, sites officiels des autorités de protection des données).
        </li>
        <li>
          Chaque document inséré dans le corpus est validé manuellement par l&apos;équipe CompliAI avant
          d&apos;être accessible à l&apos;assistant.
        </li>
        <li>
          Un système de golden set (ensemble de questions de référence) est utilisé pour évaluer
          régulièrement la qualité des réponses.
        </li>
        <li>
          Les réponses générées sont accompagnées de citations sourcées permettant à l&apos;utilisateur
          de vérifier chaque affirmation dans le texte juridique d&apos;origine.
        </li>
      </ul>

      <h2>5. Données traitées</h2>
      <p>
        Les questions posées à l&apos;assistant IA sont transmises aux prestataires suivants dans le cadre
        du traitement :
      </p>
      <ul>
        <li>
          <strong>Anthropic PBC</strong> (USA) — traitement des questions pour générer les réponses.
          Transfert encadré par les Clauses Contractuelles Types (CCT) de la Commission européenne.
        </li>
        <li>
          <strong>OpenAI, Inc.</strong> (USA) — vectorisation sémantique des questions pour la recherche
          dans le corpus. Transfert encadré par les CCT.
        </li>
      </ul>
      <p>
        Pour plus d&apos;informations sur le traitement de vos données personnelles, consultez notre{" "}
        <a href="/legal/privacy">politique de confidentialité</a>.
      </p>

      <h2>6. Base légale AI Act</h2>
      <p>
        CompliAI est un système IA à risque limité au sens de l&apos;article 50 de l&apos;AI Act. À ce titre, il
        est soumis aux obligations de transparence envers les utilisateurs finals. Cette page constitue
        la mise en œuvre de cette obligation.
      </p>
      <p>
        Contact pour toute question relative à cette déclaration :{" "}
        <a href="mailto:privacy@compliai.eu">privacy@compliai.eu</a>
      </p>
    </LegalPageShell>
  );
}
