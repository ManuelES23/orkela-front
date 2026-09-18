import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import useOpenNotification from "./useOpenNotification";

const realtime = vi.hoisted(() => ({ markAsRead: vi.fn() }));
vi.mock("../context/RealtimeContext", () => ({ useRealtime: () => realtime }));
const toast = vi.hoisted(() => ({ warning: vi.fn() }));
vi.mock("../context/NotificationContext", () => ({ useNotification: () => toast }));

const Where = () => {
  const location = useLocation();
  return <p>ruta:{location.pathname + location.search}</p>;
};

const Opener = ({ notification }) => {
  const open = useOpenNotification();
  return <button onClick={() => open(notification)}>abrir</button>;
};

const renderWith = (notification) =>
  render(
    <MemoryRouter initialEntries={["/notificaciones"]}>
      <Opener notification={notification} />
      <Routes>
        <Route path='*' element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

describe("useOpenNotification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marca leída y lleva al recurso exacto", () => {
    renderWith({ id: 3, type: "task_assigned", read: false, data: { task_id: 9, project_id: 2, organization_id: 4 } });
    fireEvent.click(screen.getByText("abrir"));

    expect(realtime.markAsRead).toHaveBeenCalledWith(3);
    expect(screen.getByText("ruta:/tasks?task=9&org=4")).toBeInTheDocument();
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("recurso borrado: lleva al listado con un aviso", () => {
    renderWith({ id: 4, type: "project_deleted", read: true, data: { project_id: 2, organization_id: 7, project_name: "Web" } });
    fireEvent.click(screen.getByText("abrir"));

    expect(realtime.markAsRead).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith('El proyecto "Web" ya no existe');
    expect(screen.getByText("ruta:/projects?org=7")).toBeInTheDocument();
  });

  it("sin destino (removido de la organización): solo la marca leída", () => {
    renderWith({
      id: 5,
      type: "organization_member_removed",
      read: false,
      data: { organization_id: 6, action: "removed_from_organization" },
    });
    fireEvent.click(screen.getByText("abrir"));

    expect(realtime.markAsRead).toHaveBeenCalledWith(5);
    expect(screen.getByText("ruta:/notificaciones")).toBeInTheDocument();
  });

  it("no intenta marcar en el servidor un aviso local sin id guardado", () => {
    renderWith({ id: "local-1", type: "team_member_joined", read: false, data: { team_id: 4 } });
    fireEvent.click(screen.getByText("abrir"));

    expect(realtime.markAsRead).not.toHaveBeenCalled();
    expect(screen.getByText("ruta:/teams/4")).toBeInTheDocument();
  });
});
