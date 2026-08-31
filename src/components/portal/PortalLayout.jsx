import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPortalToken,
  clearPortalToken,
  getPortalOrgSlug,
} from "../../utils/portalApi";

/**
 * Shell del portal público de clientes. No usa el layout interno de
 * Orkela (sin sidebar) — header mínimo con la marca de la organización.
 *
 * Guard de acceso: si no hay token, o si cualquier request del portal
 * responde 401 (evento global "portal:unauthorized"), redirige a la
 * pantalla de solicitar acceso de la organización guardada, o muestra
 * un mensaje si ni siquiera eso se conoce (primera visita con un link
 * roto, sin haber pasado nunca por un magic link válido).
 */
const PortalLayout = ({ children }) => {
  const navigate = useNavigate();
  const [hasToken, setHasToken] = useState(() => Boolean(getPortalToken()));

  useEffect(() => {
    const handleUnauthorized = () => {
      clearPortalToken();
      setHasToken(false);
      const orgSlug = getPortalOrgSlug();
      if (orgSlug) {
        navigate(`/portal/${orgSlug}`, { replace: true });
      }
    };

    window.addEventListener("portal:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("portal:unauthorized", handleUnauthorized);
  }, [navigate]);

  if (!hasToken) {
    const orgSlug = getPortalOrgSlug();
    if (orgSlug) {
      navigate(`/portal/${orgSlug}`, { replace: true });
      return null;
    }

    return (
      <div className='min-h-screen flex items-center justify-center bg-[#f7f5fb] p-6 text-center'>
        <div>
          <p className='text-gray-900 font-semibold mb-2'>
            No pudimos verificar tu acceso
          </p>
          <p className='text-gray-500 text-sm max-w-sm'>
            Revisa el correo con tu enlace de acceso al portal, o contacta al
            equipo de soporte para que te reenvíen uno nuevo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#f7f5fb] flex flex-col'>
      <header className='border-b border-gray-200 bg-white px-6 py-3.5 flex items-center gap-2.5 shrink-0'>
        <img
          src='/img/isotipo_orkela.png'
          alt=''
          className='w-8 h-8 object-contain'
          aria-hidden='true'
        />
        <span className='font-bold text-gray-900'>Portal de soporte</span>
      </header>
      <main className='flex-1 flex flex-col min-h-0'>{children}</main>
    </div>
  );
};

export default PortalLayout;
