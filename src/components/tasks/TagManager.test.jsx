import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TagManager from "./TagManager";
import Modal from "../ui/Modal";

vi.mock("../../context/NotificationContext", () => ({
  useNotification: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("../../utils/api", () => ({
  projectTagsAPI: {
    getAll: vi.fn().mockResolvedValue([{ id: 1, name: "Urgente", color: "red" }]),
    getAvailableColors: vi.fn().mockResolvedValue({ colors: { red: "Rojo" }, default_names: { red: "Urgente" } }),
  },
}));

describe("TagManager dentro de un Modal", () => {
  it("Escape cancela la edición del nombre sin cerrar el Modal", async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title='Etiquetas'>
        <TagManager projectId={1} />
      </Modal>,
    );

    fireEvent.click(await screen.findByTitle("Editar nombre"));
    const input = await screen.findByDisplayValue("Urgente");

    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() => expect(screen.queryByDisplayValue("Urgente")).not.toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Etiquetas" })).toBeInTheDocument();
  });
});
