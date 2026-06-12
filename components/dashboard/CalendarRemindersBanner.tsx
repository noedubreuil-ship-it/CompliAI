import Link from "next/link";
import { Bell, Mail } from "lucide-react";

/** M1 — Rappels automatiques (cron + notifications in-app). */
export function CalendarRemindersBanner() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div className="flex gap-3">
        <Bell className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-900">Rappels automatiques activés</p>
          <p className="text-blue-800 text-xs mt-0.5 leading-relaxed">
            Emails + notifications in-app à <strong>J-30, J-14 et J-7</strong> pour les échéances critiques et hautes.
            Alertes AI Act (J-90 à J-7) si vos notifications email sont activées.
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline shrink-0"
      >
        <Mail className="h-3.5 w-3.5" />
        Préférences
      </Link>
    </div>
  );
}
