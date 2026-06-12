"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Shield,
  MessageSquare,
  LogOut,
  User,
  Sparkles,
  Zap,
  CreditCard,
  ChevronRight,
  Menu,
  Sun,
  Moon,
  Settings,
  History,
  HelpCircle,
  Key,
  Lock,
} from "lucide-react";
import { useTheme } from "@/components/ui/dark-mode-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CreditBadge } from "@/components/ui/CreditBadge";
import {
  LEGAL_TOOL_SECTIONS,
  VEILLE_NAV,
  WORKSPACE_NAV,
  isNavItemActive,
  sectionHasActiveItem,
  type NavItem,
  type NavSection,
} from "@/lib/navigation/app-nav";

interface DashboardNavbarProps {
  userEmail: string;
  userName: string;
  tier: string;
}

function NavDropdownPanel({
  items,
  isPro,
  pathname,
  footerHref,
  footerLabel,
}: {
  items: NavItem[];
  isPro: boolean;
  pathname: string;
  footerHref?: string;
  footerLabel?: string;
}) {
  return (
    <ul className="w-[min(100vw-2rem,22rem)] p-2">
      {items.map((item) => {
        const locked = item.requiresPro && !isPro;
        const active = isNavItemActive(pathname, item.href);
        return (
          <li key={item.href}>
            <NavigationMenuLink asChild>
              <Link
                href={locked ? "/dashboard/upgrade" : item.href}
                className={cn(
                  "flex select-none gap-3 rounded-lg p-2.5 leading-none no-underline outline-none transition-colors",
                  active ? "bg-neutral-100 text-neutral-900" : "hover:bg-neutral-50",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600">
                        {item.badge}
                      </span>
                    )}
                    {locked && <Lock className="h-3 w-3 text-amber-500" />}
                  </div>
                  {item.description && (
                    <p className="mt-0.5 text-xs leading-snug text-neutral-500">{item.description}</p>
                  )}
                </div>
              </Link>
            </NavigationMenuLink>
          </li>
        );
      })}
      {footerHref && footerLabel && (
        <li className="mt-1 border-t border-neutral-100 pt-1">
          <NavigationMenuLink asChild>
            <Link
              href={footerHref}
              className="block rounded-lg px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
            >
              {footerLabel} →
            </Link>
          </NavigationMenuLink>
        </li>
      )}
    </ul>
  );
}

function MobileNavLink({
  item,
  isPro,
  pathname,
}: {
  item: NavItem;
  isPro: boolean;
  pathname: string;
}) {
  const locked = item.requiresPro && !isPro;
  const active = isNavItemActive(pathname, item.href);
  return (
    <Link
      href={locked ? "/dashboard/upgrade" : item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50",
      )}
    >
      <item.icon className="h-4 w-4 shrink-0 opacity-70" />
      <span className="flex-1">{item.label}</span>
      {locked && <Sparkles className="h-3 w-3 text-amber-400" />}
    </Link>
  );
}

