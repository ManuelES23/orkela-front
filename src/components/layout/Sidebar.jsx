import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useUserContext } from "../../hooks/useOrganizationPermissions";
import ContextSwitcher from "../ui/ContextSwitcher";
import UserAvatar from "../ui/UserAvatar";
import { motionTokens } from "../animations/variants";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  UsersRound,
  Settings,
  LogOut,
  Search,
  ChevronDown,
  Shield,
  FileText,
  Key,
  BarChart3,
  Ticket,
  Building2,
  CreditCard,
} from "lucide-react";

// Rail colapsado vs. panel expandido (overlay al hacer hover/foco, no empuja el contenido)
const RAIL_WIDTH = 80;
const PANEL_WIDTH = 256;

const Sidebar = () => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const sidebarRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isOpen = isExpanded;

  const collapse = () => {
    setIsExpanded(false);
    setSearchQuery("");
  };

  const handleBlur = (e) => {
    // Solo colapsar si el foco salió del sidebar por completo (no entre sus propios hijos)
    if (!sidebarRef.current?.contains(e.relatedTarget)) {
      collapse();
    }
  };

  // Si es superadmin, solo mostrar el menú de administración
  const isSuperAdmin = user?.isSystemAdmin || user?.role === "superadmin";

  // Determinar si está en modo organización activo (no solo si tiene
  // organización) - centralizado en useUserContext() para que el switch
  // entre varias empresas no rompa este cálculo en cada layout.
  const { isOrganizationContext: isInOrganizationMode } = useUserContext();

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
        { icon: CreditCard, label: "Planes", path: "/admin/plans" },
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

  // Lista corta (< 10 ítems): filtrar en cada render sale más barato que memoizar.
  const q = searchQuery.trim().toLowerCase();
  const filteredItems = q
    ? menuItems.filter((item) => item.label.toLowerCase().includes(q))
    : menuItems;

  return (
    <>
      {/* Sidebar - rail colapsado por defecto, expande como overlay al pasar el mouse o enfocar con teclado */}
      <motion.aside
        ref={sidebarRef}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={collapse}
        onFocus={() => setIsExpanded(true)}
        onBlur={handleBlur}
        animate={{ width: isOpen ? PANEL_WIDTH : RAIL_WIDTH }}
        transition={motionTokens.springSnappy}
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-40 overflow-hidden ${
          isOpen ? "shadow-xl" : "shadow-lg"
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
        </div>

        {/* Buscador de secciones */}
        <div className='px-3 pt-3'>
          <div
            className={`flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 ${
              isOpen ? "px-3 py-2" : "justify-center py-2"
            }`}
          >
            <Search className='w-4 h-4 text-gray-400 shrink-0' />
            {isOpen && (
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Buscar...'
                aria-label='Buscar en el menú'
                className='w-full bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none'
              />
            )}
          </div>
        </div>

        {/* Navegación */}
        <nav className='p-3 space-y-1'>
          {filteredItems.length === 0 && isOpen && (
            <p className='px-3 py-2 text-sm text-gray-400'>Sin resultados</p>
          )}
          {filteredItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-label={item.label}
                className={`relative flex items-center gap-3 px-3 py-3 rounded-lg transition-colors duration-200 ${
                  !isOpen && "justify-center"
                } ${active ? "text-brand-700" : "text-gray-700 hover:bg-gray-50"}`}
              >
                {active && (
                  <motion.span
                    layoutId='sidebar-active-pill'
                    transition={motionTokens.springSnappy}
                    className='absolute inset-0 rounded-lg bg-linear-to-r from-brand-50 to-accent-50 shadow-sm'
                  />
                )}
                <item.icon className='relative w-5 h-5 shrink-0' />
                {isOpen && (
                  <span className='relative font-medium whitespace-nowrap'>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
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
      </motion.aside>
    </>
  );
};

export default Sidebar;
