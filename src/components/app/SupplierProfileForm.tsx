import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useCategories, useSubcategories } from "@/lib/requests";
import {
  useMySupplierCategories,
  useMySupplierProfile,
  useMySupplierSubcategories,
  useSaveSupplierProfile,
  useSyncSupplierCategories,
  useSyncSupplierSubcategories,
  validateSupplierProfile,
  type SupplierProfileErrors,
  type SupplierProfileInput,
} from "@/lib/supplier-profile";
import { cn } from "@/lib/utils";

const inputCls =
  "block w-full rounded-lg border border-input bg-background px-3.5 h-11 text-[14px] text-foreground shadow-e1 placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const labelCls =
  "block text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";
const helpCls = "mt-1 text-[12px] text-muted-foreground";
const errCls = "mt-1 text-[12px] text-danger";

export function SupplierProfileForm() {
  const profileQ = useMySupplierProfile();
  const catsQ = useCategories();
  const myCatsQ = useMySupplierCategories();
  const mySubsQ = useMySupplierSubcategories();

  const saveProfile = useSaveSupplierProfile();
  const syncCats = useSyncSupplierCategories();
  const syncSubs = useSyncSupplierSubcategories();

  const [form, setForm] = useState<SupplierProfileInput>({
    business_name: "",
    description: "",
    service_area: "",
    starting_price_ils: null,
    years_experience: null,
    portfolio_links: [],
  });
  const [errors, setErrors] = useState<SupplierProfileErrors>({});
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (profileQ.data) {
      setForm({
        business_name: profileQ.data.business_name ?? "",
        description: profileQ.data.description ?? "",
        service_area: profileQ.data.service_area ?? "",
        starting_price_ils: profileQ.data.starting_price_ils ?? null,
        years_experience: profileQ.data.years_experience ?? null,
        portfolio_links: profileQ.data.portfolio_links ?? [],
      });
    }
  }, [profileQ.data]);

  useEffect(() => {
    if (myCatsQ.data) setSelectedCats(myCatsQ.data);
  }, [myCatsQ.data]);

  useEffect(() => {
    if (mySubsQ.data) setSelectedSubs(mySubsQ.data);
  }, [mySubsQ.data]);

  const patch = (p: Partial<SupplierProfileInput>) =>
    setForm((f) => ({ ...f, ...p }));

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSaveMessage(null);
    setSaveError(null);
    const e = validateSupplierProfile(form);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    try {
      await saveProfile.mutateAsync(form);
      // Sync categories first (subcategory trigger requires parent).
      await syncCats.mutateAsync({
        selected: selectedCats,
        current: myCatsQ.data ?? [],
      });
      // Drop subs whose parent category was removed.
      const validSubs = selectedSubs.filter((sid) =>
        (myCatsQ.data ?? [])
          .concat(selectedCats)
          .some(() => true /* checked below */),
      );
      await syncSubs.mutateAsync({
        selected: validSubs,
        current: mySubsQ.data ?? [],
      });
      setSaveMessage("הפרופיל נשמר.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "שמירה נכשלה.");
    }
  }

  function toggleCategory(id: string) {
    setSelectedCats((cur) =>
      cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id],
    );
    // Remove selected subs whose parent is unchecked.
    setSelectedSubs((subs) => subs);
  }

  function toggleSubcategory(id: string) {
    setSelectedSubs((cur) =>
      cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id],
    );
  }

  function updateLink(idx: number, value: string) {
    setForm((f) => {
      const links = [...f.portfolio_links];
      links[idx] = value;
      return { ...f, portfolio_links: links };
    });
  }

  function addLink() {
    setForm((f) =>
      f.portfolio_links.length >= 5
        ? f
        : { ...f, portfolio_links: [...f.portfolio_links, ""] },
    );
  }

  function removeLink(idx: number) {
    setForm((f) => ({
      ...f,
      portfolio_links: f.portfolio_links.filter((_, i) => i !== idx),
    }));
  }

  const busy =
    saveProfile.isPending || syncCats.isPending || syncSubs.isPending;

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-e1 sm:p-8">
        <h2 className="text-[16px] font-bold text-foreground">פרטי העסק</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          המידע יופיע בפני לקוחות כשתשלחו הצעה.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="business_name">
              שם העסק
            </label>
            <input
              id="business_name"
              className={cn(inputCls, "mt-1.5")}
              value={form.business_name}
              onChange={(e) => patch({ business_name: e.target.value })}
              maxLength={80}
              dir="auto"
              required
            />
            {errors.business_name ? (
              <p className={errCls}>{errors.business_name}</p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="description">
              תיאור
            </label>
            <textarea
              id="description"
              className={cn(inputCls, "mt-1.5 h-32 py-2.5")}
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              maxLength={1000}
              dir="auto"
            />
            <p className={helpCls}>{form.description.length}/1000</p>
            {errors.description ? (
              <p className={errCls}>{errors.description}</p>
            ) : null}
          </div>

          <div>
            <label className={labelCls} htmlFor="service_area">
              אזור שירות
            </label>
            <input
              id="service_area"
              className={cn(inputCls, "mt-1.5")}
              value={form.service_area}
              onChange={(e) => patch({ service_area: e.target.value })}
              maxLength={200}
              placeholder="למשל: מרכז, שרון, ירושלים"
              dir="auto"
            />
            {errors.service_area ? (
              <p className={errCls}>{errors.service_area}</p>
            ) : null}
          </div>

          <div>
            <label className={labelCls} htmlFor="starting_price">
              מחיר התחלה (ש״ח)
            </label>
            <input
              id="starting_price"
              type="number"
              min={0}
              className={cn(inputCls, "mt-1.5")}
              value={form.starting_price_ils ?? ""}
              onChange={(e) =>
                patch({
                  starting_price_ils:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
            {errors.starting_price_ils ? (
              <p className={errCls}>{errors.starting_price_ils}</p>
            ) : null}
          </div>

          <div>
            <label className={labelCls} htmlFor="years_experience">
              שנות ניסיון
            </label>
            <input
              id="years_experience"
              type="number"
              min={0}
              max={100}
              className={cn(inputCls, "mt-1.5")}
              value={form.years_experience ?? ""}
              onChange={(e) =>
                patch({
                  years_experience:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
            {errors.years_experience ? (
              <p className={errCls}>{errors.years_experience}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6 shadow-e1 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-foreground">תיק עבודות</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              עד 5 קישורים לאתר, פרויקטים או רשתות חברתיות.
            </p>
          </div>
          <button
            type="button"
            onClick={addLink}
            disabled={form.portfolio_links.length >= 5}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-muted px-3 text-[12px] font-semibold text-foreground hover:bg-accent disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            הוספת קישור
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {form.portfolio_links.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              עדיין לא הוספתם קישורים.
            </p>
          ) : (
            form.portfolio_links.map((link, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={cn(inputCls, "flex-1")}
                  type="url"
                  value={link}
                  onChange={(e) => updateLink(i, e.target.value)}
                  placeholder="https://…"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-muted text-danger hover:bg-accent"
                  aria-label="הסרת קישור"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
          {errors.portfolio_links ? (
            <p className={errCls}>{errors.portfolio_links}</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6 shadow-e1 sm:p-8">
        <h2 className="text-[16px] font-bold text-foreground">תחומי פעילות</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          בחרו את התחומים בהם אתם פעילים. תת-תחומים ייפתחו לאחר בחירת התחום.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(catsQ.data ?? []).map((c) => {
            const on = selectedCats.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.id)}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3 text-[13px] font-semibold transition-colors",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface-muted text-foreground hover:border-border-strong",
                )}
              >
                {c.name_he}
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-4">
          {selectedCats.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              בחרו לפחות תחום אחד כדי לפתוח את רשימת תת-התחומים.
            </p>
          ) : (
            selectedCats.map((cid) => (
              <SubcategoryPicker
                key={cid}
                categoryId={cid}
                categoryName={
                  catsQ.data?.find((c) => c.id === cid)?.name_he ?? ""
                }
                selected={selectedSubs}
                onToggle={toggleSubcategory}
              />
            ))
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[13px]">
          {saveMessage ? (
            <span className="text-success">{saveMessage}</span>
          ) : null}
          {saveError ? <span className="text-danger">{saveError}</span> : null}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? "שומר…" : "שמירת פרופיל"}
        </button>
      </div>
    </form>
  );
}

function SubcategoryPicker({
  categoryId,
  categoryName,
  selected,
  onToggle,
}: {
  categoryId: string;
  categoryName: string;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const q = useSubcategories(categoryId);
  const items = useMemo(() => q.data ?? [], [q.data]);
  return (
    <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {categoryName}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">אין תת-תחומים.</p>
        ) : (
          items.map((s) => {
            const on = selected.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onToggle(s.id)}
                className={cn(
                  "inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-semibold transition-colors",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-foreground hover:border-border-strong",
                )}
              >
                {s.name_he}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
