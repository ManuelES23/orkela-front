import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PortalAccessConsume from "./PortalAccessConsume";
import {
  portalAPI,
  getPortalToken,
  setPortalToken,
  setPortalOrgSlug,
  clearPortalToken,
} from "../../utils/portalApi";

vi.mock("../../utils/portalApi", () => ({
  portalAPI: { exchangeAccess: vi.fn(), me: vi.fn() },
  getPortalToken: vi.fn(),
  setPortalToken: vi.fn(),
  clearPortalToken: vi.fn(),
  getPortalOrgSlug: vi.fn(() => null),
  setPortalOrgSlug: vi.fn(),
}));

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/portal/access/:token" element={<PortalAccessConsume />} />
        <Route path="/portal/dashboard" element={<p>Bandeja del portal</p>} />
        <Route path="/portal/tickets/:id" element={<p>Ticket abierto</p>} />
        <Route path="/admin" element={<p>Panel admin</p>} />
      </Routes>
    </MemoryRouter>
  );

const enter = () => fireEvent.click(screen.getByRole("button", { name: /Entrar al portal/ }));

describe("PortalAccessConsume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPortalToken.mockReturnValue(null);
  });

  it("si me() falla una vez tras el canje, reintenta con la sesión guardada", async () => {
    portalAPI.exchangeAccess.mockResolvedValue({ token: "sesion" });
    portalAPI.me
      .mockRejectedValueOnce(httpError(500))
      .mockResolvedValueOnce({ organization: { slug: "acme" } });

    renderAt("/portal/access/abc?org=acme");
    enter();

    expect(await screen.findByText("Bandeja del portal", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(setPortalToken).toHaveBeenCalledWith("sesion");
    expect(setPortalOrgSlug).toHaveBeenCalledWith("acme");
    expect(portalAPI.me).toHaveBeenCalledTimes(2);
  });

  it("si me() sigue fallando, entra igual con el slug del correo (la bandeja tiene su Reintentar)", async () => {
    portalAPI.exchangeAccess.mockResolvedValue({ token: "sesion" });
    portalAPI.me.mockRejectedValue(httpError(500));

    renderAt("/portal/access/abc?org=acme&redirect=%2Fportal%2Ftickets%2F7");
    enter();

    expect(await screen.findByText("Ticket abierto", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(setPortalOrgSlug).toHaveBeenCalledWith("acme");
  });

  it("un 410 con una sesión válida en el navegador entra directamente", async () => {
    getPortalToken.mockReturnValue("sesion-previa");
    portalAPI.exchangeAccess.mockRejectedValue(httpError(410));
    portalAPI.me.mockResolvedValue({ organization: { slug: "acme" } });

    renderAt("/portal/access/abc?org=acme&redirect=%2Fportal%2Ftickets%2F7");
    enter();

    expect(await screen.findByText("Ticket abierto")).toBeInTheDocument();
  });

  it("un 410 sin sesión válida explica el motivo y ofrece pedir un enlace nuevo con el slug del correo", async () => {
    getPortalToken.mockReturnValue("sesion-caducada");
    portalAPI.exchangeAccess.mockRejectedValue(httpError(410));
    portalAPI.me.mockRejectedValue(httpError(401));

    renderAt("/portal/access/abc?org=acme");
    enter();

    expect(await screen.findByText(/Este enlace ya se usó o venció/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pedir un enlace nuevo" })).toHaveAttribute("href", "/portal/acme");
    expect(clearPortalToken).toHaveBeenCalled();
  });

  it("un 410 con una sesión guardada de OTRA organización no entra con ella (I-2)", async () => {
    getPortalToken.mockReturnValue("sesion-de-otro-contacto");
    portalAPI.exchangeAccess.mockRejectedValue(httpError(410));
    // La sesión guardada en este navegador compartido es de una organización
    // distinta a la del enlace que se está canjeando.
    portalAPI.me.mockResolvedValue({ organization: { slug: "otra-org" } });

    renderAt("/portal/access/abc?org=acme&redirect=%2Fportal%2Ftickets%2F7");
    enter();

    expect(await screen.findByText(/Este enlace ya se usó o venció/)).toBeInTheDocument();
    expect(screen.queryByText("Ticket abierto")).not.toBeInTheDocument();
    expect(clearPortalToken).toHaveBeenCalled();
    expect(setPortalOrgSlug).not.toHaveBeenCalledWith("otra-org");
  });

  it("ignora un slug con caracteres no válidos", async () => {
    portalAPI.exchangeAccess.mockRejectedValue(httpError(410));

    renderAt("/portal/access/abc?org=..%2Fadmin");
    enter();

    expect(await screen.findByText(/Pide un enlace nuevo al equipo de soporte/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pedir un enlace nuevo" })).not.toBeInTheDocument();
  });

  it("un redirect con segmentos .. que escapan de /portal/ cae a la bandeja", async () => {
    portalAPI.exchangeAccess.mockResolvedValue({ token: "sesion" });
    portalAPI.me.mockResolvedValue({ organization: { slug: "acme" } });

    renderAt("/portal/access/abc?org=acme&redirect=%2Fportal%2F..%2Fadmin");
    enter();

    expect(await screen.findByText("Bandeja del portal", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText("Panel admin")).not.toBeInTheDocument();
  });
});
