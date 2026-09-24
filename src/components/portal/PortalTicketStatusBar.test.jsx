import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import PortalTicketStatusBar from "./PortalTicketStatusBar";

const ticket = (overrides = {}) => ({ id: 1, status: "open", assigned_agent: null, team: null, ...overrides });

describe("PortalTicketStatusBar", () => {
  it("explica un ticket sin asignar", () => {
    render(<PortalTicketStatusBar ticket={ticket()} />);
    expect(screen.getByText(/Sin asignar: lo revisará el equipo/)).toBeInTheDocument();
  });

  it("explica un ticket en cola de equipo", () => {
    render(<PortalTicketStatusBar ticket={ticket({ team: { id: 3, name: "Soporte N1" } })} />);
    expect(screen.getByText(/en la cola de Soporte N1/)).toBeInTheDocument();
  });

  it("explica un ticket pendiente", () => {
    render(<PortalTicketStatusBar ticket={ticket({ status: "pending" })} />);
    expect(screen.getByText(/Pendiente: esperamos tu respuesta/)).toBeInTheDocument();
  });

  it("en resuelto ofrece confirmar o reabrir", async () => {
    const onConfirmResolution = vi.fn().mockResolvedValue();
    const onReopen = vi.fn().mockResolvedValue();
    render(<PortalTicketStatusBar ticket={ticket({ status: "resolved" })} onConfirmResolution={onConfirmResolution} onReopen={onReopen} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirmar solución" }));
    });
    expect(onConfirmResolution).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sigue sin funcionar" }));
    });
    expect(onReopen).toHaveBeenCalledTimes(1);
  });

  it("si la acción falla lo anuncia", async () => {
    render(
      <PortalTicketStatusBar
        ticket={ticket({ status: "resolved" })}
        onConfirmResolution={vi.fn().mockRejectedValue(new Error("x"))}
        onReopen={vi.fn()}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirmar solución" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos confirmar la solución");
  });

  it("en otros estados no muestra los botones", () => {
    render(<PortalTicketStatusBar ticket={ticket({ status: "closed" })} />);
    expect(screen.getByText(/Si respondes, se reabrirá/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
