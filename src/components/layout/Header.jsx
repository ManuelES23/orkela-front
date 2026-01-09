import { Search, Building2 } from "lucide-react";
import NotificationsPanel from "../ui/NotificationsPanel";
import InvitationsPanel from "../ui/InvitationsPanel";
import { useAuth } from "../../context/AuthContext";

const Header = ({ title, subtitle }) => {
  const { user } = useAuth();

  // Solo mostrar indicador si está en modo organización activo
  const isInOrganizationMode =
    user?.organization_id &&
    user?.organization &&
    user?.active_context === "organization";

  return (
    <header className='bg-white border-b border-gray-200 sticky top-0 z-30'>
      <div className='px-6 py-4'>
        <div className='flex items-center justify-between'>
          {/* Título */}
          <div>
            <div className='flex items-center gap-3'>
              <h1 className='text-2xl font-bold text-gray-900'>{title}</h1>
              {/* Indicador de organización - solo en modo organización */}
              {isInOrganizationMode && (
                <span className='flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium'>
                  <Building2 className='w-3.5 h-3.5' />
                  {user.organization.name}
                </span>
              )}
            </div>
            {subtitle && (
              <p className='text-sm text-gray-600 mt-1'>{subtitle}</p>
            )}
          </div>

          {/* Barra de búsqueda y notificaciones */}
          <div className='flex items-center gap-4'>
            {/* Búsqueda */}
            <div className='relative hidden md:block'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar...'
                className='pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
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
