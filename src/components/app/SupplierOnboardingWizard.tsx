import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ExternalLink, Plus, Trash2 } from "lucide-react";

import { ErrorState, LoadingState } from "@/components/app/StateCard";
import {
  useCategoriesForSupplier,
  useMySupplierCategories,
  useMySupplierProfessionSelections,
  useMySupplierProfile,
  useMySupplierServiceAreas,
  useMySupplierServices,
  useProfessionsForSupplier,
  useSaveSupplierOnboardingStage,
  useSaveSupplierProfile,
  useServiceAreas,
  useServices,
  useSubmitSupplierOnboarding,
  useSupplierOnboardingState,
  useSyncSupplierCategories,
  useSyncSupplierServiceAreas,
  useSyncSupplierServices,
  useSyncSupplierSubcategories,
  validateSupplierProfile,
  type SupplierProfileErrors,
  type SupplierProfileInput,
} from "@/lib/supplier-profile";
import { cn } from "@/lib/utils";

const STAGES = [
  "פרטי העסק",
  "מקצוע וקטגוריה",
  "שירותים מוצעים",
  "אזורי שירות",
  "תיק עבודות",
  "בדיקה ושליחה",
] as const;

const emptyProfile: SupplierProfileInput = {
  business_name: "",
  business_type: "",
  description: "",
  base_city: "",
  service_mode: "",
  max_travel_km: null,
  remote_available: null,
  service_area: "",
  starting_price_ils: null,
  years_experience: null,
  portfolio_links: [],
};

const inputClass =
  "mt-1.5 block h-11 w-full rounded-lg border border-input bg-background px-3.5 text-[14px] text-foreground shadow-e1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const labelClass = "block text-[13px] font-semibold text-foreground";
const errorClass = "mt-1 text-[12px] text-danger";

