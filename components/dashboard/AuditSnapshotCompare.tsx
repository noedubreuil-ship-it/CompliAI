"use client";

import { useMemo, useState } from "react";
import { GitCompare, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { VERDICT_COLORS, formatDate } from "@/lib/utils";

export type SnapshotRow = {
  id: string;
  version: number;
  compliance_score: number | null;
  verdict: string | null;
  created_at: string;
  audit_id: string;
};

export function AuditSnapshotCompare({ snapshots }: { snapshots: SnapshotRow[] }) {
  const sorted = useMemo(
    () => [...snapshots].sort((a, b) => a.version - b.version),
    [snapshots],
  );

  const [versionA, setVersionA] = useState(sorted[0]?.version ?? 1);
  const [versionB, setVersionB] = useState(sorted[sorted.length - 1]?.version ?? 1);

  const snapA = sorted.find((s) => s.version === versionA);
  const snapB = sorted.find((s) => s.version === versionB);

  if (sorted.length < 2) return null;

  const scoreA = snapA?.compliance_score ?? null;
  const scoreB = snapB?.compliance_score ?? null;
  const delta = scoreA != null && scoreB != null ? scoreB - scoreA : null;

  return (
    <div className="rounded-xl border bg-slate-50/80 p-5 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
        <GitCompare className="h-4 w-4 text-blue-600" />
        Comparer deux versions
      </h3>

      <div className="flex flex-wrap gap-4 items-end">
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">Version A (référence)</span>
          <select
            className="block border rounded-lg px-3 py-2 text-sm bg-white"
            value={versionA}
            onChange={(e) => setVersionA(Number(e.target.value))}
          >
            {sorted.map((s) => (
              <option key={s.id} value={s.version}>
                v{s.version} — {formatDate(s.created_at)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">Version B (plus récente)</span>
          <select
            className="block border rounded-lg px-3 py-2 text-sm bg-white"
            value={versionB}
            onChange={(e) => setVersionB(Number(e.target.value))}
          >
            {sorted.map((s) => (
              <option key={s.id} value={s.version}>
                v{s.version} — {formatDate(s.created_at)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="bg-white border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Score v{versionA}</p>
          <p className="text-xl font-bold tabular-nums">{scoreA != null ? `${scoreA}%` : "—"}</p>
          {snapA?.verdict && (
            <span
              className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border ${VERDICT_COLORS[snapA.verdict as keyof typeof VERDICT_COLORS] ?? ""}`}
            >
              {snapA.verdict}
            </span>
          )}
        </div>

        <div className="bg-white border rounded-lg p-3 flex flex-col items-center justify-center">
          <p className="text-xs text-muted-foreground">Évolution</p>
          {delta != null ?
            <p
              className={`text-xl font-bold flex items-center gap-1 ${delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-slate-600"}`}
            >
              {delta > 0 ?
                <TrendingUp className="h-5 w-5" />
              : delta < 0 ?
                <TrendingDown className="h-5 w-5" />
              : <Minus className="h-5 w-5" />}
              {delta > 0 ? "+" : ""}
              {delta} pts
            </p>
          : <p className="text-muted-foreground">—</p>}
        </div>

        <div className="bg-white border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Score v{versionB}</p>
          <p className="text-xl font-bold tabular-nums">{scoreB != null ? `${scoreB}%` : "—"}</p>
          {snapB?.verdict && (
            <span
              className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border ${VERDICT_COLORS[snapB.verdict as keyof typeof VERDICT_COLORS] ?? ""}`}
            >
              {snapB.verdict}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
