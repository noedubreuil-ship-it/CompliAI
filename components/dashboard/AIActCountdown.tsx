"use client";

import { Clock } from "lucide-react";

// AI Act Article 6 + Annexe III high-risk deadline: August 2, 2026
const DEADLINE = new Date("2026-08-02T00:00:00Z");

export default function AIActCountdown() {
  const now = new Date();
  const diffMs = DEADLINE.getTime() - now.getTime();
  const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const urgency =
    days <= 30 ? "bg-red-50 border-red-200 text-red-800" :
    days <= 60 ? "bg-orange-50 border-orange-200 text-orange-800" :
    days <= 90 ? "bg-amber-50 border-amber-200 text-amber-800" :
    "bg-blue-50 border-blue-200 text-blue-800";

  const iconColor =
    days <= 30 ? "text-red-500" :
    days <= 60 ? "text-orange-500" :
    days <= 90 ? "text-amber-500" :
    "text-blue-500";

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm font-medium ${urgency}`}>
      <Clock className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
      <span>
        <strong>{days} jours</strong> avant la deadline AI Act (systèmes haut risque) —{" "}
        <span className="font-normal opacity-80">Art. 6 + Annexe III · 2 août 2026</span>
      </span>
    </div>
  );
}
