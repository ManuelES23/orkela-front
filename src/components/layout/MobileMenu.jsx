import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useUserContext } from "../../hooks/useOrganizationPermissions";
import UserAvatar from "../ui/UserAvatar";
import {
  X,
  Settings,
  LogOut,
  Users,
  Building2,
  FileText,
  Key,
  BarChart3,
  Shield,
  User,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import ContextSwitcher from "../ui/ContextSwitcher";

const THEME_OPTIONS = [
  { value: "light", icon: Sun, label: "Claro" },
  { value: "dark", icon: Moon, label: "Oscuro" },
  { value: "system", icon: Monitor, label: "Sistema" },
];

const MobileMenu = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const isSuperAdmin = user?.isSystemAdmin || user?.role === "superadmin";
  const { isOrganizationContext: isInOrganizationMode } = useUserContext();

  const menuItems = isSuperAdmin
    ? [
        { icon: FileText, label: "Logs", path: "/admin/logs" },
        { icon: BarChart3, label: "Estadísticas", path: "/admin/stats" },
        { icon: Settings, label: "Configuración", path: "/admin/settings" },
      ]
    : [
        ...(isInOrganizationMode
          ? [{ icon: Users, label: "Equipos", path: "/teams" }]
          : []),
        ...(isInOrganizationMode && user.is_organization_owner
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
    onClose();
  };

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='fixed inset-0 bg-black/50 backdrop-blur-sm z-100 md:hidden'
          />

          {/* Menu Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className='fixed bottom-0 left-0 right-0 bg-white dark:bg-night-900 rounded-t-3xl shadow-2xl z-101 md:hidden max-h-[80vh] overflow-y-auto'
          >
            {/* Header */}
            <div className='sticky top-0 bg-white dark:bg-night-900 border-b border-gray-100 dark:border-night-700 px-6 py-4 rounded-t-3xl'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-night-50'>Menú</h3>
                <button
                  onClick={onClose}
                  className='p-2 hover:bg-gray-100 dark:hover:bg-night-800 rounded-full transition-colors'
                >
                  <X className='w-5 h-5 text-gray-600 dark:text-night-300' />
                </button>
              </div>
            </div>

            {/* Context Switcher - arriba del todo, antes de la info de usuario */}
            {user?.available_contexts?.length > 1 && (
              <div className='px-6 pt-4'>
                <ContextSwitcher />
              </div>
            )}

            {/* User Info */}
            <div className='px-6 py-4 border-b border-gray-100 dark:border-night-700'>
              <div className='flex items-center gap-3'>
                <UserAvatar user={user} size='lg' />
                <div className='flex-1'>
                  <p className='font-semibold text-gray-900 dark:text-night-50'>{user?.name}</p>
                  <p className='text-sm text-gray-500 dark:text-night-400'>{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className='px-2 py-4'>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className='flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-night-800 active:bg-gray-100 dark:active:bg-night-700 transition-colors'
                  >
                    <div className='p-2 bg-gray-100 dark:bg-night-800 rounded-lg'>
                      <Icon className='w-5 h-5 text-gray-700 dark:text-night-300' />
                    </div>
                    <span className='font-medium text-gray-900 dark:text-night-50'>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tema */}
            <div className='px-6 py-3 border-t border-gray-100 dark:border-night-700'>
              <p className='text-xs font-medium text-gray-400 dark:text-night-400 mb-2'>
                Tema
              </p>
              <div className='flex gap-1 bg-gray-100 dark:bg-night-800 rounded-lg p-1'>
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    aria-label={opt.label}
                    aria-pressed={theme === opt.value}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors duration-150 ${
                      theme === opt.value
                        ? "bg-white dark:bg-night-700 shadow-sm text-brand-600 dark:text-brand-300"
                        : "text-gray-400 dark:text-night-400 hover:text-gray-600 dark:hover:text-night-200"
                    }`}
                  >
                    <opt.icon className='w-4 h-4' />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Logout Button */}
            <div className='px-2 pb-6 pt-2'>
              <button
                onClick={handleLogout}
                className='flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 active:bg-red-200 transition-colors'
              >
                <div className='p-2 bg-red-100 dark:bg-red-950/40 rounded-lg'>
                  <LogOut className='w-5 h-5 text-red-600 dark:text-red-400' />
                </div>
                <span className='font-medium text-red-600 dark:text-red-400'>Cerrar sesión</span>
              </button>
            </div>

            {/* Safe area spacing para iPhones */}
            <div className='h-8' />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu;
