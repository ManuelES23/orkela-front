import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
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
} from "lucide-react";
import ContextSwitcher from "../ui/ContextSwitcher";

const MobileMenu = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
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
            className='fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-101 md:hidden max-h-[80vh] overflow-y-auto'
          >
            {/* Header */}
            <div className='sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-3xl'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-gray-900'>Menú</h3>
                <button
                  onClick={onClose}
                  className='p-2 hover:bg-gray-100 rounded-full transition-colors'
                >
                  <X className='w-5 h-5 text-gray-600' />
                </button>
              </div>
            </div>

            {/* User Info */}
            <div className='px-6 py-4 border-b border-gray-100'>
              <div className='flex items-center gap-3'>
                <UserAvatar user={user} size='lg' />
                <div className='flex-1'>
                  <p className='font-semibold text-gray-900'>{user?.name}</p>
                  <p className='text-sm text-gray-500'>{user?.email}</p>
                </div>
              </div>

              {/* Context Switcher */}
              {user?.available_contexts?.length > 1 && (
                <div className='mt-4'>
                  <ContextSwitcher />
                </div>
              )}
            </div>

            {/* Menu Items */}
            <div className='px-2 py-4'>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className='flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors'
                  >
                    <div className='p-2 bg-gray-100 rounded-lg'>
                      <Icon className='w-5 h-5 text-gray-700' />
                    </div>
                    <span className='font-medium text-gray-900'>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Logout Button */}
            <div className='px-2 pb-6 pt-2'>
              <button
                onClick={handleLogout}
                className='flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 active:bg-red-200 transition-colors'
              >
                <div className='p-2 bg-red-100 rounded-lg'>
                  <LogOut className='w-5 h-5 text-red-600' />
                </div>
                <span className='font-medium text-red-600'>Cerrar sesión</span>
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
