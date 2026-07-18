import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertMonitoringDatabaseReady } from "./worker";

/**
 * Client Supabase simulé : chaque table renvoie le résultat qu'on lui donne.
 * `assertMonitoringDatabaseReady` n'utilise que `.from().select().limit()`.
 */
function fakeClient(
  byTable: Record<string, { data?: unknown[]; error?: { message: string } }>
): SupabaseClient {
  return {
    from(table: string) {
      const result = byTable[table] ?? { data: [{ id: "x" }] };
      const thenable = {
        select: () => thenable,
        limit: () => Promise.resolve(result),
      };
      return thenable;
    },
  } as unknown as SupabaseClient;
}

describe("assertMonitoringDatabaseReady", () => {
  it("passe quand les trois tables sont lisibles et monitoring_sources non vide", async () => {
    await expect(
      assertMonitoringDatabaseReady(fakeClient({}))
    ).resolves.toBeUndefined();
  });

  it("échoue quand une table renvoie une erreur", async () => {
    const client = fakeClient({
      pending_documents: { error: { message: "relation does not exist" } },
    });
    await expect(assertMonitoringDatabaseReady(client)).rejects.toThrow(
      /inaccessible/
    );
  });

  it("échoue quand monitoring_sources paraît vide SANS erreur (RLS + clé insuffisante)", async () => {
    // Régression du 2026-07-18 : sous RLS, une clé anon renvoie zéro ligne et
    // AUCUNE erreur. Le cron GitHub tournait vert, voyait 0 source active alors
    // que la base en contenait 6, et sortait en `no_active_sources`. Trois
    // semaines de veille perdues sans le moindre signal.
    const client = fakeClient({ monitoring_sources: { data: [] } });
    await expect(assertMonitoringDatabaseReady(client)).rejects.toThrow(
      /SUPABASE_SERVICE_ROLE_KEY/
    );
  });

  it("ne se laisse pas berner par les autres tables vides", async () => {
    // Seule monitoring_sources doit être non vide : pending_documents et
    // monitoring_log peuvent légitimement l'être sur une base neuve.
    const client = fakeClient({
      pending_documents: { data: [] },
      monitoring_log: { data: [] },
    });
    await expect(
      assertMonitoringDatabaseReady(client)
    ).resolves.toBeUndefined();
  });
});
