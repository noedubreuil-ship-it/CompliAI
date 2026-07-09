/**
 * Manifeste des batches d'ingestion monitoring → staging_chunks.
 * Ordre opérationnel validé le 2026-07-01.
 *
 * Usage :
 *   RAG_INGESTION_BATCH_NAME=edpb-fr npx tsx --env-file=.env.local scripts/cron-ingestion-batch.ts
 */

export interface IngestionBatch {
  name: string;
  label: string;
  documentIds: string[];
  notes?: string;
}

export const INGESTION_BATCHES: IngestionBatch[] = [
  {
    name: "edpb-fr",
    label: "EDPB Opinions Art. 64 FR (9 docs — batch monitoring)",
    documentIds: [
      "ac90f27e-cdca-4ca1-80d5-d937c85dc579",
      "b3a83b88-a44f-4392-a114-32411664b086",
      "fe5149c2-6065-4769-989e-38e54b22901c",
      "90fa60d1-7bba-4741-8266-addc924e05f9",
      "3719f35a-df75-4b72-a85f-497f4748f3c1",
      "b1bd5045-1fd8-4c45-a385-6c42e9074150",
      "14e4047f-c419-4455-91c3-221836bf5b4b",
      "6d06b94d-7d21-4127-ad33-13c64b26746d",
      "77e6159b-3d91-4eab-9e1b-a4cbc6a07d76",
    ],
    notes: "9 documents FR détectés (pas 10) — Opinions BCR EDPB 2026",
  },
  {
    name: "cnil-fr",
    label: "CNIL — recommandations pixels email (1 doc)",
    documentIds: ["2d069cea-ced8-409c-9de4-0803942bd752"],
  },
  {
    name: "dpc-top-tech-ie",
    label: "DPC Irlande — inquiries tech (16 EN)",
    documentIds: [
      "294c2e7b-7ce5-4a19-8a09-8fa0d1ddda23",
      "84310b85-96d6-4f77-8797-bca0eeae4fc6",
      "15197939-8503-47ff-a7d6-9e17cd9522fc",
      "60773b11-cf05-45f7-a2f7-3727475a79e2",
      "06ebb6c4-a1d0-49a3-9c18-ac4609663bb1",
      "7704d288-016b-4d78-b892-a3a26722e191",
      "0beb706a-ebc1-4118-992f-f8169b5dda5a",
      "964c0e75-33ed-4eab-9c3f-c7257fab77fc",
      "cff00c84-17f5-40b0-ab6d-0d544247fece",
      "e8013cb9-1efc-41e4-88d8-e7995ae97b54",
      "b38a9719-701a-4cc5-b982-70690fe40aa5",
      "1457773f-4f31-4b15-b5b4-871540b47fba",
      "5e085a03-13fe-4498-bd50-c6ca9b32527f",
      "1446e5d5-3a5b-4096-b2f0-6a2946bc0861",
      "f52bea02-7bdc-463d-9745-f1c0f9cd9e35",
      "da58d375-45fc-4b1e-8cb1-0c65f59abaa7",
    ],
  },
  {
    name: "bfdi-aepd-selection",
    label: "BfDI + AEPD — sélection IA / Data Act (8 docs)",
    documentIds: [
      "085bc163-c9b3-41bf-ac26-97a858180416",
      "e8bdf582-d5c5-4fdc-b2af-182c7d5f5823",
      "0e4f0931-7966-4ee7-9926-536cf3fe3553",
      "e3455738-f581-4648-adea-46017dac3119",
      "1865281d-06b5-40b7-beaf-8532a12d48cb",
      "89ea458e-dd2b-402e-9a0b-401ea0300645",
      "dc49f382-55d7-4846-826c-e7bfc4f1f212",
      "1c84c102-61cc-41c4-b90a-8cd90e139e31",
    ],
  },
];

export function getBatchByName(name: string): IngestionBatch | undefined {
  return INGESTION_BATCHES.find((b) => b.name === name);
}
