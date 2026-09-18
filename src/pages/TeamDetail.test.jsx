import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import TeamDetail from "./TeamDetail";
import { teamsAPI } from "../utils/api";

const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
const realtime = { registerRefresh: vi.fn(), unregisterRefresh: vi.fn() };
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
});
