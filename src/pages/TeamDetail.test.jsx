import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import TeamDetail from "./TeamDetail";
import { teamsAPI } from "../utils/api";
import { TICKET_STATUS } from "../constants/tickets";

const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
const realtime = { registerRefresh: vi.fn(() => () => {}), unregisterRefresh: vi.fn(), subscribeChannel: vi.fn(() => () => {}), channelEpoch: 0 };
const auth = { user: { id: 1 } };

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  teamsAPI: {
    getById: vi.fn(),
    getTickets: vi.fn(),
    getProjects: vi.fn(),
    getMembers: vi.fn(),
    getStats: vi.fn(),
  },
}));
vi.mock("../components/layout/Layout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../components/modals/TicketModal", () => ({ default: () => null }));
vi.mock("../components/modals/TicketDetailModal", () => ({ default: () => null }));
vi.mock("../components/modals/ProjectModal", () => ({ default: () => null }));
vi.mock("../components/modals/TeamModal", () => ({ default: () => null }));
vi.mock("../context/NotificationContext", () => ({ useNotification: () => notification }));
vi.mock("../context/RealtimeContext", () => ({ useRealtime: () => realtime }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../hooks/useOrganizationPermissions", () => ({
  useUserContext: () => ({ isOrganizationContext: false, organizationId: null }),
}));

const team = (id, name) => ({
  id,
  name,
  description: "",
  user_id: 1,
  user: { id: 1, name: "Ana" },
  members: [],
  is_owner: true,
  is_leader: true,
});

const GoTo = ({ to }) => {
  const navigate = useNavigate();
  return <button onClick={() => navigate(to)}>ir-{to}</button>;
};

describe("TeamDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    teamsAPI.getById.mockReset();
    teamsAPI.getTickets.mockResolvedValue([]);
    teamsAPI.getProjects.mockResolvedValue([]);
    teamsAPI.getMembers.mockResolvedValue([]);
    teamsAPI.getStats.mockResolvedValue(null);
  });

  it("ignora la respuesta vieja al navegar a otro equipo", async () => {
    let resolveSlow;
    teamsAPI.getById.mockImplementation((id) =>
      String(id) === "1"
        ? new Promise((r) => (resolveSlow = r))
        : Promise.resolve(team(2, "Equipo dos"))
    );

    render(
      <MemoryRouter initialEntries={["/teams/1"]}>
        <GoTo to='/teams/2' />
        <Routes>
          <Route path='/teams/:id' element={<TeamDetail />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("ir-/teams/2"));
    expect((await screen.findAllByText("Equipo dos")).length).toBeGreaterThan(0);

    await act(async () => {
      resolveSlow(team(1, "Equipo uno"));
    });

    expect(screen.queryByText("Equipo uno")).not.toBeInTheDocument();
  });

  describe("vocabulario de estado de los tickets del buzón", () => {
    // Colores propios de esta pantalla: in_progress/pending NO coinciden con
    // TICKET_STATUS.badgeClass, y esta limpieza no debe cambiarlos.
    const EXPECTED = {
      open: {
        label: "Abierto",
        badge: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
        iconClass: "dark:text-blue-400",
      },
      in_progress: {
        label: "En progreso",
        badge: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800",
        iconClass: "dark:text-yellow-400",
      },
      pending: {
        label: "Pendiente",
        badge: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800",
        iconClass: "dark:text-orange-400",
      },
      resolved: {
        label: "Resuelto",
        badge: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800",
        iconClass: "dark:text-green-400",
      },
      closed: {
        label: "Cerrado",
        badge: "text-gray-600 dark:text-night-300 bg-gray-50 dark:bg-night-800 border-gray-200 dark:border-night-700",
        iconClass: "dark:text-night-300",
      },
    };

    const ticket = (id, status) => ({
      id,
      title: `Ticket ${status}`,
      description: "",
      status,
      priority: "low",
      type: "bug",
      assigned_to: null,
    });

    const renderInbox = async (tickets) => {
      teamsAPI.getById.mockResolvedValue(team(1, "Equipo uno"));
      teamsAPI.getTickets.mockResolvedValue(tickets);
      render(
        <MemoryRouter initialEntries={["/teams/1"]}>
          <Routes>
            <Route path='/teams/:id' element={<TeamDetail />} />
          </Routes>
        </MemoryRouter>
      );
      await screen.findByText(`#${tickets[0].id} - ${tickets[0].title}`);
    };

    // La tarjeta del ticket es el ancestro con borde izquierdo de color.
    const cardOf = (status, id) => screen.getByText(`#${id} - Ticket ${status}`).closest(".group");
    const badgeOf = (card, label) =>
      within(card)
        .getAllByText(label)
        .find((el) => el.tagName === "SPAN");

    it.each(Object.entries(EXPECTED))("pinta el estado %s con su etiqueta y colores de siempre", async (status, exp) => {
      await renderInbox([ticket(7, status)]);
      const card = cardOf(status, 7);

      const badge = badgeOf(card, exp.label);
      expect(badge).toBeTruthy();
      expect(badge.className).toContain(exp.badge);
      expect(badge.className).toContain("border ");

      // El contenedor del icono de tipo usa el 2.º token de la paleta de estado
      // (`split(" ")[1]`, que hoy es la clase dark:text-*). Se fija tal cual.
      expect(card.querySelector("div.p-2.rounded-lg.w-fit").className).toContain(exp.iconClass);
    });

    it("mantiene el filtro de estado con las mismas opciones y orden", async () => {
      await renderInbox([ticket(7, "open")]);
      const select = screen.getByDisplayValue("Todo estado");
      expect(Array.from(select.options).map((o) => [o.value, o.textContent])).toEqual([
        ["all", "Todo estado"],
        ["open", "Abierto"],
        ["in_progress", "En progreso"],
        ["pending", "Pendiente"],
        ["resolved", "Resuelto"],
        ["closed", "Cerrado"],
      ]);
    });

    it("toma las etiquetas de TICKET_STATUS y no de una copia local", async () => {
      const original = TICKET_STATUS.in_progress.label;
      TICKET_STATUS.in_progress.label = "Etiqueta del vocabulario compartido";
      try {
        await renderInbox([ticket(7, "in_progress")]);
        const card = cardOf("in_progress", 7);
        expect(badgeOf(card, "Etiqueta del vocabulario compartido")).toBeTruthy();
        const select = screen.getByDisplayValue("Todo estado");
        expect(Array.from(select.options).map((o) => o.textContent)).toContain("Etiqueta del vocabulario compartido");
      } finally {
        TICKET_STATUS.in_progress.label = original;
      }
    });
  });
});
