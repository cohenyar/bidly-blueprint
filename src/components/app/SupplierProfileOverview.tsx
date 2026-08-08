import type { ReactNode } from "react";
import { BriefcaseBusiness, MapPin, Pencil, WalletCards } from "lucide-react";

import { SupplierPortfolioGallery } from "@/components/app/SupplierPortfolioGallery";
import { ErrorState, LoadingState } from "@/components/app/StateCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
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

const SERVICE_MODE_LABEL = {
  on_site: "במקום הלקוח",
  remote: "מרחוק",
  both: "במקום הלקוח ומרחוק",
} as const;

export function SupplierProfileOverview() {
  const profileQuery = useMySupplierProfile();
  const onboardingQuery = useSupplierOnboardingState();
  const categoriesQuery = useCategoriesForSupplier();
  const professionsQuery = useProfessionsForSupplier();
  const servicesQuery = useServices();
  const areasQuery = useServiceAreas();
  const myCategoriesQuery = useMySupplierCategories();
  const myProfessionsQuery = useMySupplierProfessionSelections();
  const myServicesQuery = useMySupplierServices();
  const myAreasQuery = useMySupplierServiceAreas();

  const queries = [
    profileQuery,
    onboardingQuery,
    categoriesQuery,
    professionsQuery,
    servicesQuery,
    areasQuery,
    myCategoriesQuery,
    myProfessionsQuery,
    myServicesQuery,
    myAreasQuery,
  ];
  const error = queries.find((query) => query.error)?.error;
  if (error) {
    return (
      <ErrorState
        title="לא הצלחנו לטעון את הפרופיל"
        error={error}
        onRetry={() => void Promise.all(queries.map((query) => query.refetch()))}
      />
    );
  }
  if (queries.some((query) => query.isPending)) {
    return <LoadingState label="טוען את פרופיל העסק…" />;
  }

  const profile = profileQuery.data;
  if (!profile) return null;

  const categoryIds = myCategoriesQuery.data ?? [];
  const professionSelections = myProfessionsQuery.data ?? [];
  const serviceIds = new Set((myServicesQuery.data ?? []).map((row) => row.service_id));
  const areaIds = new Set(myAreasQuery.data ?? []);
  const categoryNames = (categoriesQuery.data ?? [])
    .filter((row) => categoryIds.includes(row.id))
    .map((row) => row.name_he);
  const professionNames = (professionsQuery.data ?? [])
    .filter((row) => professionSelections.some((selection) => selection.subcategory_id === row.id))
    .map((row) => ({
      id: row.id,
      name: row.name_he,
      primary: professionSelections.some(
        (selection) => selection.subcategory_id === row.id && selection.is_primary,
      ),
    }));
  const serviceNames = (servicesQuery.data ?? [])
    .filter((row) => serviceIds.has(row.id))
    .map((row) => row.name_he);
  const areaNames = (areasQuery.data ?? [])
    .filter((row) => areaIds.has(row.id))
    .map((row) => row.name_he);
  const onboarding = onboardingQuery.data;
  const active = onboarding?.eligibility_policy === "current" && Boolean(onboarding.submitted_at);
  const legacy = onboarding?.eligibility_policy === "legacy";
  const hasAbout = Boolean(
    profile.description.trim() ||
    profile.years_experience !== null ||
    profile.starting_price_ils !== null,
  );

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="request-spine-emerald flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[22px] font-bold leading-tight text-foreground">
                {profile.business_name}
              </h2>
              <Badge variant={active ? "success" : legacy ? "warning" : "muted"}>
                {active ? "פרופיל פעיל" : legacy ? "נדרש עדכון" : "פרופיל בתהליך"}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-muted-foreground">
              {profile.business_type ? (
                <span className="inline-flex items-center gap-1.5">
                  <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden />
                  {profile.business_type}
                </span>
              ) : null}
              {profile.base_city ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {profile.base_city}
                </span>
              ) : null}
              {profile.service_mode ? (
                <span>
                  {SERVICE_MODE_LABEL[profile.service_mode as keyof typeof SERVICE_MODE_LABEL] ??
                    profile.service_mode}
                </span>
              ) : null}
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="self-start">
            <a href="#profile-editor">
              <Pencil aria-hidden />
              עריכת הפרופיל
            </a>
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {hasAbout ? (
          <ProfileSection title="אודות העסק" className="lg:col-span-2">
            {profile.description.trim() ? (
              <p className="whitespace-pre-wrap text-[14px] leading-7 text-foreground">
                {profile.description}
              </p>
            ) : null}
            {profile.years_experience !== null || profile.starting_price_ils !== null ? (
              <dl className="mt-4 flex flex-wrap gap-3">
                {profile.years_experience !== null ? (
                  <ProfileFact label="ניסיון" value={`${profile.years_experience} שנים`} />
                ) : null}
                {profile.starting_price_ils !== null ? (
                  <ProfileFact
                    label="מחיר התחלתי"
                    value={`${new Intl.NumberFormat("he-IL").format(profile.starting_price_ils)} ₪`}
                    icon={<WalletCards className="h-3.5 w-3.5" aria-hidden />}
                  />
                ) : null}
              </dl>
            ) : null}
          </ProfileSection>
        ) : null}

        <ProfileSection title="תחומי שירות">
          <TaxonomyRow label="קטגוריות" values={categoryNames} />
          <TaxonomyRow
            label="מקצועות"
            values={professionNames.map((profession) => profession.name)}
            primaryValue={professionNames.find((profession) => profession.primary)?.name}
          />
          <TaxonomyRow label="שירותים" values={serviceNames} />
          <TaxonomyRow label="אזורי שירות" values={areaNames} />
          {profile.remote_available ? (
            <Badge variant="secondary" className="mt-3">
              שירות מרחוק זמין
            </Badge>
          ) : null}
        </ProfileSection>

        <ProfileSection title="תיק עבודות">
          <SupplierPortfolioGallery items={profile.portfolio_links} />
        </ProfileSection>
      </div>
    </div>
  );
}

function ProfileSection({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      <section className="p-5 sm:p-6">
        <h3 className="text-[16px] font-bold text-foreground">{title}</h3>
        <div className="mt-4">{children}</div>
      </section>
    </Card>
  );
}

function TaxonomyRow({
  label,
  values,
  primaryValue,
}: {
  label: string;
  values: string[];
  primaryValue?: string;
}) {
  if (!values.length) return null;
  return (
    <div className="mt-3 first:mt-0">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {values.map((value) => (
          <Badge key={value} variant={value === primaryValue ? "success" : "muted"}>
            {value}
            {value === primaryValue ? " · ראשי" : ""}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function ProfileFact({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-muted/45 px-3 py-2">
      <dt className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px] font-semibold text-foreground">{value}</dd>
    </div>
  );
}
