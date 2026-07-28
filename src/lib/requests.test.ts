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

import { normalizeRequestProjection, REQUEST_PROJECTION, useRequest } from "@/lib/requests";

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
