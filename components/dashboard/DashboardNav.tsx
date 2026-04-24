"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Shield,
  FolderSearch,
  MessageSquare,
  BookOpen,
  Bell,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Sparkles,
  Plus,
  Wrench,
  BarChart3,
  History,
  Settings,
  Scale,
  Newspaper,
  CalendarDays,
  Library,
  Search,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  highlight?: boolean;
  pro?: boolean;
  exact?: boolean;
  excludePaths?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord", exact: true },
  { href: "/dashboard/projects/new", icon: Plus, label: "Nouvel audit", highlight: true, exact: true },
  { href: "/dashboard/projects", icon: FolderSearch, label: "Mes projets", excludePaths: ["/dashboard/projects/new"] },
  { href: "/dashboard/chat", icon: MessageSquare, label: "Consultant juridique" },
  { href: "/dashboard/register", icon: BookOpen, label: "Registre IA", pro: true },
  { href: "/dashboard/alerts", icon: Bell, label: "Veille réglementaire", pro: true },
  { href: "/dashboard/journal", icon: Newspaper, label: "Journal juridique EU" },
  { href: "/dashboard/calendar", icon: CalendarDays, label: "Calendrier réglementaire" },
  { href: "/dashboard/tools", icon: Wrench, label: "Outils juridiques IA", pro: true },
  { href: "/dashboard/benchmark", icon: BarChart3, label: "Benchmark sectoriel", pro: true },
  { href: "/dashboard/sources", icon: Library, label: "Sources juridiques" },
  { href: "/dashboard/lawyers", icon: Scale, label: "Trouver un avocat" },
  { href: "/dashboard/audit-trail", icon: History, label: "Audit Trail" },
  { href: "/dashboard/settings", icon: Settings, label: "Paramètres", exact: true },
];

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

  const NavContent = () => (
    <>
      <div className="px-6 py-5 border-b border-slate-700">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <Shield className="h-6 w-6 text-blue-400" />
          <span className="font-bold text-lg">CompliAI</span>
        </Link>
        <div className="mt-2">
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            tier === "pro" || tier === "enterprise" ? "bg-blue-600 text-white" :
            tier === "starter" ? "bg-slate-600 text-slate-200" : "bg-slate-700 text-slate-400"
          )}>
            {tier === "free" ? "Gratuit" : tier.charAt(0).toUpperCase() + tier.slice(1)}
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
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
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group",
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
                item.highlight && !isActive && "border border-blue-500/30 text-blue-300 hover:text-blue-200"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isPro && <Sparkles className="h-3 w-3 text-blue-400" />}
              {isActive && <ChevronRight className="h-3 w-3 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-700">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs font-medium text-white truncate">{userName || "Utilisateur"}</p>
          <p className="text-xs text-slate-400 truncate">{userEmail}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 text-white flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-400" />
          <span className="font-bold">CompliAI</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={cn(
        "lg:hidden fixed top-0 left-0 z-40 w-72 bg-slate-900 text-white flex flex-col h-screen transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-slate-900 text-white flex-col h-screen">
        <NavContent />
      </aside>
    </>
  );
}
