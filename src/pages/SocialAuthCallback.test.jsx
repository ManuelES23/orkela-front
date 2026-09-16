import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import SocialAuthCallback from "./SocialAuthCallback";
import { socialAuthAPI, APIError } from "../utils/api";

const completeLogin = vi.fn();
const loginWithSocialResult = vi.fn((data) => data.user);

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  socialAuthAPI: { exchange: vi.fn(), confirm: vi.fn(), link: vi.fn(), linkWithPassword: vi.fn() },
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ loginWithSocialResult }) }));
vi.mock("../hooks/usePostLoginRedirect", () => ({
  usePostLoginRedirect: () => ({
    completeLogin,
    showContextModal: false,
    pendingUser: null,
    contextLoading: false,
    handleContextSelect: vi.fn(),
  }),
}));
vi.mock("../components/modals/ContextSelectionModal", () => ({ default: () => null }));

const SettingsProbe = () => {
  const location = useLocation();
  return <p>settings:{JSON.stringify(location.state)}</p>;
};

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path='/auth/callback' element={<SocialAuthCallback />} />
        <Route path='/settings' element={<SettingsProbe />} />
      </Routes>
    </MemoryRouter>
  );

const LINK_REQUIRED = { link_required: true, provider: "microsoft", email: "ana@grupoesplendido.com", has_password: true };

describe("SocialAuthCallback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pide la contraseña para unir cuentas e inicia sesión al confirmarla", async () => {
    socialAuthAPI.exchange.mockResolvedValue(LINK_REQUIRED);
    socialAuthAPI.linkWithPassword.mockResolvedValue({ user: { id: 7 }, token: "t" });
    renderAt("/auth/callback?ticket=t1");

    expect(await screen.findByRole("heading", { name: "¿Unimos estas cuentas?" })).toBeInTheDocument();
    expect(screen.getAllByText("ana@grupoesplendido.com").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Confirma con tu contraseña de Orkela"), { target: { value: "Clave123" } });
    fireEvent.click(screen.getByRole("button", { name: /unir y entrar/i }));

    await vi.waitFor(() => expect(completeLogin).toHaveBeenCalledWith({ id: 7 }));
    expect(socialAuthAPI.linkWithPassword).toHaveBeenCalledWith("t1", "Clave123");
  });

  it("muestra el error si la contraseña no es correcta", async () => {
    socialAuthAPI.exchange.mockResolvedValue(LINK_REQUIRED);
    socialAuthAPI.linkWithPassword.mockRejectedValue(new APIError("x", 422, { code: "invalid_password" }));
    renderAt("/auth/callback?ticket=t1");

    fireEvent.change(await screen.findByLabelText("Confirma con tu contraseña de Orkela"), { target: { value: "Mala123" } });
    fireEvent.click(screen.getByRole("button", { name: /unir y entrar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La contraseña no es correcta.");
    expect(completeLogin).not.toHaveBeenCalled();
  });

  it("explica qué hacer si la cuenta no tiene contraseña", async () => {
    socialAuthAPI.exchange.mockResolvedValue({ ...LINK_REQUIRED, has_password: false });
    renderAt("/auth/callback?ticket=t1");

    expect(await screen.findByText(/se creó con otra cuenta/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Confirma con tu contraseña de Orkela")).not.toBeInTheDocument();
  });

  it("en modo vincular termina la conexión y vuelve a Configuración", async () => {
    socialAuthAPI.link.mockResolvedValue({ provider: "google" });
    renderAt("/auth/callback?ticket=t9&mode=link");

    expect(await screen.findByText('settings:{"socialLinked":"google"}')).toBeInTheDocument();
    expect(socialAuthAPI.link).toHaveBeenCalledWith("t9");
    expect(socialAuthAPI.exchange).not.toHaveBeenCalled();
  });

  it("en modo vincular lleva el error a Configuración", async () => {
    socialAuthAPI.link.mockRejectedValue(new APIError("x", 409, { code: "already_linked" }));
    renderAt("/auth/callback?ticket=t9&mode=link");

    expect(await screen.findByText(/conectada a otro usuario/)).toBeInTheDocument();
  });
});
