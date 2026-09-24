import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PortalLayout from "./PortalLayout";

vi.mock("../../utils/portalApi", () => ({
  getPortalToken: vi.fn(() => "portal-token"),
  clearPortalToken: vi.fn(),
  getPortalOrgSlug: vi.fn(() => "acme"),
  portalAPI: { logout: vi.fn() },
}));

describe("PortalLayout", () => {
  it("ocupa la altura de la ventana y deja el scroll a su contenido", () => {
    const { container } = render(
      <MemoryRouter>
        <PortalLayout organization={{ name: "Acme" }}>
          <p>contenido</p>
        </PortalLayout>
      </MemoryRouter>
    );
    expect(container.firstChild).toHaveClass("h-dvh", "overflow-hidden");
    expect(container.querySelector("main")).toHaveClass("min-h-0", "overflow-hidden");
  });
});
