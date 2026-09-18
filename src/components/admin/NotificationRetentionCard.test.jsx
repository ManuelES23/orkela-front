import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NotificationRetentionCard from "./NotificationRetentionCard";

const settings = vi.hoisted(() => ({
  getNotificationSettings: vi.fn(),
  updateNotificationSettings: vi.fn(),
}));
vi.mock("../../utils/settingsAPI", () => ({ default: settings }));
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock("../../context/NotificationContext", () => ({ useNotification: () => toast }));

describe("NotificationRetentionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settings.getNotificationSettings.mockResolvedValue({
      data: { retention_days: 30, options: [7, 30, 90, 0] },
    });
    settings.updateNotificationSettings.mockResolvedValue({
      message: "Retención de notificaciones actualizada",
      data: { retention_days: 0, options: [7, 30, 90, 0] },
    });
  });

  it("muestra el plazo vigente y guarda uno nuevo", async () => {
    render(<NotificationRetentionCard />);

    const current = await screen.findByRole("radio", { name: "30 días" });
    expect(current).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: "Siempre" }));
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => expect(settings.updateNotificationSettings).toHaveBeenCalledWith(0));
    expect(toast.success).toHaveBeenCalled();
  });
});
