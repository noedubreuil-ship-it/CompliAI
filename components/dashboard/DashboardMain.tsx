"use client";

import { usePathname } from "next/navigation";
import AIActCountdown from "@/components/dashboard/AIActCountdown";
import GlobalSearch from "@/components/dashboard/GlobalSearch";
import NotificationBell from "@/components/dashboard/NotificationBell";

const FULL_BLEED_ROUTES = ["/dashboard/chat", "/dashboard/brain"];

function isFullBleedRoute(pathname: string): boolean {
  return FULL_BLEED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = isFullBleedRoute(pathname);

  if (fullBleed) {
    return (
      <div className="relative z-10 flex flex-1 flex-col min-h-0 overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 z-20 border-b border-neutral-200/80 bg-white/80 backdrop-blur-xl px-4 lg:px-5 py-2 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <AIActCountdown />
        </div>
        <GlobalSearch />
        <NotificationBell />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-7xl w-full mx-auto px-4 lg:px-6 py-6 lg:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
