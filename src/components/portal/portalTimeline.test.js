import { describe, it, expect } from "vitest";
import { buildPortalTimeline, describeEvent } from "./portalTimeline";

const event = (overrides) => ({
  id: 1, type: "created", actor_name: null, agent_name: null, team_name: null,
  from_status: null, to_status: null, created_at: "2026-09-18T09:00:00Z", ...overrides,
});

describe("describeEvent", () => {
  it("nombra a quien realmente hizo cada paso", () => {
    expect(describeEvent(event({ type: "created", actor_name: "Ana" }))).toBe("Creado por Ana");
    expect(describeEvent(event({ type: "routed_to_team", team_name: "Soporte N1" }))).toBe("Enviado al equipo Soporte N1");
    expect(describeEvent(event({ type: "taken", agent_name: "Beto" }))).toBe("Tomado por Beto");
    expect(describeEvent(event({ type: "assigned", agent_name: "Lía" }))).toBe("Asignado a Lía");
    expect(describeEvent(event({ type: "returned_to_inbox" }))).toBe("Devuelto a la cola del equipo");
    expect(describeEvent(event({ type: "status_changed", from_status: "in_progress", to_status: "resolved" }))).toBe("En progreso → Resuelto");
    expect(describeEvent(event({ type: "reopened_by_client", actor_name: "Ana" }))).toBe("Reabierto por Ana");
    expect(describeEvent(event({ type: "resolution_confirmed", actor_name: "Ana" }))).toBe("Solución confirmada por Ana");
    expect(describeEvent(event({ type: "desconocido" }))).toBeNull();
  });
});

describe("buildPortalTimeline", () => {
  it("usa los eventos en su orden y antepone 'Creado' si falta", () => {
    const steps = buildPortalTimeline({
      created_at: "2026-09-18T08:59:00Z",
      events: [event({ id: 7, type: "taken", agent_name: "Beto", created_at: "2026-09-18T09:20:00Z" })],
    });
    expect(steps.map((s) => s.label)).toEqual(["Creado", "Tomado por Beto"]);
  });

  it("sin eventos cae a las fechas del ticket sin inventar agente", () => {
    const steps = buildPortalTimeline({
      created_at: "2026-09-18T09:00:00Z",
      resolved_at: "2026-09-18T10:00:00Z",
      closed_at: null,
      assigned_agent: { id: 3, name: "Agente actual" },
      events: [],
    });
    expect(steps.map((s) => s.label)).toEqual(["Creado", "Resuelto"]);
  });
});
