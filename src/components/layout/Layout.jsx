import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BottomNav from "./BottomNav";
import MobileMenu from "./MobileMenu";

const Layout = ({ children, title, subtitle }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Sidebar - Solo visible en pantallas medianas y grandes */}
      <div className='hidden md:block'>
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      </div>

      {/* Contenido principal */}
      <div
        className={`transition-all duration-300 ${
          isSidebarOpen ? "md:ml-64" : "md:ml-20"
        } pb-20 md:pb-0`}
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
