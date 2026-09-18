import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import TaskDetailModal from "./TaskDetailModal";
import { tasksAPI } from "../../utils/api";

vi.mock("../../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  tasksAPI: { getById: vi.fn() },
  checklistAPI: {},
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
