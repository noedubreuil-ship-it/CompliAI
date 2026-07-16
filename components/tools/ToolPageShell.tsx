import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface ToolPageShellProps {
  title: string;
  breadcrumb?: string;
  description?: ReactNode;
  icon?: LucideIcon;
  badges?: ReactNode;
  actions?: ReactNode;
  maxWidth?: string;
  children: ReactNode;
  className?: string;
}

export function ToolPageShell({
  title,
  breadcrumb,
  description,
  icon: Icon,
  badges,
  actions,
  maxWidth = "max-w-3xl",
  children,
  className,
}: ToolPageShellProps) {
  const t = useTranslations("Tools");
  return (
    <div className={cn("mx-auto w-full space-y-6", maxWidth, className)}>
      <nav className="flex flex-wrap items-center gap-1 text-xs text-neutral-500">
        <Link href="/dashboard/tools" className="transition-colors hover:text-neutral-900">
          {t("rootBreadcrumb")}
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="font-medium text-neutral-900">{breadcrumb ?? title}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {Icon && (
            <div className="shrink-0 rounded-xl bg-neutral-100 p-2.5">
              <Icon className="h-5 w-5 text-neutral-800" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">{title}</h1>
            {description && <div className="mt-1 text-sm text-neutral-500">{description}</div>}
            {badges && <div className="mt-2 flex flex-wrap gap-2">{badges}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {children}
    </div>
  );
}
