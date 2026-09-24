import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ticketsAPI } from "../utils/api";
import useDebouncedRefresh from "./useDebouncedRefresh";

export const INBOX_TABS = ["sin_asignar", "abiertos", "esperando_cliente", "resueltos", "todos"];
export const DEFAULT_TAB = "sin_asignar";

// Parámetro de la URL → parámetro de la API
const FILTER_PARAMS = { priority: "priority", type: "type", team: "team_id", client: "client_id" };
const EMPTY_COUNTS = { sin_asignar: 0, abiertos: 0, esperando_cliente: 0, resueltos: 0, todos: 0 };
const EMPTY_META = { current_page: 1, last_page: 1, per_page: 25, total: 0, counts: EMPTY_COUNTS, client: null };

export const readInboxFilters = (searchParams) => {
  const tab = searchParams.get("tab");
  const page = Number(searchParams.get("page"));

  return {
    tab: INBOX_TABS.includes(tab) ? tab : DEFAULT_TAB,
    q: searchParams.get("q") || "",
    priority: searchParams.get("priority") || "",
    type: searchParams.get("type") || "",
    team: searchParams.get("team") || "",
    client: searchParams.get("client") || "",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
};

export const toApiFilters = (filters) => {
  const api = { tab: filters.tab, page: filters.page };
  const q = filters.q.trim();
  if (q) api.q = q;
  Object.entries(FILTER_PARAMS).forEach(([key, apiKey]) => {
    if (filters[key]) api[apiKey] = filters[key];
  });
  return api;
};

/**
 * Datos de la Bandeja de Clientes. Los filtros viven en la URL (se pueden
 * compartir y sobreviven a recargar); la API pagina de 25 en 25 y devuelve
 * los contadores de cada pestaña en meta.counts.
 */
const useClientInbox = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readInboxFilters(searchParams);
  const apiKey = JSON.stringify(toApiFilters(filters));

  const [tickets, setTickets] = useState([]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Id de la última petición: se descartan las respuestas de filtros viejos
  const requestIdRef = useRef(0);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = ++requestIdRef.current;
      if (!silent) {
        setLoading(true);
        setError(false);
      }
      try {
        const response = await ticketsAPI.getClientInbox(JSON.parse(apiKey));
        if (requestId !== requestIdRef.current) return;
        setTickets(response.data);
        setMeta({ ...EMPTY_META, ...response.meta, counts: { ...EMPTY_COUNTS, ...response.meta?.counts } });
        setError(false);
      } catch {
        // Un fallo de la recarga en vivo no tapa los datos que ya se ven
        if (requestId === requestIdRef.current && !silent) setError(true);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [apiKey]
  );

  useEffect(() => {
    load();
  }, [load]);

  // organization.sync: ticket nuevo del portal, respuesta del cliente, ruteo
  useDebouncedRefresh(["clientTickets"], () => load({ silent: true }));

  const updateParams = useCallback(
    (changes, { keepPage = false } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(changes).forEach(([key, value]) => {
            if (value === "" || value === null || value === undefined) next.delete(key);
            else next.set(key, String(value));
          });
          if (!keepPage) next.delete("page");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setTab = useCallback((tab) => updateParams({ tab }), [updateParams]);
  const setFilter = useCallback((key, value) => updateParams({ [key]: value }), [updateParams]);
  const clearFilters = useCallback(
    () => updateParams({ q: "", priority: "", type: "", team: "", client: "" }),
    [updateParams]
  );
  const setPage = useCallback(
    (page) => updateParams({ page: page > 1 ? page : "" }, { keepPage: true }),
    [updateParams]
  );

  return {
    tickets,
    meta,
    counts: meta.counts,
    filters,
    loading,
    error,
    reload: load,
    setTab,
    setFilter,
    clearFilters,
    setPage,
  };
};

export default useClientInbox;
