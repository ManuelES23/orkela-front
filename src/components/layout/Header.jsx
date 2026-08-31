import { Search, Building2 } from "lucide-react";
import NotificationsPanel from "../ui/NotificationsPanel";
import InvitationsPanel from "../ui/InvitationsPanel";
import { useAuth } from "../../context/AuthContext";
import { useUserContext } from "../../hooks/useOrganizationPermissions";

const Header = ({ title, subtitle }) => {
  const { user } = useAuth();

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
                <span className='hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 dark:bg-brand-900/30 dark:text-brand-300 rounded-full text-xs font-medium'>
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
