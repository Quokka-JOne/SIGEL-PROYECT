import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface UserAccount {
  id: string;
  nombre: string;
  email: string;
  rol: 'ADMINISTRADOR' | 'CAJERO' | 'BODEGA' | 'CONTADOR';
  estado: boolean;
  createdAt?: string;
}

export const UsersPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMINISTRADOR';

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  // Selected Role Tab
  const [activeRoleTab, setActiveRoleTab] = useState<'ADMINISTRADOR' | 'CAJERO' | 'BODEGA' | 'CONTADOR'>('ADMINISTRADOR');

  // Form fields
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'CAJERO' as 'ADMINISTRADOR' | 'CAJERO' | 'BODEGA' | 'CONTADOR',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await apiFetch<UserAccount[]>('/users');
    if (res.success && res.data) {
      setUsers(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleUserStatus = async (usr: UserAccount) => {
    const res = await apiFetch(`/users/${usr.id}/status`, { method: 'PATCH' });
    if (res.success) {
      fetchUsers();
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.nombre.trim() || !formData.email.trim() || !formData.password) {
      setFormError('Por favor complete todos los campos obligatorios.');
      return;
    }

    const res = await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify(formData),
    });

    if (res.success) {
      setFormSuccess('Usuario creado exitosamente');
      setTimeout(() => {
        setIsModalOpen(false);
        setFormData({ nombre: '', email: '', password: '', rol: 'CAJERO' });
        fetchUsers();
      }, 500);
    } else {
      setFormError(res.message || 'Error al registrar usuario.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center font-body-md text-on-surface">
        <span className="material-symbols-outlined text-4xl text-error mb-2">lock</span>
        <h2 className="text-xl font-bold font-headline-md">Acceso Restringido</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Solo los usuarios con rol de <strong>Administrador</strong> tienen acceso al control de cuentas.
        </p>
      </div>
    );
  }

  const getRoleDetails = (role: string) => {
    switch (role) {
      case 'ADMINISTRADOR':
        return { name: 'Administrador General', desc: 'Tiene autorización irrestricta para parametrizar las listas de útiles escolares, definir márgenes mayoristas, ejecutar cortes Z definitivos y autorizar compras directas al crédito.', color: 'bg-primary-container', text: 'text-on-primary' };
      case 'CAJERO':
        return { name: 'Cajero / Mostrador POS', desc: 'Cobros veloces, arqueos y comprobantes. Restringido ver costos de compra y utilidades.', color: 'bg-surface-container-high', text: 'text-primary' };
      case 'BODEGA':
        return { name: 'Encargado de Bodega', desc: 'Recepción a proveedores, Kardex físico y conteos de ciclo. Sin acceso a caja.', color: 'bg-surface-container-high', text: 'text-secondary' };
      case 'CONTADOR':
        return { name: 'Contador / Auditor', desc: 'Reportes tributarios DGI, libros de compras/ventas y exportación Excel/PDF contable.', color: 'bg-surface-container-high', text: 'text-tertiary' };
      default:
        return { name: 'Desconocido', desc: '', color: 'bg-surface-container', text: 'text-on-surface' };
    }
  };

  const activeRoleDetails = getRoleDetails(activeRoleTab);

  return (
    <div className="flex flex-col gap-space-lg w-full">
      {/* Header & Action Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-sm mb-1">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-secondary text-on-secondary shadow-sm">
              <span className="material-symbols-outlined text-body-lg">admin_panel_settings</span>
            </span>
            <span className="font-label-md text-label-md text-secondary tracking-wide uppercase">Control de Accesos · Seguridad Operativa</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight leading-tight">
            Gestión de Personal, Roles y Permisos
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Auditoría de accesos multi-sucursal con persistencia offline segura en IndexedDB.
          </p>
        </div>
        
        {/* Quick Action CTA Group */}
        <div className="flex flex-wrap items-center gap-space-sm shrink-0">
          <button className="flex items-center gap-2 px-space-md py-2.5 rounded-xl bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container-low active:scale-95 transition-all">
            <span className="material-symbols-outlined text-primary-container text-body-lg">tune</span>
            <span className="font-label-lg text-label-lg">Configurar Matriz</span>
          </button>
          <button 
            onClick={() => {
              setFormError(null);
              setFormSuccess(null);
              setFormData({ nombre: '', email: '', password: '', rol: 'CAJERO' });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-space-md py-2.5 rounded-xl bg-primary-container text-on-primary shadow-md hover:bg-primary active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-body-lg">person_add</span>
            <span className="font-label-lg text-label-lg">+ Registrar Nuevo Colaborador</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Metric Band */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Colaboradores Activos</span>
            <span className="font-numeric-pos text-numeric-pos text-primary-container mt-1">{users.length}</span>
            <span className="font-label-sm text-label-sm text-secondary-container mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-container inline-block"></span>
              {users.filter(u => u.estado).length} en turno
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center text-primary-container">
            <span className="material-symbols-outlined text-headline-sm">badge</span>
          </div>
        </div>
        
        <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Sucursales Conectadas</span>
            <span className="font-numeric-pos text-numeric-pos text-tertiary mt-1">1 Sede</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Managua</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
            <span className="material-symbols-outlined text-headline-sm">store</span>
          </div>
        </div>
        
        <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Políticas de Privacidad</span>
            <span className="font-numeric-pos text-numeric-pos text-on-surface mt-1">4 Perfiles</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">RBAC Activo</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-tertiary-fixed flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined text-headline-sm">verified_user</span>
          </div>
        </div>
        
        <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Eventos Auditoría</span>
            <span className="font-numeric-pos text-numeric-pos text-error mt-1">0</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Sistema blindado</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-error-container flex items-center justify-center text-error">
            <span className="material-symbols-outlined text-headline-sm">lock_clock</span>
          </div>
        </div>
      </div>

      {/* Interactive System Roles Selector */}
      <div className="flex flex-col gap-space-sm bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-1">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Perfiles Operativos del Sistema</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Selecciona un rol para inspeccionar sus atribuciones de seguridad.</p>
          </div>
        </div>
        
        {/* Role Selector Tabs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-sm mt-2">
          {/* Admin */}
          <div 
            onClick={() => setActiveRoleTab('ADMINISTRADOR')}
            className={`cursor-pointer p-space-md rounded-xl transition-all shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden ${activeRoleTab === 'ADMINISTRADOR' ? 'bg-primary-container text-on-primary scale-[1.02] shadow-md' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}
          >
            <div className="flex items-start justify-between">
              <span className={`inline-flex p-2 rounded-lg ${activeRoleTab === 'ADMINISTRADOR' ? 'bg-surface-container-lowest/15' : 'bg-surface-container-high'}`}>
                <span className="material-symbols-outlined text-body-lg">shield_with_heart</span>
              </span>
              <span className="font-label-sm text-label-sm bg-secondary-fixed text-on-secondary-fixed px-2 py-0.5 rounded-full">Acceso Total</span>
            </div>
            <div>
              <h3 className="font-label-lg text-label-lg font-bold">Administrador General</h3>
              <p className={`font-body-sm text-body-sm mt-1 line-clamp-2 ${activeRoleTab === 'ADMINISTRADOR' ? 'opacity-90' : 'text-on-surface-variant'}`}>
                Control absoluto de finanzas, márgenes, costos, IA predictiva y sucursales.
              </p>
            </div>
          </div>
          
          {/* Cajero */}
          <div 
            onClick={() => setActiveRoleTab('CAJERO')}
            className={`cursor-pointer p-space-md rounded-xl transition-all shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden ${activeRoleTab === 'CAJERO' ? 'bg-primary-container text-on-primary scale-[1.02] shadow-md' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}
          >
            <div className="flex items-start justify-between">
              <span className={`inline-flex p-2 rounded-lg ${activeRoleTab === 'CAJERO' ? 'bg-surface-container-lowest/15' : 'bg-surface-container-high text-primary'}`}>
                <span className="material-symbols-outlined text-body-lg">point_of_sale</span>
              </span>
            </div>
            <div>
              <h3 className="font-label-lg text-label-lg font-bold">Cajero / Mostrador POS</h3>
              <p className={`font-body-sm text-body-sm mt-1 line-clamp-2 ${activeRoleTab === 'CAJERO' ? 'opacity-90' : 'text-on-surface-variant'}`}>
                Cobros veloces, arqueos y comprobantes. Restringido ver costos.
              </p>
            </div>
          </div>
          
          {/* Bodega */}
          <div 
            onClick={() => setActiveRoleTab('BODEGA')}
            className={`cursor-pointer p-space-md rounded-xl transition-all shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden ${activeRoleTab === 'BODEGA' ? 'bg-primary-container text-on-primary scale-[1.02] shadow-md' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}
          >
            <div className="flex items-start justify-between">
              <span className={`inline-flex p-2 rounded-lg ${activeRoleTab === 'BODEGA' ? 'bg-surface-container-lowest/15' : 'bg-surface-container-high text-secondary'}`}>
                <span className="material-symbols-outlined text-body-lg">inventory_2</span>
              </span>
            </div>
            <div>
              <h3 className="font-label-lg text-label-lg font-bold">Encargado Bodega</h3>
              <p className={`font-body-sm text-body-sm mt-1 line-clamp-2 ${activeRoleTab === 'BODEGA' ? 'opacity-90' : 'text-on-surface-variant'}`}>
                Recepción, Kardex físico y conteos. Sin acceso a caja.
              </p>
            </div>
          </div>
          
          {/* Contador */}
          <div 
            onClick={() => setActiveRoleTab('CONTADOR')}
            className={`cursor-pointer p-space-md rounded-xl transition-all shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden ${activeRoleTab === 'CONTADOR' ? 'bg-primary-container text-on-primary scale-[1.02] shadow-md' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}
          >
            <div className="flex items-start justify-between">
              <span className={`inline-flex p-2 rounded-lg ${activeRoleTab === 'CONTADOR' ? 'bg-surface-container-lowest/15' : 'bg-surface-container-high text-tertiary'}`}>
                <span className="material-symbols-outlined text-body-lg">account_balance</span>
              </span>
            </div>
            <div>
              <h3 className="font-label-lg text-label-lg font-bold">Contador / Auditor</h3>
              <p className={`font-body-sm text-body-sm mt-1 line-clamp-2 ${activeRoleTab === 'CONTADOR' ? 'opacity-90' : 'text-on-surface-variant'}`}>
                Reportes tributarios, libros y exportación contable.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Role Detail Panel */}
      <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${activeRoleDetails.color}`}></div>
            <span className="font-headline-sm text-headline-sm text-on-surface">{activeRoleDetails.name}</span>
          </div>
          <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed font-bold">Detalle</span>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {activeRoleDetails.desc}
        </p>
        <div className="flex flex-col gap-2.5 bg-surface-container-low p-space-md rounded-xl">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Usuarios con este rol</span>
            <span className="font-label-md text-label-md text-on-surface">{users.filter(u => u.rol === activeRoleTab).length} personas</span>
          </div>
        </div>
      </div>

      {/* Active Collaborators Directory */}
      <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col gap-space-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-sm border-b border-surface-container">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Directorio de Colaboradores</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Gestión directa de credenciales locales.</p>
          </div>
        </div>

        {/* Users Grid List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {loading ? (
            <div className="col-span-full py-12 text-center text-on-surface-variant">Cargando lista de usuarios...</div>
          ) : users.length === 0 ? (
            <div className="col-span-full py-12 text-center text-on-surface-variant">No hay usuarios registrados.</div>
          ) : (
            users.map(u => (
              <div key={u.id} className="user-card bg-surface-container-low/60 hover:bg-surface-container-low transition-all p-space-md rounded-2xl flex flex-col justify-between gap-space-md shadow-sm border border-surface-container/50">
                <div className="flex items-start justify-between gap-space-sm">
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-surface-container text-primary flex items-center justify-center font-bold text-headline-sm shrink-0 shadow-sm">
                      {u.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-lg text-label-lg text-on-surface truncate">{u.nombre}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{u.email}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${u.estado ? 'bg-secondary' : 'bg-error'}`}></span>
                        <span className={`font-label-sm text-label-sm font-semibold ${u.estado ? 'text-primary' : 'text-error'}`}>
                          {u.estado ? 'Activo' : 'Desactivado'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="font-label-sm text-label-sm bg-primary-container text-on-primary px-2.5 py-0.5 rounded-full shrink-0">
                    {u.rol === 'ADMINISTRADOR' ? 'Admin' : u.rol === 'CAJERO' ? 'Cajero' : u.rol === 'BODEGA' ? 'Bodega' : 'Contador'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between pt-1 border-t border-surface-container">
                  <button className="font-label-sm text-label-sm text-primary hover:underline flex items-center gap-1">
                    <span className="material-symbols-outlined text-body-sm">history</span>
                    Auditoría
                  </button>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleToggleUserStatus(u)}
                      disabled={u.id === user?.id}
                      className={`p-1.5 rounded-lg transition-colors ${u.estado ? 'bg-surface-container hover:bg-error-container hover:text-error text-on-surface-variant' : 'bg-surface-container hover:bg-secondary-fixed hover:text-secondary text-on-surface-variant'}`}
                      title={u.estado ? "Desactivar" : "Activar"}
                    >
                      <span className="material-symbols-outlined text-body-md">
                        {u.estado ? 'person_off' : 'person_check'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-surface-container p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-low">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Nuevo Colaborador</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-headline-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-error-container text-error text-xs rounded-xl border border-error">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-primary-fixed text-primary text-xs rounded-xl border border-primary">
                  {formSuccess}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="ej. Martha López"
                  className="w-full px-4 py-2.5 bg-surface-container-low/40 rounded-xl font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="cajero2@jinstock.ni"
                  className="w-full px-4 py-2.5 bg-surface-container-low/40 rounded-xl font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface">Rol de Sistema *</label>
                <div className="relative">
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-surface-container-low/40 rounded-xl font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer appearance-none"
                  >
                    <option value="CAJERO">Cajero / Mostrador POS</option>
                    <option value="BODEGA">Encargado de Bodega</option>
                    <option value="CONTADOR">Contador / Auditor</option>
                    <option value="ADMINISTRADOR">Administrador (Acceso Total)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant pointer-events-none text-body-md">expand_more</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface">Contraseña de Acceso *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2.5 bg-surface-container-low/40 rounded-xl font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-label-md text-label-md text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-label-md text-label-md text-on-primary bg-primary hover:bg-primary-container transition-colors shadow-md"
                >
                  Crear Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
