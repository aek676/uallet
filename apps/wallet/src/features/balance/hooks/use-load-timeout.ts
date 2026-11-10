import { useEffect, useState } from "react";

/**
 * `true` once `loading` has lasted `ms`: the first value never arrived (RPC
 * down, hung request...).
 *
 * Not `useTrackedData`'s `getAbortSignal`: that signal covers the whole
 * attempt, so a timeout also tears down the live subscription after `ms`
 * even when everything works.
 */
export function useLoadTimeout(loading: boolean, ms: number): boolean {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) return undefined;
    const timeout = setTimeout(() => setTimedOut(true), ms);
    return () => {
      clearTimeout(timeout);
      setTimedOut(false);
    };
  }, [loading, ms]);

  return loading && timedOut;
}
