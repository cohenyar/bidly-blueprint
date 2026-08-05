import { Badge } from "@/components/ui/badge";

type Status =
  | "draft"
  | "open"
  | "matched"
  | "submitted"
  | "selected"
  | "awarded"
  | "closed"
  | "cancelled";

const STATUS_PRESENTATION: Record<
  Status,
  { label: string; variant: "muted" | "success" | "warning" | "destructive" | "secondary" }
> = {
  draft: { label: "טיוטה", variant: "muted" },
  open: { label: "פעילה", variant: "success" },
  matched: { label: "מותאמת", variant: "secondary" },
  submitted: { label: "הוגשה", variant: "warning" },
  selected: { label: "נבחרה", variant: "success" },
  awarded: { label: "נבחר נותן שירות", variant: "success" },
  closed: { label: "סגורה", variant: "muted" },
  cancelled: { label: "בוטלה", variant: "destructive" },
};

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const presentation = STATUS_PRESENTATION[status];
  return (
    <Badge variant={presentation.variant} className="whitespace-nowrap font-semibold shadow-none">
      {label ?? presentation.label}
    </Badge>
  );
}
