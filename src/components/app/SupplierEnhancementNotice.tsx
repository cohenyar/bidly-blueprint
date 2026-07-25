import { Link } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";

import {
  useDismissSupplierEnhancementNotice,
  useSupplierOnboardingState,
} from "@/lib/supplier-profile";

export function SupplierEnhancementNotice() {
  const stateQuery = useSupplierOnboardingState();
  const dismiss = useDismissSupplierEnhancementNotice();
  const state = stateQuery.data;

  if (
    stateQuery.isPending ||
    stateQuery.isError ||
    state?.eligibility_policy !== "legacy" ||
    state.notice_dismissed_at
  ) {
    return null;
  }

  return (
    <aside
      aria-label="אפשרויות פרופיל חדשות"
      className="relative rounded-2xl border border-primary/25 bg-primary/5 p-5 pe-12"
    >
      <Sparkles className="h-5 w-5 text-primary" aria-hidden />
      <h2 className="mt-2 text-[15px] font-bold text-foreground">
        התאמות חדשות מושהות עד להשלמת הפרופיל המעודכן
      </h2>
      <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-muted-foreground">
        החשבון, ההיסטוריה, ההצעות וההתאמות הקיימות נשארים זמינים. כדי לקבל התאמות חדשות, יש לבחור
        במפורש שירותים, אופן מתן שירות ואזורי שירות מנוהלים ולשלוח את הפרופיל המעודכן.
      </p>
      <Link
        to="/supplier/profile"
        className="mt-3 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground"
      >
        השלמת הפרופיל המעודכן
      </Link>
      <button
        type="button"
        aria-label="סגירת ההודעה"
        disabled={dismiss.isPending}
        onClick={() => void dismiss.mutateAsync()}
        className="absolute end-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface disabled:opacity-50"
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
