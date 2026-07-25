import { createFileRoute, Link } from "@tanstack/react-router";
import { BriefcaseBusiness, CheckCircle2, Inbox } from "lucide-react";

import { PageContainer } from "@/components/app/PageContainer";
import { ProfileCompletionPanel } from "@/components/app/ProfileCompletionPanel";
import { Section } from "@/components/app/Section";
import { ErrorState, LoadingState, StateCard } from "@/components/app/StateCard";
import { SupplierEnhancementNotice } from "@/components/app/SupplierEnhancementNotice";
import { SupplierMatchedRequestCard } from "@/components/app/SupplierMatchedRequestCard";
import {
  computeCompletion,
  useMySupplierCategories,
  useMySupplierProfile,
  useMySupplierServiceAreas,
  useMySupplierServices,
  useMySupplierSubcategories,
  useSupplierOnboardingState,
} from "@/lib/supplier-profile";
import { useActiveMatchedRequests } from "@/lib/supplier-requests";

export const Route = createFileRoute("/supplier/")({
  component: SupplierDashboardPage,
  head: () => ({ meta: [{ title: "מרחב נותן שירות · Bidly" }] }),
});

function SupplierDashboardPage() {
  const profileQuery = useMySupplierProfile();
  const categoriesQuery = useMySupplierCategories();
  const subcategoriesQuery = useMySupplierSubcategories();
  const servicesQuery = useMySupplierServices();
  const areasQuery = useMySupplierServiceAreas();
  const onboardingQuery = useSupplierOnboardingState();
  const matchesQuery = useActiveMatchedRequests();

  const loading =
    profileQuery.isLoading ||
    categoriesQuery.isLoading ||
    subcategoriesQuery.isLoading ||
    servicesQuery.isLoading ||
    areasQuery.isLoading ||
    onboardingQuery.isLoading ||
    matchesQuery.isLoading;
  const error =
    profileQuery.error ??
    categoriesQuery.error ??
    subcategoriesQuery.error ??
    servicesQuery.error ??
    areasQuery.error ??
    onboardingQuery.error ??
    matchesQuery.error;

  async function retry() {
    await Promise.all([
      profileQuery.refetch(),
      categoriesQuery.refetch(),
      subcategoriesQuery.refetch(),
      servicesQuery.refetch(),
      areasQuery.refetch(),
      onboardingQuery.refetch(),
      matchesQuery.refetch(),
    ]);
  }

  const completion = computeCompletion(
    profileQuery.data ?? null,
    categoriesQuery.data ?? [],
    subcategoriesQuery.data ?? [],
    (servicesQuery.data ?? []).map((row) => row.service_id),
    areasQuery.data ?? [],
    onboardingQuery.data ?? null,
  );
  const matches = matchesQuery.data ?? [];

  return (
    <PageContainer>
      <div className="py-10 sm:py-14">
        <div className="request-spine-navy ps-5">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="h-px w-6 bg-primary" aria-hidden />
            מרחב נותן שירות
          </span>
          <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.01em] text-foreground sm:text-[34px]">
            הבקשות שמתאימות לעסק שלכם.
          </h1>
          <p className="mt-2 max-w-[58ch] text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
            כאן תמצאו רק בקשות עם התאמה פעילה לתחומים שבחרתם, ותוכלו לעיין בפרטים ולשלוח הצעה פרטית.
          </p>
        </div>

        <div className="mt-10">
          {loading ? (
            <LoadingState label="טוען את מרחב נותן השירות…" />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void retry()} />
          ) : (
            <div className="space-y-10">
              <SupplierEnhancementNotice />
              <div className="grid gap-4 sm:grid-cols-2">
                <SummaryCard
                  icon={<BriefcaseBusiness className="h-5 w-5" />}
                  label="התאמות פעילות"
                  value={String(matches.length)}
                  detail="בקשות הזמינות כעת להצעה"
                />
                <SummaryCard
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  label="השלמת פרופיל"
                  value={`${completion.percent}%`}
                  detail={
                    completion.percent === 100
                      ? "הפרופיל מוכן לקבלת התאמות"
                      : "השלימו את הפרטים כדי לקבל התאמות"
                  }
                />
              </div>

              <ProfileCompletionPanel status={completion} />

              <Section
                eyebrow="התאמות פעילות"
                title="בקשות מותאמות"
                action={
                  <Link
                    to="/supplier/profile"
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-[13px] font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    עריכת פרופיל
                  </Link>
                }
              >
                {matches.length === 0 ? (
                  <StateCard
                    icon={<Inbox className="h-5 w-5" strokeWidth={2.25} />}
                    eyebrow="אין התאמות פעילות"
                    title="אין כרגע בקשות שמתאימות לפרופיל שלכם."
                    body="בקשות חדשות יופיעו כאן אוטומטית כשהן יתאימו לתחומים שבחרתם והפרופיל יהיה מלא."
                  />
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {matches.map((request) => (
                      <SupplierMatchedRequestCard key={request.id} request={request} />
                    ))}
                  </div>
                )}
              </Section>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-e1">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-numeric text-[28px] font-bold leading-none text-foreground">
            {value}
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground">{detail}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted text-primary">
          {icon}
        </span>
      </div>
    </div>
  );
}
