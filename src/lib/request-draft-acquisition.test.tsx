import { StrictMode, useEffect } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useRequestDraftAcquisition } from "@/lib/request-draft-acquisition";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

type DraftState = ReturnType<typeof useRequestDraftAcquisition>;

function DraftProbe({
  acquire,
  onState,
  enabled,
}: {
  acquire: (input: void) => Promise<string>;
  onState: (state: DraftState) => void;
  enabled?: boolean;
}) {
  const state = useRequestDraftAcquisition(acquire, { enabled });

  useEffect(() => {
    onState(state);
  }, [onState, state]);

  return <output>{state.error ? "error" : (state.draftId ?? "loading")}</output>;
}

describe("request draft acquisition", () => {
  afterEach(() => {
    cleanup();
  });

  it("coalesces StrictMode acquisition and exits loading with one logical draft", async () => {
    const acquisition = deferred<string>();
    const acquire = vi.fn(() => acquisition.promise);
    let latestState!: DraftState;

    render(
      <StrictMode>
        <DraftProbe acquire={acquire} onState={(state) => (latestState = state)} />
      </StrictMode>,
    );

    expect(screen.getByText("loading")).toBeTruthy();
    await waitFor(() => expect(acquire).toHaveBeenCalledTimes(1));

    await act(async () => {
      acquisition.resolve("draft-1");
      await acquisition.promise;
    });

    await waitFor(() => expect(screen.getByText("draft-1")).toBeTruthy());
    expect(acquire).toHaveBeenCalledTimes(1);
    expect(latestState.error).toBeNull();
  });

  it("resets a failed acquisition so an interrupted attempt can retry", async () => {
    const firstAttempt = deferred<string>();
    const secondAttempt = deferred<string>();
    const acquire = vi
      .fn<(input: void) => Promise<string>>()
      .mockImplementationOnce(() => firstAttempt.promise)
      .mockImplementationOnce(() => secondAttempt.promise);
    let latestState!: DraftState;

    render(
      <StrictMode>
        <DraftProbe acquire={acquire} onState={(state) => (latestState = state)} />
      </StrictMode>,
    );

    await act(async () => {
      firstAttempt.reject(new Error("interrupted"));
      await firstAttempt.promise.catch(() => undefined);
    });

    await waitFor(() => expect(screen.getByText("error")).toBeTruthy());

    act(() => {
      latestState.retry();
    });
    await waitFor(() => expect(acquire).toHaveBeenCalledTimes(2));

    await act(async () => {
      secondAttempt.resolve("draft-2");
      await secondAttempt.promise;
    });

    await waitFor(() => expect(screen.getByText("draft-2")).toBeTruthy());
    expect(acquire).toHaveBeenCalledTimes(2);
    expect(latestState.error).toBeNull();
  });

  it("allows retry when acquisition completes without a draft ID", async () => {
    const acquire = vi
      .fn<(input: void) => Promise<string>>()
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("draft-after-empty");
    let latestState!: DraftState;

    render(<DraftProbe acquire={acquire} onState={(state) => (latestState = state)} />);

    await waitFor(() => expect(screen.getByText("error")).toBeTruthy());

    act(() => {
      latestState.retry();
    });

    await waitFor(() => expect(screen.getByText("draft-after-empty")).toBeTruthy());
    expect(acquire).toHaveBeenCalledTimes(2);
    expect(latestState.error).toBeNull();
  });

  it("waits for an existing-draft choice before acquiring", async () => {
    const acquire = vi.fn().mockResolvedValue("draft-1");
    let latestState!: DraftState;
    const { rerender } = render(
      <DraftProbe acquire={acquire} enabled={false} onState={(state) => (latestState = state)} />,
    );

    await act(async () => Promise.resolve());
    expect(acquire).not.toHaveBeenCalled();
    expect(latestState.draftId).toBeNull();

    rerender(<DraftProbe acquire={acquire} enabled onState={(state) => (latestState = state)} />);

    await waitFor(() => expect(screen.getByText("draft-1")).toBeTruthy());
    expect(acquire).toHaveBeenCalledTimes(1);
  });
});
