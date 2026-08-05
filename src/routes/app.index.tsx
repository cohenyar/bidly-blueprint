import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";

import { PageHeader } from "@/components/app/PageHeader";
import { PageContainer } from "@/components/app/PageContainer";
import { Section } from "@/components/app/Section";
import { EmptyRequests, ErrorState, LoadingState } from "@/components/app/StateCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  formatBudget,
  REQUEST_STATUS_LABEL,
  useMyRequests,
  type RequestWithCategory,
} from "@/lib/requests";
import { formatDate } from "@/lib/i18n";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "מרכז הבקרה · Bidly" }] }),
});

function DashboardPage() {
  const q = useMyRequests();

  const requests = q.data ?? [];
  const recent = requests.slice(0, 3);
  const openCount = requests.filter((r) => r.status === "open").length;
  const awardedCount = requests.filter((r) => r.status === "awarded").length;

  return (
    <PageContainer>
      <div className="py-10 sm:py-14">
        <PageHeader
          eyebrow="אזור אישי"
          title="הבקשות שלכם, במקום אחד."
          subtitle="פרסמו בקשה חדשה, עקבו אחר הצעות שהתקבלו ובחרו את נותן השירות המתאים."
          action={
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/app/requests/new">
                <Plus />
                בקשה חדשה
              </Link>
            </Button>
          }
        />

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="בקשות פתוחות" value={openCount} />
          <StatTile label="נבחר ספק" value={awardedCount} />
          <StatTile label="סה״כ בקשות" value={requests.length} />
        </div>

        <div className="mt-8 sm:mt-10">
          <Section
            eyebrow="הבקשות שלי"
            title="בקשות אחרונות"
            description="מצב הבקשות וההצעות האחרונות שקיבלתם."
            action={
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/app/requests">כל הבקשות</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/app/requests/new">
                    <Plus className="h-4 w-4" />
                    בקשה חדשה
                  </Link>
                </Button>
              </div>
            }
          >
            {q.isPending ? (
              <LoadingState />
            ) : q.isError ? (
              <ErrorState error={q.error} onRetry={() => q.refetch()} />
            ) : recent.length === 0 ? (
              <EmptyRequests />
            ) : (
              <ul className="grid gap-3">
                {recent.map((r) => (
                  <RequestRow key={r.id} r={r} />
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </PageContainer>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card variant="metric" className="p-4 sm:p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-numeric text-[26px] font-bold tabular-nums text-foreground">
        {value}
      </div>
    </Card>
  );
}

export function RequestRow({ r }: { r: RequestWithCategory }) {
  return (
    <li>
      <Card asChild variant="actionable" className="request-spine-navy group hover:bg-accent/40">
        <Link
          to="/app/requests/$id"
          params={{ id: r.id }}
          className="flex items-center justify-between gap-4 ps-5 pe-4 py-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                בקשה · {r.category?.name_he ?? "—"}
              </span>
              <StatusBadge status={r.status} label={REQUEST_STATUS_LABEL[r.status]} />
            </div>
            <h3 className="mt-1 truncate text-[15px] font-bold text-foreground">{r.title}</h3>
            <p className="mt-1 truncate text-[12px] text-muted-foreground">
              {r.city} · {formatBudget(r)} · {formatDate(r.created_at)} · {r.offers_count} הצעות
            </p>
          </div>
          <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
        </Link>
      </Card>
    </li>
  );
}
