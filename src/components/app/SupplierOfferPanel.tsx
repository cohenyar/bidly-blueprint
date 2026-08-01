import { useState } from "react";
import { CheckCircle2, Clock, Send } from "lucide-react";

import {
  offerSubmissionErrorMessage,
  toSubmitOfferInput,
  useSubmitOffer,
  useWithdrawOffer,
  validateOfferForm,
  type OfferRow,
  type OfferStatus,
  type OfferValidationErrors,
} from "@/lib/offers";
import { formatCurrency, formatDateTime } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<OfferStatus, string> = {
  submitted: "ההצעה נשלחה",
  selected: "ההצעה נבחרה",
  rejected: "הלקוח בחר בהצעה אחרת",
  withdrawn: "ההצעה אינה פעילה",
};

export function SupplierOfferPrompt({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-e1 sm:p-8">
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 sm:w-auto"
      >
        <Send className="h-4 w-4" />
        שליחת הצעה
      </button>
    </div>
  );
}

export function SupplierOwnOffer({
  offer,
  canWithdraw = false,
}: {
  offer: OfferRow;
  canWithdraw?: boolean;
}) {
  const positive = offer.status === "selected";
  const withdraw = useWithdrawOffer(offer.request_id);
  return (
    <div
      className={cn(
        "rounded-2xl border bg-surface p-6 shadow-e1 sm:p-8",
        positive ? "request-spine-emerald border-success/30" : "request-spine-navy border-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            ההצעה שלכם
          </p>
          <h3 className="mt-1 text-[18px] font-bold text-foreground">
            {STATUS_LABEL[offer.status]}
          </h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold",
            positive ? "bg-success-soft text-success" : "bg-surface-muted text-muted-foreground",
          )}
        >
          {positive ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
          {STATUS_LABEL[offer.status]}
        </span>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
          <dt className="text-[11px] font-semibold text-muted-foreground">מחיר</dt>
          <dd className="mt-1 font-numeric text-[24px] font-bold text-foreground">
            {formatCurrency(offer.price)}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
          <dt className="text-[11px] font-semibold text-muted-foreground">זמן משוער</dt>
          <dd className="mt-1 flex items-center gap-1.5 text-[18px] font-bold text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            {offer.estimated_days} ימים
          </dd>
        </div>
      </dl>

      {offer.message.trim() ? (
        <div className="mt-4 rounded-xl border border-border p-4">
          <p className="text-[11px] font-semibold text-muted-foreground">פירוט ההצעה</p>
          <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
            {offer.message}
          </p>
        </div>
      ) : null}
      <p className="mt-4 text-[11px] text-muted-foreground">
        נשלחה ב־{formatDateTime(offer.created_at)}
      </p>
      {canWithdraw && offer.status === "submitted" ? (
        <div className="mt-5 border-t border-border pt-4">
          <button
            type="button"
            disabled={withdraw.isPending}
            onClick={() => {
              if (window.confirm("למשוך את ההצעה? לא ניתן יהיה לשלוח אותה מחדש.")) {
                void withdraw.mutateAsync(offer.id);
              }
            }}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-[13px] font-semibold text-foreground hover:border-danger hover:text-danger disabled:opacity-50"
          >
            {withdraw.isPending ? "מושך…" : "משיכת ההצעה"}
          </button>
          {withdraw.isError ? (
            <p role="alert" className="mt-2 text-[12px] text-danger">
              משיכת ההצעה נכשלה. ייתכן שהבקשה או ההתאמה כבר אינן פעילות.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SupplierOfferForm({
  requestId,
  onSubmitted,
}: {
  requestId: string;
  onSubmitted: () => void;
}) {
  const submitOffer = useSubmitOffer(requestId);
  const [price, setPrice] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<OfferValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    const values = {
      price,
      estimated_days: estimatedDays,
      message,
    };
    const nextErrors = validateOfferForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await submitOffer.mutateAsync(toSubmitOfferInput(values));
      onSubmitted();
    } catch (error) {
      setSubmitError(offerSubmissionErrorMessage(error));
    }
  }

  const inputClass =
    "mt-1.5 block h-11 w-full rounded-lg border border-input bg-background px-3.5 text-[14px] text-foreground shadow-e1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60";

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="rounded-2xl border border-border bg-surface p-6 shadow-e1 sm:p-8"
      noValidate
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">הצעה לבקשה</p>
      <h3 className="mt-1 text-[20px] font-bold text-foreground">שליחת הצעה פרטית</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        מלאו מחיר, זמן ביצוע משוער והודעה ללקוח. לאחר השליחה לא ניתן לשלוח הצעה נוספת.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="offer-price" className="text-[12px] font-semibold text-foreground">
            הערכת מחיר (₪)
          </label>
          <input
            id="offer-price"
            type="number"
            inputMode="numeric"
            min={1}
            max={2_147_483_647}
            step={1}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className={inputClass}
            disabled={submitOffer.isPending}
            aria-invalid={Boolean(errors.price)}
            aria-describedby={errors.price ? "offer-price-error" : undefined}
            required
          />
          {errors.price ? (
            <p id="offer-price-error" className="mt-1 text-[12px] text-danger">
              {errors.price}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="offer-days" className="text-[12px] font-semibold text-foreground">
            זמן משוער (ימים)
          </label>
          <input
            id="offer-days"
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            step={1}
            value={estimatedDays}
            onChange={(event) => setEstimatedDays(event.target.value)}
            className={inputClass}
            disabled={submitOffer.isPending}
            aria-invalid={Boolean(errors.estimated_days)}
            aria-describedby={errors.estimated_days ? "offer-days-error" : undefined}
            required
          />
          {errors.estimated_days ? (
            <p id="offer-days-error" className="mt-1 text-[12px] text-danger">
              {errors.estimated_days}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="offer-message" className="text-[12px] font-semibold text-foreground">
              פירוט ההצעה (אופציונלי)
            </label>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {message.length}/2,000
            </span>
          </div>
          <textarea
            id="offer-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={2000}
            rows={7}
            dir="auto"
            disabled={submitOffer.isPending}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "offer-message-error" : "offer-message-help"}
            className="mt-1.5 block w-full resize-y rounded-lg border border-input bg-background px-3.5 py-3 text-[14px] leading-relaxed text-foreground shadow-e1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
          />
          <p id="offer-message-help" className="mt-1 text-[11px] text-muted-foreground">
            עד 2,000 תווים. ניתן לציין ניסיון רלוונטי ומה כלול במחיר.
          </p>
          {errors.message ? (
            <p id="offer-message-error" className="mt-1 text-[12px] text-danger">
              {errors.message}
            </p>
          ) : null}
        </div>
      </div>

      {submitError ? (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-danger/30 bg-danger/5 p-3 text-[13px] text-danger"
        >
          {submitError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitOffer.isPending}
        className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        <Send className="h-4 w-4" />
        {submitOffer.isPending ? "שולח את ההצעה…" : "שליחת ההצעה"}
      </button>
    </form>
  );
}
