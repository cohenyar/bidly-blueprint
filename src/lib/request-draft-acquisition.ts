import { useCallback, useEffect, useRef, useState } from "react";

type AcquireRequestDraft = (input: void) => Promise<string>;

export function useRequestDraftAcquisition(
  acquireRequestDraft: AcquireRequestDraft,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const acquireStarted = useRef(false);
  const acquirePromise = useRef<Promise<string> | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const acquire = useCallback(() => {
    if (acquirePromise.current) return acquirePromise.current;
    if (acquireStarted.current) acquireStarted.current = false;

    acquireStarted.current = true;
    setError(null);

    const promise = Promise.resolve()
      .then(() => acquireRequestDraft(undefined))
      .then((requestId) => {
        if (!requestId) throw new Error("Draft acquisition completed without a Request ID");
        return requestId;
      })
      .finally(() => {
        if (acquirePromise.current === promise) {
          acquirePromise.current = null;
          acquireStarted.current = false;
        }
      });

    acquirePromise.current = promise;
    return promise;
  }, [acquireRequestDraft]);

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    void acquire()
      .then((requestId) => {
        if (active) setDraftId(requestId);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason : new Error("Draft acquisition failed"));
        }
      });

    return () => {
      active = false;
    };
  }, [acquire, enabled]);

  const retry = useCallback(() => {
    acquireStarted.current = false;
    setError(null);
    setDraftId(null);

    void acquire()
      .then(setDraftId)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason : new Error("Draft acquisition failed"));
      });
  }, [acquire]);

  return { draftId, error, retry };
}
