"use client";

interface ComplianceScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const SCORE_COLOR = (score: number) => {
  if (score >= 80) return { stroke: "#16a34a", text: "text-green-600", label: "Bon niveau" };
  if (score >= 60) return { stroke: "#d97706", text: "text-amber-600", label: "À améliorer" };
  if (score >= 40) return { stroke: "#ea580c", text: "text-orange-600", label: "Insuffisant" };
  return { stroke: "#dc2626", text: "text-red-600", label: "Critique" };
};

export default function ComplianceScore({ score, size = "md", showLabel = true }: ComplianceScoreProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const { stroke, text, label } = SCORE_COLOR(clampedScore);

  const dimensions = size === "sm" ? 56 : size === "lg" ? 120 : 80;
  const radius = (dimensions - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clampedScore / 100) * circumference;
  const fontSize = size === "sm" ? "text-xs" : size === "lg" ? "text-2xl" : "text-base";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dimensions, height: dimensions }}>
        <svg width={dimensions} height={dimensions} className="-rotate-90">
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={6}
          />
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${fontSize} ${text}`}>{clampedScore}</span>
        </div>
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${text}`}>{label}</span>
      )}
    </div>
  );
}
