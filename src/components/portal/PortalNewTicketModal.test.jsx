import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PortalNewTicketModal from "./PortalNewTicketModal";

const fill = () => {
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Acceso" } });
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Necesito acceso al panel" } });
};

describe("PortalNewTicketModal", () => {
  it("es un diálogo accesible con título y se cierra con Escape", () => {
    const onClose = vi.fn();
    render(<PortalNewTicketModal isOpen onClose={onClose} onCreate={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Nuevo ticket" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("ofrece Solicitud y admite 5000 caracteres", () => {
    render(<PortalNewTicketModal isOpen onClose={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.getByRole("option", { name: "Solicitud" })).toBeInTheDocument();
    expect(screen.getByLabelText("Descripción")).toHaveAttribute("maxLength", "5000");
  });

  it("crea un ticket de tipo request", async () => {
    const onCreate = vi.fn().mockResolvedValue();
    render(<PortalNewTicketModal isOpen onClose={vi.fn()} onCreate={onCreate} />);
    fill();
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "request" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear ticket" }));
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({ title: "Acceso", description: "Necesito acceso al panel", type: "request", priority: "medium" })
    );
  });

  it("anuncia el error al crear", async () => {
    render(<PortalNewTicketModal isOpen onClose={vi.fn()} onCreate={vi.fn().mockRejectedValue(new Error("x"))} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Crear ticket" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo crear el ticket");
  });
});
