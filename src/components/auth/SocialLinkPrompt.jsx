import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Link2, Lock, Info } from "lucide-react";
import AuthInput from "./AuthInput";
import Button from "../ui/Button";
import { AuthAlert } from "./AuthPanel";
import { PROVIDER_LABEL, providerIcon } from "./ProviderIcons";
import { socialAuthAPI } from "../../utils/api";
import { getSocialLinkErrorMessage } from "../../utils/socialLinkErrors";
import { motionTokens } from "../animations/variants";

const initials = (email = "") => email.slice(0, 2).toUpperCase();

/**
 * Propuesta B · el correo del proveedor ya tiene cuenta en Orkela: se
 * muestran las dos cuentas unidas y se confirma con la contraseña.
 */
const SocialLinkPrompt = ({ info, ticket, onLinked }) => {
  const reduce = useReducedMotion();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const headingRef = useRef(null);
  const label = PROVIDER_LABEL[info.provider] || info.provider;

  // Ícono del proveedor: se resuelve en una función auxiliar (no un
  // componente) para no crear el componente durante el render.
  const renderProviderIcon = (className) => {
    const Icon = providerIcon(info.provider);
    return <Icon className={className} />;
  };

  const enter = (x, delay) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, x },
          animate: { opacity: 1, x: 0 },
          transition: { duration: motionTokens.duration.base, ease: motionTokens.ease, delay },
        };

  // El panel reemplaza al "Confirmando tu acceso...": el foco va al título,
  // como en AuthPanelHeading (focusOnMount).
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await socialAuthAPI.linkWithPassword(ticket, password);
      onLinked(data);
    } catch (err) {
      setError(getSocialLinkErrorMessage(err, "No pudimos unir las cuentas. Vuelve a intentarlo desde el login."));
      setLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className='text-2xl font-extrabold text-gray-900 dark:text-night-50 text-balance rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:focus-visible:ring-brand-400/30'
        >
          ¿Unimos estas cuentas?
        </h2>
        <p className='mt-1 text-gray-500 dark:text-night-400'>
          Encontramos una cuenta de Orkela con el mismo correo que tu cuenta de {label}.
        </p>
      </div>

      <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-2'>
        <motion.div
          {...enter(-16, 0)}
          className='min-w-0 rounded-2xl border border-gray-200 dark:border-night-700 bg-gray-50 dark:bg-night-800 p-3 text-center'
        >
          <div className='mx-auto mb-1.5 grid h-9 w-9 place-items-center rounded-full bg-linear-to-br from-brand-600 to-accent-600 text-sm font-extrabold text-white'>
            {initials(info.email)}
          </div>
          <p className='text-sm font-bold text-gray-900 dark:text-night-50'>Orkela</p>
          <p className='text-xs text-gray-500 dark:text-night-400 break-all'>{info.email}</p>
        </motion.div>

        <motion.div
          initial={reduce ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...motionTokens.springSoft, delay: reduce ? 0 : 0.25 }}
          aria-hidden='true'
          className='grid h-9 w-9 place-items-center rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300'
        >
          <Link2 className='h-4 w-4' />
        </motion.div>

        <motion.div
          {...enter(16, 0.05)}
          className='min-w-0 rounded-2xl border border-gray-200 dark:border-night-700 bg-gray-50 dark:bg-night-800 p-3 text-center'
        >
          {renderProviderIcon('mx-auto mb-1.5 h-9 w-9')}
          <p className='text-sm font-bold text-gray-900 dark:text-night-50'>{label}</p>
          <p className='text-xs text-gray-500 dark:text-night-400 break-all'>{info.email}</p>
        </motion.div>
      </div>

      {info.has_password ? (
        <form onSubmit={handleSubmit} className='space-y-5' noValidate>
          {error && <AuthAlert tone='error'>{error}</AuthAlert>}

          <AuthInput
            label='Confirma con tu contraseña de Orkela'
            icon={Lock}
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete='current-password'
            required
          />

          <Button type='submit' variant='brand' size='xl' loading={loading} loadingText='Uniendo...' className='w-full' disabled={!password}>
            <Link2 className='w-5 h-5' aria-hidden='true' />
            Unir y entrar
          </Button>

          <div className='flex flex-wrap justify-between gap-2 text-sm'>
            <Link
              to='/forgot-password'
              state={{ email: info.email }}
              className='font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300'
            >
              Olvidé mi contraseña
            </Link>
            <Link to='/login' className='font-semibold text-gray-500 hover:text-gray-700 dark:text-night-400 dark:hover:text-night-200'>
              No son la misma persona
            </Link>
          </div>
        </form>
      ) : (
        <div className='space-y-5'>
          <div className='flex items-start gap-2 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 p-3 text-sm text-brand-700 dark:text-brand-300'>
            <Info className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
            <p>
              Esta cuenta de Orkela se creó con otra cuenta y no tiene contraseña. Entra con esa cuenta y conecta {label} desde
              Configuración.
            </p>
          </div>
          <Link to='/login' className='block text-center font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300'>
            Volver al login
          </Link>
        </div>
      )}
    </div>
  );
};

export default SocialLinkPrompt;
