import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VerifyEmail from "./VerifyEmail";
import { authAPI, APIError } from "../utils/api";

const completeLogin = vi.fn();
const loginWithResult = vi.fn((data) => data.user);

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  authAPI: { verifyEmail: vi.fn(), resendVerification: vi.fn() },
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ loginWithResult }) }));
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

const LINK = "?id=7&hash=abc&expires=123&signature=sig";

const renderPage = (query = LINK) =>
  render(
    <MemoryRouter initialEntries={[`/verify-email${query}`]}>
      <VerifyEmail />
    </MemoryRouter>
  );

describe("VerifyEmail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("confirma el correo con los parámetros del enlace e inicia sesión", async () => {
    authAPI.verifyEmail.mockResolvedValue({ user: { id: 7 }, token: "t" });
    renderPage();

    expect(screen.getByText("Confirmando tu correo...")).toBeInTheDocument();
    await vi.waitFor(() => expect(completeLogin).toHaveBeenCalledWith({ id: 7 }));
    expect(authAPI.verifyEmail).toHaveBeenCalledTimes(1);
    expect(authAPI.verifyEmail).toHaveBeenCalledWith({ id: "7", hash: "abc", expires: "123", signature: "sig" });
    expect(loginWithResult).toHaveBeenCalledWith({ user: { id: 7 }, token: "t" });
  });

  it("si ya estaba confirmado ofrece iniciar sesión", async () => {
    authAPI.verifyEmail.mockRejectedValue(new APIError("ya", 409, { code: "already_verified" }));
    renderPage();

    expect(await screen.findByText("Tu correo ya está confirmado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/login");
    expect(completeLogin).not.toHaveBeenCalled();
  });

  it("si el enlace venció permite pedir uno nuevo", async () => {
    authAPI.verifyEmail.mockRejectedValue(new APIError("venció", 410, { code: "link_expired" }));
    authAPI.resendVerification.mockResolvedValue({ message: "ok" });
    renderPage();

    expect(await screen.findByText("El enlace venció")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "ana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Reenviar correo" }));

    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(authAPI.resendVerification).toHaveBeenCalledWith("ana@example.com");
  });

  it("sin parámetros muestra enlace no válido sin llamar a la API", () => {
    renderPage("");

    expect(screen.getByText("Enlace no válido")).toBeInTheDocument();
    expect(authAPI.verifyEmail).not.toHaveBeenCalled();
  });
});
