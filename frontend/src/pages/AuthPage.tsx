import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const AuthPage: React.FC = () => {
  const { login, register, seedUsers } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('admin@jinstock.ni');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [rememberDevice, setRememberDevice] = useState(true);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regStore, setRegStore] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'ADMINISTRADOR' | 'CAJERO'>('ADMINISTRADOR');
  const [adminCode, setAdminCode] = useState('');

  // Verificación de correo
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await login(loginEmail, loginPassword);
      if (res.success) {
        setSuccessMessage('¡Acceso exitoso! Redirigiendo...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      } else {
        setErrorMessage(res.message || 'Error al iniciar sesión. Intente de nuevo.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de red. Verifique su servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (regPassword.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const res = await register({
        nombre: regName + ' ' + regLastName || regStore || 'Usuario Librería',
        email: regEmail,
        password: regPassword,
        rol: regRole,
        adminCode: regRole === 'ADMINISTRADOR' ? adminCode : undefined,
      });

      if (res.success) {
        if (res.requireVerification) {
          setSuccessMessage(res.message);
          setVerificationEmail(res.email || regEmail);
          setIsVerifying(true);
        } else {
          setSuccessMessage('¡Cuenta creada exitosamente!');
          setTimeout(() => {
            navigate('/dashboard');
          }, 600);
        }
      } else {
        setErrorMessage(res.message || 'Error al crear la cuenta.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de comunicación con el backend.');
    } finally {
      setLoading(false);
    }
  };

  const Logo = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: activeTab === 'login' ? 12 : 32, justifyContent: activeTab === 'login' ? 'center' : 'flex-start' }}>
      <img src="/JINSTOCK.png" alt="JINSTOCK" style={{ height: 32, objectFit: 'contain' }} />
    </div>
  );

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail, code: verificationCode })
      });
      const res = await response.json();
      
      if (res.success) {
        setSuccessMessage('Verificación exitosa. Iniciando sesión...');
        loginContext(res.data.usuario, res.data.token);
        setTimeout(() => {
          navigate('/dashboard');
        }, 600);
      } else {
        setError(res.message || 'Error al verificar el código.');
      }
    } catch (err) {
      setError('Error de conexión al verificar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#100f14', minHeight: '100vh', display: 'flex', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background Gradients */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(74,85,221,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '20%', right: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(221,74,104,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      
      {activeTab === 'login' && !isVerifying ? (
        // --- LOGIN VIEW ---
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1 }}>
          <Logo />
          <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 32 }}>Gestiona tu pasión, escala tu negocio.</p>
          
          <div style={{ background: '#24232b', border: '1px solid #33323c', borderRadius: 24, padding: '40px 32px', width: '100%', maxWidth: 420, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Bienvenido</h2>
            <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 24 }}>Ingresa tus credenciales para acceder</p>
            
            {errorMessage && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: 12, borderRadius: 8, fontSize: 14, marginBottom: 16 }}>{errorMessage}</div>}
            {successMessage && <div style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: 12, borderRadius: 8, fontSize: 14, marginBottom: 16 }}>{successMessage}</div>}

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Email</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: 16, top: 14, color: '#6b7280', fontSize: 20 }}>mail</span>
                  <input type="text" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="nombre@libreria.com" style={{ width: '100%', padding: '14px 16px 14px 48px', background: '#1c1b22', border: '1px solid #33323c', borderRadius: 12, color: '#fff', outline: 'none', fontSize: 15 }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>Contraseña</label>
                  <a href="#" onClick={(e) => { e.preventDefault(); alert("Se ha enviado un correo con las instrucciones para recuperar su contraseña."); }} style={{ fontSize: 12, color: '#8b5cf6', textDecoration: 'none' }}>¿Olvidaste la clave?</a>
                </div>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: 16, top: 14, color: '#6b7280', fontSize: 20 }}>lock</span>
                  <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '14px 16px 14px 48px', background: '#1c1b22', border: '1px solid #33323c', borderRadius: 12, color: '#fff', outline: 'none', fontSize: 15, letterSpacing: 2 }} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={rememberDevice} onChange={e => setRememberDevice(e.target.checked)} style={{ accentColor: '#8b5cf6', width: 16, height: 16 }} />
                <span style={{ fontSize: 13, color: '#9ca3af' }}>Recordarme por 30 días</span>
              </label>

              <button disabled={loading} style={{ width: '100%', padding: 16, borderRadius: 12, background: 'linear-gradient(90deg, #4A148C, #A788F4)', color: '#fff', fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer', marginTop: 8 }}>
                {loading ? 'Cargando...' : 'Entrar al Sistema'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#9ca3af' }}>
              ¿No tienes una cuenta? <button onClick={() => { setActiveTab('register'); setErrorMessage(null); }} style={{ background: 'none', border: 'none', color: '#FDDB35', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Regístrate gratis</button>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 24, marginTop: 32, fontSize: 10, color: '#4b5563', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
            <span style={{ cursor: 'pointer' }}>Soporte</span>
            <span style={{ cursor: 'pointer' }}>Privacidad</span>
            <span style={{ cursor: 'pointer' }}>Estado</span>
          </div>

        </div>
      ) : isVerifying ? (
        // --- VERIFY VIEW ---
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1 }}>
          <Logo />
          <div style={{ background: '#24232b', border: '1px solid #33323c', borderRadius: 24, padding: '40px 32px', width: '100%', maxWidth: 420, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Verifica tu correo</h2>
            <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 24 }}>Hemos enviado un código de 6 dígitos a <strong>{verificationEmail}</strong>.</p>
            
            {errorMessage && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: 12, borderRadius: 8, fontSize: 14, marginBottom: 16 }}>{errorMessage}</div>}
            {successMessage && <div style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: 12, borderRadius: 8, fontSize: 14, marginBottom: 16 }}>{successMessage}</div>}

            <form onSubmit={handleVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Código de Verificación</label>
                <input type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} placeholder="123456" maxLength={6} style={{ width: '100%', padding: '14px 16px', background: '#1c1b22', border: '1px solid #33323c', borderRadius: 12, color: '#fff', outline: 'none', fontSize: 24, letterSpacing: 8, textAlign: 'center' }} required />
              </div>
              <button disabled={loading} style={{ width: '100%', padding: 16, borderRadius: 12, background: 'linear-gradient(90deg, #4A148C, #A788F4)', color: '#fff', fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer', marginTop: 8 }}>
                {loading ? 'Verificando...' : 'Verificar y Entrar'}
              </button>
              <button type="button" onClick={() => setIsVerifying(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 14, cursor: 'pointer', marginTop: 8, textDecoration: 'underline' }}>Volver</button>
            </form>
          </div>
        </div>
      ) : (
        // --- REGISTER VIEW ---
        <div style={{ flex: 1, display: 'flex', zIndex: 1 }} className="flex-col lg:flex-row">
          
          {/* Left Column */}
          <div style={{ flex: 1, padding: '60px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ maxWidth: 480, margin: '0 auto' }}>
              <Logo />
              <h1 style={{ fontSize: 'clamp(36px, 4vw, 48px)', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 48, letterSpacing: '-0.02em' }}>
                Únete a la nueva<br/>era de la <span style={{ color: '#ef4444' }}>gestión<br/>literaria.</span>
              </h1>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: '#3b82f6', fontSize: 20 }}>rocket_launch</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 4px 0' }}>Escala sin límites</h3>
                    <p style={{ fontSize: 14, color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>Nuestra plataforma crece con tu librería, desde un solo local hasta cadenas nacionales.</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: '#eab308', fontSize: 20 }}>shield</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 4px 0' }}>Seguridad Total</h3>
                    <p style={{ fontSize: 14, color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>Tus datos de inventario y ventas protegidos con encriptación de nivel bancario.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: 20 }}>sentiment_satisfied</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 4px 0' }}>Soporte 24/7</h3>
                    <p style={{ fontSize: 14, color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>Equipo humano dedicado a resolver cualquier duda en minutos, no días.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Form) */}
          <div style={{ flex: 1, padding: '40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#24232b', border: '1px solid #33323c', borderRadius: 32, padding: '48px 40px', width: '100%', maxWidth: 500, boxShadow: '0 20px 40px rgba(0,0,0,0.5)', position: 'relative' }}>
              
              <div style={{ position: 'absolute', top: 32, right: 32, display: 'flex', gap: 6 }}>
                 <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffbd2e' }} />
                 <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4b5563' }} />
                 <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4b5563' }} />
              </div>

              <h2 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Crear Cuenta</h2>
              <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 32 }}>Comienza tu prueba de 14 días gratis</p>
              
              {errorMessage && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: 12, borderRadius: 8, fontSize: 14, marginBottom: 16 }}>{errorMessage}</div>}
              {successMessage && <div style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: 12, borderRadius: 8, fontSize: 14, marginBottom: 16 }}>{successMessage}</div>}

              <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nombre</label>
                    <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Ej. Juan" style={{ width: '100%', padding: '14px 16px', background: '#1c1b22', border: '1px solid #33323c', borderRadius: 12, color: '#fff', outline: 'none', fontSize: 15 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Apellido</label>
                    <input type="text" value={regLastName} onChange={e => setRegLastName(e.target.value)} placeholder="Ej. Pérez" style={{ width: '100%', padding: '14px 16px', background: '#1c1b22', border: '1px solid #33323c', borderRadius: 12, color: '#fff', outline: 'none', fontSize: 15 }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nombre de la librería</label>
                  <input type="text" value={regStore} onChange={e => setRegStore(e.target.value)} placeholder="Mi Librería Ideal" style={{ width: '100%', padding: '14px 16px', background: '#1c1b22', border: '1px solid #33323c', borderRadius: 12, color: '#fff', outline: 'none', fontSize: 15 }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Email profesional</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="hola@tuempresa.com" style={{ width: '100%', padding: '14px 16px', background: '#1c1b22', border: '1px solid #33323c', borderRadius: 12, color: '#fff', outline: 'none', fontSize: 15 }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Contraseña</label>
                  <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Mínimo 8 caracteres" style={{ width: '100%', padding: '14px 16px', background: '#1c1b22', border: '1px solid #33323c', borderRadius: 12, color: '#fff', outline: 'none', fontSize: 15 }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Rol</label>
                  <select value={regRole} onChange={e => setRegRole(e.target.value as any)} style={{ width: '100%', padding: '14px 16px', background: '#1c1b22', border: '1px solid #33323c', borderRadius: 12, color: '#fff', outline: 'none', fontSize: 15 }}>
                    <option value="CAJERO">Cajero (Personal de Venta)</option>
                    <option value="ADMINISTRADOR">Administrador (Control Total)</option>
                  </select>
                </div>

                {regRole === 'ADMINISTRADOR' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#ffbd2e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Código Secreto del Sistema</label>
                    <input type="password" value={adminCode} onChange={e => setAdminCode(e.target.value)} placeholder="Autorización requerida" style={{ width: '100%', padding: '14px 16px', background: '#1c1b22', border: '1px solid #ffbd2e', borderRadius: 12, color: '#fff', outline: 'none', fontSize: 15 }} required />
                  </div>
                )}

                <button disabled={loading} style={{ width: '100%', padding: '16px', borderRadius: 12, background: 'linear-gradient(90deg, #4A148C, #A788F4, #5F8FFF)', color: '#fff', fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading ? 'Procesando...' : 'Siguiente Paso'} 
                  {!loading && <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#9ca3af' }}>
                ¿Ya tienes cuenta? <br/>
                <button onClick={() => { setActiveTab('login'); setErrorMessage(null); }} style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: 600, cursor: 'pointer', padding: 4, marginTop: 4 }}>Inicia sesión</button>
              </div>

              <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
                Al registrarte, aceptas nuestros<br/>
                <a href="#" style={{ color: '#d1d5db', textDecoration: 'underline' }}>Términos de Servicio</a> y <a href="#" style={{ color: '#d1d5db', textDecoration: 'underline' }}>Política de Privacidad</a>.
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
