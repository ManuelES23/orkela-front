import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ForgotPassword from "./ForgotPassword";
import { authAPI, APIError } from "../utils/api";

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  authAPI: { forgotPassword: vi.fn() },
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>
  );

const submitEmail = (email) => {
  fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: /enviar enlace/i }));
};

describe("ForgotPassword", () => {
  beforeEach(() => vi.clearAllMocks());

  it("envía el correo y muestra una confirmación genérica", async () => {
    authAPI.forgotPassword.mockResolvedValue({ message: "ok" });
    renderPage();

    submitEmail("ana@example.com");

    expect(await screen.findByRole("status")).toHaveTextContent("ana@example.com");
    expect(authAPI.forgotPassword).toHaveBeenCalledWith("ana@example.com");
    expect(screen.getByRole("link", { name: /volver a iniciar sesión/i })).toHaveAttribute("href", "/login");
  });

  it("muestra el tiempo de espera cuando hay demasiados intentos", async () => {
    authAPI.forgotPassword.mockRejectedValue(new APIError("Too Many Attempts.", 429, { retryAfter: 30 }));
    renderPage();

    submitEmail("ana@example.com");

    expect(await screen.findByRole("alert")).toHaveTextContent("Espera 30 segundos");
  });
});
