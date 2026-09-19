import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "./Sidebar";

let mockUser;
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    logout: vi.fn(),
    hasMultipleContexts: () => false,
    getActiveContext: () => null,
  }),
}));
vi.mock("../../context/ThemeContext", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }));

const renderSidebar = () =>
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  );

describe("Sidebar", () => {
  beforeEach(() => {
    mockUser = {
      id: 1,
      name: "Ana",
      email: "ana@acme.com",
      organization_id: 4,
      organization: { id: 4, name: "Acme" },
      active_context: "4",
      is_organization_owner: false,
      organization_role: "member",
    };
  });

  it("un member no ve Clientes ni la Bandeja de Clientes", () => {
    renderSidebar();

    expect(screen.getByRole("link", { name: "Tickets" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Clientes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Bandeja de Clientes" })).not.toBeInTheDocument();
  });

  it("un manager ve Clientes y la Bandeja de Clientes", () => {
    mockUser.organization_role = "manager";
    renderSidebar();

    expect(screen.getByRole("link", { name: "Clientes" })).toHaveAttribute("href", "/clients");
    expect(screen.getByRole("link", { name: "Bandeja de Clientes" })).toHaveAttribute("href", "/client-tickets");
  });
});
