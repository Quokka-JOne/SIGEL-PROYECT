import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/* ─── Hero Dashboard Preview ─────────────────────────── */
const HeroDashboardPreview: React.FC = () => (
  <div style={{ background: '#1c1b22', borderRadius: 20, border: '1px solid #2d2c35', overflow: 'hidden', width: '100%', maxWidth: 600, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
    <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: '#24232b', borderBottom: '1px solid #33323c' }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }} />
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }} />
    </div>
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
       <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1, background: '#24232b', borderRadius: 12, padding: 16, border: '1px solid #2d2c35' }}>
             <div style={{ fontSize: 12, color: '#8a8998', marginBottom: 8 }}>Ventas Hoy</div>
             <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>C$ 38,450</div>
             <div style={{ width: '100%', height: 40, marginTop: 16, background: 'linear-gradient(90deg, #6b4cff 0%, transparent 100%)', opacity: 0.2, borderRadius: 4 }} />
          </div>
          <div style={{ flex: 1, background: '#24232b', borderRadius: 12, padding: 16, border: '1px solid #2d2c35' }}>
             <div style={{ fontSize: 12, color: '#8a8998', marginBottom: 8 }}>Productos Activos</div>
             <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>1,204</div>
             <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
                <div style={{ flex: 3, height: 6, background: '#6b4cff', borderRadius: 3 }} />
                <div style={{ flex: 1, height: 6, background: '#ff4c61', borderRadius: 3 }} />
             </div>
          </div>
       </div>
       <div style={{ background: '#24232b', borderRadius: 12, padding: 16, border: '1px solid #2d2c35' }}>
          <div style={{ fontSize: 12, color: '#8a8998', marginBottom: 12 }}>Últimas Transacciones</div>
          {[1,2,3].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? '1px solid #33323c' : 'none' }}>
               <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                 <div style={{ width: 32, height: 32, borderRadius: 8, background: '#33323c' }} />
                 <div>
                   <div style={{ fontSize: 13, color: '#fff' }}>Cuaderno Profesional</div>
                   <div style={{ fontSize: 11, color: '#8a8998' }}>Hace 2 min</div>
                 </div>
               </div>
               <div style={{ fontSize: 13, color: '#fff', fontWeight: 'bold' }}>C$ 120.00</div>
            </div>
          ))}
       </div>
    </div>
  </div>
);

/* ─── Feature Card (sin líneas de color) ─────────────── */
const FeatureCard: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div
    style={{
      background: 'rgba(22,21,28,0.8)',
      borderRadius: 16,
      padding: '32px 24px',
      border: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      transition: 'transform 0.2s, border-color 0.2s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
    }}
  >
    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(167,136,244,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="material-symbols-outlined" style={{ color: '#A788F4', fontSize: 22 }}>{icon}</span>
    </div>
    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{title}</h3>
    <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.7, margin: 0 }}>{desc}</p>
  </div>
);

/* ─── Pricing Card ───────────────────────────────────── */
interface PricingProps {
  plan: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}
