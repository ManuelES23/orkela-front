import { useEffect } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import ClientsManagement from "./ClientsManagement";
import { clientsAPI, contactsAPI } from "../utils/api";

const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  clientsAPI: { getAll: vi.fn(), getById: vi.fn(), archive: vi.fn(), update: vi.fn() },
  contactsAPI: { promote: vi.fn(), resendAccess: vi.fn(), archive: vi.fn(), update: vi.fn() },
}));
vi.mock("../components/layout/Layout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../context/NotificationContext", () => ({ useNotification: () => notification }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: { id: 1 } }) }));
vi.mock("../hooks/useMailResult", () => ({ useMailResult: () => ({ notifyClientMail: vi.fn() }) }));
const realtime = { registerRefresh: vi.fn(() => () => {}) };
vi.mock("../context/RealtimeContext", () => ({ useRealtime: () => realtime }));
vi.mock("../components/modals/TicketDetailModal", () => ({
  default: ({ isOpen, ticket }) => (isOpen ? <div role='dialog'>Detalle {ticket?.id}</div> : null),
}));
vi.mock("../components/modals/ContactModal", () => ({ default: () => null }));
vi.mock("../components/modals/ClientModal", () => ({
  default: ({ isOpen, onSaved }) =>
    isOpen ? (
      <button onClick={() => onSaved({ id: 1, name: "Acme Renombrada", type: "company", status: "active" })}>
        Guardar cliente (mock)
      </button>
    ) : null,
}));

