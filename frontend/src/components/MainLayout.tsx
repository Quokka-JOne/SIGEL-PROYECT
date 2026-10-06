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
      <header style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/JINSTOCK.png" alt="JINStock" style={{ height: 32 }} />
          <div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>Good evening, {user?.nombre?.split(' ')[0] || 'User'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: 16, top: 12, color: '#6b7280', fontSize: 20 }}>search</span>
            <input type="text" placeholder="Search books, ISBN, authors..." style={{ width: 320, padding: '12px 16px 12px 48px', background: '#1c1b22', border: '1px solid #2d2c35', borderRadius: 24, color: '#fff', outline: 'none', fontSize: 14 }} />
          </div>
          
          <button style={{ background: '#1c1b22', border: '1px solid #2d2c35', width: 44, height: 44, borderRadius: '50%', color: '#d1d5db', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
          </button>
          
          <div style={{ position: 'relative' }}>
            <img onClick={() => setShowDropdown(!showDropdown)} src={`https://ui-avatars.com/api/?name=${user?.nombre || 'U'}&background=6b4cff&color=fff`} style={{ width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', border: '2px solid #2d2c35' }} alt="Profile" />
            {showDropdown && (
              <div style={{ position: 'absolute', right: 0, top: 50, background: '#1c1b22', border: '1px solid #33323c', borderRadius: 12, padding: 8, zIndex: 10 }}>
                <button onClick={() => { logout(); navigate('/auth'); }} style={{ background: 'none', border: 'none', color: '#ef4444', padding: '8px 16px', cursor: 'pointer', width: '100%', textAlign: 'left', borderRadius: 8 }}>Cerrar sesión</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '0 32px 100px 32px' }}>
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
        <Link to="/pos" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #E28C3E, #9D5B25)', color: '#fff', textDecoration: 'none', boxShadow: '0 4px 12px rgba(226,140,62,0.4)' }}>
           <span className="material-symbols-outlined" style={{ fontSize: 24 }}>add</span>
        </Link>
      </nav>
    </div>
  );
};
