import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { useState } from "react";
import PrivateRoute from "../components/PrivateRoute";
import Tasks from "./Tasks";
import { tasksAPI, APIError } from "../utils/api";

// Enlace de una notificación de tarea (/tasks?task=ID&org=ORG): la ruta
// cambia al workspace del proyecto de la tarea y la página abre su detalle.

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  tasksAPI: { getAll: vi.fn(), getById: vi.fn() },
  checklistAPI: {},
}));
vi.mock("../components/layout/Layout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../components/modals/TaskModal", () => ({ default: () => null }));
vi.mock("../components/ui/LoadingScreen", () => ({ default: () => <p>cargando-workspace</p> }));
const notification = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }));
vi.mock("../context/NotificationContext", () => ({ useNotification: () => notification }));
const realtime = vi.hoisted(() => ({
  registerRefresh: vi.fn(() => () => {}),
  unregisterRefresh: vi.fn(),
  subscribeChannel: vi.fn(() => () => {}),
  channelEpoch: 0,
}));
vi.mock("../context/RealtimeContext", () => ({ useRealtime: () => realtime, PROJECT_LIST_KEY: "projectList" }));

const contexts = [
  { id: "personal", name: "Personal", type: "personal" },
  { id: "4", name: "Acme", type: "organization" },
];
const personalUser = { id: 1, active_context: "personal", organization_id: null, available_contexts: contexts };
const orgUser = (id) => ({
  id: 1,
  active_context: String(id),
  organization_id: id,
  organization: { id },
  available_contexts: contexts,
});

let auth;
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));

const Where = () => {
  const location = useLocation();
  return <p>ruta:{location.pathname + location.search}</p>;
};

const Harness = ({ initialUser, switchImpl }) => {
  const [user, setUser] = useState(initialUser);
  auth = {
    user,
    loading: false,
    getActiveContext: () => contexts.find((ctx) => ctx.id === user?.active_context),
    switchContext: async (ctx) => {
      await switchImpl(ctx);
      const next = orgUser(Number(ctx));
      setUser(next);
      return next;
    },
  };
  return (
    <>
      <Routes>
        <Route
          path='/tasks'
          element={
            <PrivateRoute>
              <Tasks />
            </PrivateRoute>
          }
        />
      </Routes>
      <Where />
    </>
  );
};

const renderAt = (entry, initialUser, switchImpl = vi.fn()) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Harness initialUser={initialUser} switchImpl={switchImpl} />
    </MemoryRouter>
  );

const task = {
  id: 7,
  project_id: 3,
  title: "Diseñar portada",
  status: "todo",
  priority: "medium",
  checklist_items: [],
  assigned_users: [],
  tags: [],
  project: { id: 3, name: "Web" },
};

describe("Tasks: enlace de una notificación", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth = null;
    tasksAPI.getAll.mockResolvedValue([]);
    tasksAPI.getById.mockResolvedValue(task);
  });

  it("desde modo personal cambia a la organización de la tarea y abre su detalle", async () => {
    const workspaceAtLoad = [];
    tasksAPI.getAll.mockImplementation(async () => {
      workspaceAtLoad.push(auth.user.active_context);
      return [];
    });
    const switchImpl = vi.fn();
    renderAt("/tasks?task=7&org=4", personalUser, switchImpl);

    expect(await screen.findByRole("heading", { name: "Diseñar portada" })).toBeInTheDocument();
    expect(switchImpl).toHaveBeenCalledTimes(1);
    expect(switchImpl).toHaveBeenCalledWith("4");
    expect(tasksAPI.getById).toHaveBeenCalledWith(7);
    // La lista se cargó ya en el workspace de la tarea
    expect(workspaceAtLoad).toEqual(["4"]);
    // El enlace se consume: recargar no vuelve a abrirla ni a cambiar
    await waitFor(() => expect(screen.getByText("ruta:/tasks")).toBeInTheDocument());
  });

  it("si ya está en esa organización abre el detalle sin cambiar de workspace", async () => {
    const switchImpl = vi.fn();
    renderAt("/tasks?task=7&org=4", orgUser(4), switchImpl);

    expect(await screen.findByRole("heading", { name: "Diseñar portada" })).toBeInTheDocument();
    expect(switchImpl).not.toHaveBeenCalled();
  });

  it("si no puede cambiar de workspace abre igualmente el detalle", async () => {
    const switchImpl = vi.fn().mockRejectedValue(new Error("sin acceso"));
    renderAt("/tasks?task=7&org=4", personalUser, switchImpl);

    expect(await screen.findByRole("heading", { name: "Diseñar portada" })).toBeInTheDocument();
    expect(switchImpl).toHaveBeenCalledTimes(1);
  });

  it("si la tarea ya no existe (o no hay acceso) avisa y no deja un modal vacío", async () => {
    tasksAPI.getById.mockRejectedValue(new APIError("No encontrado", 404));
    renderAt("/tasks?task=99", orgUser(4));

    await waitFor(() =>
      expect(notification.info).toHaveBeenCalledWith("Esta tarea ya no existe o no tienes acceso a ella")
    );
    expect(screen.queryByText("Detalle de Tarea")).not.toBeInTheDocument();
  });
});
