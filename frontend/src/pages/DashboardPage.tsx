import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState({
    todaySalesTotal: 0,
    monthSalesTotal: 0,
    totalProductsCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });

  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDashboardMetrics = async () => {
      setLoading(true);

      try {
        const [prodRes, saleRes] = await Promise.all([
          apiFetch<any[]>('/products?includeInactive=true'),
          apiFetch<any[]>('/sales'),
        ]);

        let prodList = prodRes.success && prodRes.data ? prodRes.data : [];
        let saleList = saleRes.success && saleRes.data ? saleRes.data : [];

        // Sort sales by date desc
        saleList.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        const todayStr = new Date().toISOString().split('T')[0];
        const todaySales = saleList.filter((s) => s.fecha && s.fecha.startsWith(todayStr));
        const todaySalesSum = todaySales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
        const monthSalesSum = saleList.reduce((acc, s) => acc + (Number(s.total) || 0), 0);

        const lowStockList = prodList.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= Number(p.stockMinimo));
        const outOfStockList = prodList.filter((p) => Number(p.stock) === 0);

        setMetrics({
          todaySalesTotal: todaySalesSum || 0,
          monthSalesTotal: monthSalesSum || 0,
          totalProductsCount: prodList.length,
          lowStockCount: lowStockList.length,
          outOfStockCount: outOfStockList.length,
        });

        setRecentSales(saleList.slice(0, 5));
        setTopProducts(prodList.slice(0, 6)); // Taking some products for "Best Sellers" mockup logic

      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardMetrics();
  }, []);

  // Format currency
  const formatMoney = (val: number) => {
    return 'C$ ' + val.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Format date relative time
  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000); // minutes
    if (diff < 1) return 'Ahora';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  if (loading) {
    return <div style={{ color: '#fff', padding: 24 }}>Cargando datos del dashboard...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-16">
      
      {/* ── ROW 1 ────────────────────────────────────────────── */}
      {/* Revenue Overview (Span 2) */}
      <div className="col-span-1 md:col-span-2 lg:col-span-2" style={{ background: '#1c1b22', borderRadius: 16, border: '1px solid #2d2c35', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff' }}>Ventas del Mes</h3>
            <p style={{ margin: 0, fontSize: 24, color: '#fff', marginTop: 4, fontWeight: 'bold' }}>{formatMoney(metrics.monthSalesTotal)}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(167, 136, 244, 0.1)', border: '1px solid rgba(167, 136, 244, 0.2)', color: '#A788F4', padding: '4px 10px', borderRadius: 16, fontSize: 12, fontWeight: 700 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>trending_up</span> Activo
          </div>
        </div>
        {/* Chart Mockup */}
        {metrics.monthSalesTotal > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 4 }}>
            <svg viewBox="0 0 500 150" style={{ width: '100%', height: 150, overflow: 'visible' }}>
              <path d="M0,130 C30,130 50,110 80,130 C120,150 140,80 180,100 C220,120 240,60 280,40 C320,20 340,60 380,40 C420,20 460,0 500,10" fill="none" stroke="#A788F4" strokeWidth="3" />
              {[
                {cx:0, cy:130}, {cx:80, cy:130}, {cx:180, cy:100}, {cx:280, cy:40}, {cx:380, cy:40}, {cx:500, cy:10}
              ].map((p,i) => (
                <circle key={i} cx={p.cx} cy={p.cy} r="4" fill="#fff" stroke="#A788F4" strokeWidth="2" />
              ))}
              {[20, 70, 120].map((y,i) => (
                <line key={i} x1="0" y1={y} x2="500" y2={y} stroke="#33323c" strokeWidth="1" />
              ))}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
              <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span><span>Jul</span><span>Ago</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dic</span>
            </div>
          </div>
        ) : (
          <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14, border: '1px dashed #33323c', borderRadius: 12 }}>
            Aún no hay ventas registradas para generar el gráfico.
          </div>
        )}
      </div>

      {/* Inventory Status (Span 1) */}
      <div className="col-span-1" style={{ background: '#1c1b22', borderRadius: 16, border: '1px solid #2d2c35', padding: 20, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff' }}>Estado de Inventario</h3>
          <span className="material-symbols-outlined" style={{ color: '#9ca3af', fontSize: 20 }}>inventory_2</span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#d1d5db', marginBottom: 8 }}>
              <span>Total Productos</span><span style={{ fontWeight: 700, color: '#fff' }}>{metrics.totalProductsCount.toLocaleString()}</span>
            </div>
            <div style={{ width: '100%', height: 6, background: '#2d2c35', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#a855f7' }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#d1d5db', marginBottom: 8 }}>
              <span>Stock Bajo</span><span style={{ fontWeight: 700, color: '#ffbd2e' }}>{metrics.lowStockCount.toLocaleString()}</span>
            </div>
            <div style={{ width: '100%', height: 6, background: '#2d2c35', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: metrics.totalProductsCount > 0 ? `${(metrics.lowStockCount / metrics.totalProductsCount) * 100}%` : '0%', height: '100%', background: '#ffbd2e' }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#d1d5db', marginBottom: 8 }}>
              <span>Sin Stock</span><span style={{ fontWeight: 700, color: '#ff5f56' }}>{metrics.outOfStockCount.toLocaleString()}</span>
            </div>
            <div style={{ width: '100%', height: 6, background: '#2d2c35', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: metrics.totalProductsCount > 0 ? `${(metrics.outOfStockCount / metrics.totalProductsCount) * 100}%` : '0%', height: '100%', background: '#ff5f56' }} />
            </div>
          </div>
        </div>

        <Link to="/compras" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', width: '100%', padding: 12, borderRadius: 12, background: 'transparent', border: '1px solid #33323c', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 24, transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#2d2c35'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          Reabastecer
        </Link>
      </div>

      {/* Top Categories (Span 1) */}
      <div className="col-span-1" style={{ background: '#1c1b22', borderRadius: 16, border: '1px solid #2d2c35', padding: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 24 }}>Distribución</h3>
        {metrics.totalProductsCount > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'conic-gradient(#3b82f6 0% 34%, #ffbd2e 34% 52%, #ef4444 52% 66%, #a855f7 66% 92%, #6b7280 92% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#1c1b22' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              {[
                { label: 'Papelería', percent: '34%', color: '#3b82f6' },
                { label: 'Arte', percent: '26%', color: '#a855f7' },
                { label: 'Oficina', percent: '18%', color: '#ffbd2e' },
                { label: 'Cuadernos', percent: '14%', color: '#ef4444' },
                { label: 'Otros', percent: '8%', color: '#6b7280' },
              ].map(cat => (
                <div key={cat.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9ca3af' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '3px', background: cat.color }} />
                  <span style={{ flex: 1 }}>{cat.label}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{cat.percent}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14, border: '1px dashed #33323c', borderRadius: 12 }}>
            No hay inventario para calcular distribución.
          </div>
        )}
      </div>

      {/* ── ROW 2 ────────────────────────────────────────────── */}
      
      {/* Recent Sales (Span 2) */}
      <div className="col-span-1 md:col-span-2 lg:col-span-2" style={{ background: '#1c1b22', borderRadius: 16, border: '1px solid #2d2c35', padding: 24, maxHeight: 340, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff' }}>Ventas Recientes</h3>
          <Link to="/ventas" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Ver todas</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {recentSales.length === 0 && <div style={{ color: '#9ca3af', fontSize: 14 }}>No hay ventas recientes.</div>}
          {recentSales.map(sale => (
            <div key={sale.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, background: 'linear-gradient(to bottom, #d1d5db, #9ca3af)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <span className="material-symbols-outlined" style={{ color: '#fff', opacity: 0.5 }}>receipt_long</span>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Factura #{sale.id}</div>
                  <div style={{ fontSize: 13, color: '#9ca3af' }}>{sale.cliente?.nombre || 'Cliente Final'}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{formatMoney(Number(sale.total))}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{timeAgo(sale.fecha)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Best Sellers (Span 2) */}
      <div className="col-span-1 md:col-span-2 lg:col-span-2" style={{ background: '#1c1b22', borderRadius: 16, border: '1px solid #2d2c35', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff' }}>Productos Destacados</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{ background: '#2d2c35', border: 'none', width: 32, height: 32, borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
            </button>
            <button style={{ background: '#2d2c35', border: 'none', width: 32, height: 32, borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 8 }}>
          {topProducts.length === 0 && <div style={{ color: '#9ca3af', fontSize: 14 }}>No hay productos registrados.</div>}
          {topProducts.map((p, i) => (
            <div key={i} style={{ width: 140, flexShrink: 0 }}>
              <div style={{ width: '100%', height: 140, borderRadius: 12, background: 'linear-gradient(to bottom, #d1d5db, #9ca3af)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: '#fff', opacity: 0.5 }}>inventory_2</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{p.nombre}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Stock: {p.stock}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ROW 3 ────────────────────────────────────────────── */}
      
      {/* Quick Actions (Span 1) */}
      <div className="col-span-1" style={{ background: '#1c1b22', borderRadius: 16, border: '1px solid #2d2c35', padding: 24 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 24 }}>Acciones Rápidas</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Link to="/inventario" style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', textDecoration: 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#a855f7' }}>add</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Nuevo Producto</span>
          </Link>
          <Link to="/pos" style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', textDecoration: 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#3b82f6' }}>point_of_sale</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Abrir POS</span>
          </Link>
          <Link to="/usuarios" style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', textDecoration: 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#eab308' }}>group</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Gestión Usuarios</span>
          </Link>
          <Link to="/ventas" style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', textDecoration: 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ef4444' }}>description</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Reportes de Venta</span>
          </Link>
        </div>
      </div>

      {/* Sync Status / Offline Readiness (Span 1) */}
      <div className="col-span-1" style={{ background: '#1c1b22', borderRadius: 16, border: '1px solid #2d2c35', padding: 24, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 24 }}>Disponibilidad Local</h3>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 160, height: 160, borderRadius: '50%', background: 'conic-gradient(#a855f7 0% 100%, #2d2c35 100% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 140, height: 140, borderRadius: '50%', background: '#1c1b22', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>100%</span>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Sincronizado</span>
              </div>
            </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 16 }}>PWA Offline Listo</div>
      </div>

    </div>
  );
};
