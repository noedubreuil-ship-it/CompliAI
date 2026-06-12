"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Shield, FolderSearch, MessageSquare, BookOpen, Bell,
  LayoutDashboard, LogOut, ChevronRight, Sparkles, Plus,
  Wrench, BarChart3, History, Settings, Scale, Newspaper,
  CalendarDays, Library, Menu, X, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EUFlagSVG } from "@/components/EUFlag";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  highlight?: boolean;
  pro?: boolean;
  exact?: boolean;
  excludePaths?: string[];
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord", exact: true, group: "main" },
  { href: "/dashboard/projects/new", icon: Plus, label: "Nouvel audit", highlight: true, exact: true, group: "main" },
  { href: "/dashboard/projects", icon: FolderSearch, label: "Mes projets", excludePaths: ["/dashboard/projects/new"], group: "main" },
  { href: "/dashboard/chat", icon: MessageSquare, label: "Consultant IA 24/7", group: "legal" },
  { href: "/dashboard/register", icon: BookOpen, label: "Registre IA", pro: true, group: "legal" },
  { href: "/dashboard/alerts", icon: Bell, label: "Veille réglementaire", pro: true, group: "legal" },
  { href: "/dashboard/journal", icon: Newspaper, label: "Journal juridique EU", group: "watch" },
  { href: "/dashboard/calendar", icon: CalendarDays, label: "Calendrier", group: "watch" },
  { href: "/dashboard/sources", icon: Library, label: "Sources juridiques", group: "watch" },
  { href: "/dashboard/tools", icon: Wrench, label: "Outils IA juridiques", pro: true, group: "tools" },
  { href: "/dashboard/benchmark", icon: BarChart3, label: "Benchmark sectoriel", pro: true, group: "tools" },
  { href: "/dashboard/lawyers", icon: Scale, label: "Trouver un avocat", group: "tools" },
  { href: "/dashboard/audit-trail", icon: History, label: "Audit Trail", group: "system" },
  { href: "/dashboard/settings", icon: Settings, label: "Paramètres", exact: true, group: "system" },
];

const GROUP_LABELS: Record<string, string> = {
  main: "Principal",
  legal: "Juridique",
  watch: "Veille",
  tools: "Outils",
  system: "Système",
};

interface DashboardNavProps {
  userEmail: string;
  userName: string;
  tier: string;
}

export default function DashboardNav({ userEmail, userName, tier }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const groups = ["main", "legal", "watch", "tools", "system"];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#001A4E] via-[#002266] to-[#001A4E]">
      {/* Header */}
      <div className="px-5 py-5 border-b border-white/8">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <div className="w-9 h-9 rounded-xl bg-[#003399] flex items-center justify-center shadow-lg ring-1 ring-white/10">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-base tracking-tight">CompliAI</span>
            <div className="flex items-center gap-1 mt-0.5">
              <EUFlagSVG width={16} height={11} opacity={0.7} />
              <span className="text-[10px] text-white/35 font-medium">EU Compliance</span>
            </div>
          </div>
        </Link>

        <div className="mt-3">
          <span className={cn(
            "text-xs px-2.5 py-1 rounded-full font-semibold",
            tier === "pro" || tier === "enterprise"
              ? "bg-[#FFCC00] text-[#003399]"
              : tier === "starter"
              ? "bg-white/15 text-white/70"
              : "bg-white/10 text-white/50"
          )}>
            {tier === "free" ? "Gratuit" : tier.charAt(0).toUpperCase() + tier.slice(1)}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {groups.map((group) => {
          const items = NAV_ITEMS.filter((i) => i.group === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              <p className="px-3 mb-1.5 text-[10px] font-bold text-white/25 uppercase tracking-widest">
                {GROUP_LABELS[group]}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const isActive = (() => {
                    if (item.exact) return pathname === item.href;
                    if (item.excludePaths?.some((p) => pathname.startsWith(p))) return false;
                    return pathname === item.href || pathname.startsWith(item.href + "/");
                  })();
                  const isPro = item.pro && tier !== "pro" && tier !== "enterprise";

                  return (
                    <Link
                      key={item.href}
                      href={isPro ? "/dashboard/upgrade" : item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group relative",
                        isActive
                          ? "bg-white/15 text-white shadow-lg backdrop-blur-sm"
                          : "text-white/50 hover:bg-white/8 hover:text-white/85",
                        item.highlight && !isActive && "border border-[#FFCC00]/30 text-[#FFCC00]/80 hover:text-[#FFCC00]"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#FFCC00] rounded-r-full" />
                      )}
                      <item.icon className={cn("h-4 w-4 flex-shrink-0 transition-colors", isActive ? "text-[#FFCC00]" : "")} />
                      <span className="flex-1 font-medium">{item.label}</span>
                      {isPro && <Sparkles className="h-3 w-3 text-[#FFCC00]/60" />}
                      {isActive && <ChevronRight className="h-3 w-3 text-white/40" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-white/8">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 mb-1">
          <div className="w-7 h-7 rounded-full bg-[#003399] flex items-center justify-center flex-shrink-0 ring-1 ring-white/15">
            <User className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{userName || "Utilisateur"}</p>
            <p className="text-[10px] text-white/40 truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#001A4E] text-white flex items-center justify-between px-4 py-3 border-b border-white/8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#FFCC00]" />
          <span className="font-bold text-sm">CompliAI</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={cn(
        "lg:hidden fixed top-0 left-0 z-40 w-72 flex flex-col h-screen transition-transform duration-300 ease-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col h-screen">
        <NavContent />
      </aside>
    </>
  );
}
