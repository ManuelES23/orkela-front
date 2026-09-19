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
