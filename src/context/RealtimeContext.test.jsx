import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { RealtimeProvider, useRealtime } from "./RealtimeContext";

let mockUser = { id: 1 };
let listener = null;
const privateSpy = vi.fn();
const toasts = { success: vi.fn(), info: vi.fn(), warning: vi.fn() };

vi.mock("./AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock("./NotificationContext", () => ({
  useNotification: () => toasts,
}));
vi.mock("../utils/echo", () => {
  const channel = {
    listen: (_event, cb) => {
      listener = cb;
      return channel;
    },
    subscribed: () => channel,
    error: () => channel,
  };
  return {
    getEcho: () => ({
      private: (name) => {
        privateSpy(name);
        return channel;
      },
      leave: vi.fn(),
      connector: { pusher: { connection: { bind: vi.fn() } } },
    }),
    updateEchoAuth: vi.fn(),
    disconnectEcho: vi.fn(),
  };
});

const api = vi.hoisted(() => ({
  list: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("../utils/api", () => ({ notificationsAPI: api }));

const Probe = ({ onRefresh = {} }) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removedFromOrgModal,
    registerRefresh,
  } = useRealtime();

  useEffect(() => {
    Object.entries(onRefresh).forEach(([key, cb]) => registerRefresh(key, cb));
  }, [onRefresh, registerRefresh]);

  return (
    <div>
      <p>no-leidas:{unreadCount}</p>
      <p>total:{notifications.length}</p>
      <p>modal-removido:{String(removedFromOrgModal.isOpen)}</p>
      <button onClick={() => markAllAsRead()}>leer todas</button>
      {notifications.map((n) => (
        <button key={n.id} onClick={() => markAsRead(n.id)}>
          leer {n.title}
        </button>
      ))}
    </div>
  );
};

const renderProvider = (props) =>
  render(
    <RealtimeProvider>
      <Probe {...props} />
    </RealtimeProvider>
  );

const emit = (data) => act(() => listener(data));

const serverItem = (id, extra = {}) => ({
  id,
  type: "task_created",
  category: "tasks",
  title: `N${id}`,
  message: "m",
  data: {},
  read_at: null,
  created_at: "2026-09-18T10:00:00+00:00",
  ...extra,
});

describe("RealtimeProvider", () => {
  beforeEach(() => {
    mockUser = { id: 1 };
    listener = null;
    privateSpy.mockClear();
    Object.values(toasts).forEach((fn) => fn.mockClear());
    api.list.mockReset().mockResolvedValue({ data: [], next_cursor: null, unread_count: 0, retention_days: 30 });
    api.markAsRead.mockReset().mockResolvedValue({ unread_count: 0 });
    api.markAllAsRead.mockReset().mockResolvedValue({ unread_count: 0 });
    api.remove.mockReset().mockResolvedValue({ unread_count: 0 });
    localStorage.setItem("token", "tok");
  });

  it("carga las últimas 10 y el contador del servidor al iniciar sesión", async () => {
    api.list.mockResolvedValue({
      data: [serverItem(2), serverItem(1, { read_at: "2026-09-18T11:00:00+00:00" })],
      next_cursor: null,
      unread_count: 7,
      retention_days: 30,
    });

    renderProvider();

    expect(await screen.findByText("no-leidas:7")).toBeInTheDocument();
    expect(screen.getByText("total:2")).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledWith({ limit: 10 });
  });

  it("agrega en vivo la notificación que llega y no la duplica", async () => {
    api.list.mockResolvedValue({ data: [serverItem(1)], next_cursor: null, unread_count: 1, retention_days: 30 });
    renderProvider();
    await screen.findByText("no-leidas:1");

    emit(serverItem(2, { title: "Nueva" }));
    emit(serverItem(2, { title: "Nueva" }));

    expect(screen.getByText("total:2")).toBeInTheDocument();
    expect(screen.getByText("no-leidas:2")).toBeInTheDocument();
    expect(toasts.info).toHaveBeenCalledTimes(1);
  });

  it("una señal silenciosa refresca sin aviso ni historial", async () => {
    const projects = vi.fn();
    const tasks = vi.fn();
    const callbacks = { projects, tasks };
    renderProvider({ onRefresh: callbacks });
    await waitFor(() => expect(api.list).toHaveBeenCalled());

    emit({ id: null, type: "project_updated", silent: true, title: "t", message: "", data: { project_id: 3 } });

    expect(screen.getByText("total:0")).toBeInTheDocument();
    expect(screen.getByText("no-leidas:0")).toBeInTheDocument();
    expect(toasts.info).not.toHaveBeenCalled();
    expect(projects).toHaveBeenCalled();
    expect(tasks).toHaveBeenCalled();
  });

  it("marca como leída en el servidor y una ya leída no baja el contador", async () => {
    api.list.mockResolvedValue({
      data: [serverItem(2, { title: "B" }), serverItem(1, { title: "A" })],
      next_cursor: null,
      unread_count: 2,
      retention_days: 30,
    });
    api.markAsRead.mockResolvedValue({ unread_count: 1 });
    renderProvider();
    await screen.findByText("no-leidas:2");

    fireEvent.click(screen.getByText("leer A"));
    fireEvent.click(screen.getByText("leer A"));

    await waitFor(() => expect(screen.getByText("no-leidas:1")).toBeInTheDocument());
    expect(api.markAsRead).toHaveBeenCalledTimes(1);
    expect(api.markAsRead).toHaveBeenCalledWith(1);
  });

  it("marca todas como leídas", async () => {
    api.list.mockResolvedValue({ data: [serverItem(1)], next_cursor: null, unread_count: 4, retention_days: 30 });
    renderProvider();
    await screen.findByText("no-leidas:4");

    fireEvent.click(screen.getByText("leer todas"));

    await waitFor(() => expect(screen.getByText("no-leidas:0")).toBeInTheDocument());
    expect(api.markAllAsRead).toHaveBeenCalled();
  });

  it("borra el historial y el contador al cerrar sesión", async () => {
    const { rerender } = renderProvider();
    await waitFor(() => expect(api.list).toHaveBeenCalled());

    emit(serverItem(5, { type: "project_created", title: "Proyecto secreto" }));
    emit({
      id: 6,
      type: "organization_member_removed",
      title: "t",
      message: "m",
      data: { action: "removed_from_organization" },
    });
    expect(screen.getByText("no-leidas:2")).toBeInTheDocument();
    expect(screen.getByText("modal-removido:true")).toBeInTheDocument();

    mockUser = null;
    rerender(
      <RealtimeProvider>
        <Probe />
      </RealtimeProvider>
    );

    expect(screen.getByText("no-leidas:0")).toBeInTheDocument();
    expect(screen.getByText("total:0")).toBeInTheDocument();
    expect(screen.getByText("modal-removido:false")).toBeInTheDocument();
  });

  it("refresca el dashboard, los proyectos y el detalle de la tarea en eventos de tareas", async () => {
    const dashboard = vi.fn();
    const taskDetail = vi.fn();
    const projects = vi.fn();
    const callbacks = { dashboard, projects, "task-detail-7": taskDetail };
    renderProvider({ onRefresh: callbacks });
    await waitFor(() => expect(api.list).toHaveBeenCalled());

    emit(serverItem(9, { type: "task_created", data: { task_id: 7 } }));

    expect(dashboard).toHaveBeenCalled();
    expect(taskDetail).toHaveBeenCalled();
    expect(projects).toHaveBeenCalled();
  });

  it("refresca el dashboard en eventos de proyectos y equipos", async () => {
    const dashboard = vi.fn();
    const callbacks = { dashboard };
    renderProvider({ onRefresh: callbacks });
    await waitFor(() => expect(api.list).toHaveBeenCalled());

    emit(serverItem(1, { type: "project_created" }));
    emit(serverItem(2, { type: "team_member_joined" }));

    expect(dashboard).toHaveBeenCalledTimes(2);
  });

  it("no suscribe al superadmin al canal user.{id} ni pide su historial", () => {
    mockUser = { id: 1, isSystemAdmin: true };
    renderProvider();

    expect(privateSpy).not.toHaveBeenCalled();
    expect(api.list).not.toHaveBeenCalled();
  });

  it("suscribe al usuario normal a su canal", async () => {
    renderProvider();

    expect(privateSpy).toHaveBeenCalledWith("user.1");
    await waitFor(() => expect(api.list).toHaveBeenCalled());
  });
});
