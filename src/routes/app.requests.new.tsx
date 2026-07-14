import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

import { PageContainer } from "@/components/app/PageContainer";
import { Section } from "@/components/app/Section";
import { ErrorState } from "@/components/app/StateCard";
import {
  useCategories,
  useCreateRequest,
  useSubcategories,
  type BudgetType,
} from "@/lib/requests";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/requests/new")({
  component: CreateRequestPage,
  head: () => ({ meta: [{ title: "בקשה חדשה · Bidly" }] }),
});

type Errors = Partial<Record<
  "title" | "description" | "city" | "category_id" | "budget",
  string
>>;

function CreateRequestPage() {
  const navigate = useNavigate();
  const cats = useCategories();
  const [categoryId, setCategoryId] = useState<string>("");
  const subs = useSubcategories(categoryId || null);
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [budgetType, setBudgetType] = useState<BudgetType>("range");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const create = useCreateRequest();

  const validate = useMemo(
    () => (): Errors => {
      const e: Errors = {};
      if (title.trim().length < 3 || title.trim().length > 120)
        e.title = "כותרת חייבת להיות בין 3 ל-120 תווים.";
      if (description.trim().length < 20 || description.trim().length > 4000)
        e.description = "תיאור חייב להיות בין 20 ל-4000 תווים.";
      if (city.trim().length < 2) e.city = "יש להזין עיר.";
      if (!categoryId) e.category_id = "יש לבחור תחום.";
      if (budgetType === "fixed") {
        const n = Number(budgetMin);
        if (!Number.isFinite(n) || n <= 0) e.budget = "סכום חייב להיות חיובי.";
      } else if (budgetType === "range") {
        const lo = Number(budgetMin);
        const hi = Number(budgetMax);
        if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo <= 0 || hi <= 0)
          e.budget = "יש להזין טווח תקציב תקין.";
        else if (lo > hi) e.budget = 'סכום מינ׳ גדול מסכום מקס׳.';
      }
      return e;
    },
    [title, description, city, categoryId, budgetType, budgetMin, budgetMax],
  );

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const payload = {
      title,
      description,
      city,
      category_id: categoryId,
      subcategory_id: subcategoryId || null,
      budget_type: budgetType,
      budget_min:
        budgetType === "open"
          ? null
          : budgetType === "fixed"
            ? Number(budgetMin)
            : Number(budgetMin),
      budget_max:
        budgetType === "open"
          ? null
          : budgetType === "fixed"
            ? Number(budgetMin)
            : Number(budgetMax),
    };
    try {
      const created = await create.mutateAsync(payload);
      void navigate({ to: "/app/requests/$id", params: { id: created.id } });
    } catch {
      /* handled below via create.isError */
    }
  }

  const inputCls =
    "block w-full rounded-lg border border-input bg-background px-3.5 h-11 text-[14px] text-foreground shadow-e1 placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

  return (
    <PageContainer>
      <div className="py-10 sm:py-14">
        <div className="request-spine-navy ps-5">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="h-px w-6 bg-primary" aria-hidden />
            בקשה חדשה
          </span>
          <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.01em] text-foreground sm:text-[34px]">
            נסחו את הבקשה
          </h1>
          <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
            כמה שפרטים יותר ברורים — כך ההצעות שתקבלו יהיו מדויקות יותר.
          </p>
        </div>

        <div className="mt-8">
          <Section eyebrow="פרטי הבקשה" title="מלאו את השדות">
            <form
              onSubmit={onSubmit}
              className="request-spine-navy grid gap-5 rounded-2xl border border-border bg-surface p-6 shadow-e1 sm:p-8"
              noValidate
            >
              <Field label="כותרת" error={errors.title} required>
                <input
                  className={inputCls}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="למשל: עיצוב לוגו לחנות אונליין"
                  maxLength={120}
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="תחום" error={errors.category_id} required>
                  <select
                    className={inputCls}
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      setSubcategoryId("");
                    }}
                    disabled={cats.isPending}
                  >
                    <option value="">בחרו תחום…</option>
                    {(cats.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_he}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="תת-תחום (רשות)">
                  <select
                    className={inputCls}
                    value={subcategoryId}
                    onChange={(e) => setSubcategoryId(e.target.value)}
                    disabled={!categoryId || subs.isPending}
                  >
                    <option value="">
                      {categoryId ? "ללא תת-תחום" : "בחרו תחום קודם"}
                    </option>
                    {(subs.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name_he}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="עיר" error={errors.city} required>
                <input
                  className={inputCls}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="למשל: תל אביב"
                  maxLength={80}
                />
              </Field>

              <Field
                label="תיאור מפורט"
                hint={`${description.trim().length}/4000 תווים`}
                error={errors.description}
                required
              >
                <textarea
                  className={cn(inputCls, "h-40 py-3 leading-relaxed")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="פרטו את מה שאתם מחפשים: היקף, לוחות זמנים, סגנון מועדף, דוגמאות."
                  maxLength={4000}
                />
              </Field>

              <div>
                <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  תקציב
                </span>
                <div className="mb-3 flex flex-wrap gap-2">
                  {(
                    [
                      { key: "range", label: "טווח" },
                      { key: "fixed", label: "סכום מדויק" },
                      { key: "open", label: "פתוח" },
                    ] as const
                  ).map((opt) => {
                    const active = budgetType === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setBudgetType(opt.key)}
                        className={cn(
                          "inline-flex h-9 items-center rounded-full border px-3.5 text-[12px] font-semibold",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {budgetType === "fixed" ? (
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="סכום ב-₪"
                  />
                ) : budgetType === "range" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className={inputCls}
                      inputMode="numeric"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="מ-₪"
                    />
                    <input
                      className={inputCls}
                      inputMode="numeric"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="עד ₪"
                    />
                  </div>
                ) : (
                  <p className="text-[12px] text-muted-foreground">
                    ספקים יגישו הצעות ללא הגבלת תקציב מראש.
                  </p>
                )}
                {errors.budget ? (
                  <p className="mt-1.5 text-[12px] text-danger">{errors.budget}</p>
                ) : null}
              </div>

              {create.isError ? (
                <ErrorState error={create.error} onRetry={() => create.reset()} />
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
                <Link
                  to="/app/requests"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-transparent px-4 text-[14px] font-semibold text-foreground hover:border-border-strong hover:bg-accent"
                >
                  ביטול
                </Link>
                <button
                  type="submit"
                  disabled={create.isPending}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {create.isPending ? "מפרסם…" : "פרסום הבקשה"}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </button>
              </div>
            </form>
          </Section>
        </div>
      </div>
    </PageContainer>
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
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
        {required ? <span className="ms-1 text-danger">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[12px] text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12px] text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}
