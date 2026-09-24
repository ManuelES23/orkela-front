import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import ClientsManagement from "./ClientsManagement";
import { clientsAPI } from "../utils/api";

const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  clientsAPI: { getAll: vi.fn(), getById: vi.fn() },
  contactsAPI: {},
}));
vi.mock("../components/layout/Layout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../components/modals/ClientModal", () => ({ default: () => null }));
vi.mock("../components/modals/ContactModal", () => ({ default: () => null }));
vi.mock("../components/modals/TicketDetailModal", () => ({
  default: ({ isOpen, ticket }) => (isOpen ? <div role='dialog'>Detalle {ticket?.id}</div> : null),
}));
vi.mock("../context/NotificationContext", () => ({ useNotification: () => notification }));
vi.mock("../hooks/useMailResult", () => ({ useMailResult: () => ({ notifyClientMail: vi.fn() }) }));

const client = {
  id: 5,
  name: "Acme SA",
  type: "company",
  status: "active",
  contacts: [],
  tickets: [{ id: 31, title: "No llega la factura", status: "open" }],
};

const LocationProbe = () => {
  const location = useLocation();
  return <p>ruta:{location.pathname + location.search}</p>;
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/clients/5"]}>
      <Routes>
        <Route path='/clients/:id' element={<ClientsManagement />} />
        <Route path='/client-tickets' element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );

describe("ClientsManagement — tickets recientes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientsAPI.getAll.mockResolvedValue({ data: [{ ...client, tickets_count: 1 }], meta: {} });
    clientsAPI.getById.mockResolvedValue(client);
  });

  it("un ticket reciente abre el detalle", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /no llega la factura/i }));

    expect(screen.getByText("Detalle 31")).toBeInTheDocument();
  });

  it("'Ver todos' navega a la Bandeja filtrada por el cliente", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("link", { name: "Ver todos" }));

    expect(await screen.findByText("ruta:/client-tickets?client=5")).toBeInTheDocument();
  });
});
