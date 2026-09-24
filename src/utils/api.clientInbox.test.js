import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ticketsAPI, clientsAPI } from "./api";

const page = { data: [], meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 } };
const ok = (body) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
const calledUrl = () => new URL(fetch.mock.calls.at(-1)[0], "http://localhost");

describe("API de Bandeja y Clientes", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(ok(page))));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getClientInbox manda solo los filtros con valor y devuelve { data, meta }", async () => {
    const result = await ticketsAPI.getClientInbox({
      tab: "abiertos",
      q: "vpn",
      priority: "",
      client_id: 7,
      team_id: null,
      unassigned: true,
      page: 2,
    });

    const url = calledUrl();
    expect(url.pathname.endsWith("/client-tickets")).toBe(true);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      tab: "abiertos",
      q: "vpn",
      client_id: "7",
      unassigned: "1",
      page: "2",
    });
    expect(result).toEqual(page);
  });

  it("getClientInbox sin filtros no agrega query string", async () => {
    await ticketsAPI.getClientInbox();
    expect(calledUrl().search).toBe("");
  });

  // Fase 1: sin cambios
  it("getClientInboxTeams pide los equipos enrutables", async () => {
    fetch.mockResolvedValueOnce(ok([{ id: 4, name: "Soporte", color: "bg-indigo-500" }]));
    await expect(ticketsAPI.getClientInboxTeams()).resolves.toEqual([{ id: 4, name: "Soporte", color: "bg-indigo-500" }]);
    expect(calledUrl().pathname.endsWith("/client-tickets/teams")).toBe(true);
  });

  it("clientsAPI.getAll manda q, status y page y omite los vacíos", async () => {
    await clientsAPI.getAll({ q: "", page: 1 });
    expect(Object.fromEntries(calledUrl().searchParams)).toEqual({ page: "1" });

    await clientsAPI.getAll({ q: "ana", status: "active", page: 2 });
    expect(Object.fromEntries(calledUrl().searchParams)).toEqual({ q: "ana", status: "active", page: "2" });
  });
});
