import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch, setAuthToken, removeAuthToken, getAuthToken } from '../services/api';

export type Rol = 'ADMINISTRADOR' | 'CAJERO';

export interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string; requireVerification?: boolean; email?: string; usuario?: UserProfile }>;
  loginOffline: (role?: Rol) => void;
  register: (data: { nombre: string; email: string; password: string; rol?: Rol }) => Promise<{ success: boolean; message?: string; requireVerification?: boolean; email?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('jinstock_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const existingToken = getAuthToken();
      if (existingToken) {
        const res = await apiFetch<UserProfile>('/auth/me');
        if (res.success && res.data) {
          setUser(res.data);
          localStorage.setItem('jinstock_user', JSON.stringify(res.data));
        } else if (res.status === 401 || res.status === 403) {
          // C-05: Si el token está vencido o inválido (401/403), cerrar sesión y limpiar almacenamiento
          console.warn('[Auth] Sesión inválida o expirada (401/403). Cerrando sesión.');
          handleLogout();
        } else {
          // C-05: Si hay fallo de red o servidor no disponible, mantener la sesión local para seguir operando offline
          console.log('[Auth] Servidor no disponible o modo offline. Manteniendo sesión local offline.');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const loginOffline = (role: Rol = 'CAJERO') => {
    const cachedUserRaw = localStorage.getItem('jinstock_user');
    const cachedUser = cachedUserRaw ? JSON.parse(cachedUserRaw) : null;

    const offlineUser: UserProfile = {
      id: cachedUser?.id || (role === 'ADMINISTRADOR' ? 'usr-admin-offline' : 'usr-cajero-offline'),
      nombre: cachedUser?.nombre || (role === 'ADMINISTRADOR' ? 'Administrador (Offline)' : 'Cajero (Offline)'),
      email: cachedUser?.email || (role === 'ADMINISTRADOR' ? 'admin@jinstock.ni' : 'cajero@jinstock.ni'),
      rol: role,
    };

    const dummyToken = 'offline-token-' + Date.now();
    setAuthToken(dummyToken);
    setToken(dummyToken);
    setUser(offlineUser);
    localStorage.setItem('jinstock_user', JSON.stringify(offlineUser));
  };

  const handleLogin = async (email: string, pass: string) => {
    // Si no hay red, permitir acceso offline directo
    if (!navigator.onLine) {
      const offlineRole: Rol = email.toLowerCase().includes('admin') ? 'ADMINISTRADOR' : 'CAJERO';
      loginOffline(offlineRole);
      return {
        success: true,
        message: 'Acceso offline concedido. Operando en modo fuera de línea.',
        usuario: JSON.parse(localStorage.getItem('jinstock_user')!),
      };
    }

    const res = await apiFetch<{ token: string; usuario: UserProfile }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });

    if (res.success && res.data) {
      setAuthToken(res.data.token);
      setToken(res.data.token);
      setUser(res.data.usuario);
      localStorage.setItem('jinstock_user', JSON.stringify(res.data.usuario));
      return { success: true, message: res.message, usuario: res.data.usuario };
    }

    // Fallback offline si el servidor está caído o devuelve 5xx por desconexión de base de datos
    if (res.networkError || (res.status && res.status >= 500)) {
      const offlineRole: Rol = email.toLowerCase().includes('admin') ? 'ADMINISTRADOR' : 'CAJERO';
      loginOffline(offlineRole);
      return {
        success: true,
        message: 'Servidor no accesible. Entrando en Modo Fuera de Línea.',
        usuario: JSON.parse(localStorage.getItem('jinstock_user')!),
      };
    }

    return {
      success: false,
      message: res.message || 'Error al iniciar sesión',
      requireVerification: res.requireVerification,
      email: res.email,
    };
  };

  const handleRegister = async (data: { nombre: string; email: string; password: string; rol?: Rol }) => {
    const res = await apiFetch<{ token: string; usuario: UserProfile }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (res.success && res.data) {
      setAuthToken(res.data.token);
      setToken(res.data.token);
      setUser(res.data.usuario);
      localStorage.setItem('jinstock_user', JSON.stringify(res.data.usuario));
      return { success: true, message: res.message };
    }

    return {
      success: res.success,
      message: res.message || 'Error al registrar la cuenta',
      requireVerification: res.requireVerification,
      email: res.email,
    };
  };

  const handleLogout = () => {
    removeAuthToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login: handleLogin,
        loginOffline,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
