import { createElement, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const limit = vi.fn(() => ({ maybeSingle }));
  const order = vi.fn(() => ({ limit }));
  const is = vi.fn(() => ({ order }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq, is }));
  const from = vi.fn(() => ({ select }));

  return { eq, from, is, limit, maybeSingle, order, select };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: supabaseMock.from,
  },
}));

import {
  buildRequestDraftUpdatePayload,
  CURRENT_REQUEST_SCHEMA_SUPPORTS_DELIVERY,
  getRequestPublishErrorMessage,
  isDeliveryModeRequiredError,
  isRequestPublishDisabled,
  normalizeRequestProjection,
  REQUEST_PROJECTION,
  saveAndPublishRequestDraft,
  useExistingRequestDraft,
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

describe("request draft lifecycle", () => {
  it("loads the customer's existing unpublished draft before acquisition", async () => {
    supabaseMock.maybeSingle.mockResolvedValue({
      data: {
        id: "draft-existing",
        title: "טיוטה קיימת",
        updated_at: "2026-07-31T08:00:00.000Z",
      },
      error: null,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    const { result } = renderHook(() => useExistingRequestDraft(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe("draft-existing");
    expect(supabaseMock.from).toHaveBeenCalledWith("requests");
  });

  it("exposes known validation errors and preserves unknown backend messages", () => {
    expect(
      getRequestPublishErrorMessage({
        code: "22000",
        message: "Required questionnaire answers are missing",
      }),
    ).toBe("יש להשלים את כל שאלות החובה.");
    expect(
      getRequestPublishErrorMessage({
        code: "22000",
        message: "A specific backend validation failed",
      }),
    ).toBe("A specific backend validation failed");
  });
});

describe("request draft update payload", () => {
  it("persists the selected delivery mode and on-site area", () => {
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
      delivery_mode: "on_site",
      service_area_id: "service-area-1",
      budget_type: "range",
      budget_min: 500,
      budget_max: 1200,
    });
    expect(payload).not.toHaveProperty("matching_policy");
  });

  it("persists remote mode and clears stale service-area data", () => {
    const payload = buildRequestDraftUpdatePayload({
      title: "ייעוץ מרחוק",
      description: "",
      city: "חיפה",
      category_id: "category-1",
      subcategory_id: "subcategory-1",
      service_id: "service-1",
      missing_service_text: "",
      delivery_mode: "remote",
      service_area_id: "stale-area",
      budget_type: "open",
      budget_min: null,
      budget_max: null,
    });

    expect(payload.delivery_mode).toBe("remote");
    expect(payload.service_area_id).toBeNull();
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

describe("request publish eligibility", () => {
  const validInput = {
    title: "תיקון נזילה",
    description: "",
    city: "חיפה",
    category_id: "category-1",
    subcategory_id: "subcategory-1",
    service_id: "service-1",
    missing_service_text: "",
    delivery_mode: "on_site" as const,
    service_area_id: "service-area-1",
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

  it("requires delivery fields for the managed publication schema", () => {
    expect(CURRENT_REQUEST_SCHEMA_SUPPORTS_DELIVERY).toBe(true);
  });

  it("disables publishing for an in-flight background autosave", () => {
    expect(
      isRequestPublishDisabled({
        publishPending: false,
        autosavePending: true,
        questionnairePending: false,
        taxonomySaving: false,
      }),
    ).toBe(true);
  });

  it.each([
    { publishPending: true, questionnairePending: false, taxonomySaving: false },
    { publishPending: false, questionnairePending: true, taxonomySaving: false },
    { publishPending: false, questionnairePending: false, taxonomySaving: true },
  ])("disables publishing during a required foreground operation", (state) => {
    expect(isRequestPublishDisabled({ ...state, autosavePending: false })).toBe(true);
  });
});

describe("request publication sequencing", () => {
  const validInput = {
    title: "תיקון נזילה",
    description: "",
    city: "חיפה",
    category_id: "category-1",
    subcategory_id: "subcategory-1",
    service_id: "service-1",
    missing_service_text: "",
    delivery_mode: "on_site" as "on_site" | "remote" | "",
    service_area_id: "service-area-1",
    budget_type: "open" as const,
    budget_min: null,
    budget_max: null,
  };

  it.each([
    { label: "on_site", input: validInput },
    {
      label: "remote",
      input: {
        ...validInput,
        delivery_mode: "remote" as const,
        service_area_id: "",
      },
    },
  ])("awaits the final $label update before publishing", async ({ input }) => {
    const save = vi.fn().mockResolvedValue({ id: "draft-1" });
    const publish = vi.fn().mockResolvedValue("request-1");
    const errors = validateRequestPublishFields(input);

    await expect(
      saveAndPublishRequestDraft({
        requestId: "draft-1",
        input,
        validationErrors: errors,
        save,
        publish,
      }),
    ).resolves.toBe("request-1");

    expect(errors).toEqual({});
    expect(save).toHaveBeenCalledWith(input);
    expect(publish).toHaveBeenCalledWith("draft-1");
    expect(save.mock.invocationCallOrder[0]).toBeLessThan(publish.mock.invocationCallOrder[0]);
  });

  it("blocks missing delivery mode before save or publish", async () => {
    const input = {
      ...validInput,
      delivery_mode: "" as const,
      service_area_id: "",
    };
    const save = vi.fn();
    const publish = vi.fn();
    const errors = validateRequestPublishFields(input);

    await expect(
      saveAndPublishRequestDraft({
        requestId: "draft-1",
        input,
        validationErrors: errors,
        save,
        publish,
      }),
    ).resolves.toBeNull();

    expect(errors.delivery_mode).toBe("יש לבחור האם השירות יינתן במקום או מרחוק");
    expect(save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("does not publish when the final draft update fails", async () => {
    const updateError = new Error("Draft update failed");
    const save = vi.fn().mockRejectedValue(updateError);
    const publish = vi.fn();

    await expect(
      saveAndPublishRequestDraft({
        requestId: "draft-1",
        input: validInput,
        validationErrors: {},
        save,
        publish,
      }),
    ).rejects.toBe(updateError);

    expect(publish).not.toHaveBeenCalled();
  });

  it("recognizes only the backend missing-delivery validation", () => {
    expect(
      isDeliveryModeRequiredError({
        code: "22000",
        message: "Request delivery mode is required",
      }),
    ).toBe(true);
    expect(
      isDeliveryModeRequiredError({
        code: "22000",
        message: "Another validation failed",
      }),
    ).toBe(false);
  });
});
