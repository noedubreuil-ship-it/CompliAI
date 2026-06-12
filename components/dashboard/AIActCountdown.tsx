"use client";

import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";

// AI Act Article 6 + Annexe III high-risk deadline: August 2, 2026
const DEADLINE = new Date("2026-08-02T00:00:00Z");

export default function AIActCountdown() {
  const now = new Date();
  const diffMs = DEADLINE.getTime() - now.getTime();
  const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const urgency =
    days <= 30 ? "bg-red-50 border-red-200 text-red-800 hover:bg-red-100" :
    days <= 60 ? "bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100" :
    days <= 90 ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100" :
    "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100";

  const iconColor =
    days <= 30 ? "text-red-500" :
    days <= 60 ? "text-orange-500" :
    days <= 90 ? "text-amber-500" :
    "text-blue-500";

  return (
    <Link href="/dashboard/calendar" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors group ${urgency}`}>
      <Clock className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
      <span className="flex-1">
        <strong>{days} jours</strong> avant la deadline AI Act (systèmes haut risque) —{" "}
        <span className="font-normal opacity-80">Art. 6 + Annexe III · 2 août 2026</span>
      </span>
      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" />
    </Link>
  );
}
