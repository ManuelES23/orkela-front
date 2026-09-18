import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import OrganizationDetail from "./OrganizationDetail";
import { NotificationProvider } from "../context/NotificationContext";
import { organizationsAPI } from "../utils/api";

// NotificationProvider real: el aviso con el enlace lo monta el provider
vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  organizationsAPI: {
    getById: vi.fn(),
    getStats: vi.fn(),
    getTeams: vi.fn(),
    getProjects: vi.fn(),
    getMembers: vi.fn(),
    getPendingInvitations: vi.fn(),
    sendInvitation: vi.fn(),
  },
}));
vi.mock("../components/layout/Layout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../components/modals/OrganizationModal", () => ({ default: () => null }));
vi.mock("../components/organizations/OrganizationMailConfig", () => ({ default: () => null }));
vi.mock("../context/RealtimeContext", () => ({
  useRealtime: () => ({ registerRefresh: vi.fn(() => () => {}), unregisterRefresh: vi.fn(), subscribeChannel: vi.fn(() => () => {}), channelEpoch: 0 }),
}));

const LINK = "http://localhost:5173/accept-organization-invitation/tok-abc";

const renderPage = async () => {
  render(
    <NotificationProvider>
      <MemoryRouter initialEntries={["/organizations/7"]}>
        <Routes>
          <Route path='/organizations/:id' element={<OrganizationDetail />} />
        </Routes>
      </MemoryRouter>
    </NotificationProvider>
  );
  fireEvent.click(await screen.findByRole("button", { name: /Miembros/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Invitar/ }));
  fireEvent.change(screen.getByPlaceholderText("email@ejemplo.com"), {
    target: { value: "nuevo@acme.com" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Enviar invitación/ }));
  });
};

describe("OrganizationDetail — invitar miembro", () => {
  let writeText;

  beforeEach(() => {
    vi.clearAllMocks();
    organizationsAPI.getById.mockResolvedValue({ id: 7, name: "Acme", can_manage: true });
    organizationsAPI.getStats.mockResolvedValue({});
    organizationsAPI.getTeams.mockResolvedValue([]);
    organizationsAPI.getProjects.mockResolvedValue([]);
    organizationsAPI.getMembers.mockResolvedValue([]);
    organizationsAPI.getPendingInvitations.mockResolvedValue([]);
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  it("si el correo salió muestra el éxito de siempre", async () => {
    organizationsAPI.sendInvitation.mockResolvedValue({
      message: "Invitación enviada exitosamente",
      mail_sent: true,
    });

    await renderPage();

    expect(await screen.findByText("Invitación enviada a nuevo@acme.com")).toBeInTheDocument();
    expect(screen.queryByText(/no se pudo enviar el correo/)).not.toBeInTheDocument();
  });

  it("si el correo falló avisa (sin toast de éxito) y ofrece copiar el enlace", async () => {
    organizationsAPI.sendInvitation.mockResolvedValue({
      message: "Invitación enviada exitosamente",
      mail_sent: false,
      invitation_link: LINK,
    });

    await renderPage();

    expect(await screen.findByText("Invitación creada, pero no se pudo enviar el correo")).toBeInTheDocument();
    expect(screen.queryByText("Invitación enviada a nuevo@acme.com")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue(LINK)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Copiar enlace/ }));
    });

    expect(writeText).toHaveBeenCalledWith(LINK);
    expect(screen.getByRole("button", { name: /Copiado/ })).toBeInTheDocument();
  });
});
