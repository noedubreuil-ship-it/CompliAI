"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AnalyticsPrintButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="print:hidden gap-1"
      onClick={() => window.print()}
    >
      <Printer className="h-4 w-4" />
      Exporter / imprimer (COMEX)
    </Button>
  );
}
