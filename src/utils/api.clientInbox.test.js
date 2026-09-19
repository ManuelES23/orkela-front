import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ticketsAPI } from "./api";

const ok = (body) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
const calledUrl = () => new URL(fetch.mock.calls.at(-1)[0], "http://localhost");

describe("API de Bandeja y Clientes", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(ok([]))));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getClientInboxTeams pide los equipos enrutables", async () => {
    fetch.mockResolvedValueOnce(ok([{ id: 4, name: "Soporte", color: "bg-indigo-500" }]));
    await expect(ticketsAPI.getClientInboxTeams()).resolves.toEqual([{ id: 4, name: "Soporte", color: "bg-indigo-500" }]);
    expect(calledUrl().pathname.endsWith("/client-tickets/teams")).toBe(true);
  });
});
