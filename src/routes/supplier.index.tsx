import { createFileRoute, Link } from "@tanstack/react-router";

import { PageContainer } from "@/components/app/PageContainer";
import { ProfileCompletionPanel } from "@/components/app/ProfileCompletionPanel";
import { ErrorState, LoadingState } from "@/components/app/StateCard";
import {
  computeCompletion,
  useMySupplierCategories,
  useMySupplierProfile,
  useMySupplierSubcategories,
} from "@/lib/supplier-profile";

export const Route = createFileRoute("/supplier/")({
  component: SupplierDashboardPage,
  head: () => ({ meta: [{ title: "מרכז הספק · Bidly" }] }),
});

function SupplierDashboardPage() {
  const profileQ = useMySupplierProfile();
  const catsQ = useMySupplierCategories();
  const subsQ = useMySupplierSubcategories();

  const loading = profileQ.isLoading || catsQ.isLoading || subsQ.isLoading;
  const error = profileQ.error ?? catsQ.error ?? subsQ.error;

  return (
    <PageContainer>
      <div className="py-10 sm:py-14">
        <div className="request-spine-navy ps-5">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="h-px w-6 bg-primary" aria-hidden />
            מרחב ספק
          </span>
          <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.01em] text-foreground sm:text-[34px]">
            ברוכים הבאים למרחב הספק.
          </h1>
          <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
            השלימו את פרטי העסק ואת התחומים שאתם מציעים. בקשות רלוונטיות יופיעו כאן לאחר שמערכת ההתאמות תופעל.
          </p>
        </div>

        <div className="mt-10">
          {loading ? (
            <LoadingState label="טוען את הפרופיל…" />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void profileQ.refetch()} />
          ) : (
            <div className="space-y-6">
              <ProfileCompletionPanel
                status={computeCompletion(
                  profileQ.data ?? null,
                  catsQ.data ?? [],
                  subsQ.data ?? [],
                )}
              />

              <div className="rounded-2xl border border-dashed border-border bg-surface-muted/40 p-6 text-[13px] text-muted-foreground sm:p-8">
                <p className="font-semibold text-foreground">בקשות מותאמות</p>
                <p className="mt-1">
                  לאחר שמערכת ההתאמות תופעל, כאן תופענה הבקשות הרלוונטיות לתחומים שבחרתם.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/supplier/profile"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-5 text-[14px] font-semibold text-foreground hover:bg-accent"
                >
                  עריכת פרופיל
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
