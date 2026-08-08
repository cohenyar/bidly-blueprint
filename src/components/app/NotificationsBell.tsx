import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Bell, CheckCheck, RotateCcw } from "lucide-react";

import {
  getNotificationPresentation,
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
  useNotificationsRealtime,
  useUnreadNotificationsCount,
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
  const unreadQuery = useUnreadNotificationsCount();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  const items = q.data ?? [];
  const visibleUnread = items.filter((notification) => !notification.read_at).length;
  const unread = unreadQuery.data ?? visibleUnread;

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
          dir="rtl"
          className="fixed inset-x-2 top-14 z-50 overflow-hidden rounded-xl border border-border bg-surface shadow-e2 sm:absolute sm:inset-x-auto sm:top-auto sm:mt-2 sm:w-[340px]"
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
                disabled={markAll.isPending}
                onClick={() => markAll.mutate()}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-primary hover:bg-accent disabled:opacity-60"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                סימון הכל כנקרא
              </button>
            ) : null}
          </div>

          <div className="max-h-[380px] overflow-auto">
            {q.isPending ? (
              <p className="p-6 text-center text-[12px] text-muted-foreground">טוען התראות...</p>
            ) : q.error ? (
              <div role="alert" className="p-5 text-center">
                <p className="text-[12px] font-semibold text-danger">לא הצלחנו לטעון את ההתראות</p>
                <button
                  type="button"
                  onClick={() => {
                    void q.refetch();
                    void unreadQuery.refetch();
                  }}
                  className="mt-3 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-accent"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  ניסיון חוזר
                </button>
              </div>
            ) : items.length === 0 ? (
              <p className="p-6 text-center text-[12px] text-muted-foreground">אין התראות חדשות</p>
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
  const presentation = getNotificationPresentation(n);
  const hasSafeRequestLink = Boolean(
    n.request_id && (requestRoute === "/app/requests/$id" || n.type === "match_created"),
  );
  const inner = (
    <div
      data-unread={!n.read_at || undefined}
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
        <p className="truncate text-[13px] font-semibold text-foreground">{presentation.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
          {presentation.description}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(n.created_at)}</p>
        {hasSafeRequestLink ? (
          <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            צפייה בבקשה
            <ArrowLeft className="h-3 w-3" aria-hidden />
          </span>
        ) : null}
      </div>
    </div>
  );

  if (n.request_id && hasSafeRequestLink) {
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
