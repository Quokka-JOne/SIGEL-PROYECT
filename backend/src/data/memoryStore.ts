import { Rol } from '@prisma/client';

export interface MemoryProduct {
  id: string;
  codigoBarras: string | null;
  sku: string | null;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  categoriaId: string;
  categoriaNombre: string;
  precioVenta: number;
  costo: number;
  stock: number;
  stockMinimo: number;
  unidadMedida: string;
  estado: boolean;
}

export interface MemoryCategory {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
}

export interface MemorySupplier {
  id: string;
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  estado: boolean;
}

export interface MemoryMovement {
  id: string;
  productoId: string;
  usuarioId: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo: string;
  fecha: string;
}

// Initial demo store
export const memoryCategories: MemoryCategory[] = [];

export const memoryProducts: MemoryProduct[] = [];

export const memorySuppliers: MemorySupplier[] = [];

export const memoryPurchases: any[] = [];
export const memorySales: any[] = [];
export const memoryMovements: MemoryMovement[] = [];
