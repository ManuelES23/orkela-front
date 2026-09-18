import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMailResult, CLIENT_MAIL_FAILED_MESSAGE } from "./useMailResult";

const notification = { success: vi.fn(), warning: vi.fn(), showInvitationLinks: vi.fn() };
vi.mock("../context/NotificationContext", () => ({ useNotification: () => notification }));

describe("useMailResult", () => {
  beforeEach(() => vi.clearAllMocks());

  it("correo al cliente fallido: advertencia en vez de éxito", () => {
    const { result } = renderHook(() => useMailResult());

    expect(result.current.notifyClientMail({ mail_sent: false }, "Enlace de acceso reenviado")).toBe(false);
    expect(notification.warning).toHaveBeenCalledWith(CLIENT_MAIL_FAILED_MESSAGE);
    expect(notification.success).not.toHaveBeenCalled();
  });

  it("sin mail_sent (o true) mantiene el éxito de siempre", () => {
    const { result } = renderHook(() => useMailResult());

    result.current.notifyClientMail({}, "Cliente creado");
    result.current.notifyInvitation({ mail_sent: true }, "Invitación enviada");
    result.current.notifyClientMail({ id: 3 }); // comentario sin mensaje de éxito

    expect(notification.success).toHaveBeenCalledTimes(2);
    expect(notification.warning).not.toHaveBeenCalled();
    expect(notification.showInvitationLinks).not.toHaveBeenCalled();
  });

  it("invitación fallida: muestra el enlace para compartir", () => {
    const { result } = renderHook(() => useMailResult());

    result.current.notifyInvitation(
      { mail_sent: false, invitation_link: "http://x/accept-team-invitation/t" },
      "Invitación enviada",
      "ana@acme.com"
    );

    expect(notification.showInvitationLinks).toHaveBeenCalledWith([
      { email: "ana@acme.com", link: "http://x/accept-team-invitation/t" },
    ]);
    expect(notification.success).not.toHaveBeenCalled();
  });
});
