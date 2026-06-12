import { createFileRoute } from "@tanstack/react-router";
import {
  ClipboardList,
  FileSpreadsheet,
  Mail,
  MessageSquare,
  FileText,
  BarChart3,
  CalendarPlus,
  Award,
  Megaphone,
  ArrowRight,
} from "lucide-react";
import { PageBody, PageHeader } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { requireAuth } from "@/lib/route-auth";

export const Route = createFileRoute("/tools")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Tools — Lectern" },
      { name: "description", content: "Tools and modules to support your teaching workflow." },
    ],
  }),
  component: ToolsPage,
});

const tools = [
  {
    section: "Daily teaching",
    items: [
      {
        icon: ClipboardList,
        title: "Lesson notes",
        desc: "Plan and archive lesson notes per group.",
      },
      {
        icon: CalendarPlus,
        title: "Lesson templates",
        desc: "Reusable structure for recurring lessons.",
      },
      { icon: Award, title: "Assignments", desc: "Create, distribute, and grade student work." },
    ],
  },
  {
    section: "Reporting",
    items: [
      { icon: FileSpreadsheet, title: "Gradebook export", desc: "Export grades to CSV or PDF." },
      { icon: BarChart3, title: "Term reports", desc: "Per-student and per-group summaries." },
      { icon: FileText, title: "Behavior log", desc: "Track incidents and notes confidentially." },
    ],
  },
  {
    section: "Communication",
    items: [
      { icon: Mail, title: "Parent emails", desc: "Send updates to parents and guardians." },
      { icon: MessageSquare, title: "Class announcements", desc: "Broadcast to specific groups." },
      { icon: Megaphone, title: "Bulletin board", desc: "Pinned notes visible to your students." },
    ],
  },
];

function ToolsPage() {
  return (
    <>
      <PageHeader
        title="Tools"
        description="A focused hub for the work that supports your teaching"
      />
      <PageBody>
        <div className="space-y-6">
          {tools.map((group) => (
            <SectionCard
              key={group.section}
              title={group.section}
              description={`${group.items.length} modules`}
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.title}
                      className="group flex items-start gap-3 rounded-md border border-border bg-surface p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          {t.title}
                          <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{t.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </SectionCard>
          ))}
        </div>
      </PageBody>
    </>
  );
}
