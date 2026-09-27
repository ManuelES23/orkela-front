import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AttachmentGallery from "./AttachmentGallery";
import { attachmentsAPI } from "../../utils/attachmentsApi";

vi.mock("../../utils/attachmentsApi", async (importOriginal) => ({
  ...(await importOriginal()),
  attachmentsAPI: { getBlob: vi.fn(), upload: vi.fn(), remove: vi.fn() },
}));

const make = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `img${i + 1}.png`, mime: "image/png", size: 1 }));

// El padre es quien posee la lista: tras borrar con éxito, quita el adjunto.
const Parent = ({ initial, onDelete }) => {
  const [items, setItems] = useState(initial);
  return (
    <AttachmentGallery
      scope='staff'
      attachments={items}
      onDelete={async (attachment) => {
        await onDelete(attachment);
        setItems((prev) => prev.filter((item) => item.id !== attachment.id));
      }}
    />
  );
};

const deleteCurrent = async (name) => {
  fireEvent.click(screen.getByRole("button", { name: `Eliminar ${name}` }));
  const confirmButtons = await screen.findAllByRole("button", { name: "Eliminar" });
  fireEvent.click(confirmButtons[confirmButtons.length - 1]);
};

describe("AttachmentGallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    attachmentsAPI.getBlob.mockResolvedValue(new Blob(["x"]));
    global.URL.createObjectURL = vi.fn(() => "blob:x");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("no pinta nada sin adjuntos", () => {
    const { container } = render(<AttachmentGallery scope='staff' attachments={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    [1, 1],
    [2, 2],
    [3, 3],
    [6, 3],
  ])("con %i imágenes muestra %i celdas", (total, cells) => {
    render(<AttachmentGallery scope='staff' attachments={make(total)} />);
    expect(screen.getAllByRole("button", { name: /^Ver imagen/ })).toHaveLength(cells);
  });

  it("con más de 3 muestra +N en la tercera celda", () => {
    render(<AttachmentGallery scope='staff' attachments={make(6)} />);
    expect(screen.getByRole("button", { name: "Ver imagen 3 de 6: img3.png (y 3 más)" })).toHaveTextContent("+3");
  });

  it("al tocar una celda abre el visor en esa imagen", async () => {
    render(<AttachmentGallery scope='portal' attachments={make(2)} />);

    fireEvent.click(screen.getByRole("button", { name: "Ver imagen 2 de 2: img2.png" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("2 de 2")).toBeInTheDocument();
  });

  it("al borrar la última imagen de 3 el visor sigue abierto en una imagen válida", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<Parent initial={make(3)} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "Ver imagen 3 de 3: img3.png" }));
    await screen.findByRole("dialog");
    await deleteCurrent("img3.png");

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 3 })));
    expect(await screen.findByText("2 de 2")).toBeInTheDocument();
    // El diálogo de confirmación termina de cerrarse; queda solo el visor.
    await waitFor(() => expect(screen.getAllByRole("dialog")).toHaveLength(1));
    expect(within(screen.getByRole("dialog")).getByRole("img", { name: "img2.png" })).toBeInTheDocument();
  });

  it("al borrar la del medio de 3 el visor sigue abierto en una imagen válida", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<Parent initial={make(3)} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "Ver imagen 2 de 3: img2.png" }));
    await screen.findByRole("dialog");
    await deleteCurrent("img2.png");

    expect(await screen.findByText("2 de 2")).toBeInTheDocument();
    // El diálogo de confirmación termina de cerrarse; queda solo el visor.
    await waitFor(() => expect(screen.getAllByRole("dialog")).toHaveLength(1));
    expect(within(screen.getByRole("dialog")).getByRole("img", { name: "img3.png" })).toBeInTheDocument();
  });

  it("al borrar la única imagen cierra el visor y no pinta nada", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<Parent initial={make(1)} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "Ver imagen 1 de 1: img1.png" }));
    await screen.findByRole("dialog");
    await deleteCurrent("img1.png");

    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("si el borrado falla mantiene la lista y muestra el error del visor", async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error("boom"));
    render(<Parent initial={make(2)} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "Ver imagen 1 de 2: img1.png" }));
    await screen.findByRole("dialog");
    await deleteCurrent("img1.png");

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo eliminar la imagen");
    expect(screen.getByText("1 de 2")).toBeInTheDocument();
  });
});
