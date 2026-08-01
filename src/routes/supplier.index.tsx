import { createFileRoute, Link } from "@tanstack/react-router";
import { BriefcaseBusiness, CheckCircle2 } from "lucide-react";

import { PageContainer } from "@/components/app/PageContainer";
import { DashboardProfileCompletionPanel } from "@/components/app/ProfileCompletionPanel";
import { ErrorState, LoadingState } from "@/components/app/StateCard";
import { SupplierEnhancementNotice } from "@/components/app/SupplierEnhancementNotice";
import {
  computeCompletion,
  isSupplierProfileComplete,
  useCategoriesForSupplier,
  useMySupplierCategories,
  useMySupplierProfessionSelections,
  useMySupplierProfile,
  useMySupplierServiceAreas,
  useMySupplierServices,
  useProfessionsForSupplier,
  useServiceAreas,
  useServices,
  useSupplierOnboardingState,
} from "@/lib/supplier-profile";
import { useActiveMatchedRequests } from "@/lib/supplier-requests";

export const Route = createFileRoute("/supplier/")({
  component: SupplierDashboardPage,
  head: () => ({ meta: [{ title: "מרחב נותן שירות · Bidly" }] }),
});

function SupplierDashboardPage() {
  const profileQuery = useMySupplierProfile();
  const catalogCategoriesQuery = useCategoriesForSupplier();
  const catalogProfessionsQuery = useProfessionsForSupplier();
  const catalogServicesQuery = useServices();
  const catalogAreasQuery = useServiceAreas();
  const categoriesQuery = useMySupplierCategories();
  const professionsQuery = useMySupplierProfessionSelections();
  const servicesQuery = useMySupplierServices();
  const areasQuery = useMySupplierServiceAreas();
  const onboardingQuery = useSupplierOnboardingState();
  const matchesQuery = useActiveMatchedRequests();

  const loading =
    profileQuery.isLoading ||
    catalogCategoriesQuery.isLoading ||
    catalogProfessionsQuery.isLoading ||
    catalogServicesQuery.isLoading ||
    catalogAreasQuery.isLoading ||
    categoriesQuery.isLoading ||
    professionsQuery.isLoading ||
    servicesQuery.isLoading ||
    areasQuery.isLoading ||
    onboardingQuery.isLoading ||
    matchesQuery.isLoading;
  const error =
    profileQuery.error ??
    catalogCategoriesQuery.error ??
    catalogProfessionsQuery.error ??
    catalogServicesQuery.error ??
    catalogAreasQuery.error ??
    categoriesQuery.error ??
    professionsQuery.error ??
    servicesQuery.error ??
    areasQuery.error ??
    onboardingQuery.error ??
    matchesQuery.error;

  async function retry() {
    await Promise.all([
      profileQuery.refetch(),
      catalogCategoriesQuery.refetch(),
      catalogProfessionsQuery.refetch(),
      catalogServicesQuery.refetch(),
      catalogAreasQuery.refetch(),
      categoriesQuery.refetch(),
      professionsQuery.refetch(),
      servicesQuery.refetch(),
      areasQuery.refetch(),
      onboardingQuery.refetch(),
      matchesQuery.refetch(),
    ]);
  }

  const activeCategoryIds = new Set(
    (catalogCategoriesQuery.data ?? [])
      .filter((category) => category.is_active)
      .map((category) => category.id),
  );
  const validCategoryIds = (categoriesQuery.data ?? []).filter((categoryId) =>
    activeCategoryIds.has(categoryId),
  );
  const selectedProfessions = professionsQuery.data ?? [];
  const validProfessions = (catalogProfessionsQuery.data ?? []).filter(
    (profession) =>
      profession.is_active &&
      validCategoryIds.includes(profession.category_id) &&
      selectedProfessions.some((selection) => selection.subcategory_id === profession.id),
  );
  const validProfessionIds = new Set(validProfessions.map((profession) => profession.id));
  const availableServices = (catalogServicesQuery.data ?? []).filter(
    (service) => service.is_active && validProfessionIds.has(service.subcategory_id),
  );
  const availableServiceIds = new Set(availableServices.map((service) => service.id));
  const validServiceIds = (servicesQuery.data ?? [])
    .filter(
      (selection) =>
        validProfessionIds.has(selection.subcategory_id) &&
        availableServiceIds.has(selection.service_id) &&
        availableServices.some(
          (service) =>
            service.id === selection.service_id &&
            service.subcategory_id === selection.subcategory_id,
        ),
    )
    .map((selection) => selection.service_id);
  const activeAreaIds = new Set(
    (catalogAreasQuery.data ?? []).filter((area) => area.is_active).map((area) => area.id),
  );
  const validAreaIds = (areasQuery.data ?? []).filter((areaId) => activeAreaIds.has(areaId));
  const completion = computeCompletion(
    profileQuery.data ?? null,
    validCategoryIds,
    [...validProfessionIds],
    validServiceIds,
    validAreaIds,
    onboardingQuery.data ?? null,
    {
      hasPrimaryProfession: selectedProfessions.some(
        (selection) => selection.is_primary && validProfessionIds.has(selection.subcategory_id),
      ),
      hasAvailableServices: availableServices.length > 0,
      hasAvailableServiceAreas: activeAreaIds.size > 0,
    },
  );
  const matches = matchesQuery.data ?? [];
  const isComplete = isSupplierProfileComplete(completion);

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

              <DashboardProfileCompletionPanel status={completion} />

              <div className="flex flex-wrap justify-end gap-3">
                {!isComplete ? (
                  <Link
                    to="/supplier/profile"
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-[13px] font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    עריכת פרופיל
                  </Link>
                ) : null}
                <Link
                  to="/supplier/requests"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  צפייה בבקשות המותאמות
                </Link>
              </div>
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
