import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TaskModal from "./TaskModal";
import { tasksAPI, projectsAPI } from "../../utils/api";
import { attachmentsAPI } from "../../utils/attachmentsApi";

vi.mock("../../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  tasksAPI: { getProjectMembers: vi.fn(), update: vi.fn(), create: vi.fn(), getById: vi.fn() },
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
    tasksAPI.getById.mockResolvedValue({ ...task, attachments: [] });
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

describe("TaskModal: cupo de imágenes desde un listado", () => {
  const listRow = { id: 5, title: "Vieja", project_id: 1, status: "todo" }; // sin attachments, como en los listados
  const pasteImage = (name = "p.png") =>
    fireEvent.paste(screen.getByPlaceholderText("Describe la tarea en detalle..."), { clipboardData: { files: [png(name)] } });

  beforeEach(() => {
    vi.clearAllMocks();
    projectsAPI.getAll.mockResolvedValue([{ id: 1, name: "Proyecto" }]);
    tasksAPI.getProjectMembers.mockResolvedValue([]);
    attachmentsAPI.remove.mockResolvedValue(undefined);
    attachmentsAPI.upload.mockResolvedValue({ id: 40, name: "p.png", mime: "image/png", size: 3 });
  });

  it("consulta la tarea una vez, muestra cuántas hay y limita el cupo", async () => {
    tasksAPI.getById.mockResolvedValue({ ...listRow, attachments: images(3) });
    render(<TaskModal isOpen onClose={vi.fn()} task={listRow} />);

    expect(await screen.findByText("3 imágenes ya adjuntas")).toBeInTheDocument();
    fireEvent.change(attachInput(), { target: { files: [png("a.png"), png("b.png"), png("c.png")] } });

    expect(await screen.findByText("Máximo 2 imágenes.")).toBeInTheDocument();
    expect(tasksAPI.getById).toHaveBeenCalledTimes(1);
    expect(tasksAPI.getById).toHaveBeenCalledWith(5);
  });

  it("no consulta si la tarea ya trae sus imágenes", async () => {
    render(<TaskModal isOpen onClose={vi.fn()} task={existingTask(images(2))} />);

    expect(await screen.findByText("2 imágenes ya adjuntas")).toBeInTheDocument();
    expect(tasksAPI.getById).not.toHaveBeenCalled();
  });

  it("si la consulta falla, deja un selector usable", async () => {
    tasksAPI.getById.mockRejectedValue(new Error("boom"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<TaskModal isOpen onClose={vi.fn()} task={listRow} />);

    await waitFor(() => expect(attachInput()).not.toBeDisabled());
    fireEvent.change(attachInput(), { target: { files: [png("a.png")] } });
    await waitFor(() => expect(attachmentsAPI.upload).toHaveBeenCalled());
    expect(screen.queryByText(/ya adjunta/)).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it("con 5 imágenes (por la consulta) muestra el aviso y no el selector", async () => {
    tasksAPI.getById.mockResolvedValue({ ...listRow, attachments: images(5) });
    render(<TaskModal isOpen onClose={vi.fn()} task={listRow} />);

    expect(await screen.findByText("Esta tarea ya tiene 5 imágenes.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Adjuntar imágenes", { selector: "input" })).not.toBeInTheDocument();
  });

  it("el selector y el pegado están deshabilitados mientras se consulta", async () => {
    let resolve;
    tasksAPI.getById.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<TaskModal isOpen onClose={vi.fn()} task={listRow} />);

    await screen.findByPlaceholderText(TITLE);
    expect(attachInput()).toBeDisabled();
    pasteImage();
    expect(attachmentsAPI.upload).not.toHaveBeenCalled();

    resolve({ ...listRow, attachments: images(1) });
    await screen.findByText("1 imagen ya adjunta");
    expect(attachInput()).not.toBeDisabled();
  });

  it("ignora la respuesta si el modal se cerró antes de recibirla", async () => {
    let resolve;
    tasksAPI.getById.mockReturnValue(new Promise((r) => (resolve = r)));
    const { rerender } = render(<TaskModal isOpen onClose={vi.fn()} task={listRow} />);
    await screen.findByPlaceholderText(TITLE);
    rerender(<TaskModal isOpen={false} onClose={vi.fn()} task={listRow} />);
    resolve({ ...listRow, attachments: images(5) });
    await new Promise((r) => setTimeout(r, 20));

    tasksAPI.getById.mockResolvedValue({ ...listRow, attachments: images(1) });
    rerender(<TaskModal isOpen onClose={vi.fn()} task={listRow} />);

    expect(await screen.findByText("1 imagen ya adjunta")).toBeInTheDocument();
  });

  it("pegar se ignora con 5 imágenes ya adjuntas", async () => {
    render(<TaskModal isOpen onClose={vi.fn()} task={existingTask(images(5))} />);

    await screen.findByText("Esta tarea ya tiene 5 imágenes.");
    pasteImage();

    expect(attachmentsAPI.upload).not.toHaveBeenCalled();
  });

  it("pegar se ignora mientras se envía", async () => {
    tasksAPI.create.mockReturnValue(new Promise(() => {}));
    render(<TaskModal isOpen onClose={vi.fn()} projectId={1} />);

    fireEvent.change(await screen.findByPlaceholderText(TITLE), { target: { value: "Nueva" } });
    submit();
    await screen.findByText("Guardando...");
    pasteImage();

    expect(attachmentsAPI.upload).not.toHaveBeenCalled();
  });
});
