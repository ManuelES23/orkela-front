import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Tickets from "./Tickets";
import { ticketsAPI, teamsAPI } from "../utils/api";

const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
const realtime = { registerRefresh: vi.fn(() => () => {}), unregisterRefresh: vi.fn(), subscribeChannel: vi.fn(() => () => {}), channelEpoch: 0 };

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  ticketsAPI: { getAll: vi.fn(), getStats: vi.fn() },
  teamsAPI: { getAll: vi.fn() },
}));
vi.mock("../components/layout/Layout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../components/modals/TicketModal", () => ({ default: () => null }));
vi.mock("../components/modals/TicketDetailModal", () => ({ default: () => null }));
vi.mock("../context/NotificationContext", () => ({ useNotification: () => notification }));
vi.mock("../context/RealtimeContext", () => ({ useRealtime: () => realtime }));

const ticket = (id, title, status) => ({
  id,
  title,
  status,
  priority: "medium",
  type: "request",
  created_at: new Date().toISOString(),
});

describe("Tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ticketsAPI.getAll.mockReset();
    teamsAPI.getAll.mockResolvedValue([]);
    ticketsAPI.getStats.mockResolvedValue({});
  });

  it("ignora la respuesta de una pestaña anterior que llega tarde", async () => {
    let resolveOpen;
    ticketsAPI.getAll.mockImplementation((filters) => {
      if (filters.status === "open") return new Promise((r) => (resolveOpen = r));
      if (filters.status === "resolved") return Promise.resolve([ticket(2, "Ticket resuelto", "resolved")]);
      return Promise.resolve([]);
    });

    render(
      <MemoryRouter>
        <Tickets />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: /abiertos/i }));
    fireEvent.click(screen.getByRole("button", { name: /resueltos/i }));
    expect(await screen.findByText("Ticket resuelto")).toBeInTheDocument();

    await act(async () => {
      resolveOpen([ticket(1, "Ticket abierto", "open")]);
    });

    expect(screen.queryByText("Ticket abierto")).not.toBeInTheDocument();
    expect(screen.getByText("Ticket resuelto")).toBeInTheDocument();
  });

  it("muestra la etiqueta de tipo y el punto de estado de cada fila", async () => {
    ticketsAPI.getAll.mockResolvedValue([{ ...ticket(3, "Duda de facturación", "pending"), type: "question" }]);

    render(
      <MemoryRouter>
        <Tickets />
      </MemoryRouter>
    );

    expect(await screen.findByText("Duda de facturación")).toBeInTheDocument();
    expect(screen.getByText("Pregunta")).toBeInTheDocument();
    expect(screen.getByTitle("Pendiente")).toHaveClass("bg-yellow-500");
  });

  it("muestra el contador de cada pestaña de estado desde las estadísticas", async () => {
    ticketsAPI.getAll.mockResolvedValue([]);
    ticketsAPI.getStats.mockResolvedValue({ total: 9, open: 4, inbox: 2 });

    render(
      <MemoryRouter>
        <Tickets />
      </MemoryRouter>
    );

    expect(await screen.findByRole("button", { name: "Abiertos (4)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Buzón de equipo\s*2/ })).toBeInTheDocument();
  });
});
