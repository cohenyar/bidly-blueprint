import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RequestServiceAreaSelect } from "@/components/app/RequestServiceAreaSelect";

const areas = [
  { id: "area-active", name_he: "אזור המרכז", is_active: true },
  { id: "area-inactive", name_he: "אזור לא פעיל", is_active: false },
];

function renderSelect(overrides: Partial<ComponentProps<typeof RequestServiceAreaSelect>> = {}) {
  const props: ComponentProps<typeof RequestServiceAreaSelect> = {
    areas,
    isPending: false,
    isError: false,
    value: "",
    onChange: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
  return { ...render(<RequestServiceAreaSelect {...props} />), props };
}

describe("customer request service-area selector", () => {
  afterEach(cleanup);

  it("renders active areas by ID and Hebrew name while omitting inactive rows", () => {
    renderSelect();

    expect(screen.getByRole("option", { name: "אזור המרכז" })).toHaveProperty(
      "value",
      "area-active",
    );
    expect(screen.queryByRole("option", { name: "אזור לא פעיל" })).toBeNull();
    expect(screen.getByRole("option", { name: "בחירת אזור מנוהל" })).toHaveProperty("value", "");
  });

  it("shows the loading state", () => {
    renderSelect({ isPending: true });
    expect(screen.getByText("טוען אזורי שירות...")).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("shows the query error and retries", () => {
    const onRetry = vi.fn();
    renderSelect({ isError: true, onRetry });

    expect(screen.getByText("לא הצלחנו לטעון את אזורי השירות")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "נסו שוב" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("explains a successful empty active-area result", () => {
    renderSelect({ areas: [] });
    expect(screen.getByText("לא הוגדרו אזורי שירות פעילים במערכת")).toBeTruthy();
    expect(screen.getByRole("combobox")).toHaveProperty("disabled", true);
  });

  it("persists the selected area ID through the change callback", () => {
    const onChange = vi.fn();
    renderSelect({ onChange });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "area-active" } });
    expect(onChange).toHaveBeenCalledWith("area-active");
  });
});
