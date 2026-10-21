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
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string; requireVerification?: boolean; email?: string }>;
  register: (data: { nombre: string; email: string; password: string }) => Promise<{ success: boolean; message?: string; requireVerification?: boolean; email?: string }>;
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
        } else if (res.networkError) {
          // C-05: Si hay fallo de red (offline), mantener la sesión local para poder seguir operando offline
          console.log('[Auth] Servidor no disponible. Manteniendo sesión local offline.');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleLogin = async (email: string, pass: string) => {
    const res = await apiFetch<{ token: string; usuario: UserProfile }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });

    if (res.success && res.data) {
      setAuthToken(res.data.token);
      setToken(res.data.token);
      setUser(res.data.usuario);
      localStorage.setItem('jinstock_user', JSON.stringify(res.data.usuario));
      return { success: true, message: res.message };
    }

    return {
      success: false,
      message: res.message || 'Error al iniciar sesión',
      requireVerification: res.requireVerification,
      email: res.email,
    };
  };

  const handleRegister = async (data: { nombre: string; email: string; password: string }) => {
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
