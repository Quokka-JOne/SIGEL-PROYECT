import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth, type Rol } from '../context/AuthContext';

export interface UserAccount {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  estado: boolean;
  verificado?: boolean;
  createdAt?: string;
}

export const UsersPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMINISTRADOR';

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'TODOS' | 'ADMINISTRADOR' | 'CAJERO'>('TODOS');

  // Form fields (M-02: Solo roles existentes en el alcance: ADMINISTRADOR y CAJERO)
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'CAJERO' as Rol,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const fetchUsers = async () => {
    setLoading(true);
    setActionError(null);
    const res = await apiFetch<UserAccount[]>('/users');
    if (res.success && res.data) {
      setUsers(res.data);
    } else {
      setActionError(res.message || 'Error al obtener usuarios.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleUserStatus = async (usr: UserAccount) => {
    setActionError(null);
    const res = await apiFetch(`/users/${usr.id}/status`, { method: 'PATCH' });
    if (res.success) {
      fetchUsers();
    } else {
      setActionError(res.message || 'Error al cambiar estado del usuario.');
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
      setFormSuccess('Usuario creado exitosamente con credenciales activas.');
      setTimeout(() => {
        setIsModalOpen(false);
        setFormData({ nombre: '', email: '', password: '', rol: 'CAJERO' });
        fetchUsers();
      }, 600);
    } else {
      setFormError(res.message || 'Error al registrar el usuario.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-white">
        <span className="material-symbols-outlined text-4xl text-rose-400 mb-2">lock</span>
        <h2 className="text-xl font-bold">Acceso Restringido</h2>
        <p className="text-xs text-gray-400 mt-1">
          Solo los usuarios con rol de <strong>Administrador</strong> tienen acceso a la gestión de colaboradores.
        </p>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    if (activeFilter === 'TODOS') return true;
    return u.rol === activeFilter;
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto font-body text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <span className="material-symbols-outlined text-purple-400 text-3xl">admin_panel_settings</span>
            Gestión de Usuarios y Roles
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Administración de cuentas con acceso al sistema (Roles: ADMINISTRADOR y CAJERO según especificación).
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setFormSuccess(null);
            setFormData({ nombre: '', email: '', password: '', rol: 'CAJERO' });
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-purple-900/30"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          Nuevo Colaborador
        </button>
      </div>

      {actionError && (
        <div className="p-3 rounded-xl border bg-red-950/70 border-red-500/40 text-red-200 text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-gray-400 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1c1b22] border border-[#2d2c35] p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400">Total Usuarios</span>
            <span className="text-2xl font-extrabold text-white block mt-1">{users.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <span className="material-symbols-outlined">group</span>
          </div>
        </div>

        <div className="bg-[#1c1b22] border border-[#2d2c35] p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400">Administradores</span>
            <span className="text-2xl font-extrabold text-purple-300 block mt-1">
              {users.filter((u) => u.rol === 'ADMINISTRADOR').length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <span className="material-symbols-outlined">shield_person</span>
          </div>
        </div>

        <div className="bg-[#1c1b22] border border-[#2d2c35] p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400">Cajeros de Turno</span>
            <span className="text-2xl font-extrabold text-emerald-400 block mt-1">
              {users.filter((u) => u.rol === 'CAJERO').length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <span className="material-symbols-outlined">badge</span>
          </div>
        </div>
      </div>

      {/* Role Filter Tabs (M-02) */}
      <div className="flex gap-2 border-b border-white/10 pb-3">
        {(['TODOS', 'ADMINISTRADOR', 'CAJERO'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeFilter === filter
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-[#1c1b22] text-gray-400 hover:text-white border border-[#2d2c35]'
            }`}
          >
            {filter === 'TODOS' ? 'Todos los Usuarios' : filter === 'ADMINISTRADOR' ? 'Administradores' : 'Cajeros'}
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-[#1c1b22] border border-[#2d2c35] rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Cargando usuarios...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-20 text-center text-gray-500 text-xs">
            No se encontraron usuarios en este rol.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#14131a] text-gray-400 border-b border-white/5 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Correo Electrónico</th>
                  <th className="py-3 px-4 text-center">Rol Asignado</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((usr) => (
                  <tr key={usr.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-800 flex items-center justify-center font-bold text-xs text-white">
                          {usr.nombre.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white leading-tight">{usr.nombre}</p>
                          <span className="text-[10px] text-gray-500">
                            Registrado: {usr.createdAt ? new Date(usr.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 font-mono text-xs">{usr.email}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          usr.rol === 'ADMINISTRADOR'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {usr.rol}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          usr.estado
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {usr.estado ? 'Activo' : 'Desactivado'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleUserStatus(usr)}
                        disabled={usr.id === user?.id}
                        title={usr.id === user?.id ? 'No puede desactivar su propia cuenta' : 'Cambiar estado'}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                          usr.estado
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {usr.estado ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Registrar Nuevo Colaborador */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1b22] border border-[#2d2c35] w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">person_add</span>
                Registrar Nuevo Colaborador
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-gray-400 font-semibold block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Roberto Martínez García"
                  className="w-full bg-[#100f14] border border-[#2d2c35] rounded-xl px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-gray-400 font-semibold block mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ejemplo@jinstock.ni"
                  className="w-full bg-[#100f14] border border-[#2d2c35] rounded-xl px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-gray-400 font-semibold block mb-1">Contraseña Inicial *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres..."
                    className="w-full bg-[#100f14] border border-[#2d2c35] rounded-xl px-3 py-2 pr-10 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* M-02: Selector de Rol (Exclusivamente ADMINISTRADOR o CAJERO) */}
              <div>
                <label className="text-gray-400 font-semibold block mb-1">Rol Operativo *</label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value as Rol })}
                  className="w-full bg-[#100f14] border border-[#2d2c35] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="CAJERO">CAJERO (Acceso exclusivo a POS y Mis Ventas)</option>
                  <option value="ADMINISTRADOR">ADMINISTRADOR (Acceso total al sistema y reportes)</option>
                </select>
                <span className="text-[11px] text-gray-500 block mt-1">
                  Nota: Roles adicionales (Bodega, Contador) quedan declarados fuera del alcance según las especificaciones del MVP.
                </span>
              </div>

              <div className="flex gap-2 pt-3 border-t border-white/10 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md transition-colors"
                >
                  Guardar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
