import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Inicio',      path: '/dashboard',  icon: 'grid_view' },
  { label: 'JIN Copilot', path: '/copilot',    icon: 'smart_toy' },
  { label: 'Productos',   path: '/inventario', icon: 'inventory_2' },
  { label: 'Compras',     path: '/compras',    icon: 'local_shipping' },
  { label: 'Usuarios',    path: '/usuarios',   icon: 'group' },
];

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div style={{ backgroundColor: '#100f14', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── TOP HEADER ───────────────────────────────────────── */}
      <header className="px-4 py-4 md:px-8 md:py-6 flex flex-wrap justify-between items-center gap-4 border-b border-surface-container-low/50">
        {/* Logo & Welcome */}
        <div className="flex items-center gap-4 shrink-0">
          <img src="/JINSTOCK.png" alt="JINStock" className="h-7 md:h-8" />
          <div className="text-xs md:text-sm text-on-surface-variant hidden sm:block">
            Hola, {user?.nombre?.split(' ')[0] || 'Administrador'}
          </div>
        </div>

        {/* Actions (Notifications & Profile) */}
        <div className="order-2 md:order-3 flex items-center gap-3 md:gap-6 shrink-0 ml-auto md:ml-0">
          <button className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-surface-container-lowest border border-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors">
             <span className="material-symbols-outlined text-xl md:text-2xl">notifications</span>
          </button>
          
          <div className="relative">
            <img onClick={() => setShowDropdown(!showDropdown)} src={`https://ui-avatars.com/api/?name=${user?.nombre || 'U'}&background=4A148C&color=fff`} className="w-9 h-9 md:w-11 md:h-11 rounded-full cursor-pointer border-2 border-surface-container transition-transform hover:scale-105" alt="Profile" />
            {showDropdown && (
              <div className="absolute right-0 top-12 md:top-14 bg-surface-container-lowest border border-surface-container rounded-xl p-2 z-50 shadow-lg min-w-[150px]">
                <button onClick={() => { logout(); navigate('/auth'); }} className="w-full text-left px-4 py-2 text-error hover:bg-error-container rounded-lg font-label-md text-label-md transition-colors">Cerrar sesión</button>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar - Full width on mobile, auto on desktop */}
        <div className="order-3 w-full md:order-2 md:w-auto flex-1 md:flex-none">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-2.5 md:top-3 text-on-surface-variant text-lg md:text-xl pointer-events-none">search</span>
            <input type="text" placeholder="Buscar libros, ISBN..." className="w-full md:w-80 pl-11 pr-4 py-2.5 md:py-3 bg-surface-container-lowest border border-surface-container rounded-full text-on-surface focus:outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm transition-all" />
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <main className="flex-1 px-4 md:px-8 pb-[100px]">
        {children}
      </main>

      {/* ── BOTTOM NAV (DOCK) ─────────────────────────────────── */}
      <nav style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'rgba(28,27,34,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 40, display: 'flex', alignItems: 'center', padding: '6px 16px', gap: 8, zIndex: 100, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', color: isActive ? '#fff' : '#9ca3af', textDecoration: 'none', transition: 'all 0.2s' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
            </Link>
          );
        })}
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
        <Link to="/pos" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #4A148C, #A788F4)', color: '#fff', textDecoration: 'none', boxShadow: '0 4px 12px rgba(74, 20, 140, 0.4)' }}>
           <span className="material-symbols-outlined" style={{ fontSize: 24 }}>add</span>
        </Link>
      </nav>
    </div>
  );
};
