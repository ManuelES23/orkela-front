import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import MobileMenu from "./MobileMenu";

const perms = { canTriageClients: true };

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: "Marta",
      email: "marta@org.test",
      organization_id: 1,
      organization: { name: "Org" },
      is_organization_owner: false,
      organization_role: "manager",
    },
    logout: vi.fn(),
  }),
}));
vi.mock("../../context/ThemeContext", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }));
vi.mock("../../hooks/useOrganizationPermissions", () => ({
  useUserContext: () => ({ isOrganizationContext: true }),
  useOrganizationPermissions: () => perms,
}));
vi.mock("../ui/ContextSwitcher", () => ({ default: () => null }));
vi.mock("../ui/UserAvatar", () => ({ default: () => null }));

let location;
const LocationProbe = () => {
  location = useLocation();
  return null;
};
const renderMenu = (onClose = vi.fn()) =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <MobileMenu isOpen onClose={onClose} />
      <LocationProbe />
    </MemoryRouter>
  );

describe("MobileMenu (menú «Más»)", () => {
  beforeEach(() => {
    perms.canTriageClients = true;
  });

  it("quien hace triage ve Clientes y Bandeja de Clientes y navega", () => {
    const onClose = vi.fn();
    renderMenu(onClose);

    expect(screen.getByRole("button", { name: "Clientes" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Bandeja de Clientes" }));

    expect(location.pathname).toBe("/client-tickets");
    expect(onClose).toHaveBeenCalled();
  });

  it("un member no ve ninguna de las dos", () => {
    perms.canTriageClients = false;
    renderMenu();

    expect(screen.queryByRole("button", { name: "Clientes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bandeja de Clientes" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Configuración" })).toBeInTheDocument();
  });

  it("el botón de cerrar tiene nombre accesible", () => {
    const onClose = vi.fn();
    renderMenu(onClose);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar menú" }));
    expect(onClose).toHaveBeenCalled();
  });
});
