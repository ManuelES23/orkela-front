import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AttachmentViewer from "./AttachmentViewer";
import { attachmentsAPI } from "../../utils/attachmentsApi";

vi.mock("../../utils/attachmentsApi", async (importOriginal) => ({
  ...(await importOriginal()),
  attachmentsAPI: { getBlob: vi.fn(), upload: vi.fn(), remove: vi.fn() },
}));

const attachments = [
  { id: 1, name: "uno.png", mime: "image/png", size: 10 },
  { id: 2, name: "dos.png", mime: "image/png", size: 10 },
];

describe("AttachmentViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    attachmentsAPI.getBlob.mockResolvedValue(new Blob(["x"], { type: "image/png" }));
  });

  it("muestra la imagen actual y navega con flechas", async () => {
    const onIndexChange = vi.fn();
    render(<AttachmentViewer scope='staff' attachments={attachments} index={0} isOpen onClose={vi.fn()} onIndexChange={onIndexChange} />);

    expect(await screen.findByRole("img", { name: "uno.png" })).toBeInTheDocument();
    expect(screen.getByText("1 de 2")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "Imagen anterior" }));
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  describe("descarga", () => {
    let clickSpy;
    let revokeSpy;
    let clicked = null;

    beforeEach(() => {
      clicked = null;
      // jsdom no implementa la navegación de un <a download>: se captura el clic.
      clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
        clicked = { download: this.download, href: this.href };
      });
      revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    });

    afterEach(() => {
      clickSpy.mockRestore();
      revokeSpy.mockRestore();
    });

    it("descarga con el nombre original", async () => {
      render(<AttachmentViewer scope='portal' attachments={attachments} index={1} isOpen onClose={vi.fn()} onIndexChange={vi.fn()} />);

      fireEvent.click(await screen.findByRole("button", { name: "Descargar dos.png" }));

      await waitFor(() => expect(attachmentsAPI.getBlob).toHaveBeenCalledWith("portal", 2, { download: true }));
      await waitFor(() => expect(clicked).not.toBeNull());
      expect(clicked.download).toBe("dos.png");
      expect(clicked.href).toMatch(/^blob:/);
      expect(revokeSpy).toHaveBeenCalledWith(clicked.href);
    });
  });

  it("eliminar pide confirmación", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<AttachmentViewer scope='staff' attachments={attachments} index={0} isOpen onClose={vi.fn()} onIndexChange={vi.fn()} onDelete={onDelete} />);

    fireEvent.click(await screen.findByRole("button", { name: "Eliminar uno.png" }));
    fireEvent.click(await screen.findByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(attachments[0]));
  });

  it("si eliminar falla, avisa y deja la confirmación abierta", async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error("boom"));
    const onClose = vi.fn();
    render(<AttachmentViewer scope='staff' attachments={attachments} index={0} isOpen onClose={onClose} onIndexChange={vi.fn()} onDelete={onDelete} />);

    fireEvent.click(await screen.findByRole("button", { name: "Eliminar uno.png" }));
    fireEvent.click(await screen.findByRole("button", { name: "Eliminar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo eliminar la imagen. Reintenta.");
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeEnabled();

    // Al cancelar y volver a abrir, el aviso desaparece.
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("Escape cierra", async () => {
    const onClose = vi.fn();
    render(<AttachmentViewer scope='staff' attachments={attachments} index={0} isOpen onClose={onClose} onIndexChange={vi.fn()} />);
    await screen.findByRole("img", { name: "uno.png" });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });
});
