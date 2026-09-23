import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PortalInboxScreen from "./PortalInboxScreen";
import { portalAPI, clearPortalToken } from "../../utils/portalApi";
import { getPortalEcho } from "../../utils/echo";

vi.mock("../../utils/portalApi", () => ({
  portalAPI: {
    me: vi.fn(),
    getTicket: vi.fn(),
    addComment: vi.fn(),
    createTicket: vi.fn(),
    logout: vi.fn(),
  },
  getPortalToken: vi.fn(() => "portal-token"),
  clearPortalToken: vi.fn(),
  getPortalOrgSlug: vi.fn(() => "acme"),
}));

vi.mock("../../utils/echo", () => ({
  getPortalEcho: vi.fn(),
  disconnectPortalEcho: vi.fn(),
  updatePortalEchoAuth: vi.fn(),
}));

const ticket1 = {
  id: 1,
  title: "Ticket seleccionado",
  status: "open",
  type: "bug",
  assigned_agent: null,
  team: null,
  has_unread: false,
};

const ticket2 = {
  id: 2,
  title: "Ticket en la lista",
  status: "open",
  type: "bug",
  assigned_agent: null,
  team: null,
  has_unread: false,
};

const ticket1Detail = {
  ...ticket1,
  description: "Descripción",
  comments: [],
  created_at: "2026-01-01T00:00:00Z",
};

// Captura el callback pasado a `channel.listen(".client-notification", cb)`
// para poder simular, desde el test, un evento entrante del websocket sin
// levantar una conexión Reverb real.
let clientNotificationListener;
let echoMock;

const setUpEchoMock = () => {
  clientNotificationListener = null;
  const channel = {
    listen: vi.fn((eventName, callback) => {
      if (eventName === ".client-notification") {
        clientNotificationListener = callback;
      }
      return channel;
    }),
  };
  echoMock = {
    private: vi.fn(() => channel),
    leave: vi.fn(),
  };
  getPortalEcho.mockReturnValue(echoMock);
};

describe("PortalInboxScreen realtime echo handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUpEchoMock();
    portalAPI.me.mockResolvedValue({
      contact: { id: 55 },
      organization: { name: "Acme" },
      tickets: [ticket1, ticket2],
    });
    portalAPI.getTicket.mockImplementation((id) =>
      id === 1 ? Promise.resolve(ticket1Detail) : Promise.resolve({ ...ticket2 })
    );
  });

  const renderScreen = () =>
    render(
      <MemoryRouter initialEntries={["/portal/tickets/1"]}>
        <Routes>
          <Route path="/portal/tickets/:id" element={<PortalInboxScreen />} />
        </Routes>
      </MemoryRouter>
    );

  it("merges an assigned_agent pushed for a non-selected ticket into its list row, live", async () => {
    renderScreen();

    await screen.findByText("Ticket en la lista");
    // La suscripción se hace en un efecto posterior al render de la lista:
    // bajo carga, el texto puede aparecer antes de que el listener exista.
    await waitFor(() => expect(clientNotificationListener).toBeTypeOf("function"));
    portalAPI.getTicket.mockClear();

    act(() => {
      clientNotificationListener({
        type: "ticket_assigned",
        data: {
          ticket_id: ticket2.id,
          new_status: "in_progress",
          assigned_agent: { id: 9, name: "Ana Soporte" },
        },
      });
    });

    expect(await screen.findByRole("img", { name: "Ana Soporte" })).toBeInTheDocument();
    // El ticket afectado no es el seleccionado — la fila se actualiza con el
    // dato que ya trae el evento, sin necesidad de un refetch.
    expect(portalAPI.getTicket).not.toHaveBeenCalledWith(ticket2.id);
  });

  it("no vuelve a suscribirse al cambiar de ticket (B10)", async () => {
    const view = render(
      <MemoryRouter initialEntries={["/portal/tickets/1"]}>
        <Routes>
          <Route path="/portal/tickets/:id" element={<PortalInboxScreen />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(echoMock.private).toHaveBeenCalledTimes(1));

    act(() => screen.getByText("Ticket en la lista").click());
    await waitFor(() => expect(portalAPI.getTicket).toHaveBeenCalledWith(2));

    expect(echoMock.private).toHaveBeenCalledTimes(1);
    expect(echoMock.leave).not.toHaveBeenCalled();
    view.unmount();
  });

  it("el admin del Cliente escucha el canal del Cliente para ver los tickets de sus colegas (B3)", async () => {
    portalAPI.me.mockResolvedValue({
      contact: { id: 55, is_admin: true, client: { id: 8 } },
      organization: { name: "Acme" },
      tickets: [ticket1, ticket2],
    });
    renderScreen();

    await waitFor(() => expect(echoMock.private).toHaveBeenCalledWith("client-portal-client.8"));
    expect(echoMock.private).not.toHaveBeenCalledWith("client-portal.55");
  });

  it("un contacto normal escucha su propio canal", async () => {
    renderScreen();
    await waitFor(() => expect(echoMock.private).toHaveBeenCalledWith("client-portal.55"));
  });
});

