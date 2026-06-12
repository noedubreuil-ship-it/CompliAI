export interface LegalChunk {
  id: string;
  regulation: string;
  article_number: string | null;
  article_title: string | null;
  chapter: string | null;
  content: string;
  eurlex_url: string | null;
  similarity?: number;
}

export interface LegalCitation {
  regulation: string;
  article_number: string;
  article_title: string;
  excerpt: string;
  eurlex_url: string;
  source?:
    | "rag"
    | "eurlex"
    | "calendar"
    | "national"
    | "eu_case_law"
    | "national_case_law"
    | "intl_standards"
    | "uk_regulator"
    | "official_portal";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: LegalCitation[];
  created_at: string;
}
