import { useCallback, useEffect, useState } from "react";
import api from "../api";

// GET `url` and keep the result. Changing `url` (e.g. picking another course) refetches.
// `setData` lets a page update the cached result after saving, without refetching.
export function useFetch(url) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ key: null, data: null, error: null });
  const key = url ? `${url}#${version}` : null;

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    api.get(url)
      .then((res) => !cancelled && setState({ key: `${url}#${version}`, data: res.data, error: null }))
      .catch((error) => !cancelled && setState({ key: `${url}#${version}`, data: null, error }));
    return () => {
      cancelled = true;
    };
  }, [url, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback(
    (update) => setState((s) => ({ ...s, data: typeof update === "function" ? update(s.data) : update })),
    []
  );

  const loading = Boolean(url) && state.key !== key;
  return { data: loading ? null : state.data, error: loading ? null : state.error, loading, reload, setData };
}
