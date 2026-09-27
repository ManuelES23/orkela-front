import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AttachmentPicker, { AttachButton, pasteHandler, dropHandlers } from "./AttachmentPicker";

const makeUploads = (overrides = {}) => ({
  items: [],
  ids: [],
  isUploading: false,
  hasErrors: false,
  notice: null,
  addFiles: vi.fn(),
  retry: vi.fn(),
  remove: vi.fn(),
  ...overrides,
});
const png = new File([new Uint8Array(3)], "c.png", { type: "image/png" });

describe("AttachmentPicker", () => {
  it("el botón clip abre el selector y entrega los archivos", () => {
    const uploads = makeUploads();
    render(<AttachButton uploads={uploads} />);

    const input = screen.getByLabelText("Adjuntar imágenes", { selector: "input" });
    fireEvent.change(input, { target: { files: [png] } });

    expect(uploads.addFiles).toHaveBeenCalledWith([png]);
    expect(screen.getByRole("button", { name: "Adjuntar imágenes" })).toBeInTheDocument();
  });

  it("pegar una captura la añade; pegar texto no hace nada", () => {
    const uploads = makeUploads();
    const handler = pasteHandler(uploads);
    const withImage = { clipboardData: { files: [png] }, preventDefault: vi.fn() };
    const withText = { clipboardData: { files: [] }, preventDefault: vi.fn() };

    handler(withImage);
    handler(withText);

    expect(uploads.addFiles).toHaveBeenCalledTimes(1);
    expect(withImage.preventDefault).toHaveBeenCalled();
    expect(withText.preventDefault).not.toHaveBeenCalled();
  });

  it("soltar archivos los añade", () => {
    const uploads = makeUploads();
    const setDragging = vi.fn();
    const handlers = dropHandlers(uploads, setDragging);
    const event = { preventDefault: vi.fn(), dataTransfer: { files: [png], types: ["Files"] } };

    handlers.onDragEnter(event);
    handlers.onDrop(event);

    expect(setDragging).toHaveBeenLastCalledWith(false);
    expect(uploads.addFiles).toHaveBeenCalledWith([png]);
  });

  it("inline: miniaturas con progreso, error con reintento y quitar", () => {
    const uploads = makeUploads({
      items: [
        { key: "a", name: "a.png", previewUrl: "blob:a", status: "uploading", progress: 40, error: null },
        { key: "b", name: "b.png", previewUrl: "blob:b", status: "error", progress: 0, error: "La imagen supera los 5 MB." },
      ],
      hasErrors: true,
    });
    render(<AttachmentPicker uploads={uploads} variant='inline' />);

    expect(screen.getByRole("progressbar", { name: "Subiendo a.png" })).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("b.png: La imagen supera los 5 MB.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar b.png" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar a.png" }));
    expect(uploads.retry).toHaveBeenCalledWith("b");
    expect(uploads.remove).toHaveBeenCalledWith("a");
  });

  it("dropzone: zona con texto de ayuda y filas con nombre y peso", () => {
    const uploads = makeUploads({
      items: [{ key: "a", name: "captura.png", size: 412 * 1024, previewUrl: "blob:a", status: "done", progress: 100, error: null }],
    });
    render(<AttachmentPicker uploads={uploads} variant='dropzone' />);

    expect(screen.getByText(/Arrastra, pega o/)).toBeInTheDocument();
    expect(screen.getByText("412 KB")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar captura.png" })).toBeInTheDocument();
  });

  it("anuncia el aviso de máximo", () => {
    render(<AttachmentPicker uploads={makeUploads({ notice: "Máximo 5 imágenes." })} variant='dropzone' />);
    expect(screen.getByText("Máximo 5 imágenes.")).toBeInTheDocument();
  });
});