export function DashboardNavbar({ userEmail, userName, tier }: DashboardNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const isPro = tier === "pro" || tier === "enterprise";
  const { theme, setTheme } = useTheme();
  const isChat = pathname === "/dashboard/chat" || pathname.startsWith("/dashboard/chat/");

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function sectionTriggerClass(active: boolean) {
    return cn(
      "h-8 px-3 text-sm font-medium rounded-lg bg-transparent border-0 shadow-none whitespace-nowrap",
      active
        ? "bg-neutral-900 text-white hover:bg-neutral-900 hover:text-white data-[state=open]:bg-neutral-900 data-[state=open]:text-white"
        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 data-[state=open]:bg-neutral-100",
    );
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 bg-[#fafafa]/95 backdrop-blur-xl">
      <div className="flex h-12 items-center gap-2 px-3 lg:px-4">
        <Link href="/dashboard/chat" className="flex shrink-0 items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-neutral-100/80">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 shadow-sm">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="hidden font-semibold tracking-tight text-neutral-900 sm:block text-[15px]">
            CompliAI
          </span>
        </Link>

        <div className="mx-1 hidden h-4 w-px bg-neutral-200 sm:block" />

        <nav className="hidden min-w-0 flex-1 items-center lg:flex">
          <NavigationMenu className="max-w-none justify-start">
            <NavigationMenuList className="gap-0.5">
              <NavigationMenuItem>
                <Link
                  href="/dashboard/chat"
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
                    isChat
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Chat
                </Link>
              </NavigationMenuItem>

              {LEGAL_TOOL_SECTIONS.map((section: NavSection) => (
                <NavigationMenuItem key={section.id}>
                  <NavigationMenuTrigger className={sectionTriggerClass(sectionHasActiveItem(pathname, section))}>
                    {section.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <NavDropdownPanel
                      items={section.items}
                      isPro={isPro}
                      pathname={pathname}
                      footerHref="/dashboard/tools"
                      footerLabel="Voir tous les outils"
                    />
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}

              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={sectionTriggerClass(WORKSPACE_NAV.some((i) => isNavItemActive(pathname, i.href)))}
                >
                  Espace travail
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <NavDropdownPanel items={WORKSPACE_NAV} isPro={isPro} pathname={pathname} />
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={sectionTriggerClass(VEILLE_NAV.some((i) => isNavItemActive(pathname, i.href)))}
                >
                  Veille
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <NavDropdownPanel items={VEILLE_NAV} isPro={isPro} pathname={pathname} />
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        <div className="flex flex-1 lg:flex-none" />

        <Link
          href="/dashboard/support"
          className="hidden text-xs font-medium text-neutral-500 hover:text-neutral-900 md:inline-flex"
        >
          Aide
        </Link>

        <CreditBadge className="hidden shrink-0 sm:flex" />

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 rounded-lg p-0 text-neutral-600">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="flex w-[min(100vw-2rem,20rem)] flex-col p-0">
            <SheetHeader className="border-b border-neutral-100 px-4 py-4">
              <SheetTitle className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-semibold text-neutral-900">{userName || "Utilisateur"}</p>
                  <p className="truncate text-xs text-neutral-500">{userEmail}</p>
                </div>
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-2 py-3">
              <div className="mb-3 px-2 lg:hidden">
                <Link
                  href="/dashboard/chat"
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                    isChat ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800",
                  )}
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat consultant
                </Link>
              </div>

              <Accordion type="multiple" className="lg:hidden space-y-1">
                {LEGAL_TOOL_SECTIONS.map((section) => (
                  <AccordionItem key={section.id} value={section.id} className="border-0">
                    <AccordionTrigger className="rounded-lg px-3 py-2 text-sm font-medium hover:no-underline hover:bg-neutral-50">
                      {section.label}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-0.5 pb-1 pl-1">
                      {section.items.map((item) => (
                        <MobileNavLink key={item.href} item={item} isPro={isPro} pathname={pathname} />
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
                <AccordionItem value="workspace" className="border-0">
                  <AccordionTrigger className="rounded-lg px-3 py-2 text-sm font-medium hover:no-underline hover:bg-neutral-50">
                    Espace travail
                  </AccordionTrigger>
                  <AccordionContent className="space-y-0.5 pb-1 pl-1">
                    {WORKSPACE_NAV.map((item) => (
                      <MobileNavLink key={item.href} item={item} isPro={isPro} pathname={pathname} />
                    ))}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="veille" className="border-0">
                  <AccordionTrigger className="rounded-lg px-3 py-2 text-sm font-medium hover:no-underline hover:bg-neutral-50">
                    Veille
                  </AccordionTrigger>
                  <AccordionContent className="space-y-0.5 pb-1 pl-1">
                    {VEILLE_NAV.map((item) => (
                      <MobileNavLink key={item.href} item={item} isPro={isPro} pathname={pathname} />
                    ))}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="mt-4 space-y-1 border-t border-neutral-100 px-1 pt-4">
                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Compte</p>

                <div
                  className={cn(
                    "mb-2 flex items-center justify-between rounded-xl px-4 py-3",
                    isPro ? "border border-amber-200/60 bg-amber-50/50" : "border border-neutral-200 bg-neutral-50",
                  )}
                >
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Plan</p>
                    <p className="mt-0.5 text-base font-bold text-neutral-900">
                      {tier === "free" ? "Gratuit" : tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </p>
                  </div>
                  {isPro ? <Shield className="h-5 w-5 text-neutral-700" /> : <Sparkles className="h-5 w-5 text-neutral-300" />}
                </div>

                {!isPro && (
                  <Link
                    href="/dashboard/upgrade"
                    className="mb-2 flex items-center gap-3 rounded-xl bg-neutral-900 px-4 py-3 text-white"
                  >
                    <Zap className="h-5 w-5 shrink-0 text-amber-400" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Passer à Pro</p>
                      <p className="text-xs text-white/60">Outils cabinet & UE-27</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/40" />
                  </Link>
                )}

                {[
                  { href: "/dashboard/credits", icon: CreditCard, label: "Crédits IA" },
                  { href: "/dashboard/api-keys", icon: Key, label: "Clés API" },
                  { href: "/dashboard/support", icon: HelpCircle, label: "Support" },
                  { href: "/dashboard/settings", icon: Settings, label: "Paramètres" },
                  { href: "/dashboard/audit-trail", icon: History, label: "Audit trail" },
                ].map(({ href, icon: Icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    <Icon className="h-4 w-4 text-neutral-400" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-neutral-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Thème</span>
                <div className="flex gap-1">
                  {[
                    { v: "light" as const, Icon: Sun },
                    { v: "dark" as const, Icon: Moon },
                  ].map(({ v, Icon }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTheme(v)}
                      className={cn(
                        "rounded-lg p-1.5 transition-colors",
                        theme === v ? "bg-neutral-900 text-white" : "text-neutral-400 hover:bg-neutral-100",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-neutral-500 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
