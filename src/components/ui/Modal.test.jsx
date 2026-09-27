import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Modal from "./Modal";
import AttachmentGallery from "../attachments/AttachmentGallery";
import { attachmentsAPI } from "../../utils/attachmentsApi";

vi.mock("../../utils/attachmentsApi", async (importOriginal) => ({
  ...(await importOriginal()),
  attachmentsAPI: { getBlob: vi.fn(), upload: vi.fn(), remove: vi.fn() },
}));

const Harness = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title='Detalle'>
        <button>Primero</button>
        <button>Último</button>
      </Modal>
    </>
  );
};

const openHarness = () => {
  render(<Harness />);
  const opener = screen.getByRole("button", { name: "Abrir" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
};

describe("Modal", () => {
  it("es un diálogo modal con nombre accesible", () => {
    openHarness();

    const dialog = screen.getByRole("dialog", { name: "Detalle" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("lleva el foco al primer elemento enfocable al abrirse", () => {
    openHarness();

    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
  });

  it("Escape cierra y devuelve el foco a quien lo abrió", async () => {
    const opener = openHarness();

    fireEvent.keyDown(document.activeElement, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it("atrapa el foco con Tab y Shift+Tab", () => {
    openHarness();
    const close = screen.getByRole("button", { name: "Cerrar" });
    const last = screen.getByRole("button", { name: "Último" });

    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(close).toHaveFocus();

    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("Escape sin manejar llama a onClose", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title='Simple'>
        <input aria-label='campo' />
      </Modal>,
    );

    fireEvent.keyDown(screen.getByLabelText("campo"), { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignora un Escape que un control interno ya manejó (preventDefault)", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title='Simple'>
        <input
          aria-label='campo'
          onKeyDown={(e) => {
            if (e.key === "Escape") e.preventDefault();
          }}
        />
      </Modal>,
    );

    fireEvent.keyDown(screen.getByLabelText("campo"), { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("ignora Escape y Tab que nacen en otro overlay fuera del diálogo", () => {
    const onClose = vi.fn();
    render(
      <>
        <Modal isOpen onClose={onClose} title='Simple'>
          <button>Dentro</button>
        </Modal>
        <div role='alertdialog'>
          <button>Otro overlay</button>
        </div>
      </>,
    );
    const outside = screen.getByRole("button", { name: "Otro overlay" });
    outside.focus();

    fireEvent.keyDown(outside, { key: "Escape" });
    const tab = fireEvent.keyDown(outside, { key: "Tab" });

    expect(onClose).not.toHaveBeenCalled();
    expect(tab).toBe(true);
    expect(outside).toHaveFocus();
  });

  it("con el foco perdido en body, Escape sigue cerrando", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title='Simple'>
        <button>Dentro</button>
      </Modal>,
    );
    document.activeElement.blur();

    fireEvent.keyDown(document.body, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("con el foco perdido en body, Tab lo devuelve al primer enfocable del diálogo", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title='Simple'>
        <button>Dentro</button>
      </Modal>,
    );
    document.activeElement.blur();

    fireEvent.keyDown(document.body, { key: "Tab" });

    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
  });

  it("con dos modales abiertos, Escape solo cierra el de arriba", async () => {
    const Stacked = () => {
      const [outer, setOuter] = useState(true);
      const [inner, setInner] = useState(true);
      return (
        <>
          <Modal isOpen={outer} onClose={() => setOuter(false)} title='Exterior'>
            <p>fuera</p>
          </Modal>
          <Modal isOpen={inner} onClose={() => setInner(false)} title='Interior'>
            <p>dentro</p>
          </Modal>
        </>
      );
    };
    render(<Stacked />);

    fireEvent.keyDown(document.activeElement, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Interior" })).not.toBeInTheDocument());
    expect(screen.getByRole("dialog", { name: "Exterior" })).toBeInTheDocument();
  });

  it("con dismissible={false} ni Escape ni el fondo lo cierran y no hay botón Cerrar", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title='Aviso obligatorio' dismissible={false}>
        <button type='button'>Continuar</button>
      </Modal>,
    );

    fireEvent.keyDown(document.activeElement, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Cerrar" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Aviso obligatorio" })).toBeInTheDocument();
  });

  it("variant='alert' no muestra cabecera pero sí un título accesible centrado", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title='¿Eliminar etiqueta?' variant='alert'>
        <p>No se puede deshacer.</p>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog", { name: "¿Eliminar etiqueta?" });
    expect(dialog).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "¿Eliminar etiqueta?" })).toBeInTheDocument();
  });

  it("con footer, las acciones quedan fuera del área con scroll del cuerpo", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title='Editar cliente' footer={<button type='button'>Guardar</button>}>
        <p>Contenido del formulario</p>
      </Modal>,
    );

    const save = screen.getByRole("button", { name: "Guardar" });
    const body = screen.getByText("Contenido del formulario");
    // El botón del footer no debe estar dentro del contenedor con overflow-y del cuerpo.
    expect(body.closest("[class*='overflow-y-auto']")).not.toContainElement(save);
  });

  describe("bloqueo del scroll de la página", () => {
    beforeEach(() => {
      document.body.style.overflow = "";
      attachmentsAPI.getBlob.mockResolvedValue(new Blob(["x"]));
      global.URL.createObjectURL = vi.fn(() => "blob:x");
      global.URL.revokeObjectURL = vi.fn();
    });

    it("un Modal cerrado no toca el overflow del body", () => {
      document.body.style.overflow = "hidden";
      render(
        <Modal isOpen={false} onClose={vi.fn()} title='Cerrado'>
          <p>x</p>
        </Modal>,
      );
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("con dos modales abiertos mantiene el bloqueo hasta que cierran ambos", () => {
      const first = render(
        <Modal isOpen onClose={vi.fn()} title='Uno'>
          <p>uno</p>
        </Modal>,
      );
      const second = render(
        <Modal isOpen onClose={vi.fn()} title='Dos'>
          <p>dos</p>
        </Modal>,
      );
      expect(document.body.style.overflow).toBe("hidden");

      second.unmount();
      expect(document.body.style.overflow).toBe("hidden");

      first.unmount();
      expect(document.body.style.overflow).toBe("unset");
    });

    it("una galería dentro de un Modal abierto no libera el bloqueo", () => {
      render(
        <Modal isOpen onClose={vi.fn()} title='Detalle'>
          <AttachmentGallery scope='staff' attachments={[{ id: 1, name: "a.png", mime: "image/png", size: 1 }]} onDelete={vi.fn()} />
        </Modal>,
      );
      expect(document.body.style.overflow).toBe("hidden");

      // Abrir y cerrar el visor tampoco lo libera.
      fireEvent.click(screen.getByRole("button", { name: /Ver imagen 1 de 1/ }));
      expect(document.body.style.overflow).toBe("hidden");
      fireEvent.keyDown(document, { key: "Escape" });
      expect(document.body.style.overflow).toBe("hidden");
    });
  });
});
