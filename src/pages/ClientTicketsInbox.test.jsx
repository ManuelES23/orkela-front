import { useEffect } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import ClientTicketsInbox from "./ClientTicketsInbox";
import { ticketsAPI } from "../utils/api";
import { TICKET_STATUS } from "../constants/tickets";

const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };

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
        Ticket #{ticket?.id}
        <button onClick={onClose}>Cerrar detalle</button>
      </div>
    ) : null,
}));

const COUNTS = { sin_asignar: 1, abiertos: 2, esperando_cliente: 0, resueltos: 3, todos: 6 };
const now = () => new Date().toISOString();
const row = (overrides = {}) => ({
  id: 1,
  title: "Acceso VPN",
  status: "open",
  priority: "high",
  type: "support",
  team_id: null,
  team: null,
  assigned_user: null,
  client_id: 7,
  client: { id: 7, name: "Acme" },
  contact: { id: 3, name: "Ana Torres" },
  comments_count: 2,
  last_client_comment_at: now(),
  has_unread_client_reply: true,
  created_at: now(),
  can_route: true,
  ...overrides,
});
const inboxPage = (rows, meta = {}) => ({
  data: rows,
  meta: { current_page: 1, last_page: 1, per_page: 25, total: rows.length, counts: COUNTS, client: null, ...meta },
});

let location;
// La URL que ve el test. La captura va en un efecto, no en el render: escribir
// en una variable de módulo mientras se renderiza es un efecto secundario
// (react-hooks/globals) y el render puede repetirse.
const LocationProbe = () => {
  const current = useLocation();
  useEffect(() => {
    location = current;
  }, [current]);
  return null;
};
const renderInbox = (url = "/client-tickets") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <ClientTicketsInbox />
      <LocationProbe />
    </MemoryRouter>
  );
const lastInboxCall = () => ticketsAPI.getClientInbox.mock.calls.at(-1)[0];

