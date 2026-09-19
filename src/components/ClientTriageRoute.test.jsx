import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ClientTriageRoute from "./ClientTriageRoute";

let mockUser;
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path='/clients' element={<ClientTriageRoute><p>Pantalla Clientes</p></ClientTriageRoute>} />
        <Route path='/clients/:id' element={<ClientTriageRoute><p>Ficha de cliente</p></ClientTriageRoute>} />
        <Route path='/client-tickets' element={<ClientTriageRoute><p>Pantalla Bandeja</p></ClientTriageRoute>} />
        <Route path='/tickets' element={<p>Pantalla Tickets</p>} />
      </Routes>
    </MemoryRouter>
  );

describe("ClientTriageRoute", () => {
  beforeEach(() => {
    mockUser = {
      id: 1,
      organization_id: 4,
      active_context: "4",
      organization: { id: 4, name: "Acme" },
      is_organization_owner: false,
      organization_role: "member",
    };
  });

  it.each(["/clients", "/clients/9", "/client-tickets"])("un member que abre %s va a /tickets", (path) => {
    renderAt(path);
    expect(screen.getByText("Pantalla Tickets")).toBeInTheDocument();
  });

  it("un manager ve Clientes y la Bandeja", () => {
    mockUser.organization_role = "manager";
    renderAt("/clients");
    expect(screen.getByText("Pantalla Clientes")).toBeInTheDocument();
  });

  it("el dueño ve la Bandeja", () => {
    mockUser.is_organization_owner = true;
    mockUser.organization_role = null;
    renderAt("/client-tickets");
    expect(screen.getByText("Pantalla Bandeja")).toBeInTheDocument();
  });
});
