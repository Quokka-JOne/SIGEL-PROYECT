const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export const getAuthToken = (): string | null => {
  return localStorage.getItem('jinstock_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('jinstock_token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('jinstock_token');
  localStorage.removeItem('jinstock_user');
};

export const apiFetch = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || `Error ${response.status}: ${response.statusText}`,
      };
    }

    return data;
  } catch (error: any) {
    console.warn(`[Network/Offline] Error consultando ${endpoint}:`, error.message);
    return {
      success: false,
      message: 'Sin conexión con el servidor. Modo offline activo.',
    };
  }
};
