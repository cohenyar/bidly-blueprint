import { createFileRoute } from "@tanstack/react-router";

import { PageContainer } from "@/components/app/PageContainer";
import { SupplierMatchedRequestsList } from "@/components/app/SupplierMatchedRequestsList";

export const Route = createFileRoute("/supplier/requests/")({
  component: SupplierMatchedRequestsPage,
  head: () => ({ meta: [{ title: "בקשות מותאמות · Bidly" }] }),
});

function SupplierMatchedRequestsPage() {
  return (
    <PageContainer>
      <div className="py-10 sm:py-14">
        <div className="request-spine-navy mb-10 ps-5">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="h-px w-6 bg-primary" aria-hidden />
            התאמות פעילות
          </span>
          <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.01em] text-foreground sm:text-[34px]">
            בקשות מותאמות
          </h1>
        </div>
        <SupplierMatchedRequestsList />
      </div>
    </PageContainer>
  );
}
