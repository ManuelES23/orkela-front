import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import OrganizationRoute from "./OrganizationRoute";
import { workspaceToOpen } from "../utils/workspace";

const contexts = [
  { id: "personal", name: "Personal", type: "personal" },
  { id: "4", name: "Acme", type: "organization" },
  { id: "9", name: "Beta", type: "organization" },
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
vi.mock("./ui/LoadingScreen", () => ({ default: () => <p>cargando</p> }));

// Auth mínimo con estado: switchContext cambia el usuario como el real
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
    <Routes>
      <Route
        path='/tickets'
        element={
          <OrganizationRoute>
            <p>pagina-tickets</p>
          </OrganizationRoute>
        }
      />
      <Route path='/dashboard' element={<p>dashboard</p>} />
    </Routes>
  );
};

const renderAt = (entry, initialUser, switchImpl = vi.fn()) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Harness initialUser={initialUser} switchImpl={switchImpl} />
    </MemoryRouter>
  );

describe("OrganizationRoute", () => {
  beforeEach(() => {
    auth = null;
  });

  it("desde modo personal cambia a la organización del enlace y abre la página", async () => {
    const switchImpl = vi.fn();
    renderAt("/tickets?ticket=5&org=4", personalUser, switchImpl);

    expect(await screen.findByText("pagina-tickets")).toBeInTheDocument();
    expect(switchImpl).toHaveBeenCalledTimes(1);
    expect(switchImpl).toHaveBeenCalledWith("4");
  });

  it("si está en otra organización cambia a la del enlace", async () => {
    const switchImpl = vi.fn();
    renderAt("/tickets?ticket=5&org=9", orgUser(4), switchImpl);

    expect(await screen.findByText("pagina-tickets")).toBeInTheDocument();
    expect(switchImpl).toHaveBeenCalledWith("9");
  });

  it("sin organización en el enlace y en modo personal sigue yendo al dashboard", async () => {
    renderAt("/tickets", personalUser);
    expect(await screen.findByText("dashboard")).toBeInTheDocument();
  });

  it("si el cambio falla vuelve al dashboard", async () => {
    renderAt("/tickets?ticket=5&org=4", personalUser, vi.fn().mockRejectedValue(new Error("403")));
    expect(await screen.findByText("dashboard")).toBeInTheDocument();
  });
});

describe("workspaceToOpen", () => {
  const params = (q) => new URLSearchParams(q);

  it("ignora organizaciones a las que el usuario no tiene acceso", () => {
    expect(workspaceToOpen(personalUser, params("org=77"), "personal")).toBeNull();
  });

  it("no cambia si ya está en esa organización", () => {
    expect(workspaceToOpen(orgUser(4), params("org=4"), "4")).toBeNull();
  });

  it("para enlaces viejos sin org usa la única organización disponible", () => {
    const single = { ...personalUser, available_contexts: contexts.slice(0, 2) };
    expect(workspaceToOpen(single, params("ticket=5"), "personal")).toBe("4");
    expect(workspaceToOpen(personalUser, params("ticket=5"), "personal")).toBeNull();
  });
});
