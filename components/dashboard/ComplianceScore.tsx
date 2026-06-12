"use client";

import { useEffect, useState } from "react";

const SCORE_CONFIG = (score: number) => {
  if (score >= 80) return { stroke: "#16a34a", bg: "bg-green-50", text: "text-green-700", border: "border-green-200", label: "Bon niveau", badge: "✓ Conforme" };
  if (score >= 60) return { stroke: "#d97706", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "À améliorer", badge: "⚠ Partiel" };
  if (score >= 40) return { stroke: "#ea580c", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "Insuffisant", badge: "! Attention" };
  return { stroke: "#dc2626", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Critique", badge: "✕ Critique" };
};

interface ComplianceScoreProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animate?: boolean;
}

export default function ComplianceScore({
  score,
  size = "md",
  showLabel = true,
  animate = true,
}: ComplianceScoreProps) {
  const hasScore = score != null;
  const clampedScore = hasScore ? Math.max(0, Math.min(100, score)) : 0;
  const config = SCORE_CONFIG(clampedScore);

  const dimensions = size === "sm" ? 56 : size === "lg" ? 128 : 88;
  const strokeWidth = size === "sm" ? 5 : size === "lg" ? 8 : 6;
  const radius = (dimensions - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  const [displayed, setDisplayed] = useState(animate ? 0 : clampedScore);

  useEffect(() => {
    if (!animate || !hasScore) return;
    const duration = 900;
    const start = performance.now();
    const raf = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * clampedScore));
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [clampedScore, animate, hasScore]);

  const dashOffset = hasScore
    ? circumference - (displayed / 100) * circumference
    : circumference;

  const fontSize = size === "sm" ? "text-xs" : size === "lg" ? "text-3xl" : "text-lg";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: dimensions, height: dimensions }}>
        <svg
          width={dimensions}
          height={dimensions}
          className="-rotate-90"
          role="img"
          aria-label={hasScore ? `Score de conformité : ${clampedScore}/100` : "Score non disponible"}
        >
          {/* Track */}
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          {/* Fill */}
          {hasScore && (
            <circle
              cx={dimensions / 2}
              cy={dimensions / 2}
              r={radius}
              fill="none"
              stroke={config.stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: animate ? "none" : "stroke-dashoffset 0.8s ease" }}
            />
          )}
        </svg>

        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {hasScore ? (
            <span className={`font-bold leading-none font-serif ${fontSize}`} style={{ color: config.stroke }}>
              {displayed}
            </span>
          ) : (
            <span className={`font-bold ${fontSize} text-slate-300`}>—</span>
          )}
          {size === "lg" && hasScore && (
            <span className="text-xs text-slate-400 mt-0.5 font-sans">/ 100</span>
          )}
        </div>
      </div>

      {showLabel && (
        <div className="flex flex-col items-center gap-1">
          <span className={`text-xs font-semibold ${hasScore ? config.text : "text-slate-400"} font-sans`}>
            {hasScore ? config.label : "Aucun audit"}
          </span>
        </div>
      )}
    </div>
  );
}
