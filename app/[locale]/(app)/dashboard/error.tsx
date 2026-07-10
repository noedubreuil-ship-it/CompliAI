"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RefreshCw, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-neutral-900">
            Une erreur inattendue est survenue
          </h2>
          <p className="text-sm text-neutral-500">
            La page n&apos;a pas pu se charger correctement. Cela peut être un problème temporaire.
          </p>
          {error.digest && (
            <p className="text-xs text-neutral-400 font-mono">
              Référence : {error.digest}
            </p>
          )}
          {process.env.NODE_ENV === "development" && (
            <pre className="mt-3 text-xs text-left bg-red-50 border border-red-200 rounded-lg p-3 overflow-auto max-h-32 text-red-700">
              {error.message}
            </pre>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/support" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Contacter le support
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
