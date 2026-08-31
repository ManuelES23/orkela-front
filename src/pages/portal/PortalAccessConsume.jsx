import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  setPortalToken,
  setPortalOrgSlug,
  portalAPI,
  getPortalToken,
  clearPortalToken,
} from "../../utils/portalApi";

const PortalAccessConsume = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    // Si el cliente ya tenía una sesión válida guardada y hace clic en un
    // enlace de correo viejo (token ya rotado o expirado — el backend emite
    // uno nuevo en cada notificación, así que los enlaces viejos se
    // acumulan), no queremos pisar esa sesión buena antes de validar la
    // nueva. Se restaura si la validación falla.
    const previousToken = getPortalToken();
    setPortalToken(token);

    portalAPI
      .me()
      .then((data) => {
        setPortalOrgSlug(data.organization.slug);
        const redirect = searchParams.get("redirect");
        navigate(redirect || "/portal/dashboard", { replace: true });
      })
      .catch(() => {
        if (previousToken) {
          setPortalToken(previousToken);
        } else {
          clearPortalToken();
        }
        setError(
          "Este enlace ya no es válido. Pide uno nuevo desde tu correo o contacta a soporte."
        );
      });
    // Solo debe correr una vez, al montar con el token de la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#f7f5fb] p-6 text-center'>
        <p className='text-gray-700 max-w-sm'>{error}</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#f7f5fb]'>
      <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600'></div>
    </div>
  );
};

export default PortalAccessConsume;
