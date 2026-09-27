import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TicketModal from "./TicketModal";
import { ticketsAPI } from "../../utils/api";
import { attachmentsAPI } from "../../utils/attachmentsApi";

vi.mock("../../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  ticketsAPI: { create: vi.fn(), update: vi.fn() },
  teamsAPI: { getAll: vi.fn().mockResolvedValue([{ id: 3, name: "Soporte" }]) },
  projectsAPI: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock("../../utils/attachmentsApi", async (importOriginal) => ({
  ...(await importOriginal()),
  attachmentsAPI: { upload: vi.fn(), remove: vi.fn().mockResolvedValue(undefined), getBlob: vi.fn() },
}));

const png = (name = "c.png") => new File([new Uint8Array(3)], name, { type: "image/png" });
const attachInput = () => screen.getByLabelText("Adjuntar imágenes", { selector: "input" });

const fill = async () => {
  fireEvent.change(await screen.findByLabelText(/Título/), { target: { value: "Error" } });
  fireEvent.change(screen.getByLabelText(/Descripción/), { target: { value: "Ver captura" } });
};

const submit = () => fireEvent.submit(screen.getByLabelText(/Título/).closest("form"));

describe("TicketModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    attachmentsAPI.remove.mockResolvedValue(undefined);
  });

  it("al crear envía las imágenes subidas", async () => {
    attachmentsAPI.upload.mockResolvedValue({ id: 8, name: "c.png", mime: "image/png", size: 3 });
    ticketsAPI.create.mockResolvedValue({ id: 1 });
    render(<TicketModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

    await fill();
    fireEvent.change(attachInput(), { target: { files: [png()] } });
    await waitFor(() => expect(attachmentsAPI.upload).toHaveBeenCalled());
    await screen.findByRole("button", { name: "Quitar c.png" });
    submit();

    await waitFor(() => expect(ticketsAPI.create).toHaveBeenCalledWith(expect.objectContaining({ attachment_ids: [8] })));
    // Enviadas: ya pertenecen al ticket, no se borran del servidor
    expect(attachmentsAPI.remove).not.toHaveBeenCalled();
  });

  it("sin imágenes envía attachment_ids vacío", async () => {
    ticketsAPI.create.mockResolvedValue({ id: 1 });
    render(<TicketModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

    await fill();
    submit();

    await waitFor(() => expect(ticketsAPI.create).toHaveBeenCalledWith(expect.objectContaining({ attachment_ids: [] })));
  });

  it("no envía mientras sube una imagen y avisa", async () => {
    attachmentsAPI.upload.mockReturnValue(new Promise(() => {}));
    render(<TicketModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

    await fill();
    fireEvent.change(attachInput(), { target: { files: [png()] } });
    await screen.findByRole("button", { name: "Quitar c.png" });
    submit();

    expect(await screen.findByText("Espera a que terminen de subir las imágenes o quita las que fallaron.")).toBeInTheDocument();
    expect(ticketsAPI.create).not.toHaveBeenCalled();
  });

  it("no envía si una imagen falló", async () => {
    attachmentsAPI.upload.mockRejectedValue(new Error("Falló"));
    render(<TicketModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

    await fill();
    fireEvent.change(attachInput(), { target: { files: [png()] } });
    await screen.findByRole("button", { name: "Reintentar c.png" });
    submit();

    expect(await screen.findByText("Espera a que terminen de subir las imágenes o quita las que fallaron.")).toBeInTheDocument();
    expect(ticketsAPI.create).not.toHaveBeenCalled();
  });

  it("Cancelar descarta las imágenes ya subidas y cierra", async () => {
    attachmentsAPI.upload.mockResolvedValue({ id: 9, name: "c.png", mime: "image/png", size: 3 });
    const onClose = vi.fn();
    render(<TicketModal isOpen onClose={onClose} onSuccess={vi.fn()} />);

    await fill();
    fireEvent.change(attachInput(), { target: { files: [png()] } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Quitar c.png" })).toBeInTheDocument());
    await waitFor(() => expect(attachmentsAPI.upload).toHaveBeenCalled());
    // Espera a que la subida termine para que haya un id que borrar
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(attachmentsAPI.remove).toHaveBeenCalledWith("staff", 9);
    expect(onClose).toHaveBeenCalled();
  });

  it("si el padre cierra el modal sin desmontarlo, descarta las imágenes", async () => {
    attachmentsAPI.upload.mockResolvedValue({ id: 10, name: "c.png", mime: "image/png", size: 3 });
    const { rerender } = render(<TicketModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

    await fill();
    fireEvent.change(attachInput(), { target: { files: [png()] } });
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
    await screen.findByRole("button", { name: "Quitar c.png" });
    rerender(<TicketModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await waitFor(() => expect(attachmentsAPI.remove).toHaveBeenCalledWith("staff", 10));
  });

  it("al editar no ofrece adjuntar imágenes", async () => {
    ticketsAPI.update.mockResolvedValue({ id: 4 });
    render(
      <TicketModal
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        ticket={{ id: 4, title: "Viejo", description: "desc", type: "request", priority: "medium", team_id: 3 }}
      />
    );

    await screen.findByDisplayValue("Viejo");
    expect(screen.queryByLabelText("Adjuntar imágenes", { selector: "input" })).not.toBeInTheDocument();
    submit();

    await waitFor(() => expect(ticketsAPI.update).toHaveBeenCalled());
    expect(ticketsAPI.update.mock.calls[0][1]).not.toHaveProperty("attachment_ids");
  });
});
