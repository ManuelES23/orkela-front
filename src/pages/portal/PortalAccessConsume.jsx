import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { setPortalToken, setPortalOrgSlug, portalAPI } from "../../utils/portalApi";

const PortalAccessConsume = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    setPortalToken(token);

    portalAPI
      .me()
      .then((data) => {
        setPortalOrgSlug(data.organization.slug);
        const redirect = searchParams.get("redirect");
        navigate(redirect || "/portal/dashboard", { replace: true });
      })
      .catch(() => {
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
