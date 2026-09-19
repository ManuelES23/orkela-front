import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOrganizationPermissions } from "./useOrganizationPermissions";

let mockUser = null;
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));

const orgUser = (overrides) => ({
  id: 1,
  organization_id: 4,
  active_context: "4",
  organization: { id: 4, name: "Acme" },
  is_organization_owner: false,
  organization_role: "member",
  ...overrides,
});

describe("useOrganizationPermissions — canTriageClients", () => {
  beforeEach(() => {
    mockUser = null;
  });

  it.each(["owner", "admin", "manager"])("%s atiende a los clientes", (role) => {
    mockUser = orgUser({ organization_role: role });
    const { result } = renderHook(() => useOrganizationPermissions());
    expect(result.current.canTriageClients).toBe(true);
  });

  it("el dueño atiende a los clientes aunque no traiga rol", () => {
    mockUser = orgUser({ organization_role: null, is_organization_owner: true });
    const { result } = renderHook(() => useOrganizationPermissions());
    expect(result.current.canTriageClients).toBe(true);
  });

  it("un member no atiende a los clientes", () => {
    mockUser = orgUser({ organization_role: "member" });
    const { result } = renderHook(() => useOrganizationPermissions());
    expect(result.current.canTriageClients).toBe(false);
  });

  it("en modo personal no hay triage", () => {
    mockUser = orgUser({ organization_role: "manager", active_context: "personal" });
    const { result } = renderHook(() => useOrganizationPermissions());
    expect(result.current.canTriageClients).toBe(false);
  });

  it("sin usuario no hay triage", () => {
    const { result } = renderHook(() => useOrganizationPermissions());
    expect(result.current.canTriageClients).toBe(false);
  });

  it("con el objeto de organización usa user_role", () => {
    mockUser = orgUser({ organization_role: "member" });
    const { result } = renderHook(() => useOrganizationPermissions({ user_role: "manager", is_owner: false }));
    expect(result.current.canTriageClients).toBe(true);
  });
});
