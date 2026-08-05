import { Clock3, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function HomepageProductPreview() {
  return (
    <Card
      variant="standard"
      className="relative overflow-hidden p-4 shadow-e3 sm:p-5"
      aria-label="תצוגת מוצר לדוגמה"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <span className="text-[11px] font-bold text-primary">תצוגת מוצר</span>
        <Badge variant="muted">דוגמה להמחשה בלבד</Badge>
      </div>

      <div className="request-spine-navy mt-4 ps-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
          בקשה לדוגמה · עיצוב גרפי
        </p>
        <h2 className="mt-1.5 text-[16px] font-bold leading-snug text-foreground">
          עיצוב זהות חזותית לעסק חדש
        </h2>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            שירות מרחוק
          </span>
          <span>·</span>
          <span>הצעות פרטיות</span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-success/25 bg-success-soft/45 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              הצעה תואמת לדוגמה
            </p>
            <p className="mt-1 text-[14px] font-semibold text-foreground">נותן שירות לדוגמה</p>
          </div>
          <Badge variant="success">92% התאמה</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-success/20 pt-3">
          <PreviewMetric label="מחיר משוער" value="₪1,800" />
          <PreviewMetric label="זמן משוער" value="3 ימים" icon={<Clock3 />} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-border pt-3 text-[12px]">
        <span className="font-semibold text-foreground">הצעה נוספת לדוגמה</span>
        <span className="font-numeric tabular-nums text-muted-foreground">₪2,200</span>
        <span className="font-numeric tabular-nums text-muted-foreground">5 ימים</span>
      </div>
    </Card>
  );
}

function PreviewMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 font-numeric text-[18px] font-bold tabular-nums text-foreground">
        {icon ? <span className="text-success [&>svg]:h-4 [&>svg]:w-4">{icon}</span> : null}
        {value}
      </p>
    </div>
  );
}
