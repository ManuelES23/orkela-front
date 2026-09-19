import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Modal from "./Modal";

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
});
