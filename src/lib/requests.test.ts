import { createElement, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return { eq, from, maybeSingle, select };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: supabaseMock.from,
  },
}));

import {
  buildRequestDraftUpdatePayload,
  CURRENT_REQUEST_SCHEMA_SUPPORTS_DELIVERY,
  isRequestPublishDisabled,
  normalizeRequestProjection,
  REQUEST_PROJECTION,
  useRequest,
  validateRequestPublishFields,
} from "@/lib/requests";

describe("request projection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("settles a successful draft query using the services relationship", async () => {
    supabaseMock.maybeSingle.mockResolvedValue({
      data: {
        id: "draft-1",
        service: {
          id: "service-1",
          slug: "kitchen-installation",
          name_he: "התקנת מטבח",
          subcategory: {
            id: "subcategory-1",
            slug: "carpentry",
            name_he: "נגרות",
            category: {
              id: "category-1",
              slug: "home",
              name_he: "לבית",
            },
          },
        },
      },
      error: null,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    const { result } = renderHook(() => useRequest("draft-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabaseMock.from).toHaveBeenCalledWith("requests");
    expect(supabaseMock.select).toHaveBeenCalledWith(REQUEST_PROJECTION);
    expect(supabaseMock.eq).toHaveBeenCalledWith("id", "draft-1");
    expect(result.current.data?.category?.name_he).toBe("לבית");
    expect(result.current.data?.subcategory?.name_he).toBe("נגרות");
    expect(result.current.data?.service?.name_he).toBe("התקנת מטבח");
    expect(result.current.isPending).toBe(false);
  });

  it("settles a failed draft query with the original PostgREST diagnostic in development", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    supabaseMock.maybeSingle.mockResolvedValue({
      data: null,
      error: {
        code: "42501",
        message: "permission denied for table requests",
        details: "RLS denied the request",
        hint: "Check request ownership",
      },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    const { result } = renderHook(() => useRequest("draft-1"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain("Code: 42501");
    expect(result.current.error?.message).toContain(
      "Message: permission denied for table requests",
    );
    expect(result.current.error?.message).toContain("Details: RLS denied the request");
    expect(result.current.error?.message).toContain("Hint: Check request ownership");
    expect(consoleError).toHaveBeenCalledWith(
      "[Supabase request projection failed]",
      expect.objectContaining({
        query: "requests.select(REQUEST_PROJECTION)",
        code: "42501",
      }),
    );
  });

  it("loads draft taxonomy through the service foreign-key chain", () => {
    expect(REQUEST_PROJECTION).toContain("service:services!requests_service_id_fkey");
    expect(REQUEST_PROJECTION).toContain("subcategory:subcategories!services_subcategory_id_fkey");
    expect(REQUEST_PROJECTION).toContain("category:categories!subcategories_category_id_fkey");
    expect(REQUEST_PROJECTION).not.toContain("*, category:categories");
    expect(REQUEST_PROJECTION).not.toContain("), subcategory:subcategories(id");
    expect(REQUEST_PROJECTION).not.toContain("service_area:service_areas");

    const draft = normalizeRequestProjection({
      id: "draft-1",
      service: {
        id: "service-1",
        slug: "kitchen-installation",
        name_he: "התקנת מטבח",
        subcategory: {
          id: "subcategory-1",
          slug: "carpentry",
          name_he: "נגרות",
          category: {
            id: "category-1",
            slug: "home",
            name_he: "לבית",
          },
        },
      },
    });

    expect(draft).toEqual({
      id: "draft-1",
      category: {
        id: "category-1",
        slug: "home",
        name_he: "לבית",
      },
      subcategory: {
        id: "subcategory-1",
        slug: "carpentry",
        name_he: "נגרות",
      },
      service: {
        id: "service-1",
        slug: "kitchen-installation",
        name_he: "התקנת מטבח",
      },
      service_area: null,
    });
  });

  it("keeps an empty draft loadable before a service is selected", () => {
    expect(
      normalizeRequestProjection({
        id: "draft-2",
        service: null,
      }),
    ).toEqual({
      id: "draft-2",
      category: null,
      subcategory: null,
      service: null,
      service_area: null,
    });
  });
});

describe("request draft update compatibility", () => {
  it("omits request delivery columns that are absent before migrations 7–10", () => {
    const payload = buildRequestDraftUpdatePayload({
      title: "  תיקון נזילה  ",
      description: "  נדרשת בדיקה ותיקון של נזילה פעילה  ",
      city: "  חיפה  ",
      category_id: "category-1",
      subcategory_id: "subcategory-1",
      service_id: "service-1",
      missing_service_text: "  ",
      delivery_mode: "on_site",
      service_area_id: "service-area-1",
      budget_type: "range",
      budget_min: 500,
      budget_max: 1200,
    });

    expect(payload).toEqual({
      title: "תיקון נזילה",
      description: "נדרשת בדיקה ותיקון של נזילה פעילה",
      city: "חיפה",
      category_id: "category-1",
      subcategory_id: "subcategory-1",
      service_id: "service-1",
      missing_service_text: null,
      budget_type: "range",
      budget_min: 500,
      budget_max: 1200,
    });
    expect(payload).not.toHaveProperty("delivery_mode");
    expect(payload).not.toHaveProperty("service_area_id");
    expect(payload).not.toHaveProperty("matching_policy");
  });

  it("normalizes an empty optional description to null", () => {
    const payload = buildRequestDraftUpdatePayload({
      title: "תיקון נזילה",
      description: "   ",
      city: "חיפה",
      category_id: "category-1",
      subcategory_id: "subcategory-1",
      service_id: "service-1",
      missing_service_text: "",
      delivery_mode: "",
      service_area_id: "",
      budget_type: "open",
      budget_min: null,
      budget_max: null,
    });

    expect(payload.description).toBeNull();
  });
});

describe("request publish eligibility compatibility", () => {
  const validInput = {
    title: "תיקון נזילה",
    description: "",
    city: "חיפה",
    category_id: "category-1",
    subcategory_id: "subcategory-1",
    service_id: "service-1",
    missing_service_text: "",
    delivery_mode: "" as const,
    service_area_id: "",
    budget_type: "open" as const,
    budget_min: null,
    budget_max: null,
  };

  it("allows publishing with an empty description", () => {
    expect(validateRequestPublishFields(validInput)).toEqual({});
  });

  it("allows publishing with a populated description", () => {
    expect(
      validateRequestPublishFields({
        ...validInput,
        description: "קצר",
      }),
    ).toEqual({});
  });

  it("rejects a description longer than 4,000 characters", () => {
    expect(
      validateRequestPublishFields({
        ...validInput,
        description: "א".repeat(4001),
      }),
    ).toEqual({
      description: "התיאור יכול להכיל עד 4,000 תווים.",
    });
  });

  it("preserves every other basic publication requirement", () => {
    expect(
      validateRequestPublishFields({
        ...validInput,
        title: "",
        city: "",
        category_id: "",
        service_id: "",
        missing_service_text: "",
      }),
    ).toEqual({
      title: "הכותרת חייבת להכיל 3–120 תווים.",
      city: "יש להזין עיר תקינה.",
      category_id: "יש לבחור קטגוריה.",
      service: "בחרו שירות או תארו את השירות שלא מצאתם.",
    });
  });

  it("does not require delivery fields before migrations 7–10", () => {
    expect(CURRENT_REQUEST_SCHEMA_SUPPORTS_DELIVERY).toBe(false);
  });

  it("does not disable publishing for background autosave alone", () => {
    expect(
      isRequestPublishDisabled({
        publishPending: false,
        autosavePending: true,
        questionnairePending: false,
        taxonomySaving: false,
      }),
    ).toBe(false);
  });

  it.each([
    { publishPending: true, questionnairePending: false, taxonomySaving: false },
    { publishPending: false, questionnairePending: true, taxonomySaving: false },
    { publishPending: false, questionnairePending: false, taxonomySaving: true },
  ])("disables publishing during a required foreground operation", (state) => {
    expect(isRequestPublishDisabled({ ...state, autosavePending: false })).toBe(true);
  });
});
