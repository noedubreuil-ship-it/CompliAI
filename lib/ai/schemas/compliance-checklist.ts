import { z } from "zod";

const PriorityEnum = z.enum(["critique", "haute", "moyenne", "faible"]);
const EffortEnum = z.enum(["low", "medium", "high"]);
const UrgencyBandEnum = z.enum([
  "already_applicable",
  "aug_2026_hr_window",
  "within_6_months_audit",
  "foundation_or_good_practice",
]);

const ChecklistItemSchema = z.object({
  id: z.string().min(1),
  canonical_ref: z.string().min(1),
  law_category_label: z.string().optional().default(""),
  subcategory: z.string().optional().default(""),
  title: z.string().min(1),
  description: z.string().optional().default(""),
  legal_basis: z.string().optional().default(""),
  priority: PriorityEnum,
  deadline_iso: z.string().optional().default(""),
  deadline_label: z.string().optional().default(""),
  urgency_band: UrgencyBandEnum.optional().default("foundation_or_good_practice"),
  article: z.string().optional().default(""),
  effort: EffortEnum,
  applicable_to: z.string().optional().default(""),
  applies_roles: z.array(z.string()).optional().default([]),
  responsible: z.string().optional().default(""),
  validation: z.string().optional().default(""),
  evidence: z.string().optional().default(""),
  tool_link_label: z.string().optional().default(""),
  tool_link_slug: z.string().nullable().optional().default(null),
  tags: z.array(z.string()).optional().default([]),
});

const ChecklistCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  article_ref: z.string().optional().default(""),
  items: z.array(ChecklistItemSchema),
});

export const ComplianceChecklistSchema = z.object({
  checklist_id: z.string().min(1).optional(),
  title: z.string().optional().default(""),
  summary: z.string().optional().default(""),
  regulation_focus: z.string().optional().default(""),
  profile_summary: z.string().optional().default(""),
  applicable_frameworks: z.string().optional().default(""),
  non_applicable_exclusions: z
    .array(z.object({ area: z.string().optional().default(""), justification: z.string().optional().default("") }))
    .optional()
    .default([]),
  total_items: z.number().int().nonnegative().optional(),
  progress_initial_note: z.string().optional().default(""),
  priority_urgent_items_summary: z.string().optional().default(""),
  secondary_timeline_hint: z.string().optional().default(""),
  quick_wins: z.array(z.string()).optional().default([]),
  categories: z.array(ChecklistCategorySchema).min(1),
  estimated_total_effort: z.string().optional().default(""),
  priority_roadmap: z.array(z.string()).optional().default([]),
});

export type ComplianceChecklist = z.infer<typeof ComplianceChecklistSchema>;

