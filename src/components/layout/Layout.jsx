import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BottomNav from "./BottomNav";
import MobileMenu from "./MobileMenu";

// Clave de localStorage para recordar si el usuario fijó el sidebar abierto
// (ver Sidebar.jsx) - vive aquí porque Layout es quien decide el margen del
// contenido en función de este estado.
const SIDEBAR_PIN_KEY = "orkela_sidebar_pinned";

const Layout = ({ children, title, subtitle }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(
    () => localStorage.getItem(SIDEBAR_PIN_KEY) === "true"
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_PIN_KEY, isPinned ? "true" : "false");
  }, [isPinned]);

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-night-950'>
      {/* Sidebar - Solo visible en pantallas medianas y grandes */}
      <div className='hidden md:block'>
        <Sidebar isPinned={isPinned} onTogglePin={() => setIsPinned((p) => !p)} />
      </div>

      {/* Contenido principal - sin fijar, el sidebar expande como overlay y el
          margen queda fijo en el ancho del rail; fijado, el contenido se corre
          para no quedar debajo del panel abierto. */}
      <div
        className={`pb-20 md:pb-0 transition-[margin-left] duration-300 ease-out ${
          isPinned ? "md:ml-64" : "md:ml-20"
        }`}
      >
        <Header title={title} subtitle={subtitle} />
        <main className='p-4 md:p-6'>{children}</main>
      </div>

      {/* Bottom Navigation - Solo visible en móviles */}
      <BottomNav onMenuClick={() => setIsMobileMenuOpen(true)} />

      {/* Mobile Menu - Panel desplegable desde abajo */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </div>
  );
};

export default Layout;
