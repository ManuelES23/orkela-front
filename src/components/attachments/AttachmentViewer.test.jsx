import { describe, it, expect, vi, beforeEach } from "vitest";
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

  it("descarga con el nombre original", async () => {
    render(<AttachmentViewer scope='portal' attachments={attachments} index={1} isOpen onClose={vi.fn()} onIndexChange={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Descargar dos.png" }));

    await waitFor(() => expect(attachmentsAPI.getBlob).toHaveBeenCalledWith("portal", 2, { download: true }));
  });

  it("eliminar pide confirmación", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<AttachmentViewer scope='staff' attachments={attachments} index={0} isOpen onClose={vi.fn()} onIndexChange={vi.fn()} onDelete={onDelete} />);

    fireEvent.click(await screen.findByRole("button", { name: "Eliminar uno.png" }));
    fireEvent.click(await screen.findByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(attachments[0]));
  });

  it("Escape cierra", async () => {
    const onClose = vi.fn();
    render(<AttachmentViewer scope='staff' attachments={attachments} index={0} isOpen onClose={onClose} onIndexChange={vi.fn()} />);
    await screen.findByRole("img", { name: "uno.png" });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });
});
