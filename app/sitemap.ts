import type { MetadataRoute } from "next";

const BASE_URL = "https://www.compliai.eu";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages = [
    { url: BASE_URL, changeFrequency: "weekly" as const, priority: 1.0 },
    { url: `${BASE_URL}/pricing`, changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${BASE_URL}/ai-act`, changeFrequency: "weekly" as const, priority: 0.95 },
    { url: `${BASE_URL}/rgpd`, changeFrequency: "weekly" as const, priority: 0.95 },
    { url: `${BASE_URL}/dpo`, changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${BASE_URL}/docs`, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${BASE_URL}/contact`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE_URL}/legal/privacy`, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${BASE_URL}/legal/cgu`, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${BASE_URL}/legal/mentions-legales`, changeFrequency: "yearly" as const, priority: 0.3 },
  ];

  return staticPages.map((page) => ({
    ...page,
    lastModified: now,
  }));
}
