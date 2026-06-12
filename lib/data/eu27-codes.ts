import { EU27 } from "@/lib/data/eu27-registry";

/** Codes ISO 3166-1 alpha-2 des 27 États membres UE (majuscules, tri stabilisé). */
export function getEu27IsoCodesSorted(): string[] {
  return Object.keys(EU27).filter((c) => /^[A-Z]{2}$/.test(c)).sort();
}
