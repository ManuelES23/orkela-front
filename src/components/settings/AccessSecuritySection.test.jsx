import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
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
    <StrictMode>
      <MemoryRouter initialEntries={[entry]}>
        <AccessSecuritySection />
      </MemoryRouter>
    </StrictMode>
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

  it("avisa el resultado de la conexión una sola vez en StrictMode", async () => {
    socialAuthAPI.identities.mockResolvedValue({ has_password: true, identities: [GOOGLE] });
    render(
      <StrictMode>
        <MemoryRouter initialEntries={[{ pathname: "/settings", state: { socialLinked: "google" } }]}>
          <AccessSecuritySection />
        </MemoryRouter>
      </StrictMode>
    );

    await screen.findByText("2 de 3 formas de entrar activas");
    expect(success).toHaveBeenCalledTimes(1);
  });

  it("si no puede cargar muestra el error con reintento y no un medidor en cero", async () => {
    socialAuthAPI.identities.mockRejectedValue(new APIError("x", 500, {}));
    renderSection();

    expect(await screen.findByText("No pudimos cargar tus formas de entrar.")).toBeInTheDocument();
    expect(screen.queryByText(/de 3 formas de entrar activas/)).not.toBeInTheDocument();

    socialAuthAPI.identities.mockResolvedValue({ has_password: true, identities: [] });
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("1 de 3 formas de entrar activas")).toBeInTheDocument();
    expect(screen.queryByText("No pudimos cargar tus formas de entrar.")).not.toBeInTheDocument();
  });

  it("mientras carga no muestra el medidor", () => {
    socialAuthAPI.identities.mockReturnValue(new Promise(() => {}));
    renderSection();

    expect(screen.getByText("Acceso y seguridad")).toBeInTheDocument();
    expect(screen.queryByText(/de 3 formas de entrar activas/)).not.toBeInTheDocument();
  });

  it("libera el botón Conectar al volver con el botón Atrás (bfcache)", async () => {
    socialAuthAPI.identities.mockResolvedValue({ has_password: true, identities: [] });
    socialAuthAPI.linkIntent.mockReturnValue(new Promise(() => {}));
    renderSection();

    fireEvent.click(await screen.findByRole("button", { name: "Conectar Google" }));
    expect(await screen.findByText("Abriendo...")).toBeInTheDocument();

    const event = new Event("pageshow");
    Object.defineProperty(event, "persisted", { value: true });
    act(() => {
      window.dispatchEvent(event);
    });

    await vi.waitFor(() => expect(screen.queryByText("Abriendo...")).not.toBeInTheDocument());
  });

  it("cambiar contraseña exige la contraseña actual", async () => {
    socialAuthAPI.identities.mockResolvedValue({ has_password: true, identities: [GOOGLE] });
    renderSection();

    fireEvent.click(await screen.findByRole("button", { name: "Cambiar contraseña" }));
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "Clave1234" } });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "Clave1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(await screen.findByText("Escribe tu contraseña actual.")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña actual")).toHaveAttribute("aria-invalid", "true");

    // Solo espacios cuenta como vacía (el backend los recorta).
    fireEvent.change(screen.getByLabelText("Contraseña actual"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));
    expect(await screen.findByText("Escribe tu contraseña actual.")).toBeInTheDocument();
    expect(profileAPI.changePassword).not.toHaveBeenCalled();
  });

  it.each([
    ["errors.current_password", { errors: { current_password: ["incorrecta"] } }, "La contraseña actual no es correcta."],
    ["sin errors (respuesta actual del backend)", { message: "La contraseña actual es incorrecta" }, "La contraseña actual no es correcta."],
  ])("muestra el error de la contraseña actual en su campo: %s", async (_, data, message) => {
    socialAuthAPI.identities.mockResolvedValue({ has_password: true, identities: [GOOGLE] });
    profileAPI.changePassword.mockRejectedValue(new APIError(data.message || "x", 422, data));
    renderSection();

    fireEvent.click(await screen.findByRole("button", { name: "Cambiar contraseña" }));
    fireEvent.change(screen.getByLabelText("Contraseña actual"), { target: { value: "Vieja1234" } });
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "Clave1234" } });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "Clave1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    await vi.waitFor(() => expect(profileAPI.changePassword).toHaveBeenCalledWith("Vieja1234", "Clave1234", "Clave1234"));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña actual")).toHaveAttribute("aria-invalid", "true");
  });

  it("avisa si se canceló la conexión", async () => {
    socialAuthAPI.identities.mockResolvedValue({ has_password: true, identities: [] });
    renderSection("/settings?social_link_error=microsoft");

    await vi.waitFor(() => expect(showError).toHaveBeenCalledWith("No se completó la conexión con Microsoft."));
    await screen.findByText("1 de 3 formas de entrar activas");
    expect(showError).toHaveBeenCalledTimes(1);
  });
});
