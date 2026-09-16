import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { socialAuthAPI } from "./api";

describe("socialAuthAPI nonce", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ token: "tok", user: { id: 1 } }) }))
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it("guarda un nonce por pestaña y lo manda al iniciar y al canjear el ticket", async () => {
    const url = socialAuthAPI.redirectUrl("google");
    const nonce = new URL(url).searchParams.get("nonce");

    expect(nonce).toMatch(/^[0-9a-f]{48}$/);
    expect(sessionStorage.getItem("orkela_social_nonce")).toBe(nonce);

    await socialAuthAPI.exchange("ticket-1");

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toEqual({ ticket: "ticket-1", nonce });
    // Canjeado: el nonce ya no sirve para otro ticket.
    expect(sessionStorage.getItem("orkela_social_nonce")).toBeNull();
  });

  it("genera un nonce distinto en cada inicio de login", () => {
    const a = new URL(socialAuthAPI.redirectUrl("google")).searchParams.get("nonce");
    const b = new URL(socialAuthAPI.redirectUrl("microsoft")).searchParams.get("nonce");

    expect(a).not.toBe(b);
  });
});
