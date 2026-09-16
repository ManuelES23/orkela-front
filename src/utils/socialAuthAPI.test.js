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

  it("pide la intención de vincular con un nonce nuevo y devuelve la URL", async () => {
    localStorage.setItem("token", "sesion");
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ redirect_url: "https://api/redirect" }) });

    const url = await socialAuthAPI.linkIntent("microsoft");

    const [endpoint, options] = fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(url).toBe("https://api/redirect");
    expect(endpoint).toMatch(/\/auth\/social\/link-intent\/microsoft$/);
    expect(options.headers.Authorization).toBe("Bearer sesion");
    expect(body.nonce).toBe(sessionStorage.getItem("orkela_social_nonce"));
  });

  it("vincula con contraseña enviando ticket, nonce y contraseña, y guarda la sesión", async () => {
    sessionStorage.setItem("orkela_social_nonce", "n1");

    await socialAuthAPI.linkWithPassword("t1", "Clave123");

    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ ticket: "t1", nonce: "n1", password: "Clave123" });
    expect(localStorage.getItem("token")).toBe("tok");
    expect(sessionStorage.getItem("orkela_social_nonce")).toBeNull();
  });

  it("un 410 al vincular no cierra la sesión y borra el nonce", async () => {
    localStorage.setItem("token", "sesion");
    sessionStorage.setItem("orkela_social_nonce", "n1");
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 410,
      headers: new Headers(),
      json: async () => ({ code: "link_expired", message: "venció" }),
    });

    await expect(socialAuthAPI.link("t1")).rejects.toMatchObject({ status: 410, code: "link_expired" });

    expect(localStorage.getItem("token")).toBe("sesion");
    expect(sessionStorage.getItem("orkela_social_nonce")).toBeNull();
  });

  it("borra el nonce al vincular con éxito", async () => {
    localStorage.setItem("token", "sesion");
    sessionStorage.setItem("orkela_social_nonce", "n1");
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ provider: "google" }) });

    await socialAuthAPI.link("t1");

    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ ticket: "t1", nonce: "n1" });
    expect(sessionStorage.getItem("orkela_social_nonce")).toBeNull();
  });

  it("conserva el nonce si la contraseña es incorrecta para poder reintentar", async () => {
    sessionStorage.setItem("orkela_social_nonce", "n1");
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      headers: new Headers(),
      json: async () => ({ code: "invalid_password", message: "La contraseña no es correcta." }),
    });

    await expect(socialAuthAPI.linkWithPassword("t1", "mala")).rejects.toMatchObject({ code: "invalid_password" });

    expect(sessionStorage.getItem("orkela_social_nonce")).toBe("n1");
  });

  it("traduce los códigos de error de vinculación", async () => {
    const { getSocialLinkErrorMessage } = await import("./socialLinkErrors");
    const { APIError } = await import("./api");

    expect(getSocialLinkErrorMessage(new APIError("x", 409, { code: "last_login_method" }), "fallback"))
      .toMatch(/única forma de entrar/);
    expect(getSocialLinkErrorMessage(new APIError("x", 410, { code: "link_expired" }), "fallback")).toBe(
      "El enlace para conectar la cuenta venció. Vuelve a intentarlo desde Configuración."
    );
    expect(getSocialLinkErrorMessage(new APIError("x", 500, {}), "fallback")).toBe("fallback");
  });
});