export function SupplierOnboardingWizard() {
  const profileQuery = useMySupplierProfile();
  const stateQuery = useSupplierOnboardingState();
  const categoriesQuery = useCategoriesForSupplier();
  const professionsQuery = useProfessionsForSupplier();
  const servicesQuery = useServices();
  const areasQuery = useServiceAreas();
  const myCategoriesQuery = useMySupplierCategories();
  const myProfessionsQuery = useMySupplierProfessionSelections();
  const myServicesQuery = useMySupplierServices();
  const myAreasQuery = useMySupplierServiceAreas();

  const saveProfile = useSaveSupplierProfile();
  const autosaveProfile = saveProfile.mutate;
  const saveStage = useSaveSupplierOnboardingStage();
  const syncCategories = useSyncSupplierCategories();
  const syncProfessions = useSyncSupplierSubcategories();
  const syncServices = useSyncSupplierServices();
  const syncAreas = useSyncSupplierServiceAreas();
  const submitOnboarding = useSubmitSupplierOnboarding();

  const [profile, setProfile] = useState(emptyProfile);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([]);
  const [primaryProfessionId, setPrimaryProfessionId] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [stage, setStage] = useState(1);
  const [errors, setErrors] = useState<SupplierProfileErrors>({});
  const [stageError, setStageError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [autosaveMessage, setAutosaveMessage] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const stageHeadingRef = useRef<HTMLHeadingElement>(null);
  const savedCategories = useRef<string[]>([]);
  const savedProfessions = useRef<string[]>([]);
  const savedServices = useRef<string[]>([]);
  const savedAreas = useRef<string[]>([]);

  const allQueries = [
    profileQuery,
    stateQuery,
    categoriesQuery,
    professionsQuery,
    servicesQuery,
    areasQuery,
    myCategoriesQuery,
    myProfessionsQuery,
    myServicesQuery,
    myAreasQuery,
  ];
  const loading = allQueries.some((query) => query.isPending);
  const loadError = allQueries.find((query) => query.error)?.error;
  const isLegacy = stateQuery.data?.eligibility_policy === "legacy";
  const availableServices = (servicesQuery.data ?? []).filter((service) =>
    selectedProfessions.includes(service.subcategory_id),
  );

  useEffect(() => {
    if (initialized || loading || loadError) return;
    const storedProfile = profileQuery.data;
    setProfile({
      business_name: storedProfile?.business_name ?? "",
      business_type: storedProfile?.business_type ?? "",
      description: storedProfile?.description ?? "",
      base_city: storedProfile?.base_city ?? "",
      service_mode:
        storedProfile?.service_mode === "on_site" ||
        storedProfile?.service_mode === "remote" ||
        storedProfile?.service_mode === "both"
          ? storedProfile.service_mode
          : "",
      max_travel_km: storedProfile?.max_travel_km ?? null,
      remote_available: storedProfile?.remote_available ?? null,
      service_area: storedProfile?.service_area ?? "",
      starting_price_ils: storedProfile?.starting_price_ils ?? null,
      years_experience: storedProfile?.years_experience ?? null,
      portfolio_links: storedProfile?.portfolio_links ?? [],
    });
    const categoryIds = myCategoriesQuery.data ?? [];
    const professionRows = myProfessionsQuery.data ?? [];
    const professionIds = professionRows.map((row) => row.subcategory_id);
    const serviceIds = (myServicesQuery.data ?? []).map((row) => row.service_id);
    const areaIds = myAreasQuery.data ?? [];
    setSelectedCategories(categoryIds);
    setSelectedProfessions(professionIds);
    setPrimaryProfessionId(
      professionRows.find((row) => row.is_primary)?.subcategory_id ?? professionIds[0] ?? null,
    );
    setSelectedServices(serviceIds);
    setSelectedAreas(areaIds);
    savedCategories.current = categoryIds;
    savedProfessions.current = professionIds;
    savedServices.current = serviceIds;
    savedAreas.current = areaIds;
    setStage(stateQuery.data?.current_stage ?? 1);
    setInitialized(true);
  }, [
    initialized,
    loading,
    loadError,
    profileQuery.data,
    stateQuery.data,
    myCategoriesQuery.data,
    myProfessionsQuery.data,
    myServicesQuery.data,
    myAreasQuery.data,
  ]);

  useEffect(() => {
    if (initialized) stageHeadingRef.current?.focus();
  }, [initialized, stage]);

  useEffect(() => {
    if (!initialized || profile.business_name.trim().length < 2) return;
    if (Object.keys(validateSupplierProfile(profile, false)).length > 0) return;
    const timer = window.setTimeout(() => {
      setAutosaveMessage("שומר שינויים…");
      autosaveProfile(profile, {
        onSuccess: () => setAutosaveMessage("כל השינויים נשמרו"),
        onError: () => setAutosaveMessage("השמירה האוטומטית נכשלה"),
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [initialized, profile, autosaveProfile]);

  if (loadError) {
    return (
      <ErrorState
        error={loadError}
        onRetry={() => {
          void Promise.all(allQueries.map((query) => query.refetch()));
        }}
      />
    );
  }
  if (loading || !initialized) {
    return <LoadingState label="טוען את תהליך ההצטרפות…" />;
  }

  const busy =
    saveProfile.isPending ||
    saveStage.isPending ||
    syncCategories.isPending ||
    syncProfessions.isPending ||
    syncServices.isPending ||
    syncAreas.isPending ||
    submitOnboarding.isPending;

  function patchProfile(patch: Partial<SupplierProfileInput>) {
    setProfile((current) => ({ ...current, ...patch }));
    setSavedMessage(null);
  }

  async function persistStage(currentStage: number) {
    setErrors({});
    setStageError(null);
    setSavedMessage(null);

    if (currentStage === 1) {
      const validation = validateSupplierProfile(profile, true);
      const businessErrors = Object.fromEntries(
        Object.entries(validation).filter(([key]) =>
          [
            "business_name",
            "business_type",
            "description",
            "base_city",
            "starting_price_ils",
            "years_experience",
          ].includes(key),
        ),
      ) as SupplierProfileErrors;
      setErrors(businessErrors);
      if (Object.keys(businessErrors).length) return false;
      await saveProfile.mutateAsync(profile);
    }

    if (currentStage === 2) {
      const validProfessions = selectedProfessions.filter((professionId) => {
        const profession = professionsQuery.data?.find((row) => row.id === professionId);
        return profession && selectedCategories.includes(profession.category_id);
      });
      if (!selectedCategories.length || !validProfessions.length) {
        setStageError("יש לבחור לפחות קטגוריה ומקצוע אחד.");
        return false;
      }
      const primary =
        primaryProfessionId && validProfessions.includes(primaryProfessionId)
          ? primaryProfessionId
          : (validProfessions[0] ?? null);
      await syncCategories.mutateAsync({
        selected: selectedCategories,
        current: savedCategories.current,
      });
      savedCategories.current = selectedCategories;
      await syncProfessions.mutateAsync({
        selected: validProfessions,
        current: savedProfessions.current,
        primaryId: primary,
      });
      savedProfessions.current = validProfessions;
      setSelectedProfessions(validProfessions);
      setPrimaryProfessionId(primary);
    }

    if (currentStage === 3) {
      const validServices = selectedServices.filter((serviceId) => {
        return availableServices.some((service) => service.id === serviceId);
      });
      if (availableServices.length > 0 && validServices.length === 0) {
        setStageError("יש לבחור לפחות שירות אחד.");
        return false;
      }
      if (availableServices.length > 0) {
        await syncServices.mutateAsync({
          selected: validServices,
          current: savedServices.current,
          services: servicesQuery.data ?? [],
        });
        savedServices.current = validServices;
        setSelectedServices(validServices);
      }
    }

    if (currentStage === 4) {
      const validation = validateSupplierProfile(profile, true);
      const areaErrors = Object.fromEntries(
        Object.entries(validation).filter(([key]) =>
          ["base_city", "service_mode", "max_travel_km", "remote_available"].includes(key),
        ),
      ) as SupplierProfileErrors;
      setErrors(areaErrors);
      if (Object.keys(areaErrors).length) return false;
      if (
        profile.service_mode !== "remote" &&
        (areasQuery.data ?? []).length > 0 &&
        selectedAreas.length === 0
      ) {
        setStageError("יש לבחור לפחות אזור שירות אחד.");
        return false;
      }
      await saveProfile.mutateAsync(profile);
      if ((areasQuery.data ?? []).length > 0) {
        await syncAreas.mutateAsync({
          selected: selectedAreas,
          current: savedAreas.current,
        });
        savedAreas.current = selectedAreas;
      }
    }

    if (currentStage === 5) {
      const validation = validateSupplierProfile(profile, false);
      if (validation.portfolio_links) {
        setErrors({ portfolio_links: validation.portfolio_links });
        return false;
      }
      await saveProfile.mutateAsync(profile);
    }

    return true;
  }

  async function moveTo(nextStage: number) {
    try {
      if (!(await persistStage(stage))) return;
      await saveStage.mutateAsync(nextStage);
      setStage(nextStage);
      setSavedMessage("השלב נשמר.");
    } catch {
      setStageError("השמירה נכשלה. הפרטים נשארו במסך; נסו שוב בעוד רגע.");
    }
  }

  async function moveBack() {
    const previousStage = Math.max(1, stage - 1);
    setErrors({});
    setStageError(null);
    setSavedMessage(null);
    setStage(previousStage);

    try {
      await saveStage.mutateAsync(previousStage);
      setSavedMessage("השלב נשמר.");
    } catch {
      setStageError("השלב הקודם נפתח, אך לא ניתן היה לשמור את מיקום ההצטרפות.");
    }
  }

  async function finish() {
    setStageError(null);
    try {
      await submitOnboarding.mutateAsync();
      setSavedMessage(
        isLegacy
          ? "הפרופיל המעודכן נשלח. התאמות חדשות הופעלו לפי הבחירות המנוהלות."
          : "הפרופיל נשלח והושלם בהצלחה.",
      );
    } catch {
      setStageError("לא ניתן להשלים את ההצטרפות. בדקו שכל השדות והבחירות נשמרו.");
    }
  }

  function toggleId(setter: React.Dispatch<React.SetStateAction<string[]>>, id: string) {
    setter((current) =>
      current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id],
    );
    setSavedMessage(null);
  }

  return (
    <div className="space-y-6">
      <nav aria-label="שלבי הצטרפות" className="overflow-x-auto pb-1">
        <ol className="flex min-w-max gap-2">
          {STAGES.map((label, index) => {
            const number = index + 1;
            const current = number === stage;
            const completed = number < stage;
            return (
              <li key={label}>
                <button
                  type="button"
                  disabled={busy || number > stage}
                  onClick={() => {
                    if (number < stage) void moveTo(number);
                  }}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-full border px-3 text-[12px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed",
                    current
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-5 w-5 place-items-center rounded-full text-[11px]",
                      current ? "bg-white/20" : "bg-surface-muted",
                    )}
                  >
                    {completed ? <Check className="h-3 w-3" /> : number}
                  </span>
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <p aria-live="polite" className="min-h-5 text-[12px] text-muted-foreground">
        {autosaveMessage ?? "השינויים נשמרים אוטומטית וניתן להמשיך מאוחר יותר."}
      </p>

      <section className="rounded-2xl border border-border bg-surface p-6 shadow-e1 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          שלב {stage} מתוך 6
        </p>
        <h2
          ref={stageHeadingRef}
          tabIndex={-1}
          className="mt-1 text-[21px] font-bold text-foreground outline-none"
        >
          {STAGES[stage - 1]}
        </h2>

        <div className="mt-6">
          {stage === 1 ? (
            <BusinessStage profile={profile} patch={patchProfile} errors={errors} />
          ) : null}
          {stage === 2 ? (
            <ProfessionStage
              categories={categoriesQuery.data ?? []}
              professions={professionsQuery.data ?? []}
              selectedCategories={selectedCategories}
              selectedProfessions={selectedProfessions}
              primaryProfessionId={primaryProfessionId}
              onToggleCategory={(id) => {
                const removing = selectedCategories.includes(id);
                toggleId(setSelectedCategories, id);
                if (removing) {
                  const childIds = new Set(
                    (professionsQuery.data ?? [])
                      .filter((profession) => profession.category_id === id)
                      .map((profession) => profession.id),
                  );
                  setSelectedProfessions((current) =>
                    current.filter((professionId) => !childIds.has(professionId)),
                  );
                  if (primaryProfessionId && childIds.has(primaryProfessionId)) {
                    setPrimaryProfessionId(null);
                  }
                }
              }}
              onToggleProfession={(id) => {
                const removing = selectedProfessions.includes(id);
                toggleId(setSelectedProfessions, id);
                if (removing && primaryProfessionId === id) setPrimaryProfessionId(null);
                if (!removing && primaryProfessionId === null) setPrimaryProfessionId(id);
              }}
              onPrimaryChange={setPrimaryProfessionId}
            />
          ) : null}
          {stage === 3 ? (
            <ChoiceGrid
              legend="שירותים מוצעים"
              emptyMessage="עדיין לא הוגדרו שירותים מנוהלים למקצועות שבחרתם. ניתן להמשיך ולהוסיף שירותים לאחר עדכון הקטלוג."
              options={availableServices.map((service) => ({
                id: service.id,
                label: service.name_he,
              }))}
              selected={selectedServices}
              onToggle={(id) => toggleId(setSelectedServices, id)}
            />
          ) : null}
          {stage === 4 ? (
            <ServiceAreasStage
              profile={profile}
              patch={patchProfile}
              errors={errors}
              areas={areasQuery.data ?? []}
              selected={selectedAreas}
              onToggle={(id) => toggleId(setSelectedAreas, id)}
            />
          ) : null}
          {stage === 5 ? (
            <PortfolioStage profile={profile} patch={patchProfile} errors={errors} />
          ) : null}
          {stage === 6 ? (
            <ReviewStage
              profile={profile}
              categoryNames={(categoriesQuery.data ?? [])
                .filter((row) => selectedCategories.includes(row.id))
                .map((row) => row.name_he)}
              professionNames={(professionsQuery.data ?? [])
                .filter((row) => selectedProfessions.includes(row.id))
                .map((row) => row.name_he)}
              serviceNames={(servicesQuery.data ?? [])
                .filter((row) => selectedServices.includes(row.id))
                .map((row) => row.name_he)}
              areaNames={(areasQuery.data ?? [])
                .filter((row) => selectedAreas.includes(row.id))
                .map((row) => row.name_he)}
              isLegacy={isLegacy}
            />
          ) : null}
        </div>

        {stageError ? (
          <p role="alert" className="mt-5 rounded-lg bg-danger/10 p-3 text-[13px] text-danger">
            {stageError}
          </p>
        ) : null}
        {savedMessage ? (
          <p role="status" className="mt-5 rounded-lg bg-success-soft p-3 text-[13px] text-success">
            {savedMessage}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <button
            type="button"
            disabled={busy || stage === 1}
            onClick={() => void moveBack()}
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-border px-4 text-[13px] font-semibold text-foreground disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
            חזרה
          </button>
          {stage < 6 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void moveTo(stage + 1)}
              className="inline-flex h-11 items-center gap-1 rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground shadow-e1 disabled:opacity-60"
            >
              {busy ? "שומר…" : "שמירה והמשך"}
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || (!isLegacy && Boolean(stateQuery.data?.submitted_at))}
              onClick={() => void finish()}
              className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground shadow-e1 disabled:opacity-60"
            >
              {stateQuery.data?.submitted_at
                ? "ההצטרפות הושלמה"
                : isLegacy
                  ? "שליחה והפעלת התאמות חדשות"
                  : "שליחת הפרופיל"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function BusinessStage({
  profile,
  patch,
  errors,
}: {
  profile: SupplierProfileInput;
  patch: (patch: Partial<SupplierProfileInput>) => void;
  errors: SupplierProfileErrors;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="שם העסק" error={errors.business_name} className="sm:col-span-2">
        <input
          className={inputClass}
          value={profile.business_name}
          maxLength={80}
          onChange={(event) => patch({ business_name: event.target.value })}
          dir="auto"
        />
      </Field>
      <Field label="סוג העסק" error={errors.business_type}>
        <input
          className={inputClass}
          value={profile.business_type}
          maxLength={80}
          onChange={(event) => patch({ business_type: event.target.value })}
          dir="auto"
        />
      </Field>
      <Field label="עיר בסיס" error={errors.base_city}>
        <input
          className={inputClass}
          value={profile.base_city}
          maxLength={80}
          onChange={(event) => patch({ base_city: event.target.value })}
          dir="auto"
        />
      </Field>
      <Field label="תיאור העסק" error={errors.description} className="sm:col-span-2">
        <textarea
          className={cn(inputClass, "h-32 py-3")}
          value={profile.description}
          maxLength={1000}
          onChange={(event) => patch({ description: event.target.value })}
          dir="auto"
        />
        <p className="mt-1 text-[12px] text-muted-foreground">{profile.description.length}/1000</p>
      </Field>
      <Field label="שנות ניסיון" error={errors.years_experience}>
        <input
          type="number"
          min={0}
          max={100}
          className={inputClass}
          value={profile.years_experience ?? ""}
          onChange={(event) =>
            patch({ years_experience: event.target.value ? Number(event.target.value) : null })
          }
        />
      </Field>
      <Field label="מחיר התחלתי (₪)" error={errors.starting_price_ils}>
        <input
          type="number"
          min={0}
          className={inputClass}
          value={profile.starting_price_ils ?? ""}
          onChange={(event) =>
            patch({ starting_price_ils: event.target.value ? Number(event.target.value) : null })
          }
        />
      </Field>
    </div>
  );
}

function ProfessionStage({
  categories,
  professions,
  selectedCategories,
  selectedProfessions,
  primaryProfessionId,
  onToggleCategory,
  onToggleProfession,
  onPrimaryChange,
}: {
  categories: Array<{ id: string; name_he: string }>;
  professions: Array<{ id: string; category_id: string; name_he: string }>;
  selectedCategories: string[];
  selectedProfessions: string[];
  primaryProfessionId: string | null;
  onToggleCategory: (id: string) => void;
  onToggleProfession: (id: string) => void;
  onPrimaryChange: (id: string) => void;
}) {
  return (
    <div className="space-y-7">
      <ChoiceGrid
        legend="קטגוריות"
        emptyMessage="לא הוגדרו קטגוריות פעילות."
        options={categories.map((row) => ({ id: row.id, label: row.name_he }))}
        selected={selectedCategories}
        onToggle={onToggleCategory}
      />
      <fieldset>
        <legend className="text-[14px] font-bold text-foreground">מקצועות</legend>
        <p className="mt-1 text-[12px] text-muted-foreground">
          בחרו מקצוע אחד או יותר וסמנו מקצוע ראשי.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {professions
            .filter((row) => selectedCategories.includes(row.category_id))
            .map((row) => {
              const selected = selectedProfessions.includes(row.id);
              return (
                <div
                  key={row.id}
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                >
                  <input
                    id={`profession-${row.id}`}
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleProfession(row.id)}
                  />
                  <label
                    htmlFor={`profession-${row.id}`}
                    className="min-w-0 flex-1 text-[13px] font-semibold"
                  >
                    {row.name_he}
                  </label>
                  {selected ? (
                    <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <input
                        type="radio"
                        name="primary-profession"
                        checked={primaryProfessionId === row.id}
                        onChange={() => onPrimaryChange(row.id)}
                      />
                      ראשי
                    </label>
                  ) : null}
                </div>
              );
            })}
        </div>
      </fieldset>
    </div>
  );
}

function ChoiceGrid({
  legend,
  emptyMessage,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  emptyMessage: string;
  options: Array<{ id: string; label: string }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[14px] font-bold text-foreground">{legend}</legend>
      {options.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {options.map((option) => (
            <label
              key={option.id}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-[13px] font-semibold",
                selected.includes(option.id)
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                onChange={() => onToggle(option.id)}
              />
              {option.label}
            </label>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-[13px] text-muted-foreground">
          {emptyMessage}
        </p>
      )}
    </fieldset>
  );
}

function ServiceAreasStage({
  profile,
  patch,
  errors,
  areas,
  selected,
  onToggle,
}: {
  profile: SupplierProfileInput;
  patch: (patch: Partial<SupplierProfileInput>) => void;
  errors: SupplierProfileErrors;
  areas: Array<{ id: string; name_he: string }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="אופן מתן השירות" error={errors.service_mode}>
          <select
            className={inputClass}
            value={profile.service_mode}
            onChange={(event) =>
              patch({ service_mode: event.target.value as SupplierProfileInput["service_mode"] })
            }
          >
            <option value="">בחירה</option>
            <option value="on_site">במקום הלקוח</option>
            <option value="remote">מרחוק</option>
            <option value="both">במקום הלקוח ומרחוק</option>
          </select>
        </Field>
        {profile.service_mode !== "remote" ? (
          <Field label="מרחק נסיעה מרבי (ק״מ)" error={errors.max_travel_km}>
            <input
              type="number"
              min={0}
              max={500}
              className={inputClass}
              value={profile.max_travel_km ?? ""}
              onChange={(event) =>
                patch({ max_travel_km: event.target.value ? Number(event.target.value) : null })
              }
            />
          </Field>
        ) : null}
      </div>
      <fieldset>
        <legend className="text-[13px] font-semibold text-foreground">זמינות מרחוק</legend>
        <div className="mt-2 flex gap-4">
          {[
            { value: true, label: "זמין" },
            { value: false, label: "לא זמין" },
          ].map((option) => (
            <label key={String(option.value)} className="flex items-center gap-2 text-[13px]">
              <input
                type="radio"
                name="remote-available"
                checked={profile.remote_available === option.value}
                onChange={() => patch({ remote_available: option.value })}
              />
              {option.label}
            </label>
          ))}
        </div>
        {errors.remote_available ? <p className={errorClass}>{errors.remote_available}</p> : null}
      </fieldset>
      <ChoiceGrid
        legend="אזורי שירות מנוהלים"
        emptyMessage="עדיין לא הוגדרו אזורי שירות מנוהלים. ניתן להשלים את ההרשמה ולעדכן אזורי שירות לאחר עדכון הקטלוג."
        options={areas.map((row) => ({ id: row.id, label: row.name_he }))}
        selected={selected}
        onToggle={onToggle}
      />
      <Field label="אזור שירות חופשי ישן (נשמר לתאימות)" error={errors.service_area}>
        <input
          className={inputClass}
          value={profile.service_area}
          maxLength={200}
          onChange={(event) => patch({ service_area: event.target.value })}
          dir="auto"
        />
      </Field>
    </div>
  );
}

function PortfolioStage({
  profile,
  patch,
  errors,
}: {
  profile: SupplierProfileInput;
  patch: (patch: Partial<SupplierProfileInput>) => void;
  errors: SupplierProfileErrors;
}) {
  function update(index: number, value: string) {
    const links = [...profile.portfolio_links];
    links[index] = value;
    patch({ portfolio_links: links });
  }
  return (
    <div>
      <p className="text-[13px] text-muted-foreground">
        שלב זה אופציונלי. ניתן להוסיף עד חמישה קישורים לעבודות קיימות.
      </p>
      <div className="mt-4 space-y-3">
        {profile.portfolio_links.map((link, index) => (
          <div key={index} className="flex gap-2">
            <ExternalLink className="mt-4 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="url"
              className={inputClass}
              value={link}
              onChange={(event) => update(index, event.target.value)}
              placeholder="https://"
              dir="ltr"
            />
            <button
              type="button"
              aria-label="הסרת קישור"
              onClick={() =>
                patch({ portfolio_links: profile.portfolio_links.filter((_, i) => i !== index) })
              }
              className="mt-1.5 grid h-11 w-11 place-items-center rounded-lg border border-border text-danger"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {errors.portfolio_links ? <p className={errorClass}>{errors.portfolio_links}</p> : null}
      <button
        type="button"
        disabled={profile.portfolio_links.length >= 5}
        onClick={() => patch({ portfolio_links: [...profile.portfolio_links, ""] })}
        className="mt-4 inline-flex h-10 items-center gap-1 rounded-lg border border-border px-4 text-[13px] font-semibold disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        הוספת קישור
      </button>
    </div>
  );
}

function ReviewStage({
  profile,
  categoryNames,
  professionNames,
  serviceNames,
  areaNames,
  isLegacy,
}: {
  profile: SupplierProfileInput;
  categoryNames: string[];
  professionNames: string[];
  serviceNames: string[];
  areaNames: string[];
  isLegacy: boolean;
}) {
  const rows = [
    ["עסק", profile.business_name],
    ["סוג עסק", profile.business_type || "לא צוין"],
    ["קטגוריות", categoryNames.join(", ") || "לא נבחרו"],
    ["מקצועות", professionNames.join(", ") || "לא נבחרו"],
    ["שירותים", serviceNames.join(", ") || "לא נבחרו"],
    ["אזורי שירות", areaNames.join(", ") || profile.service_area || "לא נבחרו"],
    [
      "תיק עבודות",
      profile.portfolio_links.length ? `${profile.portfolio_links.length} קישורים` : "ללא",
    ],
  ];
  return (
    <div>
      {isLegacy ? (
        <p className="mb-4 rounded-lg bg-primary/5 p-3 text-[13px] text-foreground">
          חשבון קיים: השליחה מעבירה את הפרופיל באופן בלתי הפיך למדיניות הנוכחית ומפעילה התאמות חדשות
          לפי השירותים ואזורי השירות שבחרתם. ההיסטוריה והגישה הקיימת נשמרות.
        </p>
      ) : null}
      <dl className="divide-y divide-border rounded-xl border border-border">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr]">
            <dt className="text-[12px] font-semibold text-muted-foreground">{label}</dt>
            <dd className="text-[13px] text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className={labelClass}>{label}</span>
      {children}
      {error ? <span className={errorClass}>{error}</span> : null}
    </label>
  );
}
