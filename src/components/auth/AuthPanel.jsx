import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, RotateCw } from "lucide-react";

/**
 * Piezas compartidas del panel de los flujos por pasos (AuthStepperShell):
 * heading, tile de estado, alertas, botón de reenvío con cuenta atrás y
 * enlace con estilo de botón de marca.
 */

export const AuthPanelHeading = ({ children, focusOnMount = false, className = "" }) => {
  const ref = useRef(null);

  // Al cambiar de panel dentro de la página, el foco va al nuevo heading.
  useEffect(() => {
    if (focusOnMount) ref.current?.focus();
  }, [focusOnMount]);

  return (
    <h1
      ref={ref}
      tabIndex={-1}
      className={`text-[22px] sm:text-[26px] leading-tight font-extrabold tracking-tight text-gray-900 dark:text-night-50 mb-2 outline-none ${className}`}
    >
      {children}
    </h1>
  );
};

const TILE_TONES = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300",
  success: "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  error: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
};

export const AuthPanelTile = ({ icon, tone = "brand", spin = false }) => {
  const Icon = icon;

  return (
    <div className={`grid place-items-center shrink-0 w-[52px] h-[52px] rounded-2xl ${TILE_TONES[tone]}`}>
      <Icon className={`w-[26px] h-[26px] ${spin ? "animate-spin" : ""}`} aria-hidden='true' />
    </div>
  );
};

const ALERT_TONES = {
  error: {
    role: "alert",
    icon: AlertCircle,
    className: "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300",
  },
  warning: {
    role: "alert",
    icon: AlertTriangle,
    className:
      "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300",
  },
  success: {
    role: "status",
    icon: CheckCircle2,
    className:
      "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-900 dark:text-green-300",
  },
};

export const AuthAlert = ({ tone = "error", children, className = "" }) => {
  const { role, icon: Icon, className: toneClass } = ALERT_TONES[tone];

  return (
    <div role={role} className={`p-3 border rounded-lg text-sm flex items-start gap-2 ${toneClass} ${className}`}>
      <Icon className='w-4 h-4 shrink-0 mt-0.5' aria-hidden='true' />
      <span>{children}</span>
    </div>
  );
};

export const AuthResendButton = ({ cooldown, sending, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    disabled={cooldown > 0 || sending}
    aria-busy={sending}
    className='w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-night-700 bg-white dark:bg-night-900 px-6 py-3.5 text-base font-semibold text-gray-700 dark:text-night-200 transition-colors enabled:hover:border-brand-300 enabled:hover:text-brand-700 dark:enabled:hover:border-brand-700 dark:enabled:hover:text-brand-300 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer'
  >
    <RotateCw className={`w-[18px] h-[18px] ${sending ? "animate-spin" : ""}`} aria-hidden='true' />
    {cooldown > 0 ? (
      <span>
        Reenviar correo en <span className='tabular-nums font-bold'>{cooldown}</span>s
      </span>
    ) : (
      <span>Reenviar correo</span>
    )}
  </button>
);

export const AuthButtonLink = ({ icon: Icon, children, className = "", ...props }) => (
  <Link
    className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-7 py-4 text-lg font-semibold text-white bg-linear-to-r from-brand-600 to-accent-600 shadow-lg shadow-brand-600/25 hover:brightness-105 hover:shadow-xl hover:shadow-brand-600/30 transition-all duration-200 ${className}`}
    {...props}
  >
    {Icon && <Icon className='w-5 h-5' aria-hidden='true' />}
    {children}
  </Link>
);
