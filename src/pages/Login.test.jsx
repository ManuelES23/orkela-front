import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "./Login";
import { authAPI, APIError } from "../utils/api";

const login = vi.fn();
const completeLogin = vi.fn();

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  authAPI: { resendVerification: vi.fn() },
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ login }) }));
vi.mock("../hooks/usePostLoginRedirect", () => ({
  usePostLoginRedirect: () => ({
    completeLogin,
    showContextModal: false,
    pendingUser: null,
    contextLoading: false,
    handleContextSelect: vi.fn(),
  }),
}));
vi.mock("../components/modals/ContextSelectionModal", () => ({ default: () => null }));

const CheckEmailProbe = () => <p>check-email:{useLocation().state?.email}</p>;

const renderPage = (entry = "/login") =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/check-email' element={<CheckEmailProbe />} />
      </Routes>
    </MemoryRouter>
  );

const fillAndSubmit = () => {
  fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "ana@example.com" } });
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Password1" } });
  fireEvent.click(screen.getByRole("button", { name: /^iniciar sesión$/i }));
};

describe("Login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("enlaza a recuperar contraseña", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveAttribute("href", "/forgot-password");
  });

  it("envía remember cuando se marca Recordarme", async () => {
    login.mockResolvedValue({ id: 1 });
    renderPage();

    fireEvent.click(screen.getByLabelText("Recordarme en este dispositivo"));
    fillAndSubmit();

    await vi.waitFor(() => expect(login).toHaveBeenCalledWith("ana@example.com", "Password1", true));
  });

  it("ante correo sin confirmar permite reenviar y va a revisar el correo", async () => {
    login.mockRejectedValue(new APIError("Confirma", 403, { code: "email_unverified" }));
    authAPI.resendVerification.mockResolvedValue({ message: "ok" });
    renderPage();

    fillAndSubmit();
    expect(await screen.findByRole("status")).toHaveTextContent("Debes confirmar tu correo");
    fireEvent.click(await screen.findByRole("button", { name: "Reenviar correo de confirmación" }));

    expect(await screen.findByText("check-email:ana@example.com")).toBeInTheDocument();
    expect(authAPI.resendVerification).toHaveBeenCalledWith("ana@example.com");
  });

  it("muestra el tiempo de espera ante 429", async () => {
    login.mockRejectedValue(new APIError("Too Many Attempts.", 429, { retryAfter: 55 }));
    renderPage();

    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Espera 55 segundos");
  });

  it.each([
    ["/login?social_error=too_many_attempts", "Demasiados intentos. Espera unos minutos y vuelve a intentarlo."],
    ["/login?social_error=admin_account", "Inicia sesión con tu usuario y contraseña de administrador."],
    ["/login?social_error=google", "No pudimos completar el inicio de sesión. Vuelve a intentarlo."],
    // link_required ya no existe: cae en el mensaje genérico.
    ["/login?social_error=google&reason=link_required", "No pudimos completar el inicio de sesión. Vuelve a intentarlo."],
  ])("explica el error de login social de %s", (entry, message) => {
    renderPage(entry);
    expect(screen.getByRole("alert")).toHaveTextContent(message);
  });
});
