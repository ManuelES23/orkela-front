import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ConfirmModal from "./ConfirmModal";
import RemovedFromOrgModal from "./RemovedFromOrgModal";
import ClientModal from "../modals/ClientModal";
import ContactModal from "../modals/ContactModal";
import ProjectDetailsModal from "../modals/ProjectDetailsModal";
import ContextSelectionModal from "../modals/ContextSelectionModal";

vi.mock("../../context/NotificationContext", () => ({ useNotification: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
vi.mock("../../hooks/useMailResult", () => ({ useMailResult: () => ({ notifyClientMail: vi.fn() }) }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ refreshUser: vi.fn() }) }));

const dismissible = [
  ["ConfirmModal", (onClose) => <ConfirmModal isOpen onClose={onClose} title='¿Eliminar etiqueta?' message='No se puede deshacer.' />, "¿Eliminar etiqueta?"],
  ["ClientModal", (onClose) => <ClientModal isOpen client={null} onClose={onClose} onSaved={vi.fn()} />, "Nuevo cliente"],
  ["ContactModal", (onClose) => <ContactModal isOpen client={{ id: 1, name: "Acme" }} contact={null} onClose={onClose} onSaved={vi.fn()} />, "Nuevo contacto"],
  [
    "ProjectDetailsModal",
    (onClose) => (
      <ProjectDetailsModal
        isOpen
        onClose={onClose}
        project={{ id: 1, name: "Web corporativa", status: "active", description: "", start_date: null, end_date: null, progress: 0, team: null, tasks: [] }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    ),
    "Web corporativa",
  ],
];

describe("Diálogos sobre el Modal accesible", () => {
  it.each(dismissible)("%s es un diálogo con nombre y Escape lo cierra", (_name, renderDialog, title) => {
    const onClose = vi.fn();
    render(<MemoryRouter>{renderDialog(onClose)}</MemoryRouter>);

    expect(screen.getByRole("dialog", { name: title })).toHaveAttribute("aria-modal", "true");
    fireEvent.keyDown(document.activeElement, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("ConfirmModal (type='danger') enfoca Cancelar al abrir, no la acción destructiva", () => {
    render(
      <MemoryRouter>
        <ConfirmModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} />
      </MemoryRouter>
    );

    expect(document.activeElement).toHaveTextContent("Cancelar");
    expect(document.activeElement).not.toHaveTextContent("Confirmar");
  });

  it("RemovedFromOrgModal es un diálogo que no se descarta con Escape", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <RemovedFromOrgModal isOpen organizationName='Acme' removerName='Marta' onClose={onClose} />
      </MemoryRouter>
    );

    expect(screen.getByRole("dialog", { name: "Has sido removido" })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Continuar en Modo Personal/ })).toBeInTheDocument();
  });

  it("ContextSelectionModal es un diálogo que no se descarta con Escape", () => {
    render(
      <ContextSelectionModal
        isOpen
        onSelect={vi.fn()}
        user={{ name: "Ana", available_contexts: [{ id: "personal", type: "personal", name: "Personal" }] }}
      />
    );

    expect(screen.getByRole("dialog", { name: "¡Bienvenido, Ana!" })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: "¡Bienvenido, Ana!" })).toBeInTheDocument();
  });
});
