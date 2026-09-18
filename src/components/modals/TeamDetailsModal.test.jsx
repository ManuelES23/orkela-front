import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TeamDetailsModal from "./TeamDetailsModal";
import { teamsAPI, teamInvitationsAPI, APIError } from "../../utils/api";

const notification = { success: vi.fn(), error: vi.fn() };

vi.mock("../../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  teamsAPI: { getById: vi.fn() },
  teamInvitationsAPI: { sendInvitation: vi.fn() },
}));
vi.mock("../../context/NotificationContext", () => ({ useNotification: () => notification }));

describe("TeamDetailsModal: invitar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra el mensaje real del backend al fallar la invitación", async () => {
    teamsAPI.getById.mockResolvedValue({
      id: 1,
      name: "Equipo",
      is_owner: true,
      members: [],
      projects: [],
    });
    teamInvitationsAPI.sendInvitation.mockRejectedValue(
      new APIError("Has alcanzado el límite de miembros de tu plan", 403)
    );

    render(<TeamDetailsModal isOpen onClose={vi.fn()} team={{ id: 1, name: "Equipo" }} />);

    fireEvent.change(await screen.findByPlaceholderText("email@ejemplo.com"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

    await vi.waitFor(() =>
      expect(notification.error).toHaveBeenCalledWith("Has alcanzado el límite de miembros de tu plan")
    );
  });
});