describe("ClientTicketsInbox v2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ticketsAPI.getClientInboxTeams.mockResolvedValue([]);
  });

  it("muestra la fila completa y los contadores; abre por defecto 'Sin asignar'", async () => {
    ticketsAPI.getClientInbox.mockResolvedValue(inboxPage([row()]));
    renderInbox();

    expect(await screen.findByRole("button", { name: "Acceso VPN" })).toBeInTheDocument();
    expect(screen.getByText("Acme · Ana Torres")).toBeInTheDocument();
    expect(screen.getByText(TICKET_STATUS.open.label)).toBeInTheDocument();
    expect(screen.getByText("Respuesta nueva del cliente")).toBeInTheDocument();
    expect(screen.getByText(/Último mensaje del cliente hace/)).toBeInTheDocument();

    const unassigned = screen.getByRole("tab", { name: /Sin asignar/ });
    expect(unassigned).toHaveAttribute("aria-selected", "true");
    expect(within(unassigned).getByText("1")).toBeInTheDocument();
    expect(within(screen.getByRole("tab", { name: /Resueltos/ })).getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "inbox-tab-sin_asignar");
    expect(lastInboxCall()).toEqual({ tab: "sin_asignar", page: 1 });
  });

  it("cambiar de pestaña pide esa pestaña y la guarda en la URL", async () => {
    ticketsAPI.getClientInbox.mockResolvedValue(inboxPage([row()]));
    renderInbox();
    await screen.findByRole("button", { name: "Acceso VPN" });

    fireEvent.click(screen.getByRole("tab", { name: /Abiertos/ }));

    await waitFor(() => expect(lastInboxCall()).toEqual({ tab: "abiertos", page: 1 }));
    expect(location.search).toContain("tab=abiertos");
  });

  it("?client= se ve como chip con el nombre y se puede quitar", async () => {
    ticketsAPI.getClientInbox.mockResolvedValue(inboxPage([row()], { client: { id: 7, name: "Acme" } }));
    renderInbox("/client-tickets?client=7&tab=todos");

    expect(await screen.findByText("Cliente: Acme")).toBeInTheDocument();
    expect(lastInboxCall()).toEqual({ tab: "todos", page: 1, client_id: "7" });

    fireEvent.click(screen.getByRole("button", { name: "Quitar filtro Cliente: Acme" }));

    await waitFor(() => expect(lastInboxCall()).toEqual({ tab: "todos", page: 1 }));
    expect(location.search).not.toContain("client=");
  });

  it("un error de carga se anuncia y 'Reintentar' vuelve a pedir", async () => {
    ticketsAPI.getClientInbox.mockRejectedValueOnce(new Error("500")).mockResolvedValue(inboxPage([row()]));
    renderInbox();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No se pudieron cargar los tickets.");
    fireEvent.click(within(alert).getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("button", { name: "Acceso VPN" })).toBeInTheDocument();
  });

  it("si fallan los equipos se avisa y se puede reintentar", async () => {
    ticketsAPI.getClientInboxTeams.mockReset();
    ticketsAPI.getClientInboxTeams
      .mockRejectedValueOnce(new Error("500"))
      .mockResolvedValue([{ id: 4, name: "Soporte" }]);
    ticketsAPI.getClientInbox.mockResolvedValue(inboxPage([row()]));
    renderInbox();

    expect(await screen.findByText("No se pudieron cargar los equipos.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar carga de equipos" }));

    await waitFor(() => expect(screen.queryByText("No se pudieron cargar los equipos.")).not.toBeInTheDocument());
    expect(within(screen.getByLabelText("Equipo")).getByRole("option", { name: "Soporte" })).toBeInTheDocument();
  });

  it("abrir una fila muestra el detalle; ?ticket= también lo abre y se limpia", async () => {
    ticketsAPI.getClientInbox.mockResolvedValue(inboxPage([row()]));
    renderInbox("/client-tickets?ticket=9");

    expect(await screen.findByRole("dialog", { name: "Detalle del ticket" })).toHaveTextContent("Ticket #9");
    await waitFor(() => expect(location.search).not.toContain("ticket="));

    fireEvent.click(screen.getByRole("button", { name: "Cerrar detalle" }));
    fireEvent.click(await screen.findByRole("button", { name: "Acceso VPN" }));
    expect(screen.getByRole("dialog", { name: "Detalle del ticket" })).toHaveTextContent("Ticket #1");
  });

  it("asignar a un equipo desde la fila avisa y recarga sin abrir el detalle", async () => {
    ticketsAPI.getClientInboxTeams.mockResolvedValue([{ id: 4, name: "Soporte" }]);
    ticketsAPI.getClientInbox.mockResolvedValue(inboxPage([row()]));
    ticketsAPI.assignToTeam.mockResolvedValue({});
    renderInbox();

    const select = await screen.findByLabelText("Asignar equipo a Acceso VPN");
    await waitFor(() => expect(within(select).getByRole("option", { name: "Soporte" })).toBeInTheDocument());
    fireEvent.change(select, { target: { value: "4" } });

    await waitFor(() => expect(ticketsAPI.assignToTeam).toHaveBeenCalledWith(1, 4));
    await waitFor(() => expect(notification.success).toHaveBeenCalledWith("Ticket asignado al equipo"));
    await waitFor(() => expect(ticketsAPI.getClientInbox).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("si falla la asignación se avisa", async () => {
    ticketsAPI.getClientInboxTeams.mockResolvedValue([{ id: 4, name: "Soporte" }]);
    ticketsAPI.getClientInbox.mockResolvedValue(inboxPage([row()]));
    ticketsAPI.assignToTeam.mockRejectedValue(new Error("403"));
    renderInbox();

    const select = await screen.findByLabelText("Asignar equipo a Acceso VPN");
    await waitFor(() => expect(within(select).getByRole("option", { name: "Soporte" })).toBeInTheDocument());
    fireEvent.change(select, { target: { value: "4" } });

    await waitFor(() => expect(notification.error).toHaveBeenCalledWith("No se pudo asignar el ticket"));
  });

  it("vacío explica la pestaña; con filtros ofrece limpiarlos", async () => {
    ticketsAPI.getClientInbox.mockResolvedValue(inboxPage([]));
    const { unmount } = renderInbox("/client-tickets?tab=esperando_cliente");
    expect(await screen.findByText("Ningún ticket está esperando al cliente.")).toBeInTheDocument();
    unmount();

    renderInbox("/client-tickets?priority=high");
    expect(await screen.findByText("Ningún ticket coincide con los filtros.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await waitFor(() => expect(lastInboxCall()).toEqual({ tab: "sin_asignar", page: 1 }));
  });

  it("pagina de 25 en 25 con Anterior/Siguiente", async () => {
    ticketsAPI.getClientInbox.mockResolvedValue(inboxPage([row()], { last_page: 2, total: 26 }));
    renderInbox();

    expect(await screen.findByText("Página 1 de 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    await waitFor(() => expect(lastInboxCall()).toEqual({ tab: "sin_asignar", page: 2 }));
    expect(location.search).toContain("page=2");
  });
});
