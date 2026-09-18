import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import NotificationsPanel from "./NotificationsPanel";

let realtime;
vi.mock("../../context/RealtimeContext", () => ({
  useRealtime: () => realtime,
}));
const toast = vi.hoisted(() => ({ warning: vi.fn() }));
vi.mock("../../context/NotificationContext", () => ({ useNotification: () => toast }));

const Where = () => {
  const location = useLocation();
  return <p>ruta:{location.pathname + location.search}</p>;
};

const renderPanel = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <NotificationsPanel />
      <Routes>
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
  data: { task_id: 40 + id, project_id: 2 },
  read: false,
  createdAt: new Date(),
  ...extra,
});

describe("NotificationsPanel", () => {
  beforeEach(() => {
    realtime = {
      notifications: [item(1), item(2, { read: true, type: "project_updated", data: { project_id: 9 } })],
      unreadCount: 12,
      isConnected: true,
      loadingNotifications: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    };
  });

  it("muestra el contador del servidor en la campana", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /notificaciones, 12 sin leer/i })).toHaveTextContent("9+");
  });

  it("al hacer clic marca como leída y navega al recurso", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));
    fireEvent.click(screen.getByText("Título 1"));

    expect(realtime.markAsRead).toHaveBeenCalledWith(1);
    expect(screen.getByText("ruta:/tasks?task=41")).toBeInTheDocument();
  });

  it("una ya leída no se vuelve a marcar pero sí navega", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));
    fireEvent.click(screen.getByText("Título 2"));

    expect(realtime.markAsRead).not.toHaveBeenCalled();
    expect(screen.getByText("ruta:/projects/9")).toBeInTheDocument();
  });

  it("marca todas como leídas", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));
    fireEvent.click(screen.getByRole("button", { name: /marcar todas como leídas/i }));

    expect(realtime.markAllAsRead).toHaveBeenCalled();
  });

  it("lleva al historial completo", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));
    fireEvent.click(screen.getByRole("link", { name: /ver todo el historial/i }));

    expect(screen.getByText("ruta:/notificaciones")).toBeInTheDocument();
  });

  it("estado vacío", () => {
    realtime = { ...realtime, notifications: [], unreadCount: 0 };
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));

    expect(screen.getByText("No tienes notificaciones")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /marcar todas como leídas/i })).not.toBeInTheDocument();
  });
});
