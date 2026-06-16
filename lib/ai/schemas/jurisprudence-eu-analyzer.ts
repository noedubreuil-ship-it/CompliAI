import { z } from "zod";

const DispositionInterpreteeSchema = z.object({
  instrument: z.string().optional().default(""),
  articles: z.array(z.string()).optional().default([]),
  lecture_retenue_par_la_juridiction: z.string().optional().default(""),
});

export const JurisprudenceEuAnalyzerSchema = z
  .object({
    reference: z.string().min(1),
    limitations_sources: z.array(z.string()).optional().default([]),
    title: z.string().min(1),
    juridiction: z.string().min(1),
    date: z.string().optional().default(""),
    parties: z.string().optional().default(""),
    ecli: z.string().nullable().optional().default(null),
    executive_summary: z.string().min(1),
    commentaire_axes: z.object({
      section_1_identification_contexte: z.string().min(1),
      section_2_faits_procedure_eu: z.string().min(1),
      section_3_sens: z.unknown(),
      section_3bis_valeur: z.unknown(),
      section_3ter_portee: z.unknown(),
      section_4_dispositions_interpretées_table: z.array(DispositionInterpreteeSchema).optional().default([]),
      section_5_place_dans_la_jurisprudence_europeenne: z.string().optional().default(""),
      section_6_implications_pratiques_renvoi: z.string().optional().default(""),
      section_7_ressources_compliai: z.array(z.unknown()).optional().default([]),
    }),
    eu_legal_context: z.unknown().optional(),
    legal_analysis: z.unknown().optional(),
    practical_implications: z.unknown().optional(),
    significance: z.unknown().optional(),
    overall_assessment: z.string().optional().default(""),
  })
  .passthrough();

export type JurisprudenceEuAnalyzerResult = z.infer<typeof JurisprudenceEuAnalyzerSchema>;

