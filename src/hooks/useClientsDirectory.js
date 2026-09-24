import { useCallback, useEffect, useRef, useState } from "react";
import { clientsAPI } from "../utils/api";
import useDebouncedRefresh from "./useDebouncedRefresh";

export const CLIENT_SEARCH_DEBOUNCE_MS = 300;

const EMPTY_META = { current_page: 1, last_page: 1, per_page: 25, total: 0 };

const dedupeById = (list) => {
  const seen = new Set();
  return list.filter((client) => {
    if (seen.has(client.id)) return false;
    seen.add(client.id);
    return true;
  });
};

/**
 * Directorio de clientes paginado con búsqueda en servidor (cliente o
 * contacto). Guardar un cliente actualiza su fila en memoria en vez de
 * volver a pedir la lista; los cambios de otros llegan por 'clients'.
 */
const useClientsDirectory = () => {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState([]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const requestIdRef = useRef(0);
  // Páginas ya mostradas: la recarga en vivo las vuelve a pedir todas
  const pagesRef = useRef(1);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), CLIENT_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = ++requestIdRef.current;
      const pages = silent ? pagesRef.current : 1;
      if (!silent) {
        setLoading(true);
        setError(false);
      }
      try {
        const responses = await Promise.all(
          Array.from({ length: pages }, (_, index) => clientsAPI.getAll({ q: query, page: index + 1 }))
        );
        if (requestId !== requestIdRef.current) return;
        pagesRef.current = pages;
        setClients(dedupeById(responses.flatMap((response) => response.data)));
        setMeta({ ...EMPTY_META, ...responses.at(-1).meta });
        setError(false);
      } catch {
        if (requestId === requestIdRef.current && !silent) setError(true);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [query]
  );

  useEffect(() => {
    load();
  }, [load]);

  useDebouncedRefresh(["clients"], () => load({ silent: true }));

  const loadMore = useCallback(async () => {
    const nextPage = pagesRef.current + 1;
    const requestId = ++requestIdRef.current;
    setLoadingMore(true);
    try {
      const response = await clientsAPI.getAll({ q: query, page: nextPage });
      if (requestId !== requestIdRef.current) return;
      pagesRef.current = nextPage;
      setClients((prev) => dedupeById([...prev, ...response.data]));
      setMeta({ ...EMPTY_META, ...response.meta });
    } finally {
      setLoadingMore(false);
    }
  }, [query]);

  const upsertClient = useCallback((client) => {
    setClients((prev) => {
      const index = prev.findIndex((item) => item.id === client.id);
      if (index === -1) return [client, ...prev];
      const next = [...prev];
      next[index] = { ...prev[index], ...client };
      return next;
    });
  }, []);

  return {
    clients,
    meta,
    loading,
    loadingMore,
    error,
    search,
    setSearch,
    hasMore: meta.current_page < meta.last_page,
    loadMore,
    upsertClient,
    reload: load,
  };
};

export default useClientsDirectory;
