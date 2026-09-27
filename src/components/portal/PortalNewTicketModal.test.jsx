import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PortalNewTicketModal from "./PortalNewTicketModal";
import { attachmentsAPI } from "../../utils/attachmentsApi";

vi.mock("../../utils/attachmentsApi", async (importOriginal) => ({
  ...(await importOriginal()),
  attachmentsAPI: { upload: vi.fn(), remove: vi.fn().mockResolvedValue(undefined), getBlob: vi.fn() },
}));

const pngFile = () => new File([new Uint8Array(3)], "c.png", { type: "image/png" });
const addImage = () =>
  fireEvent.change(screen.getByLabelText("Adjuntar imágenes", { selector: "input" }), { target: { files: [pngFile()] } });

const fill = () => {
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Acceso" } });
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Necesito acceso al panel" } });
};

describe("PortalNewTicketModal", () => {
  beforeEach(() => vi.clearAllMocks());

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
      expect(onCreate).toHaveBeenCalledWith({ title: "Acceso", description: "Necesito acceso al panel", type: "request", priority: "medium", attachment_ids: [] })
    );
  });

  it("anuncia el error al crear", async () => {
    render(<PortalNewTicketModal isOpen onClose={vi.fn()} onCreate={vi.fn().mockRejectedValue(new Error("x"))} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Crear ticket" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo crear el ticket");
  });

  it("crea el ticket con las imágenes subidas", async () => {
    attachmentsAPI.upload.mockResolvedValue({ id: 11, name: "c.png", mime: "image/png", size: 3 });
    const onCreate = vi.fn().mockResolvedValue({ id: 1 });
    render(<PortalNewTicketModal isOpen onClose={vi.fn()} onCreate={onCreate} />);
    fill();
    addImage();
    await waitFor(() => expect(attachmentsAPI.upload).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Crear ticket" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ attachment_ids: [11] })));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Quitar c.png" })).not.toBeInTheDocument());
    expect(attachmentsAPI.remove).not.toHaveBeenCalled();
  });

  it("no crea mientras una imagen sube y avisa", async () => {
    attachmentsAPI.upload.mockReturnValue(new Promise(() => {}));
    const onCreate = vi.fn();
    render(<PortalNewTicketModal isOpen onClose={vi.fn()} onCreate={onCreate} />);
    fill();
    addImage();
    fireEvent.click(screen.getByRole("button", { name: "Crear ticket" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Espera a que terminen de subir las imágenes o quita las que fallaron.");
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("al cerrar sin crear descarta las imágenes ya subidas", async () => {
    attachmentsAPI.upload.mockResolvedValue({ id: 12, name: "c.png", mime: "image/png", size: 3 });
    const onClose = vi.fn();
    render(<PortalNewTicketModal isOpen onClose={onClose} onCreate={vi.fn()} />);
    addImage();
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());

    fireEvent.keyDown(document, { key: "Escape" });

    expect(attachmentsAPI.remove).toHaveBeenCalledWith("portal", 12);
    expect(onClose).toHaveBeenCalled();
  });
});
