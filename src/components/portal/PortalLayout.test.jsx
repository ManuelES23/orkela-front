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

  // El backend guarda el logo como ruta relativa (/storage/logos/...). Sin
  // resolverla contra el host de la API, el navegador la pide al host del
  // frontend (otro dominio en producción) y la imagen no carga.
  it("resuelve el logo relativo de la organización contra el host de la API", () => {
    const { container } = render(
      <MemoryRouter>
        <PortalLayout organization={{ name: "Acme", logo: "/storage/logos/org_1_1.png" }}>
          <p>contenido</p>
        </PortalLayout>
      </MemoryRouter>
    );
    expect(container.querySelector("header img").getAttribute("src")).toMatch(
      /^https?:\/\/.+\/storage\/logos\/org_1_1\.png$/
    );
  });

  it("sin logo usa el isotipo de Orkela local", () => {
    const { container } = render(
      <MemoryRouter>
        <PortalLayout organization={{ name: "Acme", logo: null }}>
          <p>contenido</p>
        </PortalLayout>
      </MemoryRouter>
    );
    expect(container.querySelector("header img")).toHaveAttribute("src", "/img/isotipo_orkela.png");
  });
});
