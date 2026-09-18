import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Settings from "./Settings";
import { profileAPI } from "../utils/api";

const notification = { success: vi.fn(), error: vi.fn() };
const refreshUser = vi.fn();

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  profileAPI: { get: vi.fn(), deleteAvatar: vi.fn(), uploadAvatar: vi.fn(), update: vi.fn() },
}));
vi.mock("../components/layout/Layout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../components/settings/MyPlanSection", () => ({ default: () => null }));
vi.mock("../components/settings/AccessSecuritySection", () => ({ default: () => null }));
vi.mock("../components/settings/CalendarIntegrationsSection", () => ({ default: () => null }));
vi.mock("../context/NotificationContext", () => ({ useNotification: () => notification }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, name: "Ana" }, refreshUser }),
}));

describe("Settings: avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshUser.mockResolvedValue({});
  });

  it("al eliminar el avatar refresca el usuario de la sesión", async () => {
    profileAPI.get.mockResolvedValue({ name: "Ana", email: "ana@example.com", avatar: "avatars/a.png" });
    profileAPI.deleteAvatar.mockResolvedValue({});

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByTitle("Eliminar avatar"));

    await vi.waitFor(() => expect(refreshUser).toHaveBeenCalled());
  });
});
