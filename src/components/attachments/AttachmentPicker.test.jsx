import { describe, it, expect, vi, afterEach } from "vitest";
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
  afterEach(() => vi.restoreAllMocks());

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

  it("el botón clip dispara el clic del input oculto", () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    render(<AttachButton uploads={makeUploads()} />);

    fireEvent.click(screen.getByRole("button", { name: "Adjuntar imágenes" }));

    expect(click).toHaveBeenCalledTimes(1);
  });

  it("AttachButton deshabilitado deshabilita también el input", () => {
    render(<AttachButton uploads={makeUploads()} disabled />);
    expect(screen.getByLabelText("Adjuntar imágenes", { selector: "input" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Adjuntar imágenes" })).toBeDisabled();
  });

  it("pegar un archivo que no es imagen no intercepta", () => {
    const uploads = makeUploads();
    const pdf = new File(["x"], "a.pdf", { type: "application/pdf" });
    const event = { clipboardData: { files: [pdf] }, preventDefault: vi.fn() };

    pasteHandler(uploads)(event);

    expect(uploads.addFiles).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("pasteHandler deshabilitado no hace nada", () => {
    const uploads = makeUploads();
    const event = { clipboardData: { files: [png] }, preventDefault: vi.fn() };

    pasteHandler(uploads, { disabled: true })(event);

    expect(uploads.addFiles).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("arrastrar sin archivos se ignora (texto sobre el contenedor no se cancela)", () => {
    const uploads = makeUploads();
    const setDragging = vi.fn();
    const handlers = dropHandlers(uploads, setDragging);
    const event = { preventDefault: vi.fn(), dataTransfer: { files: [], types: ["text/plain"] } };

    handlers.onDragEnter(event);
    handlers.onDragOver(event);
    handlers.onDrop(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(setDragging).not.toHaveBeenCalled();
    expect(uploads.addFiles).not.toHaveBeenCalled();
  });

  it("onDragEnter con archivos activa el estado de arrastre", () => {
    const setDragging = vi.fn();
    const event = { preventDefault: vi.fn(), dataTransfer: { files: [png], types: ["Files"] } };

    dropHandlers(makeUploads(), setDragging).onDragEnter(event);

    expect(setDragging).toHaveBeenCalledWith(true);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("un item inválido oculta el reintento pero muestra su error", () => {
    const uploads = makeUploads({
      items: [{ key: "x", name: "x.pdf", previewUrl: "blob:x", status: "error", progress: 0, error: "Formato no admitido.", invalid: true }],
      hasErrors: true,
    });
    render(<AttachmentPicker uploads={uploads} variant='inline' />);

    expect(screen.getByText("x.pdf: Formato no admitido.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar x.pdf" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar x.pdf" })).toBeInTheDocument();
  });

  it("dropzone deshabilitada ignora soltar y deshabilita el input", () => {
    const uploads = makeUploads();
    const { container } = render(<AttachmentPicker uploads={uploads} variant='dropzone' disabled />);

    const zone = container.querySelector(".border-dashed");
    fireEvent.drop(zone, { dataTransfer: { files: [png], types: ["Files"] } });

    expect(uploads.addFiles).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Adjuntar imágenes", { selector: "input" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "elige imágenes" })).toBeDisabled();
  });

  it("dropzone: el texto de ayuda sale de los límites", () => {
    render(<AttachmentPicker uploads={makeUploads()} variant='dropzone' />);
    expect(screen.getByText("Hasta 5 · JPG, PNG, WebP o GIF · 5 MB cada una")).toBeInTheDocument();
  });

  it("inline: la región viva no se remonta al aparecer el primer item con error", () => {
    const empty = makeUploads();
    const { container, rerender } = render(<AttachmentPicker uploads={empty} variant='inline' />);
    const before = container.querySelector("[aria-live='polite']");

    rerender(
      <AttachmentPicker
        uploads={makeUploads({
          items: [{ key: "b", name: "b.png", previewUrl: "blob:b", status: "error", progress: 0, error: "Demasiado grande.", invalid: true }],
          hasErrors: true,
        })}
        variant='inline'
      />,
    );

    const after = container.querySelector("[aria-live='polite']");
    expect(after).toBe(before);
    expect(after).toHaveTextContent("b.png: Demasiado grande.");
  });

  describe("con el picker deshabilitado (hay una petición en curso)", () => {
    const withItems = () =>
      makeUploads({
        items: [
          { key: "a", name: "a.png", size: 10, previewUrl: "blob:a", status: "uploading", progress: 40, error: null },
          { key: "b", name: "b.png", size: 10, previewUrl: "blob:b", status: "error", progress: 0, error: "Falló" },
        ],
        hasErrors: true,
      });

    it.each(["inline", "dropzone"])("%s: Quitar y Reintentar quedan deshabilitados y conservan su nombre", (variant) => {
      const uploads = withItems();
      render(<AttachmentPicker uploads={uploads} variant={variant} disabled />);

      const remove = screen.getByRole("button", { name: "Quitar a.png" });
      const retry = screen.getByRole("button", { name: "Reintentar b.png" });
      expect(remove).toBeDisabled();
      expect(retry).toBeDisabled();
      fireEvent.click(remove);
      fireEvent.click(retry);
      expect(uploads.remove).not.toHaveBeenCalled();
      expect(uploads.retry).not.toHaveBeenCalled();
    });

    it.each(["inline", "dropzone"])("%s: habilitado, Quitar y Reintentar funcionan", (variant) => {
      render(<AttachmentPicker uploads={withItems()} variant={variant} />);
      expect(screen.getByRole("button", { name: "Quitar a.png" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Reintentar b.png" })).toBeEnabled();
    });

    it("dropHandlers deshabilitado cancela el arrastre de archivos pero no sube ni resalta", () => {
      const uploads = makeUploads();
      const setDragging = vi.fn();
      const handlers = dropHandlers(uploads, setDragging, { disabled: true });
      const files = { preventDefault: vi.fn(), dataTransfer: { files: [png], types: ["Files"] } };
      const text = { preventDefault: vi.fn(), dataTransfer: { files: [], types: ["text/plain"] } };

      handlers.onDragEnter(files);
      handlers.onDragOver(files);
      handlers.onDrop(files);
      handlers.onDrop(text);

      expect(files.preventDefault).toHaveBeenCalledTimes(3);
      expect(text.preventDefault).not.toHaveBeenCalled();
      expect(uploads.addFiles).not.toHaveBeenCalled();
      expect(setDragging).not.toHaveBeenCalledWith(true);
    });

    it("la dropzone deshabilitada cancela el drop de archivos (el navegador no abre la imagen)", () => {
      const { container } = render(<AttachmentPicker uploads={makeUploads()} variant='dropzone' disabled />);
      const notCancelled = fireEvent.drop(container.querySelector(".border-dashed"), { dataTransfer: { files: [png], types: ["Files"] } });
      expect(notCancelled).toBe(false);
    });
  });

  it("Quitar y Reintentar tienen un área táctil de al menos 44px (28px visibles + after:-inset-2)", () => {
    const uploads = makeUploads({
      items: [{ key: "b", name: "b.png", size: 10, previewUrl: "blob:b", status: "error", progress: 0, error: "Falló" }],
      hasErrors: true,
    });
    render(<AttachmentPicker uploads={uploads} variant='inline' />);

    for (const name of ["Quitar b.png", "Reintentar b.png"]) {
      const button = screen.getByRole("button", { name });
      expect(button.className).toContain("relative");
      expect(button.className).toContain("after:absolute");
      expect(button.className).toContain("after:-inset-2");
    }
  });
});
