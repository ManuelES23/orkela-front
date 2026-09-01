import { Search, Building2, Sun, Moon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import NotificationsPanel from "../ui/NotificationsPanel";
import InvitationsPanel from "../ui/InvitationsPanel";
import { useAuth } from "../../context/AuthContext";
import { useUserContext } from "../../hooks/useOrganizationPermissions";
import { useTheme } from "../../context/ThemeContext";

const Header = ({ title, subtitle }) => {
  const { user } = useAuth();
  const { isDark, setTheme } = useTheme();

  // Solo mostrar indicador si está en modo organización activo
  const { isOrganizationContext: isInOrganizationMode } = useUserContext();

  return (
    <header className='bg-white dark:bg-night-900 border-b border-gray-200 dark:border-night-700 sticky top-0 z-30'>
      <div className='px-4 md:px-6 py-3 md:py-4'>
        <div className='flex items-center justify-between'>
          {/* Título */}
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 md:gap-3'>
              <h1 className='text-lg md:text-2xl font-bold text-gray-900 dark:text-night-50 truncate'>
                {title}
              </h1>
              {/* Indicador de organización - solo en modo organización */}
              {isInOrganizationMode && (
                <span className='hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full text-xs font-medium'>
                  <Building2 className='w-3.5 h-3.5' />
                  <span className='hidden md:inline'>
                    {user.organization.name}
                  </span>
                </span>
              )}
            </div>
            {subtitle && (
              <p className='text-xs md:text-sm text-gray-600 dark:text-night-300 mt-1 hidden sm:block'>
                {subtitle}
              </p>
            )}
          </div>

          {/* Barra de búsqueda y notificaciones */}
          <div className='flex items-center gap-2 md:gap-4'>
            {/* Búsqueda - oculta en móviles */}
            <div className='relative hidden lg:block'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-night-400' />
              <input
                type='text'
                placeholder='Buscar...'
                className='pl-10 pr-4 py-2 w-64 border border-gray-300 dark:border-night-600 dark:bg-night-800 dark:text-night-50 dark:placeholder-night-500 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none'
              />
            </div>

            {/* Interruptor de modo oscuro */}
            <button
              type='button'
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
              title={isDark ? "Modo claro" : "Modo oscuro"}
              className='relative w-10 h-10 shrink-0 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-night-400 dark:hover:bg-night-800 dark:hover:text-night-100 transition-colors cursor-pointer'
            >
              <AnimatePresence mode='wait' initial={false}>
                <motion.span
                  key={isDark ? "moon" : "sun"}
                  initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className='flex items-center justify-center'
                >
                  {isDark ? (
                    <Moon className='w-5 h-5' />
                  ) : (
                    <Sun className='w-5 h-5' />
                  )}
                </motion.span>
              </AnimatePresence>
            </button>

            {/* Invitaciones pendientes */}
            <InvitationsPanel />

            {/* Notificaciones en tiempo real */}
            <NotificationsPanel />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
