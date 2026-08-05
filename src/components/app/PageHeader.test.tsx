import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PageHeader } from "@/components/app/PageHeader";

describe("PageHeader", () => {
  afterEach(cleanup);

  it("renders native Hebrew RTL hierarchy and a keyboard-focusable action", () => {
    render(
      <PageHeader
        eyebrow="אזור אישי"
        title="הבקשות שלכם"
        subtitle="עקבו אחר מצב הבקשות."
        action={<a href="/app/requests/new">בקשה חדשה</a>}
      />,
    );

    const heading = screen.getByRole("heading", { level: 1, name: "הבקשות שלכם" });
    const header = heading.closest("header");
    const action = screen.getByRole("link", { name: "בקשה חדשה" });

    expect(header?.getAttribute("dir")).toBe("rtl");
    action.focus();
    expect(document.activeElement).toBe(action);
  });

  it("keeps the primary action visible at a 320px presentation width", () => {
    render(
      <div style={{ width: 320 }}>
        <PageHeader title="כותרת" action={<button type="button">פעולה</button>} />
      </div>,
    );

    expect(screen.getByRole("button", { name: "פעולה" }).getAttribute("hidden")).toBeNull();
  });
});
