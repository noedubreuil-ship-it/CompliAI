"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditPoint {
  date: string;
  score: number;
  projectName: string;
}

interface Props {
  audits: AuditPoint[];
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function ScoreHistory({ audits }: Props) {
  const points = useMemo(
    () =>
      [...audits]
        .filter((a) => a.score != null)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-10),
    [audits]
  );

  if (points.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
        <TrendingUp className="h-6 w-6 mb-2 opacity-30" />
        Lancez au moins 2 audits pour voir la tendance
      </div>
    );
  }

  const W = 320;
  const H = 100;
  const PAD = { top: 10, right: 10, bottom: 20, left: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const minScore = Math.max(0, Math.min(...points.map((p) => p.score)) - 10);
  const maxScore = Math.min(100, Math.max(...points.map((p) => p.score)) + 10);
  const range = maxScore - minScore || 1;

  const toX = (i: number) => PAD.left + (i / (points.length - 1)) * innerW;
  const toY = (score: number) => PAD.top + innerH - ((score - minScore) / range) * innerH;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.score)}`)
    .join(" ");

  const areaD =
    pathD +
    ` L ${toX(points.length - 1)} ${PAD.top + innerH} L ${PAD.left} ${PAD.top + innerH} Z`;

  const last = points[points.length - 1].score;
  const first = points[0].score;
  const delta = last - first;
  const trend = delta > 2 ? "up" : delta < -2 ? "down" : "flat";

  const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-slate-500";
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">10 derniers audits</span>
        <span className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
          <TrendIcon className="h-3 w-3" />
          {delta > 0 ? "+" : ""}{delta} pts
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: "200px", maxHeight: "120px" }}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((v) => {
            const y = toY(Math.max(minScore, Math.min(maxScore, v)));
            if (y < PAD.top || y > PAD.top + innerH) return null;
            return (
              <g key={v}>
                <line
                  x1={PAD.left}
                  y1={y}
                  x2={W - PAD.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
                <text x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize="7" fill="#94a3b8">
                  {v}
                </text>
              </g>
            );
          })}

          {/* Area */}
          <path d={areaD} fill="#3b82f6" fillOpacity="0.08" />

          {/* Line */}
          <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={toX(i)} cy={toY(p.score)} r="4" fill="white" stroke="#3b82f6" strokeWidth="2" />
              <title>{p.projectName}: {p.score}/100 ({formatShortDate(p.date)})</title>
            </g>
          ))}

          {/* X labels (first and last only) */}
          <text x={toX(0)} y={H - 2} textAnchor="middle" fontSize="7" fill="#94a3b8">
            {formatShortDate(points[0].date)}
          </text>
          <text x={toX(points.length - 1)} y={H - 2} textAnchor="middle" fontSize="7" fill="#94a3b8">
            {formatShortDate(points[points.length - 1].date)}
          </text>
        </svg>
      </div>

      {/* Score summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Min: <strong className="text-slate-700">{Math.min(...points.map(p => p.score))}</strong></span>
        <span>Moy: <strong className="text-slate-700">{Math.round(points.reduce((s, p) => s + p.score, 0) / points.length)}</strong></span>
        <span>Max: <strong className="text-slate-700">{Math.max(...points.map(p => p.score))}</strong></span>
      </div>
    </div>
  );
}
