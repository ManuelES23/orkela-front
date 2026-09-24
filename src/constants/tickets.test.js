import { describe, it, expect } from "vitest";
import { TICKET_STATUS, TICKET_PRIORITY, TICKET_TYPE } from "./tickets";

describe("constantes de tickets", () => {
  it("define los cinco estados en el orden en que los recorre un ticket", () => {
    expect(Object.keys(TICKET_STATUS)).toEqual(["open", "in_progress", "pending", "resolved", "closed"]);
    expect(TICKET_STATUS.in_progress.label).toBe("En progreso");
    Object.values(TICKET_STATUS).forEach((status) => {
      expect(status.label).toEqual(expect.any(String));
      expect(status.badgeClass).toMatch(/border-/);
      expect(status.icon).toBeTruthy();
    });
  });

  it("define las cuatro prioridades de mayor a menor", () => {
    expect(Object.keys(TICKET_PRIORITY)).toEqual(["urgent", "high", "medium", "low"]);
    expect(TICKET_PRIORITY.urgent.label).toBe("Urgente");
    Object.values(TICKET_PRIORITY).forEach((priority) => {
      expect(priority.badgeClass).toEqual(expect.any(String));
    });
  });

  it("define los seis tipos con icono y color", () => {
    expect(Object.keys(TICKET_TYPE)).toEqual(["request", "bug", "question", "feature", "support", "other"]);
    expect(TICKET_TYPE.feature.label).toBe("Funcionalidad");
    Object.values(TICKET_TYPE).forEach((type) => {
      expect(type.icon).toBeTruthy();
      expect(type.iconClass).toMatch(/^text-/);
    });
  });
});

describe("constantes de ticket — claves de la fase 6", () => {
  it("cada estado tiene label, badgeClass, icon y dotClass", () => {
    expect(Object.keys(TICKET_STATUS).sort()).toEqual(["closed", "in_progress", "open", "pending", "resolved"]);
    for (const cfg of Object.values(TICKET_STATUS)) {
      expect(typeof cfg.label).toBe("string");
      expect(typeof cfg.badgeClass).toBe("string");
      expect(cfg.icon).toBeTruthy();
      expect(cfg.dotClass).toMatch(/^bg-/);
    }
  });

  it("cada prioridad tiene label, badgeClass y flagClass", () => {
    expect(Object.keys(TICKET_PRIORITY).sort()).toEqual(["high", "low", "medium", "urgent"]);
    for (const cfg of Object.values(TICKET_PRIORITY)) {
      expect(typeof cfg.label).toBe("string");
      expect(typeof cfg.badgeClass).toBe("string");
      expect(cfg.flagClass).toMatch(/^text-/);
    }
  });

  it("los tipos con vocabulario propio del portal lo declaran en portalLabel", () => {
    expect(TICKET_TYPE.bug.portalLabel).toBe("Reportar un problema");
    expect(TICKET_TYPE.feature.portalLabel).toBe("Pedir una función nueva");
    expect(TICKET_TYPE.question.portalLabel).toBeUndefined();
  });
});
