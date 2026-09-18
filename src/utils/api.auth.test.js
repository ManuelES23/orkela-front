import { describe, it, expect, vi, beforeEach } from "vitest";
import { authAPI, APIError, AUTH_EXPIRED_EVENT } from "./api";

const jsonResponse = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
  headers: { get: (name) => headers[name] ?? null },
});

const lastRequestBody = () => JSON.parse(fetch.mock.calls.at(-1)[1].body);
const lastRequestUrl = () => fetch.mock.calls.at(-1)[0];

describe("authAPI (auth flows)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("login envía remember y guarda el token", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { user: { id: 1 }, token: "t-1" }));

    await authAPI.login("ana@example.com", "Password1", true);

    expect(lastRequestUrl()).toMatch(/\/login$/);
    expect(lastRequestBody()).toEqual({ email: "ana@example.com", password: "Password1", remember: true });
    expect(localStorage.getItem("token")).toBe("t-1");
  });

  it("register no guarda token", async () => {
    fetch.mockResolvedValue(jsonResponse(202, { message: "Te enviamos un correo" }));

    const data = await authAPI.register("Ana", "ana@example.com", "Password1", "Password1");

    expect(data.message).toBe("Te enviamos un correo");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("verifyEmail envía los parámetros del enlace y guarda el token", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { user: { id: 1 }, token: "t-2" }));
    const params = { id: "1", hash: "h", expires: "123", signature: "s" };

    await authAPI.verifyEmail(params);

    expect(lastRequestUrl()).toMatch(/\/auth\/email\/verify$/);
    expect(lastRequestBody()).toEqual(params);
    expect(localStorage.getItem("token")).toBe("t-2");
  });

  it("resendVerification, forgotPassword y resetPassword llaman a sus endpoints", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { message: "ok" }));

    await authAPI.resendVerification("ana@example.com");
    expect(lastRequestUrl()).toMatch(/\/auth\/email\/resend$/);
    expect(lastRequestBody()).toEqual({ email: "ana@example.com" });

    await authAPI.forgotPassword("ana@example.com");
    expect(lastRequestUrl()).toMatch(/\/auth\/password\/forgot$/);

    const payload = { token: "tok", email: "ana@example.com", password: "Password1", password_confirmation: "Password1" };
    await authAPI.resetPassword(payload);
    expect(lastRequestUrl()).toMatch(/\/auth\/password\/reset$/);
    expect(lastRequestBody()).toEqual(payload);
  });

  it("expone code y retryAfter en APIError", async () => {
    fetch.mockResolvedValueOnce(jsonResponse(403, { code: "email_unverified", message: "Confirma" }));
    const unverified = await authAPI.login("ana@example.com", "Password1").catch((e) => e);
    expect(unverified).toBeInstanceOf(APIError);
    expect(unverified.code).toBe("email_unverified");

    fetch.mockResolvedValueOnce(jsonResponse(429, { message: "Too Many Attempts." }, { "Retry-After": "42" }));
    const throttled = await authAPI.login("ana@example.com", "Password1").catch((e) => e);
    expect(throttled.status).toBe(429);
    expect(throttled.retryAfter).toBe(42);
  });

  it("ante 401 con token guardado limpia la sesión y emite AUTH_EXPIRED_EVENT", async () => {
    localStorage.setItem("token", "viejo");
    localStorage.setItem("user", "{}");
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);
    fetch.mockResolvedValue(jsonResponse(401, { message: "Unauthenticated." }));

    await authAPI.getUser().catch(() => {});

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
  });
});
