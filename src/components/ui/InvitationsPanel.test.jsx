import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import InvitationsPanel from "./InvitationsPanel";
import { myInvitationsAPI } from "../../utils/api";

const switchContext = vi.fn();
const refreshUser = vi.fn();

vi.mock("../../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  myInvitationsAPI: { getAll: vi.fn(), accept: vi.fn(), decline: vi.fn() },
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ switchContext, refreshUser }),
}));
vi.mock("../../context/NotificationContext", () => ({
  useNotification: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock("../../context/RealtimeContext", () => ({
  useRealtime: () => ({
    registerRefresh: vi.fn(() => () => {}),
    subscribeChannel: vi.fn(() => () => {}),
    channelEpoch: 0,
    unregisterRefresh: vi.fn(),
    triggerRefresh: vi.fn(),
  }),
}));

const invitation = (type, id, name) => ({
  id,
  type,
  token: `${type}-tok-${id}`,
  resource_name: name,
  invited_by: "Luis",
  created_at: new Date().toISOString(),
});

const renderPanel = async () => {
  render(
    <MemoryRouter>
      <InvitationsPanel />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByTitle("Invitaciones pendientes"));
};

describe("InvitationsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    switchContext.mockResolvedValue({});
    refreshUser.mockResolvedValue({});
  });

  it("al rechazar una invitación no quita otra de distinto tipo con el mismo id", async () => {
    myInvitationsAPI.getAll.mockResolvedValue({
      invitations: [invitation("project", 3, "Proyecto Alfa"), invitation("team", 3, "Equipo Beta")],
    });
    myInvitationsAPI.decline.mockResolvedValue({});

    await renderPanel();
    await screen.findByText("Proyecto Alfa");

    const rejectButtons = screen.getAllByRole("button", { name: /rechazar/i });
    fireEvent.click(rejectButtons[0]);

    await vi.waitFor(() => expect(screen.queryByText("Proyecto Alfa")).not.toBeInTheDocument());
    expect(screen.getByText("Equipo Beta")).toBeInTheDocument();
  });

  it("al aceptar una organización cambia a ESA organización, no a la previa", async () => {
    myInvitationsAPI.getAll.mockResolvedValue({
      invitations: [invitation("organization", 9, "Org B")],
    });
    myInvitationsAPI.accept.mockResolvedValue({ organization: { id: 42 } });

    await renderPanel();
    await screen.findByText("Org B");
    fireEvent.click(screen.getByRole("button", { name: /aceptar/i }));

    const enter = await screen.findByRole("button", { name: /entrar como org b/i });
    fireEvent.click(enter);

    await vi.waitFor(() => expect(switchContext).toHaveBeenCalledWith("42"));
  });
});
