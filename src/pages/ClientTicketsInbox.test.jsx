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
});
