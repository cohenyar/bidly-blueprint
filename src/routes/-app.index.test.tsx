import type { AnchorHTMLAttributes, ComponentType, ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => ({ options: config }),
  Link: ({
    children,
    to,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/requests", () => ({
  formatBudget: () => "—",
  REQUEST_STATUS_LABEL: {
    open: "פעילה",
    awarded: "נבחר נותן שירות",
    closed: "סגורה",
    cancelled: "בוטלה",
  },
  useMyRequests: () => ({
    data: [],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/i18n", () => ({ formatDate: () => "" }));

import { Route } from "@/routes/app.index";

const DashboardPage = (Route as unknown as { options: { component: ComponentType } }).options
  .component;

describe("customer dashboard visual shell", () => {
  afterEach(cleanup);

  it("shows the primary new-request action without changing its route", () => {
    render(<DashboardPage />);

    const actions = screen.getAllByRole("link", { name: /בקשה חדשה/ });
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0].getAttribute("href")).toBe("/app/requests/new");
    expect(screen.getByRole("heading", { level: 1, name: "הבקשות שלכם, במקום אחד." })).toBeTruthy();
  });
});
