import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ContextSwitcher from "../ui/ContextSwitcher";
import UserAvatar from "../ui/UserAvatar";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  UsersRound,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
  FileText,
  Key,
  BarChart3,
  Ticket,
  Building2,
} from "lucide-react";

const Sidebar = ({ isOpen, setIsOpen }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Si es superadmin, solo mostrar el menú de administración
  const isSuperAdmin = user?.isSystemAdmin || user?.role === "superadmin";

  // Determinar si está en modo organización activo (no solo si tiene organización)
  // El usuario debe tener organización Y estar en contexto de organización
  const isInOrganizationMode =
    user?.organization_id &&
    user?.organization &&
    user?.active_context === "organization";

  const menuItems = isSuperAdmin
    ? [
        // Menú para administradores del sistema
        { icon: Users, label: "Usuarios", path: "/admin/users" },
        {
          icon: Building2,
          label: "Organizaciones",
          path: "/admin/organizations",
        },
        { icon: Key, label: "Licencias", path: "/admin/licenses" },
        { icon: FileText, label: "Logs", path: "/admin/logs" },
        { icon: BarChart3, label: "Estadísticas", path: "/admin/stats" },
        { icon: Settings, label: "Configuración", path: "/admin/settings" },
      ]
    : [
        // Menú para usuarios normales de la aplicación
        { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
        { icon: FolderKanban, label: "Proyectos", path: "/projects" },
        { icon: CheckSquare, label: "Tareas", path: "/tasks" },
        { icon: UsersRound, label: "Equipos", path: "/teams" },
        // Tickets solo disponible en modo organización
        ...(isInOrganizationMode
          ? [{ icon: Ticket, label: "Tickets", path: "/tickets" }]
          : []),
        // Mostrar "Mi Organización" si es owner o admin de la organización
        ...(isInOrganizationMode &&
        (user.is_organization_owner || user.organization_role === "admin")
          ? [
              {
                icon: Building2,
                label: user.organization.name || "Mi Organización",
                path: `/organizations/${user.organization_id}`,
              },
            ]
          : []),
        { icon: Settings, label: "Configuración", path: "/settings" },
      ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-40 shadow-lg ${
          isOpen ? "w-64" : "w-20"
        }`}
      >
        {/* Header del Sidebar */}
        <div className='flex items-center justify-between px-4 py-5 border-b border-gray-200'>
          {isOpen ? (
            <div className='flex items-center justify-center w-full'>
              <img
                src='/img/orkela_logo_h.png'
                alt='Orkela'
                className='h-12 w-auto max-w-150 object-contain'
              />
            </div>
          ) : (
            <img
              src='/img/isotipo_orkela.png'
              alt='Orkela'
              className='h-12 w-12 object-contain mx-auto'
            />
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className='p-2 hover:bg-indigo-50 rounded-lg transition-all duration-200 hover:scale-110'
          >
            {isOpen ? (
              <X className='w-5 h-5 transition-transform' />
            ) : (
              <Menu className='w-5 h-5 transition-transform' />
            )}
          </button>
        </div>

        {/* Navegación */}
        <nav className='p-3 space-y-1'>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                isActive(item.path)
                  ? "bg-indigo-50 text-indigo-600 shadow-sm"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <item.icon className='w-5 h-5 shrink-0' />
              {isOpen && <span className='font-medium'>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Usuario */}
        <div className='absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200'>
          {/* Context Switcher - solo si tiene múltiples contextos */}
          <div className='mb-3'>
            <ContextSwitcher isCompact={!isOpen} />
          </div>

          <div className='relative'>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 ${
                !isOpen && "justify-center"
              }`}
            >
              <UserAvatar user={user} size='sm' />
              {isOpen && (
                <>
                  <div className='flex-1 text-left'>
                    <p className='text-sm font-medium text-gray-900'>
                      {user?.name}
                    </p>
                    <p className='text-xs text-gray-500 truncate'>
                      {user?.email}
                    </p>
                  </div>
                  <ChevronDown className='w-4 h-4 text-gray-400' />
                </>
              )}
            </button>

            {/* Menú desplegable del usuario */}
            {isUserMenuOpen && isOpen && (
              <div className='absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200'>
                <button
                  onClick={handleLogout}
                  className='flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 transition-all duration-200 hover:translate-x-1'
                >
                  <LogOut className='w-4 h-4' />
                  <span className='text-sm font-medium'>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
