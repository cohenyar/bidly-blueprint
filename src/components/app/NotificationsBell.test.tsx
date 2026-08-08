import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const notificationState = vi.hoisted(() => ({
  query: {
    data: [] as Array<Record<string, unknown>>,
    error: null as Error | null,
    isPending: false,
    refetch: vi.fn(),
  },
  unreadQuery: {
    data: 0 as number | undefined,
    refetch: vi.fn(),
  },
  markOne: vi.fn(),
  markAll: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    onClick,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    to: string;
    params: { id: string };
  }) => (
    <a
      href={to.replace("$id", params.id)}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/lib/notifications", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/notifications")>();
  return {
    ...actual,
    useNotificationsRealtime: vi.fn(),
    useNotifications: () => notificationState.query,
    useUnreadNotificationsCount: () => notificationState.unreadQuery,
    useMarkNotificationRead: () => ({ mutate: notificationState.markOne }),
    useMarkAllRead: () => ({ mutate: notificationState.markAll, isPending: false }),
  };
});

import { NotificationsBell } from "./NotificationsBell";

const baseNotification = {
  id: "notification-1",
  user_id: "customer-1",
  type: "offer_received" as const,
  title: "legacy title",
  body: "נותן שירות שלח הצעה לבקשה תיקון חשמל",
  request_id: "request-1",
  offer_id: "offer-1",
  read_at: null,
  created_at: "2026-08-08T10:00:00.000Z",
};

describe("NotificationsBell", () => {
  beforeEach(() => {
    notificationState.query.data = [];
    notificationState.query.error = null;
    notificationState.query.isPending = false;
    notificationState.unreadQuery.data = 0;
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("shows an actionable Customer offer-received notification and marks it read", () => {
    notificationState.query.data = [baseNotification];
    notificationState.unreadQuery.data = 1;
    render(<NotificationsBell />);

    fireEvent.click(screen.getByRole("button", { name: "1 התראות חדשות" }));
    expect(screen.getByText("התקבלה הצעה חדשה")).toBeTruthy();
    expect(screen.getByText(baseNotification.body)).toBeTruthy();

    const link = screen.getByRole("link", { name: /התקבלה הצעה חדשה/ });
    expect(link.getAttribute("href")).toBe("/app/requests/request-1");
    fireEvent.click(link);
    expect(notificationState.markOne).toHaveBeenCalledWith("notification-1");
  });

  it("shows a Supplier match and uses the existing authorized request route", () => {
    notificationState.query.data = [
      {
        ...baseNotification,
        user_id: "supplier-1",
        type: "match_created",
        offer_id: null,
        body: null,
      },
    ];
    notificationState.unreadQuery.data = 1;
    render(<NotificationsBell requestRoute="/supplier/requests/$id" />);

    fireEvent.click(screen.getByRole("button", { name: "1 התראות חדשות" }));
    expect(screen.getByText("בקשה חדשה מתאימה לך")).toBeTruthy();
    expect(screen.getByText("נמצאה בקשה שמתאימה לפרופיל שלך")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/supplier/requests/request-1");
  });

  it("uses the exact unread count instead of only the visible page", () => {
    notificationState.query.data = [{ ...baseNotification, read_at: "2026-08-08T11:00:00Z" }];
    notificationState.unreadQuery.data = 12;
    render(<NotificationsBell />);

    expect(screen.getByRole("button", { name: "12 התראות חדשות" })).toBeTruthy();
    expect(screen.getByText("9+")).toBeTruthy();
  });

  it("does not create a dead Supplier request link for a terminal Offer notification", () => {
    notificationState.query.data = [
      { ...baseNotification, type: "offer_selected", user_id: "supplier-1" },
    ];
    notificationState.unreadQuery.data = 1;
    render(<NotificationsBell requestRoute="/supplier/requests/$id" />);

    fireEvent.click(screen.getByRole("button", { name: "1 התראות חדשות" }));
    expect(screen.getByText("ההצעה שלך נבחרה")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("settles to the requested empty state", () => {
    render(<NotificationsBell />);
    fireEvent.click(screen.getByRole("button", { name: "התראות" }));

    expect(screen.getAllByText("אין התראות חדשות")).toHaveLength(2);
  });

  it("settles to an error state and retries both notification queries", () => {
    notificationState.query.error = new Error("network failed");
    render(<NotificationsBell />);
    fireEvent.click(screen.getByRole("button", { name: "התראות" }));

    expect(screen.getByRole("alert").textContent).toContain("לא הצלחנו לטעון את ההתראות");
    fireEvent.click(screen.getByRole("button", { name: "ניסיון חוזר" }));
    expect(notificationState.query.refetch).toHaveBeenCalledOnce();
    expect(notificationState.unreadQuery.refetch).toHaveBeenCalledOnce();
  });

  it("keeps the compact panel inside a 320px RTL viewport", () => {
    render(
      <div style={{ width: 320 }} dir="rtl">
        <NotificationsBell />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "התראות" }));

    const panel = screen.getByRole("dialog");
    expect(panel.getAttribute("dir")).toBe("rtl");
    expect(panel.className).toContain("inset-x-2");
    expect(panel.className).toContain("sm:w-[340px]");
  });
});
