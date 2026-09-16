import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, AlertTriangle } from "lucide-react";
import { socialAuthAPI } from "../../utils/api";
import { useNotification } from "../../context/NotificationContext";
import { getSocialLinkErrorMessage } from "../../utils/socialLinkErrors";
import { PROVIDER_LABEL, providerIcon } from "../auth/ProviderIcons";
import LoadingSwap from "../ui/LoadingSwap";
import { Skeleton } from "../ui/Skeleton";
import ConfirmModal from "../ui/ConfirmModal";
import Button from "../ui/Button";
import { containerVariants } from "../animations/variants";
import AccessMeter from "./access/AccessMeter";
import AccessTile from "./access/AccessTile";
import PasswordForm from "./access/PasswordForm";

const PROVIDERS = ["google", "microsoft"];
const TOTAL_METHODS = 1 + PROVIDERS.length;

const TilesSkeleton = () => (
  <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
    {Array.from({ length: TOTAL_METHODS }, (_, i) => (
      <div key={i} className='space-y-3 rounded-xl border border-gray-100 p-4 dark:border-night-700'>
        <Skeleton className='h-10 w-10 rounded-xl' />
        <Skeleton className='h-4 w-24' />
        <Skeleton className='h-3 w-32' />
        <Skeleton className='h-9 w-full rounded-lg' />
      </div>
    ))}
  </div>
);

const AccessSecuritySection = () => {
  const { success, error: showError } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [access, setAccess] = useState(null); // { has_password, identities }
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState(null);
  const [confirmProvider, setConfirmProvider] = useState(null);
  const [passwordMode, setPasswordMode] = useState(null); // "create" | "change" | null

  const load = useCallback(async () => {
    try {
      setAccess(await socialAuthAPI.identities());
    } catch {
      showError("No se pudieron cargar tus formas de acceso");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  // Resultado al volver de conectar (SocialAuthCallback) y cancelaciones
  // del proveedor (?social_link_error=google). Se muestra una sola vez.
  useEffect(() => {
    const { socialLinked, socialLinkError } = location.state || {};
    if (socialLinked) success(`${PROVIDER_LABEL[socialLinked] || socialLinked} conectada`);
    if (socialLinkError) showError(socialLinkError);
    if (socialLinked || socialLinkError) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }

    const cancelled = searchParams.get("social_link_error");
    if (cancelled) {
      showError(`No se completó la conexión con ${PROVIDER_LABEL[cancelled] || cancelled}.`);
      const next = new URLSearchParams(searchParams);
      next.delete("social_link_error");
      setSearchParams(next, { replace: true });
    }
    // Solo reacciona a la llegada de esos datos de navegación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, searchParams]);

  const identities = access?.identities ?? [];
  const identityFor = (provider) => identities.find((i) => i.provider === provider);
  const activeCount = (access?.has_password ? 1 : 0) + identities.length;
  const isLastMethod = activeCount <= 1;

  const handleConnect = async (provider) => {
    setBusyProvider(provider);
    try {
      window.location.href = await socialAuthAPI.linkIntent(provider);
    } catch (err) {
      showError(getSocialLinkErrorMessage(err, "No se pudo iniciar la conexión."));
      setBusyProvider(null);
    }
  };

  const handleUnlink = async () => {
    const provider = confirmProvider;
    setBusyProvider(provider);
    try {
      await socialAuthAPI.unlink(provider);
      setAccess((prev) => ({ ...prev, identities: prev.identities.filter((i) => i.provider !== provider) }));
      success(`${PROVIDER_LABEL[provider]} desconectada`);
    } catch (err) {
      showError(getSocialLinkErrorMessage(err, "No se pudo desconectar la cuenta."));
    } finally {
      setBusyProvider(null);
      setConfirmProvider(null);
    }
  };

  const handlePasswordSaved = () => {
    const created = passwordMode === "create";
    setPasswordMode(null);
    setAccess((prev) => ({ ...prev, has_password: true }));
    success(created ? "Contraseña creada" : "Contraseña actualizada");
  };

  return (
    <div className='bg-white dark:bg-night-900 rounded-2xl border border-gray-100 dark:border-night-700 shadow-sm p-6'>
      <AccessMeter active={activeCount} total={TOTAL_METHODS} />

      <LoadingSwap loading={loading} skeleton={<TilesSkeleton />}>
        {access && (
          <motion.div
            variants={containerVariants}
            initial='hidden'
            animate='visible'
            className='grid grid-cols-1 gap-3 sm:grid-cols-3'
          >
            <AccessTile
              icon={Lock}
              title='Contraseña'
              subtitle={access.has_password ? "Entra con tu correo y contraseña" : "Entra también con tu correo"}
              active={access.has_password}
              statusLabel={access.has_password ? "Activa" : "Sin crear"}
            >
              <Button
                type='button'
                variant={access.has_password ? "secondary" : "brand"}
                onClick={() => setPasswordMode(access.has_password ? "change" : "create")}
              >
                {access.has_password ? "Cambiar contraseña" : "Crear contraseña"}
              </Button>
            </AccessTile>

            {PROVIDERS.map((provider) => {
              const identity = identityFor(provider);
              const label = PROVIDER_LABEL[provider];
              return (
                <AccessTile
                  key={provider}
                  icon={providerIcon(provider)}
                  title={label}
                  subtitle={identity ? identity.email || `Cuenta de ${label}` : provider === "microsoft" ? "Outlook o cuenta de empresa" : "Cuenta de Google"}
                  active={Boolean(identity)}
                  statusLabel={identity ? "Activa" : "Disponible"}
                >
                  {identity ? (
                    <Button
                      type='button'
                      variant='dangerGhost'
                      aria-label={`Desconectar ${label}`}
                      disabled={isLastMethod || busyProvider === provider}
                      onClick={() => setConfirmProvider(provider)}
                    >
                      Desconectar
                    </Button>
                  ) : (
                    <Button
                      type='button'
                      variant='secondary'
                      aria-label={`Conectar ${label}`}
                      loading={busyProvider === provider}
                      loadingText='Abriendo...'
                      onClick={() => handleConnect(provider)}
                    >
                      Conectar
                    </Button>
                  )}
                </AccessTile>
              );
            })}
          </motion.div>
        )}
      </LoadingSwap>

      {access && isLastMethod && identities.length > 0 && (
        <p
          role='note'
          className='mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
        >
          <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
          Es tu única forma de entrar. Crea una contraseña o conecta otra cuenta antes de desconectarla.
        </p>
      )}

      <AnimatePresence initial={false}>
        {passwordMode && (
          <PasswordForm
            key={passwordMode}
            mode={passwordMode}
            onDone={handlePasswordSaved}
            onCancel={() => setPasswordMode(null)}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={Boolean(confirmProvider)}
        onClose={() => setConfirmProvider(null)}
        onConfirm={handleUnlink}
        title={`Desconectar ${PROVIDER_LABEL[confirmProvider] || ""}`}
        message='Ya no podrás iniciar sesión con esa cuenta. Puedes volver a conectarla cuando quieras.'
        confirmText='Desconectar'
        loading={Boolean(busyProvider)}
      />
    </div>
  );
};

export default AccessSecuritySection;
