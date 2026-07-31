import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, FilePenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AttachmentUploader } from "@/components/app/AttachmentUploader";
import { DynamicRequestQuestionnaire } from "@/components/app/DynamicRequestQuestionnaire";
import { PageContainer } from "@/components/app/PageContainer";
import { RequestServiceAreaSelect } from "@/components/app/RequestServiceAreaSelect";
import { Section } from "@/components/app/Section";
import { ErrorState, LoadingState, StateCard } from "@/components/app/StateCard";
import {
  getRequestPublishErrorMessage,
  getRequestPublishValidationTarget,
  isRequestPublishDisabled,
  isDeliveryModeRequiredError,
  isServiceAreaRequiredError,
  useAcquireRequestDraft,
  useCategories,
  useDeleteRequestDraft,
  useExistingRequestDraft,
  usePublishRequest,
  useRequest,
  useRequestServiceAreas,
  useSaveRequestDraft,
  useServicesForProfession,
  useSubcategories,
  validateRequestPublishFields,
  type BudgetType,
  type RequestDraftInput,
} from "@/lib/requests";
import { useRequestDraftAcquisition } from "@/lib/request-draft-acquisition";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/requests/new")({
  component: CreateRequestPage,
  head: () => ({ meta: [{ title: "בקשה חדשה · Bidly" }] }),
});

type Errors = Partial<
  Record<
    | "title"
    | "description"
    | "city"
    | "category_id"
    | "subcategory_id"
    | "service"
    | "delivery_mode"
    | "service_area_id"
    | "budget"
    | "questionnaire",
    string
  >
>;

const inputClass =
  "mt-1.5 block h-11 w-full rounded-lg border border-input bg-background px-3.5 text-[14px] text-foreground shadow-e1 placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

