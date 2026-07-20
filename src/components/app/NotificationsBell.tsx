import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";

import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
  useNotificationsRealtime,
  type NotificationRow,
} from "@/lib/notifications";
import { formatDateTime } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function NotificationsBell({
  requestRoute = "/app/requests/$id",
}: {
  requestRoute?: "/app/requests/$id" | "/supplier/requests/$id";
}) {
  useNotificationsRealtime();
  const q = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  const items = q.data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `${unread} התראות חדשות` : "התראות"}
        aria-expanded={open}
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-transparent text-foreground transition-colors hover:border-border-strong hover:bg-accent",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        )}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -top-1 -end-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="מרכז התראות"
          className="absolute end-0 mt-2 w-[340px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-border bg-surface shadow-e2"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-[13px] font-bold text-foreground">התראות</p>
              <p className="text-[11px] text-muted-foreground">
                {unread > 0 ? `${unread} חדשות` : "אין התראות חדשות"}
              </p>
            </div>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-primary hover:bg-accent"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                סמן הכל כנקרא
              </button>
            ) : null}
          </div>

          <div className="max-h-[380px] overflow-auto">
            {q.isPending ? (
              <p className="p-6 text-center text-[12px] text-muted-foreground">טוען…</p>
            ) : items.length === 0 ? (
              <p className="p-6 text-center text-[12px] text-muted-foreground">אין התראות עדיין.</p>
            ) : (
              <ul>
                {items.map((n) => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    requestRoute={requestRoute}
                    onMarkRead={() => {
                      if (!n.read_at) markOne.mutate(n.id);
                      setOpen(false);
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NotificationItem({
  n,
  onMarkRead,
  requestRoute,
}: {
  n: NotificationRow;
  onMarkRead: () => void;
  requestRoute: "/app/requests/$id" | "/supplier/requests/$id";
}) {
  const inner = (
    <div
      className={cn(
        "flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0",
        !n.read_at && "bg-primary/5",
      )}
    >
      <span
        className={cn(
          "mt-1 h-2 w-2 shrink-0 rounded-full",
          n.read_at ? "bg-transparent" : "bg-primary",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{n.title}</p>
        {n.body ? (
          <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{n.body}</p>
        ) : null}
        <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(n.created_at)}</p>
      </div>
    </div>
  );

  if (n.request_id) {
    return (
      <li>
        <Link
          to={requestRoute}
          params={{ id: n.request_id }}
          onClick={onMarkRead}
          className="block hover:bg-accent/40"
        >
          {inner}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        onClick={onMarkRead}
        className="block w-full text-start hover:bg-accent/40"
      >
        {inner}
      </button>
    </li>
  );
}
