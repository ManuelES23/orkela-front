import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import TaskDetailModal from "./TaskDetailModal";
import { tasksAPI } from "../../utils/api";
import { attachmentsAPI } from "../../utils/attachmentsApi";

vi.mock("../../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  tasksAPI: { getById: vi.fn() },
  checklistAPI: {},
}));
vi.mock("../../utils/attachmentsApi", async (importOriginal) => ({
  ...(await importOriginal()),
  attachmentsAPI: { getBlob: vi.fn(), remove: vi.fn() },
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: 1 } }) }));
const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
const realtime = { registerRefresh: vi.fn(() => () => {}), subscribeChannel: vi.fn(() => () => {}), channelEpoch: 0 };
vi.mock("../../context/NotificationContext", () => ({ useNotification: () => notification }));
vi.mock("../../context/RealtimeContext", () => ({ useRealtime: () => realtime }));

const task = (extra = {}) => ({
  id: 7,
  project_id: 4,
  title: "Diseñar portada",
  status: "todo",
  priority: "medium",
  checklist_items: [],
  assigned_users: [],
  tags: [],
  project: { id: 4, name: "Web" },
  ...extra,
});

const projectSync = () => realtime.subscribeChannel.mock.calls.filter(([name]) => name === "project.4").at(-1)[2];

describe("TaskDetailModal en tiempo real", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tasksAPI.getById.mockReset();
  });

  it("recarga la tarea abierta cuando otro usuario cambia su checklist", async () => {
    tasksAPI.getById.mockResolvedValue(task());
    render(<TaskDetailModal isOpen onClose={vi.fn()} task={task()} />);
    await screen.findByText("Diseñar portada");

    tasksAPI.getById.mockResolvedValue(
      task({ checklist_items: [{ id: 1, text: "Paso agregado por Bea", is_completed: false }] })
    );
    await act(async () => projectSync()({ project_id: 4, entity: "checklist", action: "created", task_id: 7 }));

    expect(await screen.findByText("Paso agregado por Bea")).toBeInTheDocument();
  });

  it("ignora otras tareas y se cierra con un aviso si la suya se borra", async () => {
    tasksAPI.getById.mockResolvedValue(task());
    const onClose = vi.fn();
    render(<TaskDetailModal isOpen onClose={onClose} task={task()} />);
    await screen.findByText("Diseñar portada");
    const calls = tasksAPI.getById.mock.calls.length;

    await act(async () => projectSync()({ project_id: 4, entity: "task", action: "updated", task_id: 99 }));
    expect(tasksAPI.getById.mock.calls.length).toBe(calls);

    await act(async () => projectSync()({ project_id: 4, entity: "task", action: "deleted", task_id: 7 }));
    expect(onClose).toHaveBeenCalled();
    expect(notification.info).toHaveBeenCalled();
  });
});

describe("TaskDetailModal imágenes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tasksAPI.getById.mockReset();
    attachmentsAPI.getBlob.mockResolvedValue(new Blob(["x"]));
    attachmentsAPI.remove.mockResolvedValue(undefined);
    globalThis.URL.createObjectURL = vi.fn(() => "blob:x");
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  const withImage = (extra = {}) =>
    task({ user_id: 1, attachments: [{ id: 5, name: "t.png", mime: "image/png", size: 1 }], ...extra });

  it("muestra las imágenes y quien puede editar las borra", async () => {
    tasksAPI.getById.mockResolvedValue(withImage());
    const onUpdate = vi.fn();
    render(<TaskDetailModal isOpen onClose={vi.fn()} task={task()} onUpdate={onUpdate} />);

    fireEvent.click(await screen.findByRole("button", { name: "Ver imagen 1 de 1: t.png" }));
    fireEvent.click(await screen.findByRole("button", { name: "Eliminar t.png" }));
    fireEvent.click(await screen.findByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(attachmentsAPI.remove).toHaveBeenCalledWith("staff", 5));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Ver imagen 1 de 1/ })).not.toBeInTheDocument());
    expect(onUpdate).toHaveBeenCalled();
  });

  it("quien no puede editar ve las imágenes pero no puede borrarlas", async () => {
    tasksAPI.getById.mockResolvedValue(withImage({ user_id: 99 }));
    render(<TaskDetailModal isOpen onClose={vi.fn()} task={task()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Ver imagen 1 de 1: t.png" }));

    await screen.findByRole("dialog", { name: /t.png/ });
    expect(screen.queryByRole("button", { name: "Eliminar t.png" })).not.toBeInTheDocument();
  });

  it("no muestra el bloque de imágenes si no hay ninguna", async () => {
    tasksAPI.getById.mockResolvedValue(task({ user_id: 1, attachments: [] }));
    render(<TaskDetailModal isOpen onClose={vi.fn()} task={task()} />);

    await screen.findByText("Diseñar portada");
    expect(screen.queryByText("Imágenes")).not.toBeInTheDocument();
  });
});