const PricingCard: React.FC<PricingProps> = ({ plan, price, period, desc, features, highlighted = false, badge }) => (
  <div
    style={{
      background: highlighted ? 'linear-gradient(145deg, #1e1b30, #1a1824)' : 'rgba(22,21,28,0.8)',
      borderRadius: 20,
      padding: '36px 28px',
      border: highlighted ? '1.5px solid rgba(167,136,244,0.5)' : '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      position: 'relative',
      boxShadow: highlighted ? '0 0 40px rgba(107,76,255,0.15)' : 'none',
      flex: 1,
      minWidth: 260,
    }}
  >
    {badge && (
      <div style={{
        position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
        background: 'linear-gradient(90deg, #6b4cff, #A788F4)',
        color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px',
        borderRadius: 20, letterSpacing: '0.05em', whiteSpace: 'nowrap',
      }}>
        {badge}
      </div>
    )}
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: highlighted ? '#A788F4' : '#9ca3af', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{plan}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 40, fontWeight: 800, color: '#fff' }}>{price}</span>
        {period && <span style={{ fontSize: 14, color: '#6b7280' }}>/{period}</span>}
      </div>
      <p style={{ fontSize: 14, color: '#6b7280', marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>{desc}</p>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {features.map((f) => (
        <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: highlighted ? '#A788F4' : '#6b7280', marginTop: 1, flexShrink: 0 }}>check_circle</span>
          <span style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1.4 }}>{f}</span>
        </div>
      ))}
    </div>
    <Link
      to="/auth"
      style={{
        marginTop: 'auto',
        display: 'block',
        textAlign: 'center',
        padding: '13px 0',
        borderRadius: 12,
        background: highlighted ? 'linear-gradient(90deg, #6b4cff, #A788F4)' : 'rgba(255,255,255,0.07)',
        color: '#fff',
        fontSize: 14,
        fontWeight: 600,
        textDecoration: 'none',
        border: highlighted ? 'none' : '1px solid rgba(255,255,255,0.1)',
        transition: 'opacity 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
    >
      {highlighted ? 'Comenzar ahora' : 'Seleccionar plan'}
    </Link>
  </div>
);

/* ─── Main Landing Page ─────────────────────────────────────── */
export const LandingPage: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#100f14', color: '#fff', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background Gradients */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(74,85,221,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '20%', right: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(221,74,104,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      
      {/* ── STICKY NAVBAR ─────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: scrolled ? 'rgba(16, 15, 20, 0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none',
        transition: 'all 0.3s',
        padding: '16px 0',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/JINSTOCK.png" alt="JINStock" style={{ height: 38, width: 'auto', objectFit: 'contain' }} />
            <span style={{ fontWeight: 800, fontSize: 18, color: '#fff' }}>JINStock</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 14, color: '#d1d5db', fontWeight: 500 }}>
            <a href="#funciones" style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')} onMouseLeave={(e) => (e.currentTarget.style.color = '#d1d5db')}>Funciones</a>
            <a href="#precios" style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')} onMouseLeave={(e) => (e.currentTarget.style.color = '#d1d5db')}>Precios</a>
            <Link to="/auth" style={{ fontSize: 14, fontWeight: 600, color: '#fff', background: 'linear-gradient(90deg, #6b4cff, #A788F4)', padding: '8px 20px', borderRadius: 20, textDecoration: 'none', transition: 'opacity 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')} onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
              Ingresar
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px 60px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 800 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', color: '#d1d5db', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20, marginBottom: 32, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#A788F4' }} />
            SOFTWARE PARA LIBRERÍAS
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.02em' }}>
            Gestiona tu librería con <br/>
            <span style={{ background: 'linear-gradient(90deg, #A788F4, #5F8FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>inteligencia</span> y diseño
          </h1>
          <p style={{ fontSize: 18, color: '#9ca3af', lineHeight: 1.6, marginBottom: 40, maxWidth: 540 }}>
            JINStock centraliza inventario, ventas y proveedores en una plataforma moderna para librerías independientes y cadenas.
          </p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/auth" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: '#000',
              background: '#fff', padding: '14px 28px', borderRadius: 30, textDecoration: 'none', transition: 'transform 0.2s'
            }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              Iniciar Sesión
            </Link>
            <a href="#precios" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: '#fff',
              background: 'rgba(255,255,255,0.05)', padding: '12px 24px', borderRadius: 30, textDecoration: 'none', transition: 'background 0.2s', border: '1px solid rgba(255,255,255,0.1)'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
              Ver planes
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_downward</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section id="funciones" style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Todo lo que tu librería necesita</h2>
        <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 48 }}>Herramientas potentes envueltas en una interfaz clara y agradable de usar.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <FeatureCard icon="inventory_2" title="Inventario inteligente" desc="Control total de stock, proveedores y reposición automática basada en tendencias de venta." />
          <FeatureCard icon="point_of_sale" title="Cobro rápido" desc="Punto de venta fluido con facturación integrada y múltiples métodos de pago." />
          <FeatureCard icon="monitoring" title="Analítica visual" desc="Dashboards con métricas de ventas, productos más vendidos y comportamiento del cliente." />
          <FeatureCard icon="local_shipping" title="Gestión de compras" desc="Registra pedidos a proveedores, controla costos y mantén siempre el stock al día." />
          <FeatureCard icon="group" title="Múltiples usuarios" desc="Administradores y cajeros con permisos diferenciados para un trabajo seguro en equipo." />
          <FeatureCard icon="wifi_off" title="Modo sin conexión" desc="Sigue vendiendo aunque no tengas internet. Los datos se sincronizan al reconectarte." />
        </div>
      </section>

      {/* ── SPLIT SECTION ───────────────────────────────────── */}
      <section id="para-quien" style={{ maxWidth: 1200, margin: '40px auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 64, alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 24 }}>Hecho para librerías<br/>de cualquier tamaño</h2>
          <p style={{ fontSize: 16, color: '#9ca3af', lineHeight: 1.6, marginBottom: 40 }}>
            Desde la librería independiente de barrio hasta cadenas con varias sucursales, JINStock escala contigo sin complicarte la vida.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {['Configuración guiada en menos de 24 horas', 'Soporte disponible en horario comercial', 'Funciona en cualquier dispositivo con navegador'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(167,136,244,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                   <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#A788F4' }}>check</span>
                </div>
                <span style={{ fontSize: 15, color: '#e5e7eb' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', background: 'rgba(30,30,35,0.4)', padding: 32, borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
          <HeroDashboardPreview />
        </div>
      </section>

      {/* ── PRICING SECTION ─────────────────────────────────── */}
      <section id="precios" style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', color: '#d1d5db', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20, marginBottom: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#A788F4' }} />
            PLANES Y PRECIOS
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Elige el plan ideal para tu librería</h2>
          <p style={{ fontSize: 16, color: '#6b7280', maxWidth: 480, margin: '0 auto' }}>Sin contratos. Sin sorpresas. Cancela cuando quieras.</p>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'stretch' }}>
          <PricingCard
            plan="Básico"
            price="Gratis"
            period=""
            desc="Perfecto para comenzar y explorar la plataforma sin costo."
            features={[
              'Hasta 200 productos',
              '1 usuario (administrador)',
              'Punto de venta básico',
              'Reportes mensuales',
              'Modo sin conexión',
            ]}
          />
          <PricingCard
            plan="Profesional"
            price="C$ 499"
            period="mes"
            desc="Para librerías en crecimiento que necesitan más control."
            features={[
              'Productos ilimitados',
              'Hasta 5 usuarios',
              'Gestión de proveedores',
              'Reportes avanzados',
              'Modo sin conexión',
              'Soporte prioritario',
            ]}
            highlighted
            badge="✦ Más popular"
          />
          <PricingCard
            plan="Empresarial"
            price="C$ 999"
            period="mes"
            desc="Para cadenas de librerías con múltiples sucursales."
            features={[
              'Todo lo del plan Profesional',
              'Usuarios ilimitados',
              'Múltiples sucursales',
              'API de integración',
              'Análisis avanzado',
              'Soporte 24/7 dedicado',
            ]}
          />
        </div>
      </section>

      {/* ── CTA SECTION ─────────────────────────────────────── */}
      <section style={{ maxWidth: 1000, margin: '40px auto 120px', padding: '0 24px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 32, padding: '60px 40px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 16 }}>¿Listo para gestionar tu librería?</h2>
          <p style={{ fontSize: 16, color: '#9ca3af', marginBottom: 40, maxWidth: 500, lineHeight: 1.5 }}>
            Ingresa ahora y descubre cómo JINStock puede ayudarte a vender más y gestionar mejor.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 400 }}>
            <Link to="/auth" style={{ width: '100%', padding: '16px', borderRadius: 24, background: 'linear-gradient(90deg, #4A148C, #A788F4)', color: '#fff', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'opacity 0.2s', textAlign: 'center', textDecoration: 'none', display: 'block', boxSizing: 'border-box' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
              Comenzar Ahora — Es Gratis
            </Link>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Acceso inmediato • Sin tarjeta de crédito</div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/JINSTOCK.png" alt="JINStock" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />
            <span style={{ fontSize: 13, color: '#6b7280' }}>© 2026 JINStock. Todos los derechos reservados.</span>
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#6b7280' }}>
            <a href="#funciones" style={{ color: 'inherit', textDecoration: 'none' }}>Funciones</a>
            <a href="#precios" style={{ color: 'inherit', textDecoration: 'none' }}>Precios</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacidad</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Términos</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
