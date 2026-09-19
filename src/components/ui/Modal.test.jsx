import { describe, it, expect } from "vitest";
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
