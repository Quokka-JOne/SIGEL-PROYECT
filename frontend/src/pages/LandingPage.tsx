import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/* ─── Hero Dashboard Preview (Dark Mode) ─────────────── */
const HeroDashboardPreview: React.FC = () => (
  <div style={{ background: '#1c1b22', borderRadius: 20, border: '1px solid #2d2c35', overflow: 'hidden', width: '100%', maxWidth: 600, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
    {/* Topbar */}
    <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: '#24232b', borderBottom: '1px solid #33323c' }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }} />
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }} />
    </div>
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
       {/* Mock content looking like the screenshot's dashboard */}
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

/* ─── Feature Card ──────────────────────────────────────────── */
const FeatureCard: React.FC<{ icon: string; title: string; desc: string; accentColor: string }> = ({ icon, title, desc, accentColor }) => (
  <div style={{ background: 'rgba(30,30,35,0.6)', borderRadius: 16, padding: '32px 24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 16, transition: 'transform 0.2s', cursor: 'pointer' }}
       onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
       onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
    <div style={{ width: 48, height: 48, borderRadius: 12, background: `${accentColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="material-symbols-outlined" style={{ color: accentColor, fontSize: 24 }}>{icon}</span>
    </div>
    <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>{title}</h3>
    <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>{desc}</p>
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
        background: scrolled ? 'rgba(16, 15, 20, 0.8)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none',
        transition: 'all 0.3s',
        padding: '16px 0',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/JINSTOCK.png" alt="JINStock" style={{ height: 32 }} />
          </div>
          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 14, color: '#d1d5db', fontWeight: 500 }} className="hidden md:flex">
            <a href="#funciones" style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')} onMouseLeave={(e) => (e.currentTarget.style.color = '#d1d5db')}>Funciones</a>
            <a href="#para-quien" style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')} onMouseLeave={(e) => (e.currentTarget.style.color = '#d1d5db')}>Para quién</a>
            <Link to="/auth" style={{ fontSize: 14, fontWeight: 500, color: '#fff', background: '#2d2c35', padding: '8px 20px', borderRadius: 20, textDecoration: 'none', transition: 'background 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#3f3d4a')} onMouseLeave={(e) => (e.currentTarget.style.background = '#2d2c35')}>
              Contactar
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 800 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', color: '#d1d5db', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20, marginBottom: 32, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6b4cff' }} />
            SOFTWARE SAAS PARA LIBRERÍAS
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.02em' }}>
            Gestiona tu librería con <br/>
            <span style={{ background: 'linear-gradient(90deg, #8b5cf6, #ec4899, #f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>inteligencia</span> y diseño
          </h1>
          <p style={{ fontSize: 18, color: '#9ca3af', lineHeight: 1.6, marginBottom: 40, maxWidth: 540 }}>
            JINStock centraliza inventario, ventas y fidelización en una plataforma moderna diseñada para librerías independientes y cadenas que quieren crecer.
          </p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/auth" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: '#000',
              background: '#fff', padding: '14px 28px', borderRadius: 30, textDecoration: 'none', transition: 'transform 0.2s'
            }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              Iniciar Sesión
            </Link>
            <Link to="/auth" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 600, color: '#fff',
              background: 'rgba(255,255,255,0.05)', padding: '12px 24px', borderRadius: 30, textDecoration: 'none', transition: 'background 0.2s', border: '1px solid rgba(255,255,255,0.1)'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
              Crear Cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section id="funciones" style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Todo lo que tu librería necesita</h2>
        <p style={{ fontSize: 16, color: '#9ca3af', marginBottom: 48 }}>Herramientas potentes envueltas en una interfaz clara y agradable de usar.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          <FeatureCard 
            icon="inventory_2" 
            title="Inventario inteligente" 
            desc="Control total de stock, ISBN, proveedores y reposición automática basada en tendencias de venta."
            accentColor="#3b82f6" 
          />
          <FeatureCard 
            icon="point_of_sale" 
            title="Cobro rápido" 
            desc="Punto de venta fluido con facturación electrónica integrada y múltiples métodos de pago."
            accentColor="#ef4444" 
          />
          <FeatureCard 
            icon="monitoring" 
            title="Analítica visual" 
            desc="Dashboards claros con métricas de ventas, títulos más vendidos y comportamiento del cliente."
            accentColor="#eab308" 
          />
        </div>
      </section>

      {/* ── SPLIT SECTION ───────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '80px auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }} className="lg:grid-cols-2 grid-cols-1">
        <div>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 24 }}>Hecho para librerías<br/>de cualquier tamaño</h2>
          <p style={{ fontSize: 16, color: '#9ca3af', lineHeight: 1.6, marginBottom: 40 }}>
            Desde la librería independiente de barrio hasta cadenas con varias sucursales, JINStock escala contigo sin complicarte la vida.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {['Onboarding guiado en menos de 24 horas', 'Soporte humano en horario comercial', 'Integración con e-commerce y redes sociales'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#d1d5db' }}>check</span>
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

      {/* ── CTA SECTION ─────────────────────────────────────── */}
      <section style={{ maxWidth: 1000, margin: '80px auto 120px', padding: '0 24px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 32, padding: '60px 40px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 16 }}>¿Listo para gestionar tu librería?</h2>
          <p style={{ fontSize: 16, color: '#9ca3af', marginBottom: 40, maxWidth: 500, lineHeight: 1.5 }}>
            Ingresa ahora y descubre cómo JINStock puede ayudarte a vender más y gestionar mejor.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 400 }}>
            <Link to="/auth" style={{ width: '100%', padding: '16px', borderRadius: 24, background: 'linear-gradient(90deg, #8b5cf6, #6366f1)', color: '#fff', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'opacity 0.2s', textAlign: 'center', textDecoration: 'none', display: 'block' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
              Comenzar Ahora
            </Link>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Acceso inmediato y seguro</div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>© 2026 JINStock. Todos los derechos reservados.</div>
          <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#6b7280' }}>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacidad</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Términos</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
