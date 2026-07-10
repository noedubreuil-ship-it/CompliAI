"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuditTrailExportButton() {
  function handleExport() {
    window.location.href = "/api/audit-trail/export";
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
      <Download className="h-4 w-4" />
      Exporter CSV
    </Button>
  );
}
