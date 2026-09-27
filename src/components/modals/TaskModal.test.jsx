import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TaskModal from "./TaskModal";
import { tasksAPI, projectsAPI } from "../../utils/api";
import { attachmentsAPI } from "../../utils/attachmentsApi";

vi.mock("../../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  tasksAPI: { getProjectMembers: vi.fn(), update: vi.fn(), create: vi.fn() },
  projectsAPI: { getAll: vi.fn() },
}));
vi.mock("../../utils/attachmentsApi", async (importOriginal) => ({
  ...(await importOriginal()),
  attachmentsAPI: { upload: vi.fn(), remove: vi.fn().mockResolvedValue(undefined), getBlob: vi.fn() },
}));
vi.mock("../tasks/TaskChecklist", () => ({ default: () => null }));
vi.mock("../tasks/TagSelector", () => ({ default: () => null }));

const statusSelect = () =>
  screen.getAllByRole("combobox").find((el) => el.getAttribute("name") === "status");

describe("TaskModal: estado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    projectsAPI.getAll.mockResolvedValue([{ id: 1, name: "Proyecto" }]);
    tasksAPI.getProjectMembers.mockResolvedValue([]);
  });

  it("ofrece los estados válidos del backend", async () => {
    render(<TaskModal isOpen onClose={vi.fn()} projectId={1} />);

    await screen.findByText("Estado");
    const values = [...statusSelect().querySelectorAll("option")].map((o) => o.value);

    expect(values).toEqual(["todo", "in-progress", "done", "cancelled"]);
    expect(statusSelect()).toHaveValue("todo");
  });

  it("muestra el estado real de una tarea existente", async () => {
    const task = { id: 5, title: "T", project_id: 1, status: "in-progress" };
    render(<TaskModal isOpen onClose={vi.fn()} task={task} />);

    await screen.findByText("Estado");

    expect(statusSelect()).toHaveValue("in-progress");
  });
});

const TITLE = "Ej: Diseñar mockups para landing";
const png = (name = "c.png") => new File([new Uint8Array(3)], name, { type: "image/png" });
const attachInput = () => screen.getByLabelText("Adjuntar imágenes", { selector: "input" });
const images = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `${i + 1}.png`, mime: "image/png", size: 1 }));
const submit = () => fireEvent.submit(screen.getByPlaceholderText(TITLE).closest("form"));
const existingTask = (attachments) => ({ id: 5, title: "Vieja", project_id: 1, status: "todo", attachments });
const settled = () => waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());

