import { StrictMode } from "react";
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
    // Éxito: muestra el mensaje y a los 3 s navega al proyecto
    successText: /invitación aceptada/i,
    redirectsTo: "/projects/1",
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
    successText: /bienvenido al equipo/i,
    redirectsTo: "/teams",
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
    // Organización: no redirige sola, pide elegir contexto
    successText: /en qué modo deseas continuar/i,
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

const renderAt = (page, { strict = false } = {}) => {
  const entry = page.path.replace(":token", "tok");
  const Wrapper = strict ? StrictMode : ({ children }) => children;
  const ui = () => (
    <Wrapper>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={page.path} element={<page.Component />} />
          <Route path='/login' element={<p>pantalla-login</p>} />
          <Route path='/projects/:id' element={<p>pantalla-destino</p>} />
          <Route path='/teams' element={<p>pantalla-destino</p>} />
        </Routes>
      </MemoryRouter>
    </Wrapper>
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

  it("acepta la invitación una sola vez con sesión iniciada, aunque haya re-renders y StrictMode", async () => {
    const api = page.setup();
    auth = { ...auth, user: { id: 1 }, loading: false };
    const { rerenderPage } = renderAt(page, { strict: true });

    await vi.waitFor(() => expect(api.acceptInvitation).toHaveBeenCalledWith("tok"));
    await screen.findByText(page.successText);

    // Re-renders del AuthProvider: refreshUser/switchContext cambian de identidad
    auth = { ...auth, refreshUser: vi.fn().mockResolvedValue({}), switchContext: vi.fn() };
    rerenderPage();
    rerenderPage();
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    expect(api.acceptInvitation).toHaveBeenCalledTimes(1);
    expect(api.acceptInvitation).toHaveBeenCalledWith("tok");
    expect(screen.queryByText("pantalla-login")).not.toBeInTheDocument();
  });

  it("al aceptar muestra el éxito y redirige (si corresponde)", async () => {
    page.setup();
    auth = { ...auth, user: { id: 1 }, loading: false };
    renderAt(page);

    await screen.findByText(page.successText);
    await act(async () => {
      vi.advanceTimersByTime(3500);
    });

    if (page.redirectsTo) {
      expect(screen.getByText("pantalla-destino")).toBeInTheDocument();
    } else {
      expect(screen.getByText(page.successText)).toBeInTheDocument();
    }
  });

  it("si aceptar falla muestra el error y no reintenta en los re-renders", async () => {
    const api = page.setup();
    api.acceptInvitation.mockRejectedValue(new Error("token vencido"));
    auth = { ...auth, user: { id: 1 }, loading: false };
    const { rerenderPage } = renderAt(page);

    await screen.findByText("token vencido");

    auth = { ...auth, refreshUser: vi.fn().mockResolvedValue({}), switchContext: vi.fn() };
    rerenderPage();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("token vencido")).toBeInTheDocument();
    expect(api.acceptInvitation).toHaveBeenCalledTimes(1);
  });

  it("si la sesión se inicia con la pantalla de redirección ya visible, acepta una sola vez y no va al login", async () => {
    const api = page.setup();
    auth = { ...auth, user: null, loading: false };
    const { rerenderPage } = renderAt(page);

    await screen.findByText(/redirigiendo a iniciar sesión/i);
    expect(api.acceptInvitation).not.toHaveBeenCalled();

    auth = { ...auth, user: { id: 1 } };
    rerenderPage();

    await screen.findByText(page.successText);
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(api.acceptInvitation).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("pantalla-login")).not.toBeInTheDocument();
  });
});
