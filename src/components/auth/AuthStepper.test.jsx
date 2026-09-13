import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import AuthStepper from "./AuthStepper";

const steps = () => within(screen.getByRole("list", { name: "Progreso" })).getAllByRole("listitem");
const states = () => steps().map((li) => li.getAttribute("data-state"));

describe("AuthStepper", () => {
  it("muestra las etiquetas del flujo de recuperación", () => {
    render(<AuthStepper flow='recovery' current={1} status='active' />);

    expect(steps().map((li) => li.textContent)).toEqual([
      expect.stringContaining("Correo"),
      expect.stringContaining("Revisa tu bandeja"),
      expect.stringContaining("Nueva contraseña"),
    ]);
  });

  it("muestra las etiquetas del flujo de registro", () => {
    render(<AuthStepper flow='signup' current={2} status='active' />);

    expect(screen.getByText("Crea tu cuenta")).toBeInTheDocument();
    expect(screen.getByText("Confirma tu correo")).toBeInTheDocument();
    expect(screen.getByText("¡Listo!")).toBeInTheDocument();
  });

  it("marca aria-current solo en el paso actual", () => {
    render(<AuthStepper flow='recovery' current={2} status='active' />);

    const current = steps().map((li) => li.getAttribute("aria-current"));
    expect(current).toEqual([null, "step", null]);
  });

  it("deriva done / estado actual / todo según el paso", () => {
    render(<AuthStepper flow='signup' current={2} status='error' />);

    expect(states()).toEqual(["done", "error", "todo"]);
  });

  it("con current=3 y status=done todos los pasos quedan completos y sin aria-current", () => {
    render(<AuthStepper flow='signup' current={3} status='done' />);

    expect(states()).toEqual(["done", "done", "done"]);
    steps().forEach((li) => expect(li).not.toHaveAttribute("aria-current"));
  });

  it("la barra cuenta el paso actual como completo cuando su estado es done", () => {
    const fillOf = (props) => {
      const { container, unmount } = render(<AuthStepper flow='signup' {...props} />);
      const fill = container.querySelector("[data-fill]").getAttribute("data-fill");
      unmount();
      return Number(fill);
    };

    expect(fillOf({ current: 1, status: "active" })).toBe(0);
    expect(fillOf({ current: 2, status: "active" })).toBe(0.5);
    expect(fillOf({ current: 2, status: "done" })).toBe(1);
    expect(fillOf({ current: 3, status: "done" })).toBe(1);
  });
});
