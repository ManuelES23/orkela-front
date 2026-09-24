import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import useClientsDirectory from "./useClientsDirectory";
import { clientsAPI } from "../utils/api";

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  clientsAPI: { getAll: vi.fn() },
}));
const realtime = { registerRefresh: vi.fn(() => () => {}) };
vi.mock("../context/RealtimeContext", () => ({ useRealtime: () => realtime }));

const acme = { id: 1, name: "Acme", status: "active", tickets_count: 3 };
const globex = { id: 2, name: "Globex", status: "active", tickets_count: 0 };
const directoryPage = (rows, meta = {}) => ({
  data: rows,
  meta: { current_page: 1, last_page: 1, per_page: 25, total: rows.length, ...meta },
});

describe("useClientsDirectory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("carga la primera página y 'loadMore' agrega la siguiente sin duplicar", async () => {
    clientsAPI.getAll
      .mockResolvedValueOnce(directoryPage([acme], { last_page: 2, total: 2 }))
      .mockResolvedValueOnce(directoryPage([acme, globex], { current_page: 2, last_page: 2, total: 2 }));
    const { result } = renderHook(() => useClientsDirectory());

    await waitFor(() => expect(result.current.clients).toEqual([acme]));
    expect(clientsAPI.getAll).toHaveBeenCalledWith({ q: "", page: 1 });
    expect(result.current.hasMore).toBe(true);

    await act(async () => result.current.loadMore());
    expect(clientsAPI.getAll).toHaveBeenLastCalledWith({ q: "", page: 2 });
    expect(result.current.clients).toEqual([acme, globex]);
    expect(result.current.hasMore).toBe(false);
  });

  it("la búsqueda se manda al servidor tras una pausa", async () => {
    clientsAPI.getAll.mockResolvedValue(directoryPage([acme]));
    const { result } = renderHook(() => useClientsDirectory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearch("  ana@acme "));
    expect(clientsAPI.getAll).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(clientsAPI.getAll).toHaveBeenLastCalledWith({ q: "ana@acme", page: 1 }));
  });

  it("upsertClient actualiza la fila conservando el conteo, o antepone una nueva", async () => {
    clientsAPI.getAll.mockResolvedValue(directoryPage([acme]));
    const { result } = renderHook(() => useClientsDirectory());
    await waitFor(() => expect(result.current.clients).toEqual([acme]));

    act(() => result.current.upsertClient({ id: 1, name: "Acme SA", status: "active" }));
    expect(result.current.clients).toEqual([{ ...acme, name: "Acme SA" }]);

    act(() => result.current.upsertClient(globex));
    expect(result.current.clients.map((c) => c.id)).toEqual([2, 1]);
    expect(clientsAPI.getAll).toHaveBeenCalledTimes(1);
  });

  it("'clients' recarga en silencio todas las páginas cargadas", async () => {
    clientsAPI.getAll
      .mockResolvedValueOnce(directoryPage([acme], { last_page: 2 }))
      .mockResolvedValueOnce(directoryPage([globex], { current_page: 2, last_page: 2 }));
    const { result } = renderHook(() => useClientsDirectory());
    await waitFor(() => expect(result.current.clients).toEqual([acme]));
    await act(async () => result.current.loadMore());

    clientsAPI.getAll.mockImplementation(({ page }) =>
      Promise.resolve(
        page === 1
          ? directoryPage([{ ...acme, name: "Acme SA" }], { last_page: 2 })
          : directoryPage([globex], { current_page: 2, last_page: 2 })
      )
    );
    const refresh = realtime.registerRefresh.mock.calls.filter(([key]) => key === "clients").at(-1)[1];
    act(() => refresh());

    await waitFor(() => expect(result.current.clients.map((c) => c.name)).toEqual(["Acme SA", "Globex"]), {
      timeout: 2000,
    });
    expect(result.current.loading).toBe(false);
  });

  it("un error se expone y reload lo recupera; loadMore propaga su error", async () => {
    clientsAPI.getAll
      .mockRejectedValueOnce(new Error("500"))
      .mockResolvedValueOnce(directoryPage([acme], { last_page: 2 }))
      .mockRejectedValueOnce(new Error("500"));
    const { result } = renderHook(() => useClientsDirectory());

    await waitFor(() => expect(result.current.error).toBe(true));
    await act(async () => result.current.reload());
    expect(result.current.error).toBe(false);

    await act(async () => {
      await expect(result.current.loadMore()).rejects.toThrow("500");
    });
    expect(result.current.loadingMore).toBe(false);
    expect(result.current.clients).toEqual([acme]);
  });
});
