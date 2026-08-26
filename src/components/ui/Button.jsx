import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const Button = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  loading = false,
  loadingText,
  disabled = false,
  ...props
}) => {
  const baseStyles =
    "font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 hover:shadow-lg",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 hover:shadow-md",
    danger: "bg-red-600 text-white hover:bg-red-700 hover:shadow-lg",
    outline:
      "border-2 border-brand-600 text-brand-600 hover:bg-brand-50 hover:shadow-md",
    // Variante de marca (gradiente violeta -> fucsia) para los flujos de auth
    brand:
      "text-white bg-linear-to-r from-brand-600 to-accent-600 shadow-lg shadow-brand-600/25 hover:brightness-105 hover:shadow-xl hover:shadow-brand-600/30",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
    xl: "px-7 py-4 text-lg",
  };

  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileHover={isDisabled ? {} : { scale: 1.03 }}
      whileTap={isDisabled ? {} : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      disabled={isDisabled}
      aria-busy={loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className='w-5 h-5 animate-spin' />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </motion.button>
  );
};

export default Button;
