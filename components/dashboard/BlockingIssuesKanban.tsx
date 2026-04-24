"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Clock, Circle } from "lucide-react";
import { SEVERITY_COLORS } from "@/lib/utils";

type IssueStatus = "open" | "in_progress" | "resolved";

interface BlockingIssue {
  id: string;
  title: string;
  description: string;
  regulation: string;
  article?: string;
  severity: string;
  phase: string;
  status: IssueStatus;
  notes?: string;
}

interface Props {
  projectId: string;
  initialIssues: BlockingIssue[];
}

const COLUMNS: { id: IssueStatus; label: string; icon: React.ElementType; color: string }[] = [
  { id: "open", label: "À traiter", icon: Circle, color: "text-slate-600" },
  { id: "in_progress", label: "En cours", icon: Clock, color: "text-blue-600" },
  { id: "resolved", label: "Résolu", icon: CheckCircle2, color: "text-green-600" },
];

export default function BlockingIssuesKanban({ projectId, initialIssues }: Props) {
  const [issues, setIssues] = useState<BlockingIssue[]>(initialIssues);
  const [updating, setUpdating] = useState<string | null>(null);

  async function moveIssue(issueId: string, newStatus: IssueStatus) {
    setUpdating(issueId);
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i))
    );

    try {
      await fetch(`/api/projects/${projectId}/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error("Failed to update issue status:", err);
    } finally {
      setUpdating(null);
    }
  }

  const issuesByStatus = (status: IssueStatus) =>
    issues.filter((i) => i.status === status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Suivi des issues bloquantes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const colIssues = issuesByStatus(col.id);
            return (
              <div key={col.id} className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <col.icon className={`h-4 w-4 ${col.color}`} />
                  <span className="text-sm font-medium">{col.label}</span>
                  <span className="ml-auto text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {colIssues.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[120px]">
                  {colIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`p-3 rounded-lg border text-xs space-y-2 ${SEVERITY_COLORS[issue.severity as keyof typeof SEVERITY_COLORS]} ${updating === issue.id ? "opacity-50" : ""}`}
                    >
                      <p className="font-semibold leading-snug">{issue.title}</p>
                      {issue.regulation && (
                        <p className="opacity-70">
                          {issue.regulation}
                          {issue.article && ` — Art. ${issue.article}`}
                        </p>
                      )}
                      <div className="flex gap-1 flex-wrap pt-1">
                        {COLUMNS.filter((c) => c.id !== col.id).map((target) => (
                          <button
                            key={target.id}
                            onClick={() => moveIssue(issue.id, target.id)}
                            disabled={updating === issue.id}
                            className="text-xs px-2 py-0.5 rounded bg-white/60 hover:bg-white border border-white/80 transition-colors"
                          >
                            → {target.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {colIssues.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      Aucune issue
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
