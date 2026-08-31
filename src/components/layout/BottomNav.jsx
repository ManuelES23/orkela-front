import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useUserContext } from "../../hooks/useOrganizationPermissions";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Ticket,
  Building2,
  Menu,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const BottomNav = ({ onMenuClick }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(location.pathname);

  const isSuperAdmin = user?.isSystemAdmin || user?.role === "superadmin";
  const { isOrganizationContext: isInOrganizationMode } = useUserContext();

  // Menú principal para usuarios normales
  const mainMenuItems = isSuperAdmin
    ? [
        { icon: Users, label: "Usuarios", path: "/admin/users" },
        { icon: Building2, label: "Orgs", path: "/admin/organizations" },
        { icon: Menu, label: "Más", path: null, isMenu: true },
      ]
    : [
        { icon: LayoutDashboard, label: "Inicio", path: "/dashboard" },
        { icon: FolderKanban, label: "Proyectos", path: "/projects" },
        { icon: CheckSquare, label: "Tareas", path: "/tasks" },
        ...(isInOrganizationMode
          ? [
              { icon: Ticket, label: "Tickets", path: "/tickets" },
              { icon: Users, label: "Equipos", path: "/teams" },
            ]
          : []),
        { icon: Menu, label: "Más", path: null, isMenu: true },
      ];

  const isActive = (path) => {
    if (!path) return false;
    return location.pathname === path;
  };

  const handleNavClick = (item) => {
    if (item.isMenu) {
      onMenuClick?.();
    } else {
      setActiveTab(item.path);
    }
  };

  return (
    <nav className='fixed bottom-0 left-0 right-0 bg-white dark:bg-night-900 border-t border-gray-200 dark:border-night-700 shadow-2xl z-50 md:hidden'>
      <div className='flex items-center justify-around h-16 px-2'>
        {mainMenuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          if (item.isMenu) {
            return (
              <button
                key='menu'
                onClick={() => handleNavClick(item)}
                className='flex flex-col items-center justify-center flex-1 h-full relative'
              >
                <div
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    active
                      ? "bg-brand-50 dark:bg-brand-900/20 dark:bg-brand-900/30"
                      : "hover:bg-gray-50 dark:hover:bg-night-800 active:scale-95"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      active
                        ? "text-brand-600"
                        : "text-gray-600 dark:text-night-300"
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium mt-0.5 ${
                    active
                      ? "text-brand-600"
                      : "text-gray-600 dark:text-night-300"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => handleNavClick(item)}
              className='flex flex-col items-center justify-center flex-1 h-full relative'
            >
              {/* Indicador activo */}
              {active && (
                <motion.div
                  layoutId='bottomNavIndicator'
                  className='absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-brand-600 rounded-full'
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}

              <div
                className={`p-2 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-brand-50 dark:bg-brand-900/20 dark:bg-brand-900/30"
                    : "hover:bg-gray-50 dark:hover:bg-night-800 active:scale-95"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    active
                      ? "text-brand-600"
                      : "text-gray-600 dark:text-night-300"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-medium mt-0.5 ${
                  active
                    ? "text-brand-600"
                    : "text-gray-600 dark:text-night-300"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
