import { useCallback } from "react";
import { useNotification } from "../context/NotificationContext";
import { INVITE_MAIL_FAILED_MESSAGE } from "../components/ui/InvitationLinkNotice";

export const CLIENT_MAIL_FAILED_MESSAGE =
  "Se guardó, pero no se pudo enviar el correo al cliente";

/**
 * El backend responde `mail_sent: false` cuando el correo no salió (SMTP
 * caído, etc.). Ausente o true = comportamiento de siempre.
 */
export const mailFailed = (result) => result?.mail_sent === false;

/**
 * Avisos para respuestas que disparan un correo. En vez de mostrar "enviado"
 * cuando el correo falló:
 * - invitaciones: aviso con el enlace para compartir a mano (invitation_link)
 * - correos al cliente del portal: toast de advertencia (nunca hay enlace:
 *   el magic link no vuelve al staff)
 */
export const useMailResult = () => {
  const { success, warning, showInvitationLinks } = useNotification();

  // Devuelve true si el correo salió (o el backend no lo informa)
  const notifyInvitation = useCallback(
    (result, successMessage, email) => {
      if (!mailFailed(result)) {
        if (successMessage) success(successMessage);
        return true;
      }
      if (result.invitation_link && showInvitationLinks) {
        showInvitationLinks([{ email, link: result.invitation_link }]);
      } else {
        warning(INVITE_MAIL_FAILED_MESSAGE);
      }
      return false;
    },
    [success, warning, showInvitationLinks]
  );

  const notifyClientMail = useCallback(
    (result, successMessage) => {
      if (mailFailed(result)) {
        warning(CLIENT_MAIL_FAILED_MESSAGE);
        return false;
      }
      if (successMessage) success(successMessage);
      return true;
    },
    [success, warning]
  );

  return { notifyInvitation, notifyClientMail, showInvitationLinks };
};

export default useMailResult;
