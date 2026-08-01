import { useState } from "react";
import { Inbox } from "lucide-react";

import { Section } from "@/components/app/Section";
import { ErrorState, LoadingState, StateCard } from "@/components/app/StateCard";
import { SupplierMatchedRequestCard } from "@/components/app/SupplierMatchedRequestCard";
import {
  MATCH_SCORE_THRESHOLDS,
  type MatchScoreThreshold,
  useActiveMatchedRequests,
} from "@/lib/supplier-requests";

export function SupplierMatchedRequestsList() {
  const [minimumMatchScore, setMinimumMatchScore] = useState<MatchScoreThreshold>(50);
  const matchesQuery = useActiveMatchedRequests(minimumMatchScore);

  if (matchesQuery.isLoading) {
    return <LoadingState label="טוען את הבקשות המותאמות…" />;
  }

  if (matchesQuery.isError) {
    return <ErrorState error={matchesQuery.error} onRetry={() => void matchesQuery.refetch()} />;
  }

  const matches = matchesQuery.data ?? [];

  return (
    <Section eyebrow="התאמות פעילות" title="בקשות מותאמות">
      <div className="mb-4 flex items-center justify-end gap-2">
        <label
          htmlFor="minimum-match-score"
          className="text-[12px] font-semibold text-muted-foreground"
        >
          סינון לפי התאמה
        </label>
        <select
          id="minimum-match-score"
          value={minimumMatchScore}
          onChange={(event) =>
            setMinimumMatchScore(Number(event.target.value) as MatchScoreThreshold)
          }
          className="h-9 rounded-lg border border-border bg-surface px-3 text-[12px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {MATCH_SCORE_THRESHOLDS.map((threshold) => (
            <option key={threshold} value={threshold}>
              {threshold === 50 ? "כל ההתאמות" : `${threshold}%+`}
            </option>
          ))}
        </select>
      </div>

      {matches.length === 0 ? (
        <SupplierWorkspaceEmptyState />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {matches.map((request) => (
            <SupplierMatchedRequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </Section>
  );
}

export function SupplierWorkspaceEmptyState() {
  return (
    <StateCard
      icon={<Inbox className="h-5 w-5" strokeWidth={2.25} />}
      eyebrow="אין התאמות פעילות"
      title="אין כרגע בקשות שמתאימות לפרופיל שלכם."
      body="בקשות חדשות יופיעו כאן אוטומטית כשהן יתאימו לתחומים שבחרתם והפרופיל יהיה מלא."
    />
  );
}
