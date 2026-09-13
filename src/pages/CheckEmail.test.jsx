import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CheckEmail from "./CheckEmail";
import { authAPI } from "../utils/api";

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  authAPI: { resendVerification: vi.fn() },
}));

const renderPage = (state = { email: "ana@example.com" }) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: "/check-email", state }]}>
      <CheckEmail />
    </MemoryRouter>
  );

describe("CheckEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  it("muestra el correo y habilita el reenvío tras 60 segundos", async () => {
    authAPI.resendVerification.mockResolvedValue({ message: "ok" });
    renderPage();

    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reenviar correo en 60s" })).toBeDisabled();

    for (let i = 0; i < 60; i++) {
      act(() => vi.advanceTimersByTime(1000));
    }

    fireEvent.click(screen.getByRole("button", { name: "Reenviar correo" }));
    await act(async () => {});

    expect(authAPI.resendVerification).toHaveBeenCalledWith("ana@example.com");
    expect(screen.getByRole("button", { name: "Reenviar correo en 60s" })).toBeDisabled();
  });

  it("sin email en el state no ofrece reenvío y enlaza al login", () => {
    renderPage(null);

    expect(screen.queryByRole("button", { name: /reenviar/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/login");
  });
});
