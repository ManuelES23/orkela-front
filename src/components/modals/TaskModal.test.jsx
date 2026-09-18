import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import TaskModal from "./TaskModal";
import { tasksAPI, projectsAPI } from "../../utils/api";

vi.mock("../../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  tasksAPI: { getProjectMembers: vi.fn(), update: vi.fn(), create: vi.fn() },
  projectsAPI: { getAll: vi.fn() },
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
