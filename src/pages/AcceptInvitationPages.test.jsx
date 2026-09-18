import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AcceptInvitation from "./AcceptInvitation";
import AcceptTeamInvitation from "./AcceptTeamInvitation";
import AcceptOrganizationInvitation from "./AcceptOrganizationInvitation";
import { invitationsAPI, teamInvitationsAPI, organizationsAPI } from "../utils/api";

let auth = { user: null, loading: true };

vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  invitationsAPI: { getInfo: vi.fn(), acceptInvitation: vi.fn() },
  teamInvitationsAPI: { getInfo: vi.fn(), acceptInvitation: vi.fn() },
  organizationsAPI: { getInvitationInfo: vi.fn(), acceptInvitation: vi.fn() },
}));

const pages = [
  {
    name: "AcceptInvitation",
    Component: AcceptInvitation,
    path: "/accept-invitation/:token",
    setup: () => {
      invitationsAPI.getInfo.mockResolvedValue({
        email: "ana@example.com",
        user_exists: true,
        project: { name: "Proyecto" },
        invited_by: { name: "Luis" },
      });
      invitationsAPI.acceptInvitation.mockResolvedValue({ message: "ok", project: { id: 1, name: "Proyecto" } });
      return invitationsAPI;
    },
  },
  {
    name: "AcceptTeamInvitation",
    Component: AcceptTeamInvitation,
    path: "/accept-team-invitation/:token",
    setup: () => {
      teamInvitationsAPI.getInfo.mockResolvedValue({
        email: "ana@example.com",
        user_exists: true,
        team: { name: "Equipo" },
        invited_by: { name: "Luis" },
      });
      teamInvitationsAPI.acceptInvitation.mockResolvedValue({ message: "ok", team: { id: 1, name: "Equipo" } });
      return teamInvitationsAPI;
    },
  },
  {
    name: "AcceptOrganizationInvitation",
    Component: AcceptOrganizationInvitation,
    path: "/accept-organization-invitation/:token",
    setup: () => {
      organizationsAPI.getInvitationInfo.mockResolvedValue({
        email: "ana@example.com",
        user_exists: true,
        organization: { name: "Org" },
        invited_by: { name: "Luis" },
      });
      organizationsAPI.acceptInvitation.mockResolvedValue({ message: "ok", organization: { id: 5, name: "Org" } });
      return organizationsAPI;
    },
  },
];

const renderAt = (page) => {
  const entry = page.path.replace(":token", "tok");
  const ui = () => (
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path={page.path} element={<page.Component />} />
        <Route path='/login' element={<p>pantalla-login</p>} />
      </Routes>
    </MemoryRouter>
  );
  const result = render(ui());
  return { ...result, rerenderPage: () => result.rerender(ui()) };
};

describe.each(pages)("$name con sesión iniciada", (page) => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Solo setTimeout: framer-motion necesita requestAnimationFrame real
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"], shouldAdvanceTime: true });
    auth = { user: null, loading: true, refreshUser: vi.fn().mockResolvedValue({}), switchContext: vi.fn() };
  });

  afterEach(() => vi.useRealTimers());

  it("no manda al login si la sesión se confirma después de montar la página", async () => {
    const api = page.setup();
    const { rerenderPage } = renderAt(page);

    // AuthContext termina de verificar la sesión: el usuario sí estaba logueado
    auth = { ...auth, user: { id: 1 }, loading: false };
    rerenderPage();

    await vi.waitFor(() => expect(api.acceptInvitation).toHaveBeenCalledWith("tok"));
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText("pantalla-login")).not.toBeInTheDocument();
  });

  it("sin sesión sigue redirigiendo al login", async () => {
    const api = page.setup();
    auth = { ...auth, user: null, loading: false };
    renderAt(page);

    await screen.findByText(/redirigiendo a iniciar sesión/i);
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("pantalla-login")).toBeInTheDocument();
    expect(api.acceptInvitation).not.toHaveBeenCalled();
  });
});