describe("TaskModal: imágenes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    projectsAPI.getAll.mockResolvedValue([{ id: 1, name: "Proyecto" }]);
    tasksAPI.getProjectMembers.mockResolvedValue([]);
    attachmentsAPI.remove.mockResolvedValue(undefined);
  });

  it("al crear envía las imágenes subidas y no las borra", async () => {
    attachmentsAPI.upload.mockResolvedValue({ id: 21, name: "c.png", mime: "image/png", size: 3 });
    tasksAPI.create.mockResolvedValue({ id: 1 });
    render(<TaskModal isOpen onClose={vi.fn()} projectId={1} />);

    fireEvent.change(await screen.findByPlaceholderText(TITLE), { target: { value: "Nueva" } });
    fireEvent.change(attachInput(), { target: { files: [png()] } });
    await waitFor(() => expect(attachmentsAPI.upload).toHaveBeenCalled());
    await screen.findByRole("button", { name: "Quitar c.png" });
    await settled();
    submit();

    await waitFor(() => expect(tasksAPI.create).toHaveBeenCalledWith(expect.objectContaining({ attachment_ids: [21] })));
    // Enviadas: ya pertenecen a la tarea, no se borran del servidor
    expect(attachmentsAPI.remove).not.toHaveBeenCalled();
  });

  it("al editar envía attachment_ids con las nuevas y muestra cuántas ya hay", async () => {
    attachmentsAPI.upload.mockResolvedValue({ id: 30, name: "c.png", mime: "image/png", size: 3 });
    tasksAPI.update.mockResolvedValue({ id: 5 });
    render(<TaskModal isOpen onClose={vi.fn()} task={existingTask(images(1))} />);

    expect(await screen.findByText("1 imagen ya adjunta")).toBeInTheDocument();
    fireEvent.change(attachInput(), { target: { files: [png()] } });
    await screen.findByRole("button", { name: "Quitar c.png" });
    await settled();
    submit();

    await waitFor(() => expect(tasksAPI.update).toHaveBeenCalledWith(5, expect.objectContaining({ attachment_ids: [30] })));
  });

  it("usa el plural cuando ya hay varias", async () => {
    render(<TaskModal isOpen onClose={vi.fn()} task={existingTask(images(3))} />);

    expect(await screen.findByText("3 imágenes ya adjuntas")).toBeInTheDocument();
  });

  it("al editar solo deja añadir hasta completar 5", async () => {
    render(<TaskModal isOpen onClose={vi.fn()} task={existingTask(images(4))} />);

    await screen.findByText("4 imágenes ya adjuntas");
    fireEvent.change(attachInput(), { target: { files: [png("a.png"), png("b.png")] } });

    expect(await screen.findByText("Máximo 1 imagen.")).toBeInTheDocument();
  });

  it("con 5 imágenes ya adjuntas no ofrece adjuntar más", async () => {
    render(<TaskModal isOpen onClose={vi.fn()} task={existingTask(images(5))} />);

    expect(await screen.findByText("Esta tarea ya tiene 5 imágenes.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Adjuntar imágenes", { selector: "input" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Máximo 0/)).not.toBeInTheDocument();
  });

  it("no envía mientras sube una imagen y avisa", async () => {
    attachmentsAPI.upload.mockReturnValue(new Promise(() => {}));
    render(<TaskModal isOpen onClose={vi.fn()} projectId={1} />);

    fireEvent.change(await screen.findByPlaceholderText(TITLE), { target: { value: "Nueva" } });
    fireEvent.change(attachInput(), { target: { files: [png()] } });
    await screen.findByRole("button", { name: "Quitar c.png" });
    submit();

    expect(await screen.findByText("Espera a que terminen de subir las imágenes o quita las que fallaron.")).toBeInTheDocument();
    expect(tasksAPI.create).not.toHaveBeenCalled();
  });

  it("no envía si una imagen falló", async () => {
    attachmentsAPI.upload.mockRejectedValue(new Error("Falló"));
    render(<TaskModal isOpen onClose={vi.fn()} projectId={1} />);

    fireEvent.change(await screen.findByPlaceholderText(TITLE), { target: { value: "Nueva" } });
    fireEvent.change(attachInput(), { target: { files: [png()] } });
    await screen.findByRole("button", { name: "Reintentar c.png" });
    submit();

    expect(await screen.findByText("Espera a que terminen de subir las imágenes o quita las que fallaron.")).toBeInTheDocument();
    expect(tasksAPI.create).not.toHaveBeenCalled();
  });

  it("Cancelar descarta las imágenes ya subidas y cierra", async () => {
    attachmentsAPI.upload.mockResolvedValue({ id: 9, name: "c.png", mime: "image/png", size: 3 });
    const onClose = vi.fn();
    render(<TaskModal isOpen onClose={onClose} projectId={1} />);

    await screen.findByPlaceholderText(TITLE);
    fireEvent.change(attachInput(), { target: { files: [png()] } });
    await screen.findByRole("button", { name: "Quitar c.png" });
    await settled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(attachmentsAPI.remove).toHaveBeenCalledWith("staff", 9);
    expect(onClose).toHaveBeenCalled();
  });

  it("si el padre cierra el modal sin desmontarlo, descarta las imágenes", async () => {
    attachmentsAPI.upload.mockResolvedValue({ id: 10, name: "c.png", mime: "image/png", size: 3 });
    const { rerender } = render(<TaskModal isOpen onClose={vi.fn()} projectId={1} />);

    await screen.findByPlaceholderText(TITLE);
    fireEvent.change(attachInput(), { target: { files: [png()] } });
    await screen.findByRole("button", { name: "Quitar c.png" });
    await settled();
    rerender(<TaskModal isOpen={false} onClose={vi.fn()} projectId={1} />);

    await waitFor(() => expect(attachmentsAPI.remove).toHaveBeenCalledWith("staff", 10));
  });

  it("no descarta las imágenes si se cierra mientras se envía", async () => {
    attachmentsAPI.upload.mockResolvedValue({ id: 11, name: "c.png", mime: "image/png", size: 3 });
    tasksAPI.create.mockReturnValue(new Promise(() => {}));
    const { rerender } = render(<TaskModal isOpen onClose={vi.fn()} projectId={1} />);

    fireEvent.change(await screen.findByPlaceholderText(TITLE), { target: { value: "Nueva" } });
    fireEvent.change(attachInput(), { target: { files: [png()] } });
    await screen.findByRole("button", { name: "Quitar c.png" });
    await settled();
    submit();
    await screen.findByText("Guardando...");
    rerender(<TaskModal isOpen={false} onClose={vi.fn()} projectId={1} />);

    // Da tiempo a que cualquier descarte indebido llegue a ejecutarse
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(attachmentsAPI.remove).not.toHaveBeenCalled();
  });

  it("pegar una imagen en la descripción la sube", async () => {
    attachmentsAPI.upload.mockResolvedValue({ id: 12, name: "p.png", mime: "image/png", size: 3 });
    render(<TaskModal isOpen onClose={vi.fn()} projectId={1} />);

    fireEvent.paste(await screen.findByPlaceholderText("Describe la tarea en detalle..."), {
      clipboardData: { files: [png("p.png")] },
    });

    await waitFor(() => expect(attachmentsAPI.upload).toHaveBeenCalled());
  });
});
