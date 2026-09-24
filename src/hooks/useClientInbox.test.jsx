import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import useClientInbox, { readInboxFilters, toApiFilters } from "./useClientInbox";
import { ticketsAPI } from "../utils/api";

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  ticketsAPI: { getClientInbox: vi.fn() },
}));
const realtime = { registerRefresh: vi.fn(() => () => {}) };
vi.mock("../context/RealtimeContext", () => ({ useRealtime: () => realtime }));

const inboxPage = (rows, counts = {}) => ({
  data: rows,
  meta: { current_page: 1, last_page: 1, per_page: 25, total: rows.length, counts, client: null },
});

const setup = (url = "/client-tickets") =>
  renderHook(() => ({ inbox: useClientInbox(), location: useLocation() }), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>,
  });

describe("readInboxFilters / toApiFilters", () => {
  it("usa valores por defecto y descarta pestaña o página inválidas", () => {
    expect(readInboxFilters(new URLSearchParams("tab=nope&page=-2"))).toEqual({
      tab: "sin_asignar",
      q: "",
      priority: "",
      type: "",
      team: "",
      client: "",
      page: 1,
    });
  });

  it("traduce los parámetros de la URL a los de la API", () => {
    const filters = readInboxFilters(new URLSearchParams("tab=abiertos&client=5&team=2&q=%20vpn%20&priority=high&page=3"));
    expect(toApiFilters(filters)).toEqual({ tab: "abiertos", page: 3, q: "vpn", priority: "high", team_id: "2", client_id: "5" });
  });
});

describe("useClientInbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("carga con los filtros de la URL y expone filas, meta y contadores", async () => {
    ticketsAPI.getClientInbox.mockResolvedValue(inboxPage([{ id: 1, title: "VPN" }], { abiertos: 1 }));
    const { result } = setup("/client-tickets?tab=abiertos&client=5&q=vpn");

    await waitFor(() => expect(result.current.inbox.loading).toBe(false));
    expect(ticketsAPI.getClientInbox).toHaveBeenCalledWith({ tab: "abiertos", page: 1, q: "vpn", client_id: "5" });
    expect(result.current.inbox.tickets).toEqual([{ id: 1, title: "VPN" }]);
    expect(result.current.inbox.counts).toEqual({
      sin_asignar: 0,
      abiertos: 1,
      esperando_cliente: 0,
      resueltos: 0,
      todos: 0,
    });
  });

  it("cambiar un filtro lo guarda en la URL, conserva la pestaña y vuelve a la página 1", async () => {
    ticketsAPI.getClientInbox.mockResolvedValue(inboxPage([]));
    const { result } = setup("/client-tickets?tab=abiertos&page=3");
    await waitFor(() => expect(result.current.inbox.loading).toBe(false));

    act(() => result.current.inbox.setFilter("priority", "high"));

    const params = new URLSearchParams(result.current.location.search);
    expect(params.get("priority")).toBe("high");
    expect(params.get("tab")).toBe("abiertos");
    expect(params.has("page")).toBe(false);
    await waitFor(() =>
      expect(ticketsAPI.getClientInbox).toHaveBeenLastCalledWith({ tab: "abiertos", page: 1, priority: "high" })
    );
  });

  it("setTab, setPage y clearFilters actualizan la URL", async () => {
    ticketsAPI.getClientInbox.mockResolvedValue(inboxPage([]));
    const { result } = setup("/client-tickets?client=5&q=vpn");
    await waitFor(() => expect(result.current.inbox.loading).toBe(false));

    act(() => result.current.inbox.setPage(2));
    expect(new URLSearchParams(result.current.location.search).get("page")).toBe("2");

    act(() => result.current.inbox.setTab("resueltos"));
    let params = new URLSearchParams(result.current.location.search);
    expect(params.get("tab")).toBe("resueltos");
    expect(params.has("page")).toBe(false);

    act(() => result.current.inbox.clearFilters());
    params = new URLSearchParams(result.current.location.search);
    expect(params.has("client")).toBe(false);
    expect(params.has("q")).toBe(false);
    expect(params.get("tab")).toBe("resueltos");
  });

  it("ignora una respuesta vieja que llega tarde", async () => {
    let resolveOld;
    ticketsAPI.getClientInbox.mockImplementation((filters) =>
      filters.priority
        ? Promise.resolve(inboxPage([{ id: 2, title: "Nueva" }]))
        : new Promise((resolve) => (resolveOld = resolve))
    );
    const { result } = setup();

    act(() => result.current.inbox.setFilter("priority", "high"));
    await waitFor(() => expect(result.current.inbox.tickets).toEqual([{ id: 2, title: "Nueva" }]));

    await act(async () => resolveOld(inboxPage([{ id: 1, title: "Vieja" }])));
    expect(result.current.inbox.tickets).toEqual([{ id: 2, title: "Nueva" }]);
  });

  it("un error se expone y reload lo recupera", async () => {
    ticketsAPI.getClientInbox.mockRejectedValueOnce(new Error("500")).mockResolvedValue(inboxPage([{ id: 1 }]));
    const { result } = setup();

    await waitFor(() => expect(result.current.inbox.error).toBe(true));
    await act(async () => result.current.inbox.reload());
    expect(result.current.inbox.error).toBe(false);
    expect(result.current.inbox.tickets).toEqual([{ id: 1 }]);
  });

  it("clientTickets recarga en silencio y un fallo silencioso conserva los datos", async () => {
    ticketsAPI.getClientInbox.mockResolvedValue(inboxPage([{ id: 1 }]));
    const { result } = setup();
    await waitFor(() => expect(result.current.inbox.tickets).toEqual([{ id: 1 }]));

    ticketsAPI.getClientInbox.mockRejectedValue(new Error("500"));
    const refresh = realtime.registerRefresh.mock.calls.filter(([key]) => key === "clientTickets").at(-1)[1];
    act(() => refresh());

    await waitFor(() => expect(ticketsAPI.getClientInbox).toHaveBeenCalledTimes(2), { timeout: 2000 });
    expect(result.current.inbox.error).toBe(false);
    expect(result.current.inbox.loading).toBe(false);
    expect(result.current.inbox.tickets).toEqual([{ id: 1 }]);
  });
});
