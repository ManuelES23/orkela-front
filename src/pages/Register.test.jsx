import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import Register from "./Register";

const register = vi.fn();

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ register }) }));

const CheckEmailProbe = () => <p>check-email:{useLocation().state?.email}</p>;

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path='/register' element={<Register />} />
        <Route path='/check-email' element={<CheckEmailProbe />} />
      </Routes>
    </MemoryRouter>
  );

const fill = (password) => {
  fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana" } });
  fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "ana@example.com" } });
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: password } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
};

describe("Register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra el checklist y bloquea contraseñas débiles", () => {
    renderPage();

    fill("debil");

    expect(screen.getByRole("list", { name: "Requisitos de la contraseña" })).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("tras registrarse lleva a revisar el correo", async () => {
    register.mockResolvedValue({ message: "ok" });
    renderPage();

    fill("Password123");

    expect(await screen.findByText("check-email:ana@example.com")).toBeInTheDocument();
    expect(register).toHaveBeenCalledWith("Ana", "ana@example.com", "Password123");
  });
});
