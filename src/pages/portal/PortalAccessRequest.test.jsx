import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PortalAccessRequest from "./PortalAccessRequest";
import { portalAPI } from "../../utils/portalApi";

vi.mock("../../utils/portalApi", () => ({
  portalAPI: { getOrgInfo: vi.fn(), requestAccess: vi.fn() },
}));

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

const renderAt = (orgSlug) =>
  render(
    <MemoryRouter initialEntries={[`/portal/${orgSlug}`]}>
      <Routes>
        <Route path="/portal/:orgSlug" element={<PortalAccessRequest />} />
      </Routes>
    </MemoryRouter>
  );

describe("PortalAccessRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("un slug que no existe muestra que no se encontró el portal", async () => {
    portalAPI.getOrgInfo.mockRejectedValue(httpError(404));

    renderAt("no-existe");

    expect(
      await screen.findByRole("heading", { level: 1, name: "No encontramos este portal" })
    ).toBeInTheDocument();
  });

  it("un 429 del throttle de org-info muestra un mensaje de límite, no de portal inexistente (I-3)", async () => {
    portalAPI.getOrgInfo.mockRejectedValue(httpError(429));

    renderAt("acme");

    expect(await screen.findByText(/Demasiados intentos/)).toBeInTheDocument();
    expect(
      screen.queryByText(/No encontramos este portal de soporte/)
    ).not.toBeInTheDocument();
  });

  it("carga la organización y muestra el formulario con campos etiquetados", async () => {
    portalAPI.getOrgInfo.mockResolvedValue({ name: "Acme", logo: null });

    renderAt("acme");

    expect(await screen.findByText("Acme")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Accede a tus tickets" })).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute("type", "email");
    expect(screen.getByRole("button", { name: /Enviar enlace de acceso/ })).toBeInTheDocument();
  });

  it("anuncia el error de envío", async () => {
    portalAPI.getOrgInfo.mockResolvedValue({ name: "Acme", logo: null });
    portalAPI.requestAccess.mockRejectedValue(new Error("red"));

    renderAt("acme");

    fireEvent.change(await screen.findByLabelText("Correo electrónico"), { target: { value: "ana@acme.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Enviar enlace de acceso/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo enviar el enlace");
  });
});
