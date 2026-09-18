import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import TicketDetailModal from "./TicketDetailModal";
import { ticketsAPI } from "../../utils/api";

vi.mock("../../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  ticketsAPI: {
    getById: vi.fn(),
    getComments: vi.fn(),
    takeTicket: vi.fn(),
    returnToInbox: vi.fn(),
    assignTicket: vi.fn(),
    update: vi.fn(),
    addComment: vi.fn(),
  },
  teamsAPI: { getMembers: vi.fn().mockResolvedValue([]) },
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: 1 } }) }));
// Referencias estables, como en los providers reales (useCallback)
const notification = { success: vi.fn(), error: vi.fn() };
const realtime = { registerRefresh: vi.fn(), unregisterRefresh: vi.fn() };
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

describe("TicketDetailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ticketsAPI.getById.mockReset();
    ticketsAPI.getComments.mockResolvedValue([]);
  });

  it("conserva los permisos calculados después de tomar el ticket", async () => {
    ticketsAPI.getById
      .mockResolvedValueOnce({ ...baseTicket, is_in_inbox: true, can_take: true })
      .mockResolvedValueOnce({
        ...baseTicket,
        status: "in_progress",
        assigned_to: 1,
        is_in_inbox: false,
        can_resolve: true,
      });
    // take devuelve el modelo plano, sin can_resolve / is_in_inbox
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
});
