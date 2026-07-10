"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarDays, ExternalLink, ChevronDown, ChevronUp, Filter,
  AlertTriangle, Info, Clock, Globe, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  EU_CALENDAR_EVENTS,
  EVENT_TYPE_CONFIG,
  IMPORTANCE_CONFIG,
  type EventType,
  type EventImportance,
  type CalendarEvent,
} from "@/lib/data/eu-calendar";
import { EU_AUTHORITIES, getCountryFlag } from "@/lib/data/eu-authorities";
import { CalendarRemindersBanner } from "@/components/dashboard/CalendarRemindersBanner";

// ─── Helpers ────────────────────────────────────────────────────────────────

const ALL_TYPES: EventType[] = [
  "Délai réglementaire", "Entrée en vigueur", "Arrêt CJUE", "Audience CJUE",
  "Vote Parlement EU", "Décision DPA attendue", "Publication officielle",
  "Consultation publique", "Sommet / Conférence", "Discours / Audition",
];

const ALL_IMPORTANCES: EventImportance[] = ["critique", "haute", "moyenne", "info"];

function formatDate(dateStr: string, label?: string): string {
  if (label) return label;
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function monthKey(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00Z");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── EventCard ──────────────────────────────────────────────────────────────

function EventCard({ event }: { event: CalendarEvent }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = EVENT_TYPE_CONFIG[event.type];
  const importConfig = IMPORTANCE_CONFIG[event.importance];
  const authority = event.authorityId ? EU_AUTHORITIES.find(a => a.id === event.authorityId) : null;
  const days = daysUntil(event.date);
  const isPast = days < 0;
  const isUrgent = days >= 0 && days <= 30;
  const isSoon = days > 30 && days <= 90;

  return (
    <Card className={`transition-all hover:shadow-md ${
      isPast ? "opacity-60" : ""
    } ${isUrgent && !isPast ? "border-red-300 shadow-sm" : ""}`}>
      <CardContent className="pt-4 pb-3 space-y-2.5">
        {/* Top row */}
        <div className="flex items-start gap-3">
          {/* Date badge */}
          <div className={`flex-shrink-0 text-center rounded-xl border px-2.5 py-1.5 min-w-[56px] ${
            isPast ? "bg-gray-50 border-gray-200" :
            isUrgent ? "bg-red-50 border-red-300" :
            isSoon ? "bg-amber-50 border-amber-200" :
            "bg-white border-gray-200"
          }`}>
            <div className={`text-xs font-bold uppercase tracking-wide ${
              isPast ? "text-gray-400" : isUrgent ? "text-red-600" : isSoon ? "text-amber-700" : "text-slate-600"
            }`}>
              {new Date(event.date + "T12:00:00Z").toLocaleDateString("fr-FR", { month: "short" })}
            </div>
            <div className={`text-xl font-extrabold leading-none ${
              isPast ? "text-gray-400" : isUrgent ? "text-red-700" : "text-slate-800"
            }`}>
              {new Date(event.date + "T12:00:00Z").getDate()}
            </div>
            <div className={`text-xs ${isPast ? "text-gray-400" : "text-slate-500"}`}>
              {new Date(event.date + "T12:00:00Z").getFullYear()}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {/* Type badge */}
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${typeConfig.bg} ${typeConfig.color} ${typeConfig.border}`}>
                {event.type}
              </span>
              {/* Importance badge */}
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${importConfig.color}`}>
                {importConfig.label}
              </span>
              {/* Authority */}
              {authority && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-medium flex items-center gap-1">
                  {getCountryFlag(authority.countryCode)} {authority.name}
                </span>
              )}
              {/* Estimated */}
              {event.isEstimated && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> Estimé
                </span>
              )}
              {/* Past */}
              {isPast && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Passé</span>
              )}
            </div>

            <h3 className="font-semibold text-sm text-slate-800 leading-snug">{event.title}</h3>

            {/* Date label */}
            <p className="text-xs text-slate-500 mt-0.5">
              {event.dateLabel ?? formatDate(event.date)}
              {!isPast && days >= 0 && (
                <span className={`ml-2 font-medium ${isUrgent ? "text-red-600" : isSoon ? "text-amber-600" : "text-slate-400"}`}>
                  {days === 0 ? "Aujourd'hui" : days === 1 ? "Demain" : `Dans ${days} jours`}
                </span>
              )}
            </p>
          </div>

          {/* Expand toggle */}
          <button onClick={() => setExpanded(!expanded)} className="flex-shrink-0 text-slate-400 hover:text-slate-600 mt-1">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="pl-[68px] space-y-2.5">
            <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>

            {/* Regulation */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Globe className="h-3 w-3" />
              <span className="font-medium">{event.regulation}</span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {event.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{tag}</span>
              ))}
            </div>

            {/* Source link */}
            {event.sourceUrl && (
              <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50 transition-colors">
                Source officielle <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Calendar Page ──────────────────────────────────────────────────────

export default function CalendarPage() {
  const [selectedTypes, setSelectedTypes] = useState<EventType[]>([]);
  const [selectedImportance, setSelectedImportance] = useState<EventImportance[]>([]);
  const [showPast, setShowPast] = useState(false);
  const [selectedRegulation, setSelectedRegulation] = useState("");
  const [view, setView] = useState<"list" | "month">("list");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = useMemo(() => {
    return EU_CALENDAR_EVENTS.filter(e => {
      const isPast = new Date(e.date + "T00:00:00") < today;
      if (!showPast && isPast) return false;
      if (selectedTypes.length > 0 && !selectedTypes.includes(e.type)) return false;
      if (selectedImportance.length > 0 && !selectedImportance.includes(e.importance)) return false;
      if (selectedRegulation && !e.regulation.toLowerCase().includes(selectedRegulation.toLowerCase())) return false;
      return true;
    });
  }, [selectedTypes, selectedImportance, showPast, selectedRegulation]);

  // Group by month for list view
  const byMonth = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of filtered) {
      const key = monthKey(e.date);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [filtered]);

  const criticalCount = EU_CALENDAR_EVENTS.filter(e => {
    const d = daysUntil(e.date);
    return d >= 0 && d <= 90 && e.importance === "critique";
  }).length;

  const upcomingCount = EU_CALENDAR_EVENTS.filter(e => daysUntil(e.date) >= 0 && daysUntil(e.date) <= 30).length;

  // All unique regulations for filter
  const regulations = [...new Set(EU_CALENDAR_EVENTS.map(e => e.regulation))].sort();

  const hasFilters = selectedTypes.length > 0 || selectedImportance.length > 0 || selectedRegulation;

  function toggleType(t: EventType) {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }
  function toggleImportance(i: EventImportance) {
    setSelectedImportance(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-slate-700" />
            Calendrier réglementaire européen
          </h1>
          <p className="text-muted-foreground mt-1">
            Arrêts CJUE, votes législatifs, délais AI Act/RGPD, sommets et décisions DPA à venir
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("list")}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${view === "list" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
            Liste
          </button>
          <button onClick={() => setView("month")}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${view === "month" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
            Mensuel
          </button>
        </div>
      </div>

      <CalendarRemindersBanner />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-red-50 border-red-200 p-3 text-center">
          <div className="text-2xl font-bold text-red-700">{criticalCount}</div>
          <div className="text-xs text-red-600 font-medium mt-0.5">Échéances critiques (90j)</div>
        </div>
        <div className="rounded-xl border bg-amber-50 border-amber-200 p-3 text-center">
          <div className="text-2xl font-bold text-amber-700">{upcomingCount}</div>
          <div className="text-xs text-amber-600 font-medium mt-0.5">Événements dans 30 jours</div>
        </div>
        <div className="rounded-xl border bg-blue-50 border-blue-200 p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">{EU_CALENDAR_EVENTS.filter(e => daysUntil(e.date) >= 0).length}</div>
          <div className="text-xs text-blue-600 font-medium mt-0.5">Événements à venir</div>
        </div>
        <div className="rounded-xl border bg-purple-50 border-purple-200 p-3 text-center">
          <div className="text-2xl font-bold text-purple-700">{EU_CALENDAR_EVENTS.filter(e => e.type === "Arrêt CJUE" || e.type === "Audience CJUE").length}</div>
          <div className="text-xs text-purple-600 font-medium mt-0.5">Affaires CJUE suivies</div>
        </div>
      </div>

      {/* Alert banner for urgent events */}
      {upcomingCount > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {upcomingCount} événement{upcomingCount > 1 ? "s" : ""} dans les 30 prochains jours
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              Vérifiez votre conformité aux obligations arrivant à échéance.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        {/* Type filters */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-slate-500 flex items-center gap-1"><Filter className="h-3 w-3" /> Type :</span>
          {ALL_TYPES.map(t => {
            const cfg = EVENT_TYPE_CONFIG[t];
            const active = selectedTypes.includes(t);
            return (
              <button key={t} onClick={() => toggleType(t)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  active ? `${cfg.bg} ${cfg.color} ${cfg.border} font-medium` : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                }`}>
                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${cfg.dot}`} />
                {t}
              </button>
            );
          })}
        </div>

        {/* Importance + Regulation + toggles */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500">Importance :</span>
          {ALL_IMPORTANCES.map(imp => {
            const cfg = IMPORTANCE_CONFIG[imp];
            const active = selectedImportance.includes(imp);
            return (
              <button key={imp} onClick={() => toggleImportance(imp)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  active ? `${cfg.color} font-medium` : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                }`}>
                {cfg.label}
              </button>
            );
          })}

          <div className="w-px h-5 bg-gray-200 mx-1" />

          <select
            value={selectedRegulation}
            onChange={e => setSelectedRegulation(e.target.value)}
            className="text-xs border border-slate-200 rounded-full px-3 py-1 bg-white text-slate-600 hover:border-slate-400 focus:outline-none"
          >
            <option value="">Toutes les réglementations</option>
            {regulations.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <button onClick={() => setShowPast(!showPast)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${showPast ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
            {showPast ? "Masquer passés" : "Afficher passés"}
          </button>

          {hasFilters && (
            <button onClick={() => { setSelectedTypes([]); setSelectedImportance([]); setSelectedRegulation(""); }}
              className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex items-center gap-1">
              <X className="h-3 w-3" /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-slate-500">{filtered.length} événement{filtered.length > 1 ? "s" : ""}{hasFilters ? " (filtré)" : ""}</p>

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div className="space-y-8">
          {Object.keys(byMonth).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun événement trouvé</p>
              <p className="text-sm mt-1">Modifiez vos filtres ou activez l&apos;affichage des événements passés</p>
            </div>
          ) : (
            Object.entries(byMonth).map(([month, events]) => {
              const isPastMonth = new Date(month + "-01T00:00:00") < today && new Date(month + "-28T00:00:00") < today;
              return (
                <div key={month}>
                  {/* Month header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`h-px flex-1 ${isPastMonth ? "bg-gray-200" : "bg-slate-300"}`} />
                    <h2 className={`text-sm font-bold uppercase tracking-wider px-2 ${isPastMonth ? "text-gray-400" : "text-slate-700"}`}>
                      {monthLabel(month)}
                    </h2>
                    <div className={`h-px flex-1 ${isPastMonth ? "bg-gray-200" : "bg-slate-300"}`} />
                  </div>
                  <div className="space-y-3">
                    {events.map(event => <EventCard key={event.id} event={event} />)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── MONTH VIEW ── */}
      {view === "month" && (
        <MonthView events={filtered} />
      )}

      {/* Legend */}
      <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Légende</p>
        <div className="flex flex-wrap gap-3">
          {ALL_TYPES.map(t => {
            const cfg = EVENT_TYPE_CONFIG[t];
            return (
              <div key={t} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                {t}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-2 flex items-start gap-1">
          <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
          Les dates marquées <em>Estimé</em> sont des prévisions basées sur les textes officiels et les calendriers institutionnels. Elles peuvent évoluer.
        </p>
      </div>
    </div>
  );
}

// ─── Month Grid View ─────────────────────────────────────────────────────────

function MonthView({ events }: { events: CalendarEvent[] }) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);
  const startDow = (monthStart.getDay() + 6) % 7; // Monday = 0

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: monthEnd.getDate() }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel2 = monthStart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  function eventsOnDay(day: number) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.date === dateStr);
  }

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  }

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const selectedEvents = selectedDay ? eventsOnDay(selectedDay) : [];

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>
        <h2 className="text-lg font-bold text-slate-800 capitalize">{monthLabel2}</h2>
        <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronRight className="h-5 w-5 text-slate-600" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dayEvents = eventsOnDay(day);
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = dateStr === today.toISOString().split("T")[0];
          const isSelected = selectedDay === day;

          return (
            <button key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`relative min-h-[52px] p-1 rounded-lg border text-left transition-all ${
                isSelected ? "border-slate-800 bg-slate-50 shadow" :
                isToday ? "border-blue-400 bg-blue-50" :
                dayEvents.length > 0 ? "border-slate-200 hover:border-slate-400 hover:bg-slate-50" :
                "border-transparent hover:border-slate-200"
              }`}>
              <span className={`text-sm font-medium ${isToday ? "text-blue-700" : "text-slate-700"}`}>{day}</span>
              <div className="flex flex-wrap gap-0.5 mt-1">
                {dayEvents.slice(0, 3).map(e => {
                  const cfg = EVENT_TYPE_CONFIG[e.type];
                  return <span key={e.id} className={`w-2 h-2 rounded-full ${cfg.dot}`} title={e.title} />;
                })}
                {dayEvents.length > 3 && <span className="text-[10px] text-slate-400">+{dayEvents.length - 3}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      {selectedDay && selectedEvents.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <h3 className="text-sm font-semibold text-slate-700">
            {new Date(currentYear, currentMonth, selectedDay).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </h3>
          {selectedEvents.map(e => <EventCard key={e.id} event={e} />)}
        </div>
      )}
      {selectedDay && selectedEvents.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">Aucun événement ce jour</p>
      )}
    </div>
  );
}
