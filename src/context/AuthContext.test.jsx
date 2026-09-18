import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { authAPI, APIError } from "../utils/api";

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  authAPI: { getUser: vi.fn() },
}));

const Probe = () => {
  const { user, loading } = useAuth();
  if (loading) return <p>cargando</p>;
  return <p>usuario:{user ? user.name : "ninguno"}</p>;
};

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

describe("AuthProvider: verificación inicial de la sesión", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("token", "tok");
    localStorage.setItem("user", JSON.stringify({ id: 1, name: "Ana" }));
  });

  it("con un 401 limpia la sesión", async () => {
    authAPI.getUser.mockRejectedValue(new APIError("Unauthenticated.", 401));

    renderProvider();

    expect(await screen.findByText("usuario:ninguno")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("con un error de red conserva el token y ofrece reintentar", async () => {
    authAPI.getUser.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    renderProvider();

    const retry = await screen.findByRole("button", { name: /reintentar/i });
    expect(localStorage.getItem("token")).toBe("tok");
    expect(screen.queryByText(/usuario:/)).not.toBeInTheDocument();

    authAPI.getUser.mockResolvedValueOnce({ id: 1, name: "Ana" });
    fireEvent.click(retry);

    expect(await screen.findByText("usuario:Ana")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe("tok");
  });

  it("con un 500 no cierra la sesión", async () => {
    authAPI.getUser.mockRejectedValue(new APIError("Server Error", 500));

    renderProvider();

    expect(await screen.findByRole("button", { name: /reintentar/i })).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe("tok");
    expect(localStorage.getItem("user")).not.toBeNull();
  });
});
