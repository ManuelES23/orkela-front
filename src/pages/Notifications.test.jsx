import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import Notifications from "./Notifications";

const api = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("../utils/api", () => ({ notificationsAPI: api }));
vi.mock("../components/layout/Layout", () => ({
  default: ({ children, subtitle }) => (
    <div>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}));
const toast = { error: vi.fn(), success: vi.fn(), warning: vi.fn() };
vi.mock("../context/NotificationContext", () => ({ useNotification: () => toast }));

let realtime;
let historyListener;
vi.mock("../context/RealtimeContext", () => ({ useRealtime: () => realtime }));

const Where = () => {
  const location = useLocation();
  return <p>ruta:{location.pathname + location.search}</p>;
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/notificaciones"]}>
      <Routes>
        <Route path='/notificaciones' element={<Notifications />} />
        <Route path='*' element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

const item = (id, extra = {}) => ({
  id,
  type: "task_assigned",
  category: "tasks",
  title: `Título ${id}`,
  message: `Mensaje ${id}`,
  data: { task_id: 100 + id },
  read_at: null,
  created_at: new Date().toISOString(),
  ...extra,
});

const page = (data, extra = {}) => ({ data, next_cursor: null, unread_count: 1, retention_days: 30, ...extra });

describe("Notifications (historial)", () => {
  beforeEach(() => {
    api.list.mockReset().mockResolvedValue(page([item(2), item(1, { read_at: new Date().toISOString() })]));
    realtime = {
      unreadCount: 1,
      retentionDays: 30,
      markAsRead: vi.fn().mockResolvedValue(),
      markAllAsRead: vi.fn().mockResolvedValue(),
      removeNotification: vi.fn().mockResolvedValue(),
      subscribeToNotifications: (listener) => {
        historyListener = listener;
        return () => {
          historyListener = null;
        };
      },
    };
    toast.error.mockClear();
  });

  it("agrupa por día y muestra el plazo de retención", async () => {
    renderPage();

    expect(await screen.findByText("Título 2")).toBeInTheDocument();
    expect(screen.getByText("Hoy")).toBeInTheDocument();
    expect(screen.getByText(/se guardan 30 días/i)).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledWith({ limit: 20 });
  });

  it("filtra por categoría y por no leídas", async () => {
    renderPage();
    await screen.findByText("Título 2");

    fireEvent.click(screen.getByRole("tab", { name: "Tickets" }));
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith({ limit: 20, category: "tickets" }));

    fireEvent.click(screen.getByRole("radio", { name: "No leídas" }));
    await waitFor(() =>
      expect(api.list).toHaveBeenLastCalledWith({ limit: 20, category: "tickets", status: "unread" })
    );
  });

  it("carga más con el cursor", async () => {
    api.list
      .mockResolvedValueOnce(page([item(3)], { next_cursor: "abc" }))
      .mockResolvedValueOnce(page([item(2)]));
    renderPage();
    await screen.findByText("Título 3");

    fireEvent.click(screen.getByRole("button", { name: /cargar más/i }));

    expect(await screen.findByText("Título 2")).toBeInTheDocument();
    expect(api.list).toHaveBeenLastCalledWith({ limit: 20, cursor: "abc" });
    expect(screen.queryByRole("button", { name: /cargar más/i })).not.toBeInTheDocument();
  });

  it("elimina una notificación", async () => {
    renderPage();
    await screen.findByText("Título 2");

    fireEvent.click(screen.getAllByRole("button", { name: /eliminar notificación/i })[0]);

    expect(realtime.removeNotification).toHaveBeenCalledWith(2);
    await waitFor(() => expect(screen.queryByText("Título 2")).not.toBeInTheDocument());
  });

  it("marca una como leída sin navegar", async () => {
    renderPage();
    await screen.findByText("Título 2");

    fireEvent.click(screen.getByRole("button", { name: /marcar como leída/i }));

    expect(realtime.markAsRead).toHaveBeenCalledWith(2);
    expect(screen.queryByText(/^ruta:/)).not.toBeInTheDocument();
  });

  it("al hacer clic abre el recurso", async () => {
    renderPage();
    fireEvent.click(await screen.findByText("Título 2"));

    expect(realtime.markAsRead).toHaveBeenCalledWith(2);
    expect(await screen.findByText("ruta:/tasks?task=102")).toBeInTheDocument();
  });

  it("agrega en vivo las que llegan si coinciden con el filtro", async () => {
    renderPage();
    await screen.findByText("Título 2");

    act(() =>
      historyListener({
        kind: "created",
        notification: {
          id: 9,
          type: "ticket_created",
          category: "tickets",
          title: "En vivo",
          message: "m",
          data: {},
          read: false,
          createdAt: new Date(),
        },
      })
    );

    expect(screen.getByText("En vivo")).toBeInTheDocument();
  });

  it("estado vacío", async () => {
    api.list.mockResolvedValue(page([], { unread_count: 0 }));
    renderPage();

    expect(await screen.findByText("No tienes notificaciones")).toBeInTheDocument();
  });

  it("marca todas como leídas", async () => {
    renderPage();
    await screen.findByText("Título 2");

    fireEvent.click(screen.getByRole("button", { name: /marcar todas como leídas/i }));

    expect(realtime.markAllAsRead).toHaveBeenCalled();
  });
});
