import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import ResetPassword from "./ResetPassword";
import { authAPI, APIError } from "../utils/api";

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  authAPI: { resetPassword: vi.fn() },
}));

const LoginProbe = () => {
  const location = useLocation();
  return <p>login:{location.state?.email}</p>;
};

const renderPage = (query = "?token=tok-1&email=ana%40example.com") =>
  render(
    <MemoryRouter initialEntries={[`/reset-password${query}`]}>
      <Routes>
        <Route path='/reset-password' element={<ResetPassword />} />
        <Route path='/login' element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>
  );

const fillPasswords = (password, confirmation = password) => {
  fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: confirmation } });
};

describe("ResetPassword", () => {
  beforeEach(() => vi.clearAllMocks());

  it("guarda la nueva contraseña y vuelve al login con el email", async () => {
    authAPI.resetPassword.mockResolvedValue({ message: "ok" });
    renderPage();

    fillPasswords("NuevaClave123");
    fireEvent.click(screen.getByRole("button", { name: /guardar contraseña/i }));

    expect(await screen.findByText("login:ana@example.com")).toBeInTheDocument();
    expect(authAPI.resetPassword).toHaveBeenCalledWith({
      token: "tok-1",
      email: "ana@example.com",
      password: "NuevaClave123",
      password_confirmation: "NuevaClave123",
    });
  });

  it("no envía una contraseña que no cumple las reglas", () => {
    renderPage();

    fillPasswords("debil");
    fireEvent.click(screen.getByRole("button", { name: /guardar contraseña/i }));

    expect(authAPI.resetPassword).not.toHaveBeenCalled();
    expect(screen.getByRole("list", { name: "Requisitos de la contraseña" })).toBeInTheDocument();
  });

  it("no envía si las contraseñas no coinciden", () => {
    renderPage();

    fillPasswords("NuevaClave123", "OtraClave123");
    fireEvent.click(screen.getByRole("button", { name: /guardar contraseña/i }));

    expect(authAPI.resetPassword).not.toHaveBeenCalled();
    expect(screen.getByText("Las contraseñas no coinciden")).toBeInTheDocument();
  });

  it("ofrece pedir un nuevo enlace cuando el token es inválido", async () => {
    authAPI.resetPassword.mockRejectedValue(new APIError("inválido", 400, { code: "link_invalid" }));
    renderPage();

    fillPasswords("NuevaClave123");
    fireEvent.click(screen.getByRole("button", { name: /guardar contraseña/i }));

    expect(await screen.findByRole("link", { name: /pedir un nuevo enlace/i })).toHaveAttribute("href", "/forgot-password");
  });

  it("sin token en la URL muestra directamente el estado de enlace inválido", () => {
    renderPage("");

    expect(screen.getByRole("link", { name: /pedir un nuevo enlace/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
  });
});