const acme = { id: 1, name: "Acme", type: "company", status: "active", tickets_count: 3 };
const globex = { id: 2, name: "Globex", type: "company", status: "active", tickets_count: 0 };
const directoryPage = (rows, meta = {}) => ({
  data: rows,
  meta: { current_page: 1, last_page: 1, per_page: 25, total: rows.length, ...meta },
});
const acmeDetail = (overrides = {}) => ({
  ...acme,
  notes: null,
  contacts: [{ id: 5, name: "Luis Peña", email: "luis@acme.test", is_admin: false, status: "active" }],
  tickets: [],
  ...overrides,
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
const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path='/clients' element={<ClientsManagement />} />
        <Route path='/clients/:id' element={<ClientsManagement />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>
  );

describe("ClientsManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("en /clients no salta al primer cliente", async () => {
    clientsAPI.getAll.mockResolvedValue(directoryPage([acme]));
    renderAt("/clients");

    expect(await screen.findByRole("button", { name: /Acme/ })).toBeInTheDocument();
    expect(location.pathname).toBe("/clients");
    expect(clientsAPI.getById).not.toHaveBeenCalled();
    expect(screen.getByText("Selecciona un cliente para ver su detalle")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Volver a clientes" })).not.toBeInTheDocument();
  });

  // De la fase 1 (Task 13), se conserva: un ticket reciente abre el detalle.
  it("un ticket reciente de la ficha abre el detalle", async () => {
    clientsAPI.getAll.mockResolvedValue(directoryPage([acme]));
    clientsAPI.getById.mockResolvedValue(acmeDetail({ tickets: [{ id: 31, title: "No llega la factura", status: "open" }] }));
    renderAt("/clients/1");

    fireEvent.click(await screen.findByRole("button", { name: /no llega la factura/i }));

    expect(screen.getByText("Detalle 31")).toBeInTheDocument();
  });

  it("la ficha ofrece volver a la lista y 'Ver todos' filtra la Bandeja por cliente", async () => {
    clientsAPI.getAll.mockResolvedValue(directoryPage([acme]));
    clientsAPI.getById.mockResolvedValue(acmeDetail());
    renderAt("/clients/1");

    expect(await screen.findByRole("link", { name: "Volver a clientes" })).toHaveAttribute("href", "/clients");
    expect(screen.getByRole("link", { name: "Ver todos" })).toHaveAttribute("href", "/client-tickets?client=1&tab=todos");
  });

  it("busca en el servidor por cliente, contacto o correo", async () => {
    clientsAPI.getAll.mockResolvedValue(directoryPage([acme]));
    renderAt("/clients");
    await screen.findByRole("button", { name: /Acme/ });

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar clientes" }), { target: { value: "luis@acme" } });

    await waitFor(() => expect(clientsAPI.getAll).toHaveBeenLastCalledWith({ q: "luis@acme", page: 1 }));
  });

  it("'Cargar más' agrega la página siguiente", async () => {
    clientsAPI.getAll
      .mockResolvedValueOnce(directoryPage([acme], { last_page: 2, total: 2 }))
      .mockResolvedValueOnce(directoryPage([globex], { current_page: 2, last_page: 2, total: 2 }));
    renderAt("/clients");

    fireEvent.click(await screen.findByRole("button", { name: "Cargar más clientes" }));

    expect(await screen.findByRole("button", { name: /Globex/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Acme/ })).toBeInTheDocument();
    expect(clientsAPI.getAll).toHaveBeenLastCalledWith({ q: "", page: 2 });
    expect(screen.queryByRole("button", { name: "Cargar más clientes" })).not.toBeInTheDocument();
  });

  it("si falla 'Cargar más' se avisa", async () => {
    clientsAPI.getAll
      .mockResolvedValueOnce(directoryPage([acme], { last_page: 2, total: 2 }))
      .mockRejectedValueOnce(new Error("500"));
    renderAt("/clients");

    fireEvent.click(await screen.findByRole("button", { name: "Cargar más clientes" }));

    await waitFor(() => expect(notification.error).toHaveBeenCalledWith("No se pudieron cargar más clientes"));
  });

  it("si falla la lista se puede reintentar", async () => {
    clientsAPI.getAll.mockRejectedValueOnce(new Error("500")).mockResolvedValue(directoryPage([acme]));
    renderAt("/clients");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No se pudieron cargar los clientes.");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("button", { name: /Acme/ })).toBeInTheDocument();
  });

  it("guardar un cliente actualiza su fila sin recargar toda la lista", async () => {
    clientsAPI.getAll.mockResolvedValue(directoryPage([acme]));
    clientsAPI.getById
      .mockResolvedValueOnce(acmeDetail({ contacts: [] }))
      .mockResolvedValue(acmeDetail({ name: "Acme Renombrada", contacts: [] }));
    renderAt("/clients/1");
    await screen.findByRole("heading", { name: "Acme" });

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cliente (mock)" }));

    expect(await screen.findByRole("button", { name: /Acme Renombrada/ })).toHaveTextContent("3 tickets");
    expect(await screen.findByRole("heading", { name: "Acme Renombrada" })).toBeInTheDocument();
    expect(clientsAPI.getAll).toHaveBeenCalledTimes(1);
  });

  it("archivar actualiza la fila sin recargar la lista", async () => {
    clientsAPI.getAll.mockResolvedValue(directoryPage([acme]));
    clientsAPI.getById
      .mockResolvedValueOnce(acmeDetail({ contacts: [] }))
      .mockResolvedValue(acmeDetail({ status: "archived", contacts: [] }));
    clientsAPI.archive.mockResolvedValue({});
    renderAt("/clients/1");
    await screen.findByRole("heading", { name: "Acme" });

    fireEvent.click(screen.getByRole("button", { name: "Archivar" }));

    await waitFor(() => expect(screen.getByRole("button", { name: /Acme/ })).toHaveTextContent("Archivado"));
    expect(clientsAPI.getAll).toHaveBeenCalledTimes(1);
  });

  it("si falla refrescar la ficha se avisa en vez de quedar en silencio", async () => {
    clientsAPI.getAll.mockResolvedValue(directoryPage([acme]));
    clientsAPI.getById.mockResolvedValueOnce(acmeDetail()).mockRejectedValue(new Error("500"));
    contactsAPI.promote.mockResolvedValue({});
    renderAt("/clients/1");

    fireEvent.click(await screen.findByRole("button", { name: "Hacer admin" }));

    await waitFor(() =>
      expect(notification.error).toHaveBeenCalledWith("No se pudo actualizar el detalle del cliente.")
    );
  });

  it("organization.sync de clientes recarga la lista y la ficha abierta sin avisos", async () => {
    clientsAPI.getAll.mockResolvedValue(directoryPage([acme]));
    clientsAPI.getById.mockResolvedValue(acmeDetail());
    renderAt("/clients/1");
    await screen.findByRole("heading", { name: "Acme" });

    clientsAPI.getAll.mockResolvedValue(directoryPage([{ ...acme, name: "Acme SA" }]));
    clientsAPI.getById.mockResolvedValue(acmeDetail({ name: "Acme SA" }));
    const callbacks = realtime.registerRefresh.mock.calls.filter(([key]) => key === "clients").map(([, cb]) => cb);
    expect(callbacks.length).toBeGreaterThan(0);
    act(() => callbacks.forEach((callback) => callback()));

    expect(await screen.findByRole("heading", { name: "Acme SA" }, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Acme SA/ })).toBeInTheDocument();
    expect(notification.error).not.toHaveBeenCalled();
  });
});
