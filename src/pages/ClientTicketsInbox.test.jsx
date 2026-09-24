import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ClientTicketsInbox from "./ClientTicketsInbox";
import { ticketsAPI } from "../utils/api";

const notification = { success: vi.fn(), error: vi.fn() };
vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  ticketsAPI: { getClientInbox: vi.fn(), getClientInboxTeams: vi.fn(), assignToTeam: vi.fn() },
}));
vi.mock("../components/layout/Layout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../context/NotificationContext", () => ({ useNotification: () => notification }));
const realtime = { registerRefresh: vi.fn(() => () => {}) };
vi.mock("../context/RealtimeContext", () => ({ useRealtime: () => realtime }));
vi.mock("../components/modals/TicketDetailModal", () => ({
  default: ({ isOpen, ticket, onClose }) =>
    isOpen ? (
      <div role='dialog' aria-label='Detalle del ticket'>
        <p>Detalle {ticket?.id}</p>
        <button onClick={onClose}>Cerrar detalle</button>
      </div>
    ) : null,
}));

describe("ClientTicketsInbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ticketsAPI.getClientInboxTeams.mockResolvedValue([]);
    ticketsAPI.assignToTeam.mockResolvedValue({});
  });

  it("ignora la respuesta vieja al marcar 'Solo sin asignar'", async () => {
    let resolveAll;
    ticketsAPI.getClientInbox.mockImplementation((filters) =>
      filters.unassigned
        ? Promise.resolve({ data: [{ id: 2, title: "Sin asignar", status: "open", team_id: null }], meta: {} })
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
      resolveAll({ data: [{ id: 1, title: "Asignado", status: "open", team_id: 3, team: { name: "Soporte" } }], meta: {} });
    });

    expect(screen.queryByText("Asignado")).not.toBeInTheDocument();
    expect(screen.getByText("Sin asignar")).toBeInTheDocument();
  });

  it("se recarga en vivo con organization.sync (clave clientTickets)", async () => {
    ticketsAPI.getClientInbox.mockResolvedValue({ data: [{ id: 1, title: "Primero", status: "open", team_id: null }], meta: {} });
    render(
      <MemoryRouter>
        <ClientTicketsInbox />
      </MemoryRouter>
    );
    await screen.findByText("Primero");

    ticketsAPI.getClientInbox.mockResolvedValue({
      data: [
        { id: 2, title: "Nuevo del portal", status: "open", team_id: null },
        { id: 1, title: "Primero", status: "open", team_id: null },
      ],
      meta: {},
    });
    const refresh = realtime.registerRefresh.mock.calls.filter(([key]) => key === "clientTickets").at(-1)[1];
    await act(async () => refresh());

    expect(await screen.findByText("Nuevo del portal")).toBeInTheDocument();
  });

  const portalTicket = {
    id: 7,
    title: "Sin luz en la oficina",
    status: "open",
    team_id: null,
    client: { name: "Acme SA" },
    contact: { name: "Ana", is_admin: true },
  };

  it("abre el detalle al hacer clic en la fila", async () => {
    ticketsAPI.getClientInbox.mockResolvedValue({ data: [portalTicket], meta: {} });
    render(
      <MemoryRouter>
        <ClientTicketsInbox />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: /sin luz en la oficina/i }));

    expect(screen.getByText("Detalle 7")).toBeInTheDocument();
  });

  it("abre el detalle con Enter y con Espacio", async () => {
    ticketsAPI.getClientInbox.mockResolvedValue({ data: [portalTicket], meta: {} });
    render(
      <MemoryRouter>
        <ClientTicketsInbox />
      </MemoryRouter>
    );
    const row = await screen.findByRole("button", { name: /sin luz en la oficina/i });

    fireEvent.keyDown(row, { key: "Enter" });
    expect(screen.getByText("Detalle 7")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar detalle" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.keyDown(row, { key: " " });
    expect(screen.getByText("Detalle 7")).toBeInTheDocument();
  });

  it("abre el ticket del enlace ?ticket=ID", async () => {
    ticketsAPI.getClientInbox.mockResolvedValue({ data: [portalTicket], meta: {} });
    render(
      <MemoryRouter initialEntries={["/client-tickets?ticket=7"]}>
        <ClientTicketsInbox />
      </MemoryRouter>
    );

    expect(await screen.findByText("Detalle 7")).toBeInTheDocument();
  });

  it("el selector de equipo de la fila lista los equipos de la organización y no abre el detalle", async () => {
    ticketsAPI.getClientInboxTeams.mockResolvedValue([{ id: 3, name: "Soporte" }]);
    ticketsAPI.getClientInbox.mockResolvedValue({ data: [portalTicket], meta: {} });
    render(
      <MemoryRouter>
        <ClientTicketsInbox />
      </MemoryRouter>
    );

    const placeholder = await screen.findByText("Asignar a equipo...");
    fireEvent.mouseDown(placeholder);
    fireEvent.click(await screen.findByText("Soporte"));

    await waitFor(() => expect(ticketsAPI.assignToTeam).toHaveBeenCalledWith(7, 3));
    expect(notification.success).toHaveBeenCalledWith("Ticket asignado al equipo");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("si asignar al equipo falla, avisa con un error y no recarga la lista", async () => {
    ticketsAPI.getClientInboxTeams.mockResolvedValue([{ id: 3, name: "Soporte" }]);
    ticketsAPI.getClientInbox.mockResolvedValue({ data: [portalTicket], meta: {} });
    ticketsAPI.assignToTeam.mockRejectedValue(new Error("boom"));
    render(
      <MemoryRouter>
        <ClientTicketsInbox />
      </MemoryRouter>
    );

    fireEvent.mouseDown(await screen.findByText("Asignar a equipo..."));
    fireEvent.click(await screen.findByText("Soporte"));

    await waitFor(() => expect(notification.error).toHaveBeenCalledWith("No se pudo asignar el ticket"));
    expect(notification.success).not.toHaveBeenCalled();
    expect(ticketsAPI.getClientInbox).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
