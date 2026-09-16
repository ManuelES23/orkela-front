import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AccessSecuritySection from "./AccessSecuritySection";
import { socialAuthAPI, profileAPI, APIError } from "../../utils/api";

const success = vi.fn();
const showError = vi.fn();

vi.mock("../../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  socialAuthAPI: { identities: vi.fn(), linkIntent: vi.fn(), unlink: vi.fn() },
  profileAPI: { createPassword: vi.fn(), changePassword: vi.fn() },
}));
vi.mock("../../context/NotificationContext", () => ({
  useNotification: () => ({ success, error: showError }),
}));

const GOOGLE = { provider: "google", email: "ana.torres@gmail.com", linked_at: "2026-09-12T10:00:00Z" };

const renderSection = (entry = "/settings") =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <AccessSecuritySection />
    </MemoryRouter>
  );

describe("AccessSecuritySection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra cuántas formas de entrar están activas y permite desconectar", async () => {
    socialAuthAPI.identities.mockResolvedValue({ has_password: true, identities: [GOOGLE] });
    socialAuthAPI.unlink.mockResolvedValue({});
    renderSection();

    expect(await screen.findByText("2 de 3 formas de entrar activas")).toBeInTheDocument();
    expect(screen.getByText("ana.torres@gmail.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Desconectar Google" }));
    fireEvent.click(await screen.findByRole("button", { name: "Desconectar" }));

    await vi.waitFor(() => expect(socialAuthAPI.unlink).toHaveBeenCalledWith("google"));
    expect(await screen.findByText("1 de 3 formas de entrar activas")).toBeInTheDocument();
  });

  it("no deja desconectar el único método y ofrece crear contraseña", async () => {
    socialAuthAPI.identities.mockResolvedValue({ has_password: false, identities: [GOOGLE] });
    renderSection();

    expect(await screen.findByText("1 de 3 formas de entrar activas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desconectar Google" })).toBeDisabled();
    expect(screen.getByText(/única forma de entrar/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear contraseña" })).toBeInTheDocument();
  });

  it("crea la contraseña y actualiza el medidor", async () => {
    socialAuthAPI.identities.mockResolvedValue({ has_password: false, identities: [GOOGLE] });
    profileAPI.createPassword.mockResolvedValue({});
    renderSection();

    fireEvent.click(await screen.findByRole("button", { name: "Crear contraseña" }));
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "Clave1234" } });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "Clave1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    await vi.waitFor(() => expect(profileAPI.createPassword).toHaveBeenCalledWith("Clave1234", "Clave1234"));
    expect(await screen.findByText("2 de 3 formas de entrar activas")).toBeInTheDocument();
  });

  it("conectar pide la intención de vincular al proveedor", async () => {
    socialAuthAPI.identities.mockResolvedValue({ has_password: true, identities: [GOOGLE] });
    socialAuthAPI.linkIntent.mockRejectedValue(new APIError("x", 429, { retryAfter: 30 }));
    renderSection();

    fireEvent.click(await screen.findByRole("button", { name: "Conectar Microsoft" }));

    await vi.waitFor(() => expect(socialAuthAPI.linkIntent).toHaveBeenCalledWith("microsoft"));
    expect(showError).toHaveBeenCalledWith(expect.stringContaining("30 segundos"));
  });

  it("avisa el resultado de una conexión al volver del proveedor", async () => {
    socialAuthAPI.identities.mockResolvedValue({ has_password: true, identities: [GOOGLE] });
    render(
      <MemoryRouter initialEntries={[{ pathname: "/settings", state: { socialLinked: "google" } }]}>
        <AccessSecuritySection />
      </MemoryRouter>
    );

    await vi.waitFor(() => expect(success).toHaveBeenCalledWith("Google conectada"));
  });

  it("avisa si se canceló la conexión", async () => {
    socialAuthAPI.identities.mockResolvedValue({ has_password: true, identities: [] });
    renderSection("/settings?social_link_error=microsoft");

    await vi.waitFor(() => expect(showError).toHaveBeenCalledWith("No se completó la conexión con Microsoft."));
  });
});
