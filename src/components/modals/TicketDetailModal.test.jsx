import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import TicketDetailModal from "./TicketDetailModal";
import { ticketsAPI, projectsAPI } from "../../utils/api";

vi.mock("../../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  ticketsAPI: {
    getById: vi.fn(),
    getComments: vi.fn(),
    takeTicket: vi.fn(),
    returnToInbox: vi.fn(),
    assignTicket: vi.fn(),
    assignToTeam: vi.fn(),
    getClientInboxTeams: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
    addComment: vi.fn(),
  },
  teamsAPI: { getMembers: vi.fn().mockResolvedValue([]), getAll: vi.fn().mockResolvedValue([]) },
  projectsAPI: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: 1 } }) }));
// Referencias estables, como en los providers reales (useCallback)
const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
const realtime = { registerRefresh: vi.fn(() => () => {}), unregisterRefresh: vi.fn(), subscribeChannel: vi.fn(() => () => {}), channelEpoch: 0 };
vi.mock("../../context/NotificationContext", () => ({ useNotification: () => notification }));
vi.mock("../../context/RealtimeContext", () => ({ useRealtime: () => realtime }));

const baseTicket = {
  id: 10,
  title: "No carga el portal",
  description: "desc",
  status: "open",
  priority: "medium",
  type: "request",
  team_id: 3,
  team: { id: 3, name: "Soporte" },
  created_at: new Date().toISOString(),
};

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};

const portalTicket = {
  ...baseTicket,
  id: 20,
  source: "client_portal",
  team_id: null,
  team: null,
  user: null,
  client: { id: 5, name: "Acme SA" },
  contact: { id: 8, name: "Ana Ruiz", email: "ana@acme.com", is_admin: true },
};

