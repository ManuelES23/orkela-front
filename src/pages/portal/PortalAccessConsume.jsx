import { useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, ShieldCheck } from "lucide-react";
import Button from "../../components/ui/Button";
import { motionTokens } from "../../components/animations/variants";
import {
  setPortalToken,
  setPortalOrgSlug,
  getPortalOrgSlug,
  portalAPI,
} from "../../utils/portalApi";

// Solo se aceptan destinos dentro del portal: el parámetro viene en la URL
// del correo y no debe poder mandar al usuario a otra parte de la app.
const safePortalRedirect = (value) =>
  value && value.startsWith("/portal/") && !value.startsWith("//") ? value : "/portal/dashboard";

/**
 * El enlace del correo es de un solo uso: se canjea por una sesión al pulsar
 * "Entrar". Que haga falta un clic (y no se canjee al cargar la página) evita
 * que los antivirus de correo que abren los enlaces lo gasten antes que el
 * cliente.
 */
const PortalAccessConsume = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const orgSlug = getPortalOrgSlug();

  const handleEnter = async () => {
    setError(null);
    setLoading(true);

    try {
      const { token: sessionToken } = await portalAPI.exchangeAccess(token);
      setPortalToken(sessionToken);
      const data = await portalAPI.me();
      setPortalOrgSlug(data.organization.slug);
      navigate(safePortalRedirect(searchParams.get("redirect")), { replace: true });
    } catch (err) {
      setLoading(false);
      setError(
        err?.status === 410
          ? "Este enlace ya se usó o venció. Por seguridad, cada enlace sirve una sola vez."
          : "No pudimos verificar tu acceso. Intenta de nuevo."
      );
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#f7f5fb] dark:bg-night-950 p-6'>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionTokens.duration.slow, ease: motionTokens.ease }}
        className='w-full max-w-md bg-white dark:bg-night-900 rounded-2xl shadow-lg p-8 text-center'
      >
        <div className='mx-auto mb-5 grid place-items-center w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'>
          <ShieldCheck className='w-7 h-7' aria-hidden='true' />
        </div>
        <h1 className='text-xl font-extrabold text-gray-900 dark:text-night-50 mb-2'>Portal de soporte</h1>

        {error ? (
          <div role='alert'>
            <p className='text-gray-600 dark:text-night-400 mb-6'>{error}</p>
            {orgSlug ? (
              <Link
                to={`/portal/${orgSlug}`}
                className='font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300'
              >
                Pedir un enlace nuevo
              </Link>
            ) : (
              <p className='text-sm text-gray-500 dark:text-night-400'>
                Pide un enlace nuevo al equipo de soporte.
              </p>
            )}
          </div>
        ) : (
          <>
            <p className='text-gray-600 dark:text-night-400 mb-6'>
              Pulsa el botón para entrar. Por seguridad, este enlace solo se puede usar una vez.
            </p>
            <Button
              type='button'
              variant='brand'
              size='xl'
              loading={loading}
              loadingText='Entrando...'
              onClick={handleEnter}
              className='w-full'
            >
              <LogIn className='w-5 h-5' aria-hidden='true' />
              Entrar al portal
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PortalAccessConsume;
