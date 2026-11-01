import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { apiFetch } from '../services/api';

interface LowStockAlert {
  id: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
}

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isAdmin = user?.rol === 'ADMINISTRADOR';

  // F-05 & M-08: Consultar productos con bajo stock o agotados para la campana de alertas
  useEffect(() => {
    let isMounted = true;
    const fetchAlerts = async () => {
      try {
        const res = await apiFetch<any[]>('/products?lowStock=true');
        if (isMounted && res.success && res.data) {
          setLowStockAlerts(
            res.data.map((p) => ({
              id: p.id,
              nombre: p.nombre,
              stock: p.stock,
              stockMinimo: p.stockMinimo,
            }))
          );
        }
      } catch (e) {
        // Silently catch in offline mode
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // Actualizar cada minuto
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // M-03: Menú dinámico según el rol autenticado
  const navItems = isAdmin
    ? [
        { label: 'Inicio', path: '/dashboard', icon: 'grid_view' },
        { label: 'JIN Copilot', path: '/copilot', icon: 'smart_toy' },
        { label: 'Inventario', path: '/inventario', icon: 'inventory_2' },
        { label: 'Compras', path: '/compras', icon: 'local_shipping' },
        { label: 'Reportes', path: '/reportes', icon: 'bar_chart' },
        { label: 'Usuarios', path: '/usuarios', icon: 'group' },
      ]
    : [
        { label: 'Punto de Venta', path: '/pos', icon: 'point_of_sale' },
        { label: 'Mis Ventas', path: '/ventas', icon: 'receipt_long' },
      ];

  // M-08: Conectar buscador a inventario o POS
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (isAdmin) {
        navigate(`/inventario?search=${encodeURIComponent(searchQuery.trim())}`);
      } else {
        navigate(`/pos?search=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };

  return (
    <div className="bg-[#100f14] text-white min-h-screen flex flex-col font-sans">
      {/* ── TOP HEADER ───────────────────────────────────────── */}
      <header className="print:hidden px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 flex flex-col md:flex-row justify-between items-center gap-2.5 sm:gap-4 border-b border-white/5 bg-[#14131a] sticky top-0 z-40 backdrop-blur-md">
        {/* Left: Logo & User role chip */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to={isAdmin ? '/dashboard' : '/pos'} className="flex items-center gap-2 text-decoration-none">
              <img src="/logo.png" alt="JINStock" className="h-7 sm:h-8 object-contain" />
              <span className="font-extrabold text-sm sm:text-base tracking-wide text-white">JINStock</span>
            </Link>
            <span className="text-[10px] sm:text-xs bg-white/5 border border-white/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-purple-300 font-semibold ml-1 sm:ml-2">
              {user?.rol || 'CAJERO'}
            </span>
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-2">
            {/* Notification Bell Mobile */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowDropdown(false);
                }}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white relative"
                aria-label="Alertas de inventario"
              >
                <span className="material-symbols-outlined text-[18px]">notifications</span>
                {lowStockAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
                    {lowStockAlerts.length}
                  </span>
                )}
              </button>

              {/* Mobile Notifications Popover */}
              {showNotifications && (
                <div className="absolute right-0 top-10 bg-[#1c1b22] border border-[#2d2c35] rounded-xl p-3 z-50 shadow-2xl w-[290px] max-w-[calc(100vw-24px)]">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-amber-400 text-sm">warning</span>
                      Stock Crítico
                    </h4>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                      {lowStockAlerts.length}
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {lowStockAlerts.length === 0 ? (
                      <div className="py-3 text-center text-gray-400 text-[11px]">
                        ✅ Niveles de inventario óptimos.
                      </div>
                    ) : (
                      lowStockAlerts.map((prod) => (
                        <div
                          key={prod.id}
                          className="p-1.5 rounded-lg bg-[#100f14] border border-[#2d2c35] flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-1.5">
                            <p className="font-semibold text-white truncate text-[11px]" title={prod.nombre}>
                              {prod.nombre}
                            </p>
                            <span className="text-[9px] text-gray-400">
                              Mín: {prod.stockMinimo} u.
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              prod.stock === 0 ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {prod.stock === 0 ? '0 u.' : `${prod.stock} u.`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {isAdmin && lowStockAlerts.length > 0 && (
                    <div className="pt-2 border-t border-white/10 mt-2">
                      <Link
                        to="/compras"
                        onClick={() => setShowNotifications(false)}
                        className="block text-center w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold transition-colors"
                      >
                        Reabastecer
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Profile dropdown Mobile */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowDropdown(!showDropdown);
                  setShowNotifications(false);
                }}
                className="w-8 h-8 rounded-full bg-purple-900 border border-purple-500/30 flex items-center justify-center text-white font-bold text-xs"
                aria-label="Perfil de usuario"
              >
                {user?.nombre?.charAt(0) || 'U'}
              </button>
              {showDropdown && (
                <div className="absolute right-0 top-10 bg-[#1c1b22] border border-[#2d2c35] rounded-xl p-2 z-50 shadow-2xl min-w-[170px] max-w-[calc(100vw-24px)]">
                  <div className="px-3 py-1.5 border-b border-white/10 mb-1">
                    <p className="text-xs font-semibold text-white truncate">{user?.nombre}</p>
                    <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/auth');
                    }}
                    className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Search Bar (M-08) */}
        <form onSubmit={handleSearchSubmit} className="w-full md:w-auto md:flex-1 md:max-w-md mx-auto">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2 md:left-3.5 md:top-2.5 text-gray-400 text-base md:text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAdmin ? 'Buscar en inventario...' : 'Buscar producto en caja POS...'}
              className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-1.5 md:py-2 bg-[#100f14] border border-[#2d2c35] rounded-full text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors shadow-inner"
            />
          </div>
        </form>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          {/* F-05 & M-08: Notification Bell with Low Stock Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowDropdown(false);
              }}
              title="Alertas de Inventario"
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors relative"
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
              {lowStockAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
                  {lowStockAlerts.length}
                </span>
              )}
            </button>

            {/* Notifications Popover Desktop */}
            {showNotifications && (
              <div className="absolute right-0 top-12 bg-[#1c1b22] border border-[#2d2c35] rounded-2xl p-4 z-50 shadow-2xl w-80">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-amber-400 text-sm">warning</span>
                    Alertas de Stock Crítico
                  </h4>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    {lowStockAlerts.length}
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-xs">
                  {lowStockAlerts.length === 0 ? (
                    <div className="py-4 text-center text-gray-400 text-xs">
                      ✅ Todo el inventario supera los niveles mínimos de reserva.
                    </div>
                  ) : (
                    lowStockAlerts.map((prod) => (
                      <div
                        key={prod.id}
                        className="p-2 rounded-xl bg-[#100f14] border border-[#2d2c35] flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-white truncate" title={prod.nombre}>
                            {prod.nombre}
                          </p>
                          <span className="text-[10px] text-gray-400">
                            Mínimo configurado: {prod.stockMinimo} u.
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            prod.stock === 0 ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {prod.stock === 0 ? 'Agotado' : `${prod.stock} u.`}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {isAdmin && lowStockAlerts.length > 0 && (
                  <div className="pt-2 border-t border-white/10 mt-2">
                    <Link
                      to="/compras"
                      onClick={() => setShowNotifications(false)}
                      className="block text-center w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Generar Compra de Reabastecimiento
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile Desktop */}
          <div className="relative">
            <button
              onClick={() => {
                setShowDropdown(!showDropdown);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2.5 bg-white/5 border border-white/10 hover:border-purple-500/40 rounded-full py-1 px-3 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                {user?.nombre?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white leading-tight">{user?.nombre?.split(' ')[0]}</span>
                <span className="text-[10px] text-gray-400 leading-tight">{user?.rol}</span>
              </div>
              <span className="material-symbols-outlined text-gray-400 text-sm">expand_more</span>
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-12 bg-[#1c1b22] border border-[#2d2c35] rounded-xl p-2 z-50 shadow-2xl min-w-[180px]">
                <div className="px-3 py-2 border-b border-white/10 mb-1">
                  <p className="text-xs font-bold text-white truncate">{user?.nombre}</p>
                  <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate('/auth');
                  }}
                  className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <main className="flex-1 px-3 sm:px-6 md:px-8 py-4 sm:py-6 pb-24 md:pb-28 print:p-0 print:pb-0 max-w-[1920px] w-full mx-auto">{children}</main>

      {/* ── BOTTOM NAV (DOCK) ─────────────────────────────────── */}
      <nav
        className="print:hidden fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 bg-[#1c1b22]/95 backdrop-blur-xl border border-white/10 rounded-full flex items-center px-2 sm:px-3.5 py-1.5 gap-1 sm:gap-1.5 z-45 shadow-[0_15px_40px_rgba(0,0,0,0.7)] max-w-[calc(100vw-16px)] sm:max-w-max overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              className={`flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full shrink-0 transition-all ${
                isActive
                  ? 'bg-purple-500/25 text-[#A788F4] shadow-inner'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span
                className="material-symbols-outlined text-[19px] sm:text-[22px]"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="w-[1px] h-5 sm:h-6 bg-white/10 mx-0.5 sm:mx-1 shrink-0" />
            <Link
              to="/pos"
              title="Abrir Punto de Venta (POS)"
              className="flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full shrink-0 bg-gradient-to-br from-purple-600 to-indigo-900 text-white shadow-[0_4px_15px_rgba(124,58,237,0.4)] hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined text-[19px] sm:text-[22px]">
                point_of_sale
              </span>
            </Link>
          </>
        )}
      </nav>
    </div>
  );
};
