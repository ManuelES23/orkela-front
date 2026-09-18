import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { authAPI, profileAPI, invitationsAPI, APIError } from "./api";
import { adminUsersAPI } from "./adminAPI";
import settingsAPI from "./settingsAPI";
import { portalAPI, PortalAPIError } from "./portalApi";

const htmlResponse = (status) =>
  new Response("<!DOCTYPE html><html><body>Bad Gateway</body></html>", {
    status,
    headers: { "Content-Type": "text/html" },
  });

describe("respuestas no JSON de la API", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("request() convierte un 502 en HTML en APIError con mensaje amigable", async () => {
    fetch.mockResolvedValue(htmlResponse(502));

    const err = await authAPI.getUser().catch((e) => e);

    expect(err).toBeInstanceOf(APIError);
    expect(err.status).toBe(502);
    expect(err.message).not.toMatch(/Unexpected token|JSON/);
    expect(err.message).toMatch(/servidor/i);
  });

  it("request() acepta un 204 sin cuerpo", async () => {
    fetch.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(profileAPI.deleteAvatar()).resolves.toEqual({});
  });

  it("request() conserva el message del backend en errores JSON", async () => {
    fetch.mockResolvedValue(
      new Response(JSON.stringify({ message: "Ya es miembro" }), { status: 422 })
    );

    await expect(authAPI.getUser()).rejects.toMatchObject({ status: 422, message: "Ya es miembro" });
  });

  it("uploadAvatar muestra un mensaje amigable ante un 413 en HTML", async () => {
    fetch.mockResolvedValue(htmlResponse(413));

    const err = await profileAPI.uploadAvatar(new File(["x"], "a.png")).catch((e) => e);

    expect(err.message).toMatch(/demasiado grande/i);
    expect(err.status).toBe(413);
  });

  it("publicRequest no expone el SyntaxError", async () => {
    fetch.mockResolvedValue(htmlResponse(500));

    const err = await invitationsAPI.getInfo("tok").catch((e) => e);

    expect(err.message).not.toMatch(/Unexpected token|JSON/);
    expect(err.status).toBe(500);
  });

  it("adminAPI y settingsAPI no exponen el SyntaxError", async () => {
    fetch.mockResolvedValue(htmlResponse(502));

    const adminErr = await adminUsersAPI.getAll().catch((e) => e);
    const settingsErr = await settingsAPI.getMailConfig().catch((e) => e);

    expect(adminErr.message).toMatch(/servidor/i);
    expect(settingsErr.message).toMatch(/servidor/i);
  });

  it("portalRequest lanza PortalAPIError con mensaje amigable", async () => {
    fetch.mockResolvedValue(htmlResponse(502));

    const err = await portalAPI.getOrgInfo("acme").catch((e) => e);

    expect(err).toBeInstanceOf(PortalAPIError);
    expect(err.status).toBe(502);
    expect(err.message).toMatch(/servidor/i);
  });
});
