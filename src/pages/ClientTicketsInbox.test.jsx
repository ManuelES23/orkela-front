import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ClientTicketsInbox from "./ClientTicketsInbox";
import { ticketsAPI, teamsAPI } from "../utils/api";

const notification = { success: vi.fn(), error: vi.fn() };

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  ticketsAPI: { getClientInbox: vi.fn() },
  teamsAPI: { getAll: vi.fn() },
}));
vi.mock("../components/layout/Layout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../context/NotificationContext", () => ({ useNotification: () => notification }));
const realtime = { registerRefresh: vi.fn(() => () => {}) };
vi.mock("../context/RealtimeContext", () => ({ useRealtime: () => realtime }));

describe("ClientTicketsInbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    teamsAPI.getAll.mockResolvedValue([]);
  });

  it("ignora la respuesta vieja al marcar 'Solo sin asignar'", async () => {
    let resolveAll;
    ticketsAPI.getClientInbox.mockImplementation((filters) =>
      filters.unassigned
        ? Promise.resolve([{ id: 2, title: "Sin asignar", status: "open", team_id: null }])
        : new Promise((r) => (resolveAll = r))
    );

    render(
      <MemoryRouter>
        <ClientTicketsInbox />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText("Solo sin asignar"));
    expect(await screen.findByText("Sin asignar")).toBeInTheDocument();

    await act(async () => {
      resolveAll([{ id: 1, title: "Asignado", status: "open", team_id: 3, team: { name: "Soporte" } }]);
    });

    expect(screen.queryByText("Asignado")).not.toBeInTheDocument();
    expect(screen.getByText("Sin asignar")).toBeInTheDocument();
  });

  it("se recarga en vivo con organization.sync (clave clientTickets)", async () => {
    ticketsAPI.getClientInbox.mockResolvedValue([{ id: 1, title: "Primero", status: "open", team_id: null }]);
    render(
      <MemoryRouter>
        <ClientTicketsInbox />
      </MemoryRouter>
    );
    await screen.findByText("Primero");

    ticketsAPI.getClientInbox.mockResolvedValue([
      { id: 2, title: "Nuevo del portal", status: "open", team_id: null },
      { id: 1, title: "Primero", status: "open", team_id: null },
    ]);
    const refresh = realtime.registerRefresh.mock.calls.filter(([key]) => key === "clientTickets").at(-1)[1];
    await act(async () => refresh());

    expect(await screen.findByText("Nuevo del portal")).toBeInTheDocument();
  });
});
