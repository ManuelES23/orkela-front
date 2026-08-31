import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
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
  Pin,
  PinOff,
  Contact,
  Inbox,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

const THEME_OPTIONS = [
  { value: "light", icon: Sun, label: "Claro" },
  { value: "dark", icon: Moon, label: "Oscuro" },
  { value: "system", icon: Monitor, label: "Sistema" },
];

// Rail colapsado vs. panel expandido (overlay al hacer hover/foco, no empuja el contenido)
const RAIL_WIDTH = 80;
const PANEL_WIDTH = 256;

const Sidebar = ({ isPinned = false, onTogglePin }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const sidebarRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasMultipleContexts } = useAuth();
  const { theme, setTheme } = useTheme();

  // Fijado (pin) o expandido por hover/foco - ambos abren el panel
  const isOpen = isExpanded || isPinned;

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
        // Equipos y Tickets solo disponibles en modo organización — los
        // planes personales no incluyen esta feature (ver spec
        // docs/superpowers/specs/2026-08-30-planes-personales-design.md)
        ...(isInOrganizationMode
          ? [{ icon: UsersRound, label: "Equipos", path: "/teams" }]
          : []),
        ...(isInOrganizationMode
          ? [{ icon: Ticket, label: "Tickets", path: "/tickets" }]
          : []),
        ...(isInOrganizationMode
          ? [{ icon: Contact, label: "Clientes", path: "/clients" }]
          : []),
        ...(isInOrganizationMode
          ? [{ icon: Inbox, label: "Bandeja de Clientes", path: "/client-tickets" }]
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
        className={`fixed left-0 top-0 h-full bg-white dark:bg-night-900 border-r border-gray-200 dark:border-night-700 z-40 overflow-hidden ${
          isOpen ? "shadow-xl" : "shadow-lg"
        }`}
      >
        {/* Header del Sidebar */}
        <div className='flex items-center justify-between px-4 py-5 border-b border-gray-200 dark:border-night-700'>
          {isOpen ? (
            <>
              <div className='flex items-center justify-center flex-1'>
                <img
                  src='/img/orkela_logo_h.png'
                  alt='Orkela'
                  className='h-12 w-auto max-w-150 object-contain'
                />
              </div>
              <button
                onClick={onTogglePin}
                aria-label={isPinned ? "Desanclar sidebar" : "Fijar sidebar abierto"}
                title={isPinned ? "Desanclar sidebar" : "Fijar sidebar abierto"}
                className={`shrink-0 p-1.5 rounded-lg transition-colors duration-200 ${
                  isPinned
                    ? "bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300"
                    : "text-gray-300 hover:bg-gray-50 hover:text-gray-500 dark:text-night-600 dark:hover:bg-night-800 dark:hover:text-night-400"
                }`}
              >
                {isPinned ? (
                  <PinOff className='w-4 h-4' />
                ) : (
                  <Pin className='w-4 h-4' />
                )}
              </button>
            </>
          ) : (
            <img
              src='/img/isotipo_orkela.png'
              alt='Orkela'
              className='h-12 w-12 object-contain mx-auto'
            />
          )}
        </div>

        {/* Context Switcher - arriba del todo, antes de la navegación (solo
            si el usuario tiene más de un contexto entre el que elegir) */}
        {hasMultipleContexts() && (
          <div className='px-3 pt-3'>
            <ContextSwitcher isCompact={!isOpen} />
          </div>
        )}

        {/* Buscador de secciones */}
        <div className='px-3 pt-3'>
          <div
            className={`flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-night-800 border border-gray-200 dark:border-night-700 ${
              isOpen ? "px-3 py-2" : "justify-center py-2"
            }`}
          >
            <Search className='w-4 h-4 text-gray-400 dark:text-night-400 shrink-0' />
            {isOpen && (
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Buscar...'
                aria-label='Buscar en el menú'
                className='w-full bg-transparent text-sm text-gray-700 dark:text-night-50 placeholder-gray-400 dark:placeholder-night-500 focus:outline-none'
              />
            )}
          </div>
        </div>

        {/* Navegación */}
        <nav className='p-3 space-y-1'>
          {filteredItems.length === 0 && isOpen && (
            <p className='px-3 py-2 text-sm text-gray-400 dark:text-night-400'>Sin resultados</p>
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
                } ${
                  active
                    ? "text-brand-700 dark:text-brand-300 dark:text-brand-300"
                    : "text-gray-700 hover:bg-gray-50 dark:text-night-300 dark:hover:bg-night-800"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId='sidebar-active-pill'
                    transition={motionTokens.springSnappy}
                    className='absolute inset-0 rounded-lg bg-linear-to-r from-brand-50 to-accent-50 dark:from-brand-900/40 dark:to-accent-900/30 shadow-sm'
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
        <div className='absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200 dark:border-night-700'>
          <div className='relative'>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-night-800 transition-all duration-200 ${
                !isOpen && "justify-center"
              }`}
            >
              <UserAvatar user={user} size='sm' />
              {isOpen && (
                <>
                  <div className='flex-1 text-left'>
                    <p className='text-sm font-medium text-gray-900 dark:text-night-50'>
                      {user?.name}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-night-400 truncate'>
                      {user?.email}
                    </p>
                  </div>
                  <ChevronDown className='w-4 h-4 text-gray-400 dark:text-night-400' />
                </>
              )}
            </button>

            {/* Menú desplegable del usuario */}
            {isUserMenuOpen && isOpen && (
              <div className='absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-night-800 border border-gray-200 dark:border-night-700 rounded-lg shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200'>
                {/* Tema */}
                <div className='px-3 py-2.5 border-b border-gray-100 dark:border-night-700'>
                  <p className='text-xs font-medium text-gray-400 dark:text-night-400 mb-1.5'>
                    Tema
                  </p>
                  <div className='flex gap-1 bg-gray-100 dark:bg-night-900 rounded-lg p-1'>
                    {THEME_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setTheme(opt.value)}
                        title={opt.label}
                        aria-label={opt.label}
                        aria-pressed={theme === opt.value}
                        className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-colors duration-150 ${
                          theme === opt.value
                            ? "bg-white dark:bg-night-700 shadow-sm text-brand-600 dark:text-brand-300"
                            : "text-gray-400 dark:text-night-400 hover:text-gray-600 dark:hover:text-night-200"
                        }`}
                      >
                        <opt.icon className='w-3.5 h-3.5' />
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className='flex items-center gap-3 w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all duration-200 hover:translate-x-1'
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
