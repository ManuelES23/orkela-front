import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PortalTicketDetailsPanel from "./PortalTicketDetailsPanel";

describe("PortalTicketDetailsPanel", () => {
  it("atribuye 'Tomado por' al agente del evento, no al asignado actual", async () => {
    render(
      <PortalTicketDetailsPanel
        ticket={{
          id: 1, type: "bug", priority: "medium", status: "in_progress", created_at: "2026-09-18T09:00:00Z",
          assigned_agent: { id: 3, name: "Lía Actual" }, team: null,
          events: [
            { id: 1, type: "created", actor_name: "Ana", agent_name: null, team_name: null, from_status: null, to_status: null, created_at: "2026-09-18T09:00:00Z" },
            { id: 2, type: "taken", actor_name: null, agent_name: "Beto Primero", team_name: null, from_status: null, to_status: null, created_at: "2026-09-18T09:10:00Z" },
          ],
        }}
      />
    );
    expect(await screen.findByText("Tomado por Beto Primero")).toBeInTheDocument();
    expect(screen.queryByText("Tomado por Lía Actual")).not.toBeInTheDocument();
    expect(screen.getByText("Creado por Ana")).toBeInTheDocument();
  });
});
