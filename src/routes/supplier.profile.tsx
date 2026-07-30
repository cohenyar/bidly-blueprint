import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { PageContainer } from "@/components/app/PageContainer";
import { SupplierProfileForm } from "@/components/app/SupplierProfileForm";

export const Route = createFileRoute("/supplier/profile")({
  component: SupplierProfilePage,
  head: () => ({ meta: [{ title: "פרופיל נותן שירות · Bidly" }] }),
});

export function SupplierProfilePage() {
  return (
    <PageContainer>
      <div className="py-10 sm:py-14">
        <Link
          to="/supplier"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          חזרה לאזור הספק
        </Link>

        <div className="request-spine-navy mt-6 ps-5">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="h-px w-6 bg-primary" aria-hidden />
            פרופיל נותן שירות
          </span>
          <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-[-0.01em] text-foreground sm:text-[32px]">
            פרטי העסק והתחומים שלכם
          </h1>
          <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-muted-foreground">
            המידע משמש להתאמת בקשות ולתצוגה בעת שליחת הצעה ללקוח.
          </p>
        </div>

        <div className="mt-8">
          <SupplierProfileForm />
        </div>
      </div>
    </PageContainer>
  );
}
