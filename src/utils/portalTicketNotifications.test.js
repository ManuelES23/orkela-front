import { describe, it, expect } from "vitest";
import { applyTicketNotification } from "./portalTicketNotifications";

describe("applyTicketNotification", () => {
  it("updates the ticket status when the payload carries a new_status", () => {
    const ticket = { id: 1, status: "open", assigned_agent: null };
    const payload = { data: { new_status: "in_progress" } };

    const result = applyTicketNotification(ticket, payload);

    expect(result.status).toBe("in_progress");
  });

  it("merges the assigned agent into the ticket row so the list avatar updates live", () => {
    const ticket = { id: 1, status: "open", assigned_agent: null };
    const payload = {
      data: { new_status: "in_progress", assigned_agent: { id: 9, name: "Ana Soporte" } },
    };

    const result = applyTicketNotification(ticket, payload);

    expect(result.assigned_agent).toEqual({ id: 9, name: "Ana Soporte" });
  });

  it("merges the team into the ticket row when the payload carries one", () => {
    const ticket = { id: 1, status: "open", team: null };
    const payload = { data: { team: { id: 3, name: "Soporte N1", color: "blue" } } };

    const result = applyTicketNotification(ticket, payload);

    expect(result.team).toEqual({ id: 3, name: "Soporte N1", color: "blue" });
  });

  it("leaves fields the payload does not mention untouched", () => {
    const ticket = {
      id: 1,
      status: "open",
      assigned_agent: { id: 5, name: "Previo" },
      team: { id: 2, name: "N1" },
    };
    const payload = { data: { new_status: "resolved" } };

    const result = applyTicketNotification(ticket, payload);

    expect(result.assigned_agent).toEqual({ id: 5, name: "Previo" });
    expect(result.team).toEqual({ id: 2, name: "N1" });
  });

  it("does not mutate the original ticket object", () => {
    const ticket = { id: 1, status: "open", assigned_agent: null };
    const payload = { data: { new_status: "in_progress" } };

    applyTicketNotification(ticket, payload);

    expect(ticket.status).toBe("open");
  });
});
