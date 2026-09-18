import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { useEffect } from "react";
import { RealtimeProvider, useRealtime } from "./RealtimeContext";

let mockUser = { id: 1 };
let listener = null;

vi.mock("./AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock("./NotificationContext", () => ({
  useNotification: () => ({ success: vi.fn(), info: vi.fn(), warning: vi.fn() }),
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
      private: () => channel,
      leave: vi.fn(),
      connector: { pusher: { connection: { bind: vi.fn() } } },
    }),
    updateEchoAuth: vi.fn(),
    disconnectEcho: vi.fn(),
  };
});

const Probe = ({ onRefresh = {} }) => {
  const { notifications, unreadCount, markAsRead, removedFromOrgModal, registerRefresh } =
    useRealtime();

  useEffect(() => {
    Object.entries(onRefresh).forEach(([key, cb]) => registerRefresh(key, cb));
  }, [onRefresh, registerRefresh]);

  return (
    <div>
      <p>no-leidas:{unreadCount}</p>
      <p>total:{notifications.length}</p>
      <p>ids-unicos:{new Set(notifications.map((n) => n.id)).size}</p>
      <p>modal-removido:{String(removedFromOrgModal.isOpen)}</p>
      {notifications.map((n) => (
        <button key={n.id} onClick={() => markAsRead(n.id)}>
          leer {n.title}
        </button>
      ))}
    </div>
  );
};

const emit = (data) => act(() => listener(data));

describe("RealtimeProvider", () => {
  beforeEach(() => {
    mockUser = { id: 1 };
    listener = null;
    localStorage.setItem("token", "tok");
  });

  it("borra el historial y el contador al cerrar sesión", () => {
    const { rerender } = render(
      <RealtimeProvider>
        <Probe />
      </RealtimeProvider>
    );

    emit({ type: "project_created", title: "Proyecto secreto", message: "m" });
    emit({
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

  it("genera ids únicos aunque lleguen en el mismo milisegundo", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    render(
      <RealtimeProvider>
        <Probe />
      </RealtimeProvider>
    );

    emit({ type: "project_created", title: "A", message: "m" });
    emit({ type: "project_created", title: "B", message: "m" });
    vi.restoreAllMocks();

    expect(screen.getByText("ids-unicos:2")).toBeInTheDocument();
  });

  it("marcar como leída una notificación ya leída no baja el contador", () => {
    render(
      <RealtimeProvider>
        <Probe />
      </RealtimeProvider>
    );

    emit({ type: "project_created", title: "A", message: "m" });
    emit({ type: "project_created", title: "B", message: "m" });

    fireEvent.click(screen.getByText("leer A"));
    fireEvent.click(screen.getByText("leer A"));

    expect(screen.getByText("no-leidas:1")).toBeInTheDocument();
  });

  it("refresca el dashboard y el detalle de la tarea en eventos de tareas", () => {
    const dashboard = vi.fn();
    const taskDetail = vi.fn();
    const callbacks = { dashboard, "task-detail-7": taskDetail };

    render(
      <RealtimeProvider>
        <Probe onRefresh={callbacks} />
      </RealtimeProvider>
    );

    emit({ type: "task_updated", title: "t", message: "m", data: { task_id: 7 } });

    expect(dashboard).toHaveBeenCalled();
    expect(taskDetail).toHaveBeenCalled();
  });

  it("refresca el dashboard en eventos de proyectos y equipos", () => {
    const dashboard = vi.fn();
    const callbacks = { dashboard };

    render(
      <RealtimeProvider>
        <Probe onRefresh={callbacks} />
      </RealtimeProvider>
    );

    emit({ type: "project_created", title: "t", message: "m" });
    emit({ type: "team_created", title: "t", message: "m" });

    expect(dashboard).toHaveBeenCalledTimes(2);
  });
});
