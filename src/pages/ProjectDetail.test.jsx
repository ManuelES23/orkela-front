import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import ProjectDetail from "./ProjectDetail";
import { projectsAPI, tasksAPI } from "../utils/api";

const notification = { success: vi.fn(), error: vi.fn() };
const realtime = { registerRefresh: vi.fn(), unregisterRefresh: vi.fn() };
const auth = { user: { id: 1 } };

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  projectsAPI: { getById: vi.fn() },
  tasksAPI: { getAll: vi.fn() },
}));
vi.mock("../components/layout/Layout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../components/tasks/ProjectGantt", () => ({ default: () => null }));
vi.mock("../components/tasks/ProjectCalendar", () => ({ default: () => null }));
vi.mock("../components/tasks/TagManager", () => ({ default: () => null }));
vi.mock("../components/modals/ProjectModal", () => ({ default: () => null }));
vi.mock("../components/modals/TaskModal", () => ({ default: () => null }));
vi.mock("../context/NotificationContext", () => ({ useNotification: () => notification }));
vi.mock("../context/RealtimeContext", () => ({ useRealtime: () => realtime }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../hooks/useOrganizationPermissions", () => ({
  useUserContext: () => ({ isOrganizationContext: false, organizationId: null }),
}));

const project = (id, name, tasks = []) => ({
  id,
  name,
  description: "",
  status: "active",
  priority: "medium",
  user_id: 1,
  user: { id: 1, name: "Ana" },
  users: [],
  team: null,
  tasks,
  is_owner: true,
  can_edit: true,
  can_delete: true,
  created_at: "2026-01-01T10:00:00.000000Z",
});

const task = (id, projectId, title) => ({
  id,
  project_id: projectId,
  title,
  status: "todo",
  priority: "medium",
  assigned_users: [],
  tags: [],
  checklist_items: [],
});

const GoTo = ({ to }) => {
  const navigate = useNavigate();
  return <button onClick={() => navigate(to)}>ir-{to}</button>;
};

const renderAt = (entry) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <GoTo to='/projects/2' />
      <Routes>
        <Route path='/projects/:id' element={<ProjectDetail />} />
      </Routes>
    </MemoryRouter>
  );

describe("ProjectDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    projectsAPI.getById.mockReset();
    tasksAPI.getAll.mockReset();
  });

  it("muestra las tareas de un proyecto fuera del contexto activo", async () => {
    projectsAPI.getById.mockResolvedValue(
      project(7, "Proyecto de otra empresa", [task(1, 7, "Tarea fuera de contexto")])
    );
    // GET /tasks está acotado al contexto activo: no trae nada de este proyecto
    tasksAPI.getAll.mockResolvedValue([]);

    renderAt("/projects/7");

    expect(await screen.findByText("Tarea fuera de contexto")).toBeInTheDocument();
  });

  it("ignora la respuesta vieja al navegar a otro proyecto", async () => {
    let resolveSlow;
    projectsAPI.getById.mockImplementation((id) =>
      String(id) === "1"
        ? new Promise((r) => (resolveSlow = r))
        : Promise.resolve(project(2, "Proyecto dos"))
    );
    tasksAPI.getAll.mockResolvedValue([]);

    renderAt("/projects/1");
    fireEvent.click(screen.getByText("ir-/projects/2"));

    expect((await screen.findAllByText("Proyecto dos")).length).toBeGreaterThan(0);

    await act(async () => {
      resolveSlow(project(1, "Proyecto uno"));
    });

    expect(screen.queryByText("Proyecto uno")).not.toBeInTheDocument();
  });
});