describe("PortalInboxScreen detalle del ticket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUpEchoMock();
    portalAPI.me.mockResolvedValue({
      contact: { id: 55 },
      organization: { name: "Acme" },
      tickets: [ticket1, ticket2],
    });
    portalAPI.getTicket.mockImplementation((id) =>
      id === 1 ? Promise.resolve(ticket1Detail) : Promise.resolve({ ...ticket2 })
    );
  });

  const renderScreen = () =>
    render(
      <MemoryRouter initialEntries={["/portal/tickets/1"]}>
        <Routes>
          <Route path="/portal/tickets/:id" element={<PortalInboxScreen />} />
          <Route path="/portal/dashboard" element={<PortalInboxScreen />} />
        </Routes>
      </MemoryRouter>
    );

  it("muestra el error con Reintentar en vez de un esqueleto infinito y recupera al reintentar", async () => {
    portalAPI.getTicket.mockRejectedValueOnce(Object.assign(new Error("Error del servidor"), { status: 500 }));
    renderScreen();

    expect(await screen.findByText("No pudimos cargar la conversación")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Descripción")).toBeInTheDocument();
    expect(portalAPI.getTicket).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("No pudimos cargar la conversación")).not.toBeInTheDocument();
  });

  it("un 404 muestra que el ticket no existe, sin Reintentar", async () => {
    portalAPI.getTicket.mockRejectedValueOnce(Object.assign(new Error("No encontrado"), { status: 404 }));
    renderScreen();

    expect(await screen.findByText("No encontramos este ticket")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Volver a mis tickets" }));
    await waitFor(() => expect(screen.queryByText("No encontramos este ticket")).not.toBeInTheDocument());
  });

  it("no duplica el comentario si el evento en vivo llega antes que la respuesta del envío", async () => {
    const comment = { id: 10, content: "Hola equipo", contact_id: 55, created_at: "2026-01-02T00:00:00Z" };
    let resolvePost;
    portalAPI.addComment.mockImplementation(
      () => new Promise((resolve) => { resolvePost = resolve; })
    );
    renderScreen();
    await screen.findByText("Descripción");
    await waitFor(() => expect(clientNotificationListener).toBeTypeOf("function"));

    fireEvent.change(screen.getByPlaceholderText("Escribe una respuesta..."), {
      target: { value: "Hola equipo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    portalAPI.getTicket.mockResolvedValue({ ...ticket1Detail, comments: [comment] });
    act(() => {
      clientNotificationListener({ type: "comment_added", data: { ticket_id: 1, comment_id: 10 } });
    });
    await screen.findByText("Hola equipo");

    await act(async () => {
      resolvePost(comment);
    });

    await waitFor(() => expect(screen.getAllByText("Hola equipo")).toHaveLength(1));
  });
});

describe("PortalInboxScreen acceso revocado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUpEchoMock();
    portalAPI.getTicket.mockResolvedValue(ticket1Detail);
  });

  const renderWithAccessRoute = () =>
    render(
      <MemoryRouter initialEntries={["/portal/tickets/1"]}>
        <Routes>
          <Route path="/portal/tickets/:id" element={<PortalInboxScreen />} />
          <Route path="/portal/:orgSlug" element={<p>Pantalla de acceso</p>} />
        </Routes>
      </MemoryRouter>
    );

  it("cierra la sesión al recibir session_revoked para este contacto", async () => {
    portalAPI.me.mockResolvedValue({ contact: { id: 55 }, organization: { name: "Acme" }, tickets: [ticket1] });
    renderWithAccessRoute();
    await waitFor(() => expect(clientNotificationListener).toBeTypeOf("function"));

    act(() => {
      clientNotificationListener({ type: "session_revoked", data: { contact_id: 55 } });
    });

    expect(await screen.findByText("Pantalla de acceso")).toBeInTheDocument();
    expect(clearPortalToken).toHaveBeenCalled();
  });

  it("el admin del Cliente ignora la revocación de un colega", async () => {
    portalAPI.me.mockResolvedValue({
      contact: { id: 55, is_admin: true, client: { id: 8 } },
      organization: { name: "Acme" },
      tickets: [ticket1],
    });
    renderWithAccessRoute();
    await waitFor(() => expect(clientNotificationListener).toBeTypeOf("function"));

    act(() => {
      clientNotificationListener({ type: "session_revoked", data: { contact_id: 99 } });
    });

    expect(clearPortalToken).not.toHaveBeenCalled();
    expect(screen.queryByText("Pantalla de acceso")).not.toBeInTheDocument();
  });
});
