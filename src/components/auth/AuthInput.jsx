import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { motionTokens } from "../animations/variants";

/**
 * Input reusable para los formularios de auth: icono, label visible,
 * foco animado con el token de marca, error inline animado y toggle
 * de mostrar/ocultar contraseña quand type="password".
 */
const AuthInput = ({
  icon: Icon,
  label,
  type = "text",
  error,
  className = "",
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = useId();
  const isPassword = type === "password";
  const resolvedType = isPassword && showPassword ? "text" : type;

  return (
    <div className={className}>
      <div className='flex items-center justify-between mb-2.5'>
        <label htmlFor={inputId} className='block text-base font-semibold text-gray-700 dark:text-night-200'>
          {label}
        </label>
      </div>

      <div className='relative'>
        {Icon && (
          <Icon
            aria-hidden='true'
            className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-night-500'
          />
        )}
        <input
          id={inputId}
          type={resolvedType}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full py-3.5 rounded-xl border bg-white dark:bg-night-900 text-base text-gray-900 dark:text-night-50 placeholder:text-gray-400 dark:placeholder:text-night-500 outline-none transition-all duration-150 ${
            Icon ? "pl-12" : "pl-4"
          } ${isPassword ? "pr-12" : "pr-4"} ${
            error
              ? "border-red-300 dark:border-red-800 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-950/40"
              : "border-gray-200 dark:border-night-700 hover:border-gray-300 dark:hover:border-night-600 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/30"
          }`}
          {...props}
        />
        {isPassword && (
          <button
            type='button'
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-night-500 dark:hover:text-night-300 cursor-pointer'
          >
            {showPassword ? (
              <EyeOff className='w-5 h-5' />
            ) : (
              <Eye className='w-5 h-5' />
            )}
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={`${inputId}-error`}
            role='alert'
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 6 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: motionTokens.duration.fast, ease: motionTokens.ease }}
            className='text-sm text-red-600 dark:text-red-400 overflow-hidden'
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthInput;
