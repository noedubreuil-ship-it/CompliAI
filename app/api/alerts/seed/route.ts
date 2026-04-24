import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Known AI Act deadlines to pre-populate for the current user's projects
const KNOWN_ALERTS = [
  {
    id: "aiact-prohibited-2025",
    regulation: "AI Act (UE 2024/1689)",
    title: "⛔ Systèmes IA interdits — Article 5 en vigueur depuis le 2 fév. 2025",
    description: "Les pratiques d'IA interdites sont applicables depuis le 2 février 2025 : notation sociale par les pouvoirs publics, manipulation subliminale, exploitation des vulnérabilités, identification biométrique en temps réel dans les espaces publics (sauf exceptions). Vérifiez qu'aucun de vos systèmes ne relève de ces catégories.",
    severity: "critical",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689#d1e2799-1-1",
    affected_features: ["Art. 5 AI Act — Pratiques interdites"],
  },
  {
    id: "aiact-gpai-2025",
    regulation: "AI Act (UE 2024/1689)",
    title: "🤖 Modèles IA à usage général (GPAI) — Obligations en vigueur depuis août 2025",
    description: "Si vous utilisez des modèles GPAI (ChatGPT, Claude, Gemini, Mistral…) ou si vous en développez un, les obligations Art. 51-56 sont applicables. Vérifiez vos contrats de sous-traitance avec ces fournisseurs, les obligations de transparence et les exigences de documentation.",
    severity: "high",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689#d1e5892-1-1",
    affected_features: ["Art. 51-56 AI Act — GPAI", "Art. 53 — Transparence GPAI"],
  },
  {
    id: "aiact-literacy-2025",
    regulation: "AI Act (UE 2024/1689)",
    title: "📚 Littératie IA obligatoire — Article 4 en vigueur depuis août 2025",
    description: "L'Article 4 impose que tous les employés utilisant des systèmes IA dans leur travail disposent d'une littératie IA suffisante. Mettez en place une formation et documentez-la. Générez votre Politique IA Employés via les Outils juridiques IA.",
    severity: "high",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689#d1e1847-1-1",
    affected_features: ["Art. 4 AI Act — Littératie IA", "Formation employés obligatoire"],
  },
  {
    id: "aiact-full-2026",
    regulation: "AI Act (UE 2024/1689)",
    title: "🚨 AI Act complet — Systèmes haut risque : échéance 2 août 2026",
    description: "Dans moins d'un an, l'AI Act s'applique intégralement à tous les systèmes IA à haut risque (Annexe III). Documentation technique (Art. 11), évaluation de conformité (Art. 43), enregistrement dans la base EU et marquage CE obligatoires. Lancez votre audit de conformité maintenant.",
    severity: "critical",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689#d1e12237-1-1",
    affected_features: ["Art. 11 — Documentation technique", "Art. 43 — Évaluation conformité", "Art. 49 — Marquage CE", "Art. 71 — Enregistrement EU"],
  },
  {
    id: "rgpd-dpia-ai",
    regulation: "RGPD (UE 2016/679)",
    title: "🔒 RGPD — DPIA obligatoire pour les systèmes IA traitant des données personnelles",
    description: "Toute utilisation d'IA impliquant un traitement à grande échelle de données personnelles ou des décisions automatisées affectant des personnes physiques nécessite une Analyse d'Impact (DPIA, Art. 35 RGPD). L'EDPB a clarifié que l'entraînement de modèles IA sur données personnelles déclenche cette obligation.",
    severity: "high",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679#d1e3883-1-1",
    affected_features: ["Art. 35 RGPD — DPIA", "Art. 22 RGPD — Décisions automatisées"],
  },
];

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Get user's active projects
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(5);

  if (!projects || projects.length === 0) {
    return NextResponse.json({ error: "Aucun projet actif trouvé. Créez d'abord un projet." }, { status: 400 });
  }

  let created = 0;
  for (const project of projects) {
    for (const alert of KNOWN_ALERTS) {
      // Check if already exists
      const { data: existing } = await supabase
        .from("regulatory_alerts")
        .select("id")
        .eq("user_id", user.id)
        .eq("project_id", project.id)
        .ilike("title", `%${alert.id.slice(0, 15)}%`)
        .maybeSingle();

      if (existing) continue;

      await supabase.from("regulatory_alerts").insert({
        user_id: user.id,
        project_id: project.id,
        title: alert.title,
        description: alert.description,
        regulation: alert.regulation,
        affected_features: alert.affected_features,
        severity: alert.severity,
        source_url: alert.source_url,
        is_read: false,
      });
      created++;
    }
  }

  return NextResponse.json({ created, projects: projects.length });
}