function CreateRequestPage() {
  const navigate = useNavigate();
  const existingDraftQuery = useExistingRequestDraft();
  const deleteDraft = useDeleteRequestDraft();
  const [draftSessionAuthorized, setDraftSessionAuthorized] = useState(false);
  const acquireDraft = useAcquireRequestDraft();
  const {
    draftId,
    error: acquireError,
    retry: retryDraftAcquisition,
  } = useRequestDraftAcquisition(acquireDraft.mutateAsync, {
    enabled: draftSessionAuthorized,
  });
  const draftQuery = useRequest(draftId ?? "");
  const saveDraft = useSaveRequestDraft(draftId);
  const autosaveDraft = saveDraft.mutate;
  const publishRequest = usePublishRequest();
  const categoriesQuery = useCategories();
  const serviceAreasQuery = useRequestServiceAreas();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [missingServiceText, setMissingServiceText] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"on_site" | "remote" | "">("");
  const [serviceAreaId, setServiceAreaId] = useState("");
  const [budgetType, setBudgetType] = useState<BudgetType>("open");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [initialized, setInitialized] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState("מכין טיוטה פרטית…");
  const [questionnaireValid, setQuestionnaireValid] = useState(true);
  const [questionnairePending, setQuestionnairePending] = useState(false);
  const [taxonomySaving, setTaxonomySaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const deliveryModeSelectRef = useRef<HTMLSelectElement>(null);
  const serviceAreaSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (
      existingDraftQuery.isSuccess &&
      !existingDraftQuery.isFetching &&
      !existingDraftQuery.data
    ) {
      setDraftSessionAuthorized(true);
    }
  }, [existingDraftQuery.data, existingDraftQuery.isFetching, existingDraftQuery.isSuccess]);

  const subcategoriesQuery = useSubcategories(categoryId || null);
  const servicesQuery = useServicesForProfession(subcategoryId || null);

  useEffect(() => {
    if (
      categoryId &&
      !subcategoryId &&
      !subcategoriesQuery.isPending &&
      (subcategoriesQuery.data ?? []).length === 0
    ) {
      setQuestionnaireValid(true);
    }
  }, [categoryId, subcategoryId, subcategoriesQuery.isPending, subcategoriesQuery.data]);

  useEffect(() => {
    if (!draftQuery.isSuccess || !draftQuery.data || initialized) return;
    const draft = draftQuery.data;
    if (draft.published_at) {
      void navigate({ to: "/app/requests/$id", params: { id: draft.id }, replace: true });
      return;
    }
    setTitle(draft.title ?? "");
    setDescription(draft.description ?? "");
    setCity(draft.city ?? "");
    setCategoryId(draft.category_id ?? "");
    setSubcategoryId(draft.subcategory_id ?? "");
    setServiceId(draft.service_id ?? "");
    setMissingServiceText(draft.missing_service_text ?? "");
    setDeliveryMode(
      draft.delivery_mode === "on_site" || draft.delivery_mode === "remote"
        ? draft.delivery_mode
        : "",
    );
    setServiceAreaId(draft.service_area_id ?? "");
    setBudgetType(draft.budget_type);
    setBudgetMin(draft.budget_min === null ? "" : String(draft.budget_min));
    setBudgetMax(draft.budget_max === null ? "" : String(draft.budget_max));
    setAutosaveStatus("הטיוטה פרטית ונשמרת אוטומטית.");
    setInitialized(true);
  }, [draftQuery.isSuccess, draftQuery.data, initialized, navigate]);

  const draftInput = useMemo<RequestDraftInput>(
    () => ({
      title,
      description,
      city,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      service_id: serviceId,
      missing_service_text: missingServiceText,
      delivery_mode: deliveryMode,
      service_area_id: serviceAreaId,
      budget_type: budgetType,
      budget_min: budgetType === "open" || budgetMin === "" ? null : Number(budgetMin),
      budget_max:
        budgetType === "open"
          ? null
          : budgetType === "fixed"
            ? budgetMin === ""
              ? null
              : Number(budgetMin)
            : budgetMax === ""
              ? null
              : Number(budgetMax),
    }),
    [
      title,
      description,
      city,
      categoryId,
      subcategoryId,
      serviceId,
      missingServiceText,
      deliveryMode,
      serviceAreaId,
      budgetType,
      budgetMin,
      budgetMax,
    ],
  );

  useEffect(() => {
    if (!initialized || !draftId || taxonomySaving) return;
    const timer = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      setAutosaveStatus("שומר טיוטה…");
      autosaveDraft(draftInput, {
        onSuccess: () => setAutosaveStatus("כל השינויים נשמרו בטיוטה הפרטית."),
        onError: () => setAutosaveStatus("השמירה האוטומטית נכשלה. הפרטים נשארו במסך."),
      });
    }, 800);
    autosaveTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (autosaveTimerRef.current === timer) autosaveTimerRef.current = null;
    };
  }, [initialized, draftId, draftInput, taxonomySaving, autosaveDraft]);

  async function persistTaxonomy(next: Partial<RequestDraftInput>) {
    setTaxonomySaving(true);
    setQuestionnaireValid(false);
    try {
      await saveDraft.mutateAsync({ ...draftInput, ...next });
      setAutosaveStatus("בחירת התחום נשמרה.");
    } catch {
      setAutosaveStatus("שמירת בחירת התחום נכשלה.");
    } finally {
      setTaxonomySaving(false);
    }
  }

  function validate(): Errors {
    const nextErrors: Errors = validateRequestPublishFields(draftInput);
    if ((subcategoriesQuery.data ?? []).length > 0 && !subcategoryId) {
      nextErrors.subcategory_id = "יש לבחור מקצוע.";
    }
    if (deliveryMode === "remote") {
      const selectedService = servicesQuery.data?.find((service) => service.id === serviceId);
      if (!serviceId || !selectedService?.supports_remote) {
        nextErrors.service = "שירות מרחוק דורש שירות מנוהל שתומך בעבודה מרחוק.";
      }
      if (missingServiceText.trim()) {
        nextErrors.service = "לא ניתן להשתמש בשירות חסר עבור בקשה מרחוק.";
      }
    }
    if (!questionnaireValid) {
      nextErrors.questionnaire = "יש להשלים את כל השאלות החובה הגלויות.";
    }
    return nextErrors;
  }

  function focusDeliveryModeSelection() {
    window.requestAnimationFrame(() => {
      deliveryModeSelectRef.current?.focus();
      deliveryModeSelectRef.current?.scrollIntoView?.({ block: "center" });
    });
  }

  function focusServiceAreaSelection() {
    window.requestAnimationFrame(() => {
      serviceAreaSelectRef.current?.focus();
      serviceAreaSelectRef.current?.scrollIntoView?.({ block: "center" });
    });
  }

  function focusPublishValidationTarget(nextErrors: Errors) {
    const target = getRequestPublishValidationTarget(nextErrors);
    if (target === "delivery_mode") focusDeliveryModeSelection();
    if (target === "service_area_id") focusServiceAreaSelection();
  }

  useEffect(() => {
    if (!initialized || deliveryMode !== "on_site" || serviceAreaId) return;
    const frame = window.requestAnimationFrame(() => {
      serviceAreaSelectRef.current?.focus();
      serviceAreaSelectRef.current?.scrollIntoView?.({ block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [deliveryMode, initialized, serviceAreaId]);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!draftId) return;
    const nextErrors = validate();
    setErrors(nextErrors);
    const firstValidationError = Object.values(nextErrors).find(Boolean);
    setPublishError(firstValidationError ?? null);
    focusPublishValidationTarget(nextErrors);
    if (
      Object.keys(nextErrors).length ||
      questionnairePending ||
      taxonomySaving ||
      saveDraft.isPending
    ) {
      return;
    }

    setPublishError(null);
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    setIsFinalizing(true);
    try {
      setAutosaveStatus("שומר את הפרטים האחרונים…");
      await saveDraft.mutateAsync(draftInput);
      setAutosaveStatus("מפרסם את הבקשה…");
      const publishedId = await publishRequest.mutateAsync(draftId);
      if (!publishedId) throw new Error("Publication completed without a Request ID");
      toast.success("הבקשה פורסמה בהצלחה");
      try {
        await navigate({ to: "/app/requests/$id", params: { id: publishedId }, replace: true });
      } catch {
        window.location.assign(`/app/requests/${encodeURIComponent(publishedId)}`);
      }
    } catch (error) {
      const message = getRequestPublishErrorMessage(error);
      setPublishError(message);
      setAutosaveStatus(message);
      if (isDeliveryModeRequiredError(error)) {
        setErrors((current) => ({
          ...current,
          delivery_mode: "יש לבחור האם השירות יינתן במקום או מרחוק",
        }));
        publishRequest.reset();
        focusDeliveryModeSelection();
      } else if (isServiceAreaRequiredError(error)) {
        setErrors((current) => ({
          ...current,
          service_area_id: "יש לבחור אזור שירות לפני פרסום הבקשה",
        }));
        publishRequest.reset();
        focusServiceAreaSelection();
      }
    } finally {
      setIsFinalizing(false);
    }
  }

  async function deleteExistingDraftAndStartNew() {
    const existingDraft = existingDraftQuery.data;
    if (!existingDraft) return;
    if (!window.confirm("למחוק את הטיוטה הקיימת ולהתחיל בקשה חדשה?")) return;

    try {
      await deleteDraft.mutateAsync(existingDraft.id);
      setInitialized(false);
      setDraftSessionAuthorized(true);
    } catch {
      // The mutation error remains visible in the draft-choice surface.
    }
  }

  if (existingDraftQuery.isPending || (existingDraftQuery.isFetching && !draftSessionAuthorized)) {
    return (
      <PageContainer>
        <div className="py-14">
          <LoadingState label="בודק אם קיימת טיוטה…" />
        </div>
      </PageContainer>
    );
  }

  if (existingDraftQuery.isError) {
    return (
      <PageContainer>
        <div className="py-14">
          <ErrorState
            error={existingDraftQuery.error}
            onRetry={() => void existingDraftQuery.refetch()}
          />
        </div>
      </PageContainer>
    );
  }

  if (existingDraftQuery.data && !draftSessionAuthorized) {
    const deleteError =
      deleteDraft.error instanceof Error
        ? deleteDraft.error.message
        : deleteDraft.isError
          ? "לא הצלחנו למחוק את הטיוטה. היא נשמרה וניתן לנסות שוב."
          : null;

    return (
      <PageContainer>
        <div className="py-14">
          <StateCard
            icon={<FilePenLine className="h-5 w-5" />}
            eyebrow="טיוטה קיימת"
            title="יש לכם בקשה שעדיין לא פורסמה"
            body={
              <div>
                <p>
                  {existingDraftQuery.data.title?.trim() ||
                    "הפרטים שכבר הזנתם שמורים בטיוטה הפרטית."}
                </p>
                {deleteError ? (
                  <p role="alert" className="mt-3 text-danger" dir="auto">
                    {deleteError}
                  </p>
                ) : null}
              </div>
            }
            action={
              <>
                <button
                  type="button"
                  onClick={() => setDraftSessionAuthorized(true)}
                  disabled={deleteDraft.isPending}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground shadow-e1 disabled:opacity-60"
                >
                  המשך עריכת הטיוטה
                </button>
                <button
                  type="button"
                  onClick={() => void deleteExistingDraftAndStartNew()}
                  disabled={deleteDraft.isPending}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-5 text-[14px] font-semibold text-foreground disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteDraft.isPending ? "מוחק טיוטה…" : "מחיקת הטיוטה ויצירת בקשה חדשה"}
                </button>
              </>
            }
          />
        </div>
      </PageContainer>
    );
  }

  const initialLoading =
    acquireDraft.isPending ||
    (draftId !== null && draftQuery.isPending) ||
    categoriesQuery.isPending;
  const initialError =
    acquireError ?? acquireDraft.error ?? draftQuery.error ?? categoriesQuery.error;

  if (initialError) {
    return (
      <PageContainer>
        <div className="py-14">
          <ErrorState
            error={initialError}
            onRetry={() => {
              acquireDraft.reset();
              setInitialized(false);
              retryDraftAcquisition();
            }}
          />
        </div>
      </PageContainer>
    );
  }
  if (initialLoading || !initialized || !draftId) {
    return (
      <PageContainer>
        <div className="py-14">
          <LoadingState label="מכין טיוטה פרטית…" />
        </div>
      </PageContainer>
    );
  }

  const publishing =
    isRequestPublishDisabled({
      publishPending: publishRequest.isPending,
      autosavePending: saveDraft.isPending,
      questionnairePending,
      taxonomySaving,
    }) || isFinalizing;
  const reviewErrors = validate();
  const validationSummary = Object.entries(reviewErrors).filter(
    (entry): entry is [keyof Errors, string] => Boolean(entry[1]),
  );
  const publishDisabled = publishing || validationSummary.length > 0;

  return (
    <PageContainer>
      <div className="py-10 sm:py-14">
        <Link
          to="/app/requests"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          חזרה לבקשות
        </Link>

        <div className="request-spine-navy mt-6 ps-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            בקשה חדשה · טיוטה פרטית
          </span>
          <h1 className="mt-3 text-[28px] font-bold text-foreground sm:text-[34px]">
            תארו מה אתם צריכים
          </h1>
          <p className="mt-2 max-w-[60ch] text-[14px] text-muted-foreground">
            נותני שירות לא יכולים לראות את הטיוטה. ההתאמה מתחילה רק לאחר לחיצה על פרסום.
          </p>
        </div>

        <div className="mt-8">
          <Section eyebrow="פרטי הבקשה" title="מילוי ושמירה אוטומטית">
            <form
              onSubmit={publish}
              noValidate
              className="request-spine-navy grid gap-6 rounded-2xl border border-border bg-surface p-6 shadow-e1 sm:p-8"
            >
              <p
                aria-live="polite"
                className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-[12px] text-muted-foreground"
              >
                <CheckCircle2 className="h-4 w-4 text-success" />
                {autosaveStatus}
              </p>

              <Field label="כותרת" error={errors.title} required>
                <input
                  className={inputClass}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  dir="auto"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="קטגוריה" error={errors.category_id} required>
                  <select
                    className={inputClass}
                    value={categoryId}
                    onChange={(event) => {
                      const value = event.target.value;
                      setCategoryId(value);
                      setSubcategoryId("");
                      setServiceId("");
                      setMissingServiceText("");
                      void persistTaxonomy({
                        category_id: value,
                        subcategory_id: "",
                        service_id: "",
                        missing_service_text: "",
                      });
                    }}
                  >
                    <option value="">בחירה</option>
                    {(categoriesQuery.data ?? []).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name_he}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="מקצוע" error={errors.subcategory_id}>
                  <select
                    className={inputClass}
                    value={subcategoryId}
                    disabled={!categoryId || subcategoriesQuery.isPending}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSubcategoryId(value);
                      setServiceId("");
                      setMissingServiceText("");
                      void persistTaxonomy({
                        subcategory_id: value,
                        service_id: "",
                        missing_service_text: "",
                      });
                    }}
                  >
                    <option value="">
                      {(subcategoriesQuery.data ?? []).length
                        ? "בחירת מקצוע"
                        : "אין מקצוע מנוהל בקטגוריה"}
                    </option>
                    {(subcategoriesQuery.data ?? []).map((profession) => (
                      <option key={profession.id} value={profession.id}>
                        {profession.name_he}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="שירות" error={errors.service}>
                <select
                  className={inputClass}
                  value={serviceId}
                  disabled={!subcategoryId || servicesQuery.isPending}
                  onChange={(event) => {
                    const value = event.target.value;
                    setServiceId(value);
                    if (value) setMissingServiceText("");
                    void persistTaxonomy({
                      service_id: value,
                      missing_service_text: value ? "" : missingServiceText,
                    });
                  }}
                >
                  <option value="">
                    {(servicesQuery.data ?? []).length ? "בחירת שירות" : "לא מצאתי את השירות"}
                  </option>
                  {(servicesQuery.data ?? [])
                    .filter((service) => deliveryMode !== "remote" || service.supports_remote)
                    .map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name_he}
                      </option>
                    ))}
                </select>
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="אופן קבלת השירות" error={errors.delivery_mode} required>
                  <select
                    ref={deliveryModeSelectRef}
                    className={inputClass}
                    value={deliveryMode}
                    aria-invalid={Boolean(errors.delivery_mode)}
                    onChange={(event) => {
                      const value = event.target.value as "on_site" | "remote" | "";
                      const selectedService = servicesQuery.data?.find(
                        (service) => service.id === serviceId,
                      );
                      const nextServiceId =
                        value === "remote" && !selectedService?.supports_remote ? "" : serviceId;
                      setDeliveryMode(value);
                      setErrors((current) => ({ ...current, delivery_mode: undefined }));
                      setServiceAreaId(value === "on_site" ? serviceAreaId : "");
                      setServiceId(nextServiceId);
                      if (value === "remote") setMissingServiceText("");
                      void persistTaxonomy({
                        delivery_mode: value,
                        service_area_id: value === "on_site" ? serviceAreaId : "",
                        service_id: nextServiceId,
                        missing_service_text: value === "remote" ? "" : missingServiceText,
                      });
                    }}
                  >
                    <option value="">בחירה</option>
                    <option value="on_site">שירות במקום</option>
                    <option value="remote">שירות מרחוק</option>
                  </select>
                </Field>

                {deliveryMode === "on_site" ? (
                  <Field label="אזור שירות" error={errors.service_area_id} required>
                    <RequestServiceAreaSelect
                      ref={serviceAreaSelectRef}
                      areas={serviceAreasQuery.data ?? []}
                      isPending={serviceAreasQuery.isPending}
                      isError={serviceAreasQuery.isError}
                      className={inputClass}
                      value={serviceAreaId}
                      invalid={Boolean(errors.service_area_id)}
                      onChange={(value) => {
                        setServiceAreaId(value);
                        setErrors((current) => ({ ...current, service_area_id: undefined }));
                        setPublishError(null);
                      }}
                      onRetry={() => void serviceAreasQuery.refetch()}
                    />
                  </Field>
                ) : (
                  <div className="rounded-lg border border-border bg-surface-muted/40 p-4 text-[12px] text-muted-foreground">
                    התאמה מרחוק נפתחת רק לנותני שירות שבחרו בשירות המנוהל ותומכים בעבודה מרחוק.
                  </div>
                )}
              </div>

              {!serviceId && categoryId && deliveryMode !== "remote" ? (
                <Field
                  label="לא מצאתי את השירות"
                  hint="הטקסט נשמר בנפרד ואינו יוצר או משנה את הקטלוג."
                  error={errors.service}
                  required
                >
                  <input
                    className={inputClass}
                    value={missingServiceText}
                    onChange={(event) => setMissingServiceText(event.target.value)}
                    minLength={3}
                    maxLength={500}
                    dir="auto"
                  />
                </Field>
              ) : null}

              <Field label="עיר" error={errors.city} required>
                <input
                  className={inputClass}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  maxLength={80}
                  dir="auto"
                />
              </Field>

              <Field
                label="תיאור (אופציונלי)"
                hint={`${description.trim().length}/4000 תווים`}
                error={errors.description}
              >
                <textarea
                  className={cn(inputClass, "h-40 py-3 leading-relaxed")}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={4000}
                  dir="auto"
                />
              </Field>

              <BudgetFields
                type={budgetType}
                minimum={budgetMin}
                maximum={budgetMax}
                error={errors.budget}
                onTypeChange={setBudgetType}
                onMinimumChange={setBudgetMin}
                onMaximumChange={setBudgetMax}
              />

              {subcategoryId && !taxonomySaving ? (
                <DynamicRequestQuestionnaire
                  requestId={draftId}
                  subcategoryId={subcategoryId}
                  serviceId={serviceId || null}
                  onValidityChange={setQuestionnaireValid}
                  onPendingChange={setQuestionnairePending}
                />
              ) : null}
              {errors.questionnaire ? (
                <p role="alert" className="text-[12px] text-danger">
                  {errors.questionnaire}
                </p>
              ) : null}

              <fieldset className="rounded-xl border border-border p-5">
                <legend className="px-2 text-[14px] font-bold text-foreground">
                  קבצים מצורפים (אופציונלי)
                </legend>
                <p className="mb-4 text-[12px] text-muted-foreground">
                  הקבצים פרטיים וניתן להסיר אותם לפני הפרסום.
                </p>
                <AttachmentUploader requestId={draftId} canEdit />
              </fieldset>

              <div className="rounded-lg border border-border bg-surface-muted/40 px-4 py-3 text-[13px]">
                <p className="font-semibold text-foreground">בדיקה לפני פרסום</p>
                {validationSummary.length > 0 ? (
                  <ul className="mt-2 grid gap-1 text-danger">
                    {validationSummary.map(([key, message]) => (
                      <li key={key}>
                        {key === "delivery_mode" || key === "service_area_id" ? (
                          <button
                            type="button"
                            className="text-start underline underline-offset-2"
                            onClick={() => focusPublishValidationTarget({ [key]: message })}
                          >
                            {message}
                          </button>
                        ) : (
                          message
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-success">כל שדות החובה מלאים וניתן לפרסם.</p>
                )}
              </div>

              {publishError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-[13px] text-danger"
                  dir="auto"
                >
                  <p className="font-semibold">{publishError}</p>
                  <p className="mt-1">הטיוטה נשמרה. תקנו את הפרטים ונסו לפרסם שוב.</p>
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
                <Link
                  to="/app/requests"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-4 text-[14px] font-semibold text-foreground"
                >
                  יציאה — הטיוטה תישמר
                </Link>
                <button
                  type="submit"
                  disabled={publishDisabled}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground shadow-e1 disabled:opacity-60"
                >
                  {isFinalizing || publishRequest.isPending ? "מפרסם…" : "פרסום הבקשה"}
                </button>
              </div>
            </form>
          </Section>
        </div>
      </div>
    </PageContainer>
  );
}

function BudgetFields({
  type,
  minimum,
  maximum,
  error,
  onTypeChange,
  onMinimumChange,
  onMaximumChange,
}: {
  type: BudgetType;
  minimum: string;
  maximum: string;
  error?: string;
  onTypeChange: (type: BudgetType) => void;
  onMinimumChange: (value: string) => void;
  onMaximumChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[13px] font-semibold text-foreground">תקציב</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {(
          [
            { value: "range", label: "טווח" },
            { value: "fixed", label: "סכום מדויק" },
            { value: "open", label: "פתוח" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={type === option.value}
            onClick={() => onTypeChange(option.value)}
            className={cn(
              "h-9 rounded-full border px-3.5 text-[12px] font-semibold",
              type === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {type === "fixed" ? (
        <input
          className={inputClass}
          inputMode="numeric"
          value={minimum}
          onChange={(event) => onMinimumChange(event.target.value.replace(/[^\d]/g, ""))}
          aria-label="סכום תקציב"
        />
      ) : type === "range" ? (
        <div className="grid grid-cols-2 gap-3">
          <input
            className={inputClass}
            inputMode="numeric"
            value={minimum}
            onChange={(event) => onMinimumChange(event.target.value.replace(/[^\d]/g, ""))}
            aria-label="תקציב מינימלי"
          />
          <input
            className={inputClass}
            inputMode="numeric"
            value={maximum}
            onChange={(event) => onMaximumChange(event.target.value.replace(/[^\d]/g, ""))}
            aria-label="תקציב מרבי"
          />
        </div>
      ) : (
        <p className="mt-2 text-[12px] text-muted-foreground">
          נותני שירות יוכלו להגיש הצעה ללא מגבלת תקציב מראש.
        </p>
      )}
      {error ? <p className="mt-1 text-[12px] text-danger">{error}</p> : null}
    </fieldset>
  );
}

function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="text-[13px] font-semibold text-foreground">
        {label}
        {required ? <span className="ms-1 text-danger">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-muted-foreground">{hint}</span> : null}
      {error ? (
        <span role="alert" className="mt-1 block text-[12px] text-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
}
