import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { RealtimeProvider, useRealtime } from "./RealtimeContext";

let mockUser = { id: 1 };
let listener = null;
// Oyentes por canal y evento (canales de recurso *.sync)
const channelListeners = {};
const privateSpy = vi.fn();
const leaveSpy = vi.fn();
const unbindSpy = vi.fn();
const refreshUser = vi.fn(() => Promise.resolve());
const toasts = { success: vi.fn(), info: vi.fn(), warning: vi.fn() };

vi.mock("./AuthContext", () => ({ useAuth: () => ({ user: mockUser, refreshUser }) }));
vi.mock("./NotificationContext", () => ({
  useNotification: () => toasts,
}));
vi.mock("../utils/echo", () => {
  const channelFor = (name) => {
    const channel = {
      listen: (event, cb) => {
        if (name.startsWith("user.")) listener = cb;
        channelListeners[name] = { ...(channelListeners[name] || {}), [event]: cb };
        return channel;
      },
      subscribed: () => channel,
      error: () => channel,
    };
    return channel;
  };
  return {
    getEcho: () => ({
      private: (name) => {
        privateSpy(name);
        return channelFor(name);
      },
      leave: leaveSpy,
      connector: { pusher: { connection: { bind: vi.fn(), unbind: unbindSpy } } },
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
    leaveSpy.mockClear();
    refreshUser.mockClear();
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

  it("varias pantallas pueden registrar la misma clave y darse de baja por separado", async () => {
    let api_;
    const Grab = () => {
      api_ = useRealtime();
      return null;
    };
    render(
      <RealtimeProvider>
        <Grab />
      </RealtimeProvider>
    );
    const a = vi.fn();
    const b = vi.fn();
    const offA = api_.registerRefresh("projects", a);
    api_.registerRefresh("projects", b);

    act(() => api_.triggerRefresh("projects"));
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    offA();
    act(() => api_.triggerRefresh("projects"));
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it("comparte la suscripción a un canal de recurso y lo abandona con el último", async () => {
    let api_;
    const Grab = () => {
      api_ = useRealtime();
      return null;
    };
    render(
      <RealtimeProvider>
        <Grab />
      </RealtimeProvider>
    );
    const one = vi.fn();
    const two = vi.fn();
    const offOne = api_.subscribeChannel("project.5", "project.sync", one);
    const offTwo = api_.subscribeChannel("project.5", "project.sync", two);

    expect(privateSpy.mock.calls.filter(([n]) => n === "project.5")).toHaveLength(1);
    act(() => channelListeners["project.5"][".project.sync"]({ project_id: 5, entity: "task", action: "updated" }));
    expect(one).toHaveBeenCalledTimes(1);
    expect(two).toHaveBeenCalledTimes(1);
    expect(toasts.info).not.toHaveBeenCalled();

    offOne();
    expect(leaveSpy).not.toHaveBeenCalledWith("project.5");
    offTwo();
    expect(leaveSpy).toHaveBeenCalledWith("project.5");
  });

  it("escucha organization.sync de la organización activa sin avisos y refresca mi usuario si me afecta", async () => {
    mockUser = { id: 1, organization_id: 4, active_context: "4" };
    const clientTickets = vi.fn();
    const organizations = vi.fn();
    renderProvider({ onRefresh: { clientTickets, organizations } });
    await waitFor(() => expect(privateSpy).toHaveBeenCalledWith("organization.4"));
    const sync = (payload) => act(() => channelListeners["organization.4"][".organization.sync"](payload));

    sync({ organization_id: 4, entity: "client_ticket", action: "created", ticket_id: 9 });
    expect(clientTickets).toHaveBeenCalled();
    expect(refreshUser).not.toHaveBeenCalled();

    sync({ organization_id: 4, entity: "member", action: "role_updated", member_id: 1 });
    expect(organizations).toHaveBeenCalled();
    expect(refreshUser).toHaveBeenCalled();
    expect(screen.getByText("total:0")).toBeInTheDocument();
    expect(toasts.info).not.toHaveBeenCalled();
  });

  it("en modo personal no se suscribe a ninguna organización", () => {
    mockUser = { id: 1, organization_id: null, active_context: "personal" };
    renderProvider();
    expect(privateSpy.mock.calls.some(([n]) => n.startsWith("organization."))).toBe(false);
  });

  it("la desactivación muestra el mismo modal que la expulsión", async () => {
    renderProvider();
    await waitFor(() => expect(api.list).toHaveBeenCalled());

    emit({
      id: 3,
      type: "organization_member_deactivated",
      title: "t",
      message: "m",
      data: { action: "removed_from_organization", organization_name: "Acme" },
    });

    expect(screen.getByText("modal-removido:true")).toBeInTheDocument();
  });

  it("un cambio de mi rol refresca mi usuario", async () => {
    refreshUser.mockClear();
    renderProvider();
    await waitFor(() => expect(api.list).toHaveBeenCalled());

    emit(serverItem(4, { type: "organization_role_updated", data: { organization_id: 2, new_role: "admin" } }));

    expect(refreshUser).toHaveBeenCalled();
  });

  it("una invitación cancelada desaparece en vivo sin aviso", async () => {
    const invitations = vi.fn();
    renderProvider({ onRefresh: { invitations } });
    await waitFor(() => expect(api.list).toHaveBeenCalled());

    emit({ id: null, type: "organization_invitation_cancelled", silent: true, title: "", message: "", data: {} });

    expect(invitations).toHaveBeenCalled();
    expect(screen.getByText("total:0")).toBeInTheDocument();
    expect(toasts.info).not.toHaveBeenCalled();
  });

  it("desenlaza los handlers de conexión al cerrar sesión", async () => {
    const { rerender } = renderProvider();
    await waitFor(() => expect(api.list).toHaveBeenCalled());
    unbindSpy.mockClear();

    mockUser = null;
    rerender(
      <RealtimeProvider>
        <Probe />
      </RealtimeProvider>
    );

    expect(unbindSpy).toHaveBeenCalledWith("connected", expect.any(Function));
  });
});
