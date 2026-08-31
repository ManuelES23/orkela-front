import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Send } from "lucide-react";
import { portalAPI } from "../../utils/portalApi";
import { motionTokens } from "../../components/animations/variants";
import Button from "../../components/ui/Button";

const PortalAccessRequest = () => {
  const { orgSlug } = useParams();
  const [org, setOrg] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    portalAPI
      .getOrgInfo(orgSlug)
      .then(setOrg)
      .catch(() => setNotFound(true));
  }, [orgSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await portalAPI.requestAccess(orgSlug, email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (notFound) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#f7f5fb] p-6 text-center'>
        <p className='text-gray-700'>
          No encontramos este portal de soporte. Verifica el enlace que te
          compartieron.
        </p>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#f7f5fb] p-6'>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: motionTokens.duration.slow,
          ease: motionTokens.ease,
        }}
        className='w-full max-w-md bg-white rounded-2xl shadow-lg p-8'
      >
        <div className='flex items-center gap-2.5 mb-6'>
          <img
            src='/img/isotipo_orkela.png'
            alt=''
            className='w-9 h-9 object-contain'
            aria-hidden='true'
          />
          <span className='font-extrabold text-xl text-brand-700'>
            {org?.name || "Portal de soporte"}
          </span>
        </div>

        {sent ? (
          <p className='text-gray-700'>
            Si tu correo está registrado, te llegará un enlace de acceso en
            breve. Revisa tu bandeja de entrada.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className='space-y-5' noValidate>
            <h2 className='text-2xl font-extrabold text-gray-900'>
              Accede a tus tickets
            </h2>
            <p className='text-gray-500 text-sm'>
              Escribe el correo con el que te registró{" "}
              {org?.name || "la organización"} y te enviaremos un enlace de
              acceso.
            </p>
            <div className='relative'>
              <Mail
                aria-hidden='true'
                className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400'
              />
              <input
                type='email'
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='tu@empresa.com'
                autoComplete='email'
                className='w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
              />
            </div>
            <Button
              type='submit'
              variant='brand'
              size='xl'
              loading={loading}
              loadingText='Enviando...'
              className='w-full'
            >
              <Send className='w-5 h-5' />
              Enviar enlace de acceso
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default PortalAccessRequest;
