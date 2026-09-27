import { describe, it, expect, vi } from "vitest";
import { useRef, useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PortalMessageBubble from "./PortalMessageBubble";
import PortalComposer, { MESSAGE_MAX } from "./PortalComposer";

vi.mock("../../../utils/attachmentsApi", async (importOriginal) => ({
  ...(await importOriginal()),
  attachmentsAPI: { upload: vi.fn(), remove: vi.fn(), getBlob: vi.fn().mockResolvedValue(new Blob(["x"])) },
}));

const message = {
  key: "c-1", id: 1, content: "Mira https://ayuda.acme.com\nsegunda línea", created_at: "2026-09-18T09:10:00Z",
  own: false, fromStaff: true, authorName: "Beto", status: "sent",
};

describe("PortalMessageBubble", () => {
  it("muestra autor, hora, saltos de línea y enlaces seguros", () => {
    const { container } = render(<PortalMessageBubble message={message} />);
    expect(container.firstChild).toHaveAttribute("data-own", "false");
    expect(screen.getByText(/Beto/)).toBeInTheDocument();
    expect(container.querySelector("time")).toHaveAttribute("dateTime", "2026-09-18T09:10:00Z");
    expect(container.querySelector(".whitespace-pre-wrap")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "https://ayuda.acme.com" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("en error ofrece reintentar", () => {
    const onRetry = vi.fn();
    render(<PortalMessageBubble message={{ ...message, own: true, authorName: null, status: "failed" }} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No se envió");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("mientras envía lo indica", () => {
    render(<PortalMessageBubble message={{ ...message, own: true, authorName: null, status: "sending" }} />);
    expect(screen.getByText("Enviando…")).toBeInTheDocument();
  });
});

const makeUploads = (overrides = {}) => ({
  items: [],
  ids: [],
  uploaded: [],
  isUploading: false,
  hasErrors: false,
  notice: null,
  addFiles: vi.fn(),
  retry: vi.fn(),
  remove: vi.fn(),
  reset: vi.fn(),
  discardAll: vi.fn(),
  ...overrides,
});

const ComposerHarness = ({ onSubmit, hint = null, uploads = makeUploads() }) => {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);
  return (
    <PortalComposer
      value={value}
      onChange={setValue}
      onSubmit={(text) => {
        onSubmit(text);
        setValue("");
      }}
      inputRef={inputRef}
      uploads={uploads}
      hint={hint}
    />
  );
};

describe("PortalComposer", () => {
  it("Enter envía el texto recortado, Shift+Enter no, y conserva el foco", () => {
    const onSubmit = vi.fn();
    render(<ComposerHarness onSubmit={onSubmit} />);
    const input = screen.getByLabelText("Tu respuesta");
    input.focus();

    fireEvent.change(input, { target: { value: "  Hola  " } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("Hola");
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(input).not.toBeDisabled();
  });

  it("no envía texto vacío", () => {
    const onSubmit = vi.fn();
    render(<ComposerHarness onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByLabelText("Tu respuesta"), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("limita a 5000 caracteres y enlaza el aviso", () => {
    render(<ComposerHarness onSubmit={vi.fn()} hint='Si respondes, el ticket se reabrirá.' />);
    const input = screen.getByLabelText("Tu respuesta");
    expect(MESSAGE_MAX).toBe(5000);
    expect(input).toHaveAttribute("maxLength", "5000");
    expect(input).toHaveAccessibleDescription("Si respondes, el ticket se reabrirá.");
  });

  it("con solo imágenes listas envía texto vacío y las imágenes, y vacía el selector", () => {
    const onSubmit = vi.fn();
    const uploaded = [{ id: 5, name: "c.png", mime: "image/png", size: 3 }];
    const uploads = makeUploads({ ids: [5], uploaded, items: [{ key: "k", name: "c.png", status: "done", progress: 100, previewUrl: "blob:x" }] });
    render(<PortalComposer value='' onChange={vi.fn()} onSubmit={onSubmit} inputRef={{ current: null }} uploads={uploads} />);

    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onSubmit).toHaveBeenCalledWith("", uploaded);
    expect(uploads.reset).toHaveBeenCalled();
  });

  it("bloquea el envío mientras sube o hay errores", () => {
    const { rerender } = render(
      <PortalComposer value='Hola' onChange={vi.fn()} onSubmit={vi.fn()} inputRef={{ current: null }} uploads={makeUploads({ isUploading: true })} />
    );
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();

    rerender(<PortalComposer value='Hola' onChange={vi.fn()} onSubmit={vi.fn()} inputRef={{ current: null }} uploads={makeUploads({ hasErrors: true })} />);
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    expect(screen.getByText("Una imagen no se subió: reintenta o quítala.")).toBeInTheDocument();
  });

  it("soltar archivos en el compositor los añade a las subidas", () => {
    const uploads = makeUploads();
    const { container } = render(<PortalComposer value='' onChange={vi.fn()} onSubmit={vi.fn()} inputRef={{ current: null }} uploads={uploads} />);
    const file = new File([new Uint8Array(3)], "c.png", { type: "image/png" });

    fireEvent.drop(container.querySelector("form"), { dataTransfer: { files: [file], types: ["Files"] } });

    expect(uploads.addFiles).toHaveBeenCalledWith([file]);
  });
});

describe("PortalMessageBubble con adjuntos", () => {
  it("sin texto no pinta la burbuja de texto y muestra la galería", () => {
    const { container } = render(
      <PortalMessageBubble message={{ ...message, content: "", attachments: [{ id: 9, name: "c.png", mime: "image/png", size: 3 }] }} />
    );
    expect(container.querySelector(".whitespace-pre-wrap")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ver imagen 1 de 1: c\.png/ })).toBeInTheDocument();
  });

  it("la galería de la burbuja ocupa el ancho (w-full min-w-56): en una columna flex que se ajusta al contenido mediría 0 hasta cargar la imagen", () => {
    const { container } = render(
      <PortalMessageBubble message={{ ...message, attachments: [{ id: 9, name: "c.png", mime: "image/png", size: 3 }] }} />
    );
    const gallery = screen.getByRole("button", { name: /Ver imagen 1 de 1: c\.png/ }).parentElement;
    expect(container.contains(gallery)).toBe(true);
    expect(gallery).toHaveClass("w-full", "min-w-56", "max-w-sm", "mt-1");
  });
});