describe("TicketDetailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ticketsAPI.getById.mockReset();
    ticketsAPI.getComments.mockResolvedValue([]);
    ticketsAPI.getClientInboxTeams.mockResolvedValue([]);
    projectsAPI.getAll.mockResolvedValue([]);
  });

  it("conserva los permisos calculados después de tomar el ticket", async () => {
    ticketsAPI.getById
      .mockResolvedValueOnce({ ...baseTicket, is_in_inbox: true, can_take: true })
      .mockResolvedValueOnce({
        ...baseTicket,
        status: "in_progress",
        assigned_to: 1,
        is_in_inbox: false,
        can_change_status: true,
      });
    // take devuelve el modelo plano, sin can_change_status / is_in_inbox
    ticketsAPI.takeTicket.mockResolvedValue({ ...baseTicket, status: "in_progress", assigned_to: 1 });

    render(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 10 }} />);

    fireEvent.click(await screen.findByRole("button", { name: /tomar este ticket/i }));

    expect(await screen.findByText(/cambiar estado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /devolver al buzón/i })).toBeInTheDocument();
  });

  it("ignora la respuesta vieja al cambiar de ticket", async () => {
    const slow = deferred();
    ticketsAPI.getById.mockImplementation((id) =>
      id === 1 ? slow.promise : Promise.resolve({ ...baseTicket, id: 2, title: "Ticket nuevo" })
    );

    const { rerender } = render(
      <TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 1 }} />
    );
    rerender(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 2 }} />);

    expect(await screen.findByText("Ticket nuevo")).toBeInTheDocument();

    await act(async () => {
      slow.resolve({ ...baseTicket, id: 1, title: "Ticket viejo" });
    });

    expect(screen.queryByText("Ticket viejo")).not.toBeInTheDocument();
    expect(screen.getByText("Ticket nuevo")).toBeInTheDocument();
  });

  const teamSync = () => realtime.subscribeChannel.mock.calls.filter(([name]) => name === "team.3").at(-1)[2];

  it("muestra en vivo un comentario (también interno) que agrega otro miembro del equipo", async () => {
    ticketsAPI.getById.mockResolvedValue({ ...baseTicket });
    ticketsAPI.getComments.mockResolvedValue([]);
    render(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 10, team_id: 3 }} />);
    await screen.findByText("No carga el portal");

    ticketsAPI.getComments.mockResolvedValue([
      { id: 5, content: "Nota interna del equipo", is_internal: true, user: { id: 2, name: "Bea" }, created_at: new Date().toISOString() },
    ]);
    await act(async () => teamSync()({ team_id: 3, entity: "ticket", action: "comment_added", ticket_id: 10 }));

    expect(await screen.findByText("Nota interna del equipo")).toBeInTheDocument();
    expect(notification.success).not.toHaveBeenCalled();
  });

  it("ignora team.sync de otros tickets y se cierra si el suyo se borra", async () => {
    ticketsAPI.getById.mockResolvedValue({ ...baseTicket });
    const onClose = vi.fn();
    render(<TicketDetailModal isOpen onClose={onClose} ticket={{ id: 10, team_id: 3 }} />);
    await screen.findByText("No carga el portal");
    const calls = ticketsAPI.getById.mock.calls.length;

    await act(async () => teamSync()({ team_id: 3, entity: "ticket", action: "updated", ticket_id: 99 }));
    expect(ticketsAPI.getById.mock.calls.length).toBe(calls);

    await act(async () => teamSync()({ team_id: 3, entity: "ticket", action: "deleted", ticket_id: 10 }));
    expect(onClose).toHaveBeenCalled();
    expect(notification.info).toHaveBeenCalledWith("Este ticket ya no existe o no tienes acceso a él");
  });

  it("abierto desde una notificación: si el ticket ya no existe avisa y se cierra", async () => {
    ticketsAPI.getById.mockRejectedValue(Object.assign(new Error("No encontrado"), { status: 404 }));
    ticketsAPI.getComments.mockResolvedValue([]);
    const onClose = vi.fn();
    render(<TicketDetailModal isOpen onClose={onClose} ticket={{ id: 77 }} />);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(notification.info).toHaveBeenCalledWith("Este ticket ya no existe o no tienes acceso a él");
  });

  it("ticket del portal: muestra cliente y contacto y que está pendiente de enrutar", async () => {
    ticketsAPI.getById.mockResolvedValue({ ...portalTicket });
    render(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 20 }} />);

    expect(await screen.findByText("Acme SA")).toBeInTheDocument();
    expect(screen.getByText("Cliente / Contacto")).toBeInTheDocument();
    expect(screen.getByText(/Ana Ruiz/)).toBeInTheDocument();
    expect(screen.getByText(/ana@acme\.com/)).toBeInTheDocument();
    expect(screen.queryByText("Creado por")).not.toBeInTheDocument();
    expect(screen.getByText("Sin equipo — pendiente de enrutar")).toBeInTheDocument();
  });

  it("con can_route asigna el ticket a un equipo", async () => {
    ticketsAPI.getClientInboxTeams.mockResolvedValue([
      { id: 3, name: "Soporte" },
      { id: 4, name: "Facturación" },
    ]);
    ticketsAPI.getById
      .mockResolvedValueOnce({ ...portalTicket, can_route: true })
      .mockResolvedValueOnce({ ...portalTicket, can_route: true, team_id: 4, team: { id: 4, name: "Facturación" } });
    ticketsAPI.assignToTeam.mockResolvedValue({});
    const onUpdate = vi.fn();
    render(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 20 }} onUpdate={onUpdate} />);

    const select = await screen.findByLabelText("Asignar a equipo");
    await screen.findByRole("option", { name: "Facturación" });
    fireEvent.change(select, { target: { value: "4" } });

    await waitFor(() => expect(ticketsAPI.assignToTeam).toHaveBeenCalledWith(20, 4));
    expect(await screen.findByLabelText("Cambiar equipo")).toHaveValue("4");
    expect(onUpdate).toHaveBeenCalled();
  });

  it("sin can_route no muestra el control de equipo", async () => {
    ticketsAPI.getById.mockResolvedValue({ ...portalTicket, team_id: 3, team: { id: 3, name: "Soporte" } });
    render(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 20 }} />);

    expect(await screen.findByText("Soporte")).toBeInTheDocument();
    expect(screen.queryByLabelText("Asignar a equipo")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Cambiar equipo")).not.toBeInTheDocument();
    expect(ticketsAPI.getClientInboxTeams).not.toHaveBeenCalled();
  });

  it("con can_edit_classification cambia prioridad, tipo y proyecto", async () => {
    projectsAPI.getAll.mockResolvedValue([{ id: 9, name: "Web" }]);
    ticketsAPI.getById.mockResolvedValue({ ...portalTicket, can_edit_classification: true, project_id: null });
    ticketsAPI.update.mockResolvedValue({});
    render(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 20 }} />);

    fireEvent.change(await screen.findByLabelText("Prioridad"), { target: { value: "urgent" } });
    await waitFor(() => expect(ticketsAPI.update).toHaveBeenCalledWith(20, { priority: "urgent" }));

    await waitFor(() => expect(screen.getByLabelText("Tipo")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "bug" } });
    await waitFor(() => expect(ticketsAPI.update).toHaveBeenCalledWith(20, { type: "bug" }));

    await screen.findByRole("option", { name: "Web" });
    await waitFor(() => expect(screen.getByLabelText("Proyecto")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Proyecto"), { target: { value: "9" } });
    await waitFor(() => expect(ticketsAPI.update).toHaveBeenCalledWith(20, { project_id: 9 }));
  });

  it("sin can_edit_classification no hay selectores de clasificación", async () => {
    ticketsAPI.getById.mockResolvedValue({ ...portalTicket });
    render(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 20 }} />);

    await screen.findByText("Acme SA");
    expect(screen.queryByLabelText("Prioridad")).not.toBeInTheDocument();
    expect(projectsAPI.getAll).not.toHaveBeenCalled();
  });

  it("con can_change_status reabre un ticket cerrado", async () => {
    ticketsAPI.getById.mockResolvedValue({ ...portalTicket, status: "closed", can_change_status: true });
    ticketsAPI.update.mockResolvedValue({});
    render(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 20 }} />);

    expect(await screen.findByText("Reabrir o cambiar estado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abierto" }));

    await waitFor(() => expect(ticketsAPI.update).toHaveBeenCalledWith(20, { status: "open" }));
  });

  it("sin can_change_status no hay botones de estado", async () => {
    ticketsAPI.getById.mockResolvedValue({ ...portalTicket });
    render(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 20 }} />);

    await screen.findByText("Acme SA");
    expect(screen.queryByText(/cambiar estado/i)).not.toBeInTheDocument();
  });

  it("nota interna según can_comment_internal y aviso de correo al cliente", async () => {
    ticketsAPI.getById.mockResolvedValue({ ...portalTicket, can_comment_internal: true });
    render(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 20 }} />);

    expect(await screen.findByRole("note")).toHaveTextContent("Este comentario se enviará al cliente por correo.");

    fireEvent.click(screen.getByLabelText(/comentario interno/i));

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("sin can_comment_internal no hay nota interna, pero sí el aviso de correo", async () => {
    ticketsAPI.getById.mockResolvedValue({ ...portalTicket });
    render(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 20 }} />);

    expect(await screen.findByRole("note")).toBeInTheDocument();
    expect(screen.queryByLabelText(/comentario interno/i)).not.toBeInTheDocument();
  });

  it("al cambiar de ticket no pinta el contenido del anterior bajo el título nuevo", async () => {
    const globex = deferred();
    ticketsAPI.getById.mockImplementation((id) =>
      id === 20 ? Promise.resolve({ ...portalTicket }) : globex.promise
    );
    ticketsAPI.getComments.mockImplementation((id) =>
      Promise.resolve(
        id === 20
          ? [{ id: 1, content: "Comentario de Acme", is_internal: false, user: { id: 2, name: "Bea" }, created_at: new Date().toISOString() }]
          : []
      )
    );
    const { rerender } = render(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 20 }} />);
    expect(await screen.findByText("Acme SA")).toBeInTheDocument();
    expect(screen.getByText("Comentario de Acme")).toBeInTheDocument();

    rerender(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 31 }} />);

    expect(screen.getByText("Ticket #31")).toBeInTheDocument();
    expect(screen.queryByText("Acme SA")).not.toBeInTheDocument();
    expect(screen.queryByText("Comentario de Acme")).not.toBeInTheDocument();
    expect(screen.queryByText("No se pudo cargar el ticket")).not.toBeInTheDocument();

    await act(async () => {
      globex.resolve({ ...portalTicket, id: 31, client: { id: 6, name: "Globex" } });
    });
    expect(await screen.findByText("Globex")).toBeInTheDocument();
    expect(screen.queryByText("Acme SA")).not.toBeInTheDocument();
  });

  it("una recarga silenciosa del mismo ticket no lo vacía", async () => {
    ticketsAPI.getById.mockResolvedValue({ ...portalTicket });
    render(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 20 }} />);
    await screen.findByText("Acme SA");
    const refresh = realtime.registerRefresh.mock.calls.filter(([key]) => key === "ticketDetail-20").at(-1)[1];
    const slow = deferred();
    ticketsAPI.getById.mockReturnValue(slow.promise);

    act(() => {
      refresh();
    });

    expect(screen.getByText("Acme SA")).toBeInTheDocument();
    await act(async () => slow.resolve({ ...portalTicket }));
  });

  it("si no se pueden cargar los equipos, avisa con un error", async () => {
    ticketsAPI.getClientInboxTeams.mockRejectedValue(new Error("boom"));
    ticketsAPI.getById.mockResolvedValue({ ...portalTicket, can_route: true });
    render(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 20 }} />);

    await waitFor(() => expect(notification.error).toHaveBeenCalledWith("No se pudieron cargar los equipos"));
  });

  it("si no se pueden cargar los proyectos, avisa con un error", async () => {
    projectsAPI.getAll.mockRejectedValue(new Error("boom"));
    ticketsAPI.getById.mockResolvedValue({ ...portalTicket, can_edit_classification: true });
    render(<TicketDetailModal isOpen onClose={vi.fn()} ticket={{ id: 20 }} />);

    await waitFor(() => expect(notification.error).toHaveBeenCalledWith("No se pudieron cargar los proyectos"));
  });
});
