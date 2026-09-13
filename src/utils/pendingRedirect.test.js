import { describe, it, expect, beforeEach } from "vitest";
import { setPendingRedirect, consumePendingRedirect } from "./pendingRedirect";

describe("pendingRedirect", () => {
  beforeEach(() => localStorage.clear());

  it("guarda y consume un destino una sola vez", () => {
    setPendingRedirect("/accept-invitation/abc");

    expect(consumePendingRedirect()).toBe("/accept-invitation/abc");
    expect(consumePendingRedirect()).toBeNull();
  });

  it("no aplica un destino vencido", () => {
    setPendingRedirect("/accept-invitation/abc", { ttlMs: -1 });

    expect(consumePendingRedirect()).toBeNull();
  });

  it("no aplica un destino atado a otro email", () => {
    setPendingRedirect("/accept-invitation/abc", { email: "ana@example.com" });

    expect(consumePendingRedirect("otro@example.com")).toBeNull();
  });

  it("aplica un destino atado al email cuando coincide", () => {
    setPendingRedirect("/accept-invitation/abc", { email: "ana@example.com" });

    expect(consumePendingRedirect("ana@example.com")).toBe("/accept-invitation/abc");
  });

  it("aplica un destino sin email guardado sin importar quién inicia sesión", () => {
    setPendingRedirect("/accept-invitation/abc");

    expect(consumePendingRedirect("cualquiera@example.com")).toBe("/accept-invitation/abc");
  });

  it("acepta el formato legado (string plano)", () => {
    localStorage.setItem("socialReturnTo", "/accept-invitation/legacy");

    expect(consumePendingRedirect("ana@example.com")).toBe("/accept-invitation/legacy");
  });

  it("no guarda nada si no hay destino", () => {
    setPendingRedirect(null);

    expect(consumePendingRedirect()).toBeNull();
  });
});
