import { describe, it, expect } from "vitest";
import { TICKET_STATUS, TICKET_PRIORITY, TICKET_TYPE } from "../../constants/tickets";
import {
  STATUS_LABELS,
  STATUS_DOT_COLOR,
  STATUS_BADGE_COLOR,
  STATUS_FILTERS,
  TYPE_LABELS,
  PRIORITY_LABELS,
} from "./ticketVocabulary";

describe("ticketVocabulary del portal", () => {
  it("toma etiquetas y colores de estado de las constantes compartidas", () => {
    for (const [status, cfg] of Object.entries(TICKET_STATUS)) {
      expect(STATUS_LABELS[status]).toBe(cfg.label);
      expect(STATUS_DOT_COLOR[status]).toBe(cfg.dotClass);
      expect(STATUS_BADGE_COLOR[status]).toBe(cfg.badgeClass);
    }
  });

  it("mantiene el orden del filtro de estado", () => {
    expect(STATUS_FILTERS.map((f) => f.value)).toEqual(["all", "open", "in_progress", "pending", "resolved", "closed"]);
    expect(STATUS_FILTERS[0].label).toBe("Todos");
    expect(STATUS_FILTERS[1].label).toBe(TICKET_STATUS.open.label);
  });

  it("usa la etiqueta del portal cuando existe y si no la del staff", () => {
    expect(TYPE_LABELS.bug).toBe("Reportar un problema");
    expect(TYPE_LABELS.feature).toBe("Pedir una función nueva");
    expect(TYPE_LABELS.question).toBe(TICKET_TYPE.question.label);
    expect(Object.keys(TYPE_LABELS).sort()).toEqual(Object.keys(TICKET_TYPE).sort());
  });

  it("toma las prioridades de las constantes compartidas", () => {
    for (const [priority, cfg] of Object.entries(TICKET_PRIORITY)) {
      expect(PRIORITY_LABELS[priority]).toBe(cfg.label);
    }
  });
});
