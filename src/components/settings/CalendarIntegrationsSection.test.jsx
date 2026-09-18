import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CalendarIntegrationsSection from "./CalendarIntegrationsSection";
import { calendarAPI } from "../../utils/calendarAPI";

vi.mock("../../utils/calendarAPI", () => ({
  calendarAPI: { listConnections: vi.fn(), confirmConnection: vi.fn(), requestConnectTicket: vi.fn(), disconnect: vi.fn() },
}));
vi.mock("../../context/NotificationContext", () => ({
  useNotification: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const renderSection = () =>
  render(
    <MemoryRouter>
      <CalendarIntegrationsSection />
    </MemoryRouter>
  );

describe("CalendarIntegrationsSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("no ofrece conectar Google Calendar, solo Microsoft", async () => {
    calendarAPI.listConnections.mockResolvedValue([]);
    renderSection();

    expect(await screen.findByText("Microsoft Outlook")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conectar Microsoft" })).toBeInTheDocument();
    expect(screen.queryByText("Google Calendar")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Conectar Google" })).not.toBeInTheDocument();
  });

  it("sigue mostrando Google a quien ya lo tiene conectado, para poder desconectarlo", async () => {
    calendarAPI.listConnections.mockResolvedValue([
      { provider: "google", status: "active", provider_account_email: "ana@gmail.com" },
    ]);
    renderSection();

    expect(await screen.findByText("Google Calendar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desconectar" })).toBeInTheDocument();
  });
});
