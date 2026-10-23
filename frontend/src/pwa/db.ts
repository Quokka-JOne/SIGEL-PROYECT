import Dexie, { type Table } from 'dexie';

export type OfflineSaleStatus = 'PENDIENTE' | 'SINCRONIZANDO' | 'SINCRONIZADO' | 'ERROR' | 'REVISION';

export interface LocalProduct {
  id: string;
  codigoBarras?: string | null;
  sku?: string | null;
  nombre: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  categoriaId: string;
  categoriaNombre?: string;
  precioVenta: number;
  costo: number;
  stock: number;
  stockMinimo: number;
  unidadMedida: string;
  estado: boolean;
}

export interface LocalCategory {
  id: string;
  nombre: string;
  descripcion?: string | null;
  estado: boolean;
}

export interface LocalOfflineSale {
  id?: number;
  offlineId: string;
  numeroComprobante: string;
  usuarioId: string;
  fecha: string;
  total: number;
  metodoPago: string;
  montoPagadoNIO?: number | null;
  montoPagadoUSD?: number | null;
  cambioNIO?: number | null;
  detalles: Array<{
    productoId: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  estado: OfflineSaleStatus;
  synced: number; // 0 para no sincronizado, 1 para sincronizado
  error?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface LocalSupplier {
  id: string;
  nombre: string;
  ruc?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  estado: boolean;
}

export interface LocalPurchase {
  id: string;
  numeroFactura?: string;
  proveedorId: string;
  proveedor?: { nombre: string };
  fecha: string;
  total: number;
  estado: string;
  motivoCancelacion?: string;
  detalles: Array<{
    productoId: string;
    producto?: { nombre: string; sku?: string };
    cantidad: number;
    costoUnitario: number;
    subtotal: number;
  }>;
}

export interface LocalMetadata {
  key: string;
  value: string;
}

export class JINStockDB extends Dexie {
  products!: Table<LocalProduct>;
  categories!: Table<LocalCategory>;
  offlineSales!: Table<LocalOfflineSale>;
  suppliers!: Table<LocalSupplier>;
  purchases!: Table<LocalPurchase>;
  metadata!: Table<LocalMetadata>;

  constructor() {
    super('JINStockDB');
    this.version(1).stores({
      products: 'id, codigoBarras, sku, nombre, categoriaId, estado',
      categories: 'id, nombre, estado',
      offlineSales: '++id, offlineId, numeroComprobante, synced, fecha',
    });

    // C-01: Versión 2 de esquema Dexie con soporte de estados e índice de sincronización
    this.version(2).stores({
      products: 'id, codigoBarras, sku, nombre, categoriaId, estado, stock',
      categories: 'id, nombre, estado',
      offlineSales: '++id, offlineId, numeroComprobante, estado, synced, fecha',
      metadata: 'key',
    });

    // Versión 3: Soporte para proveedores y compras offline
    this.version(3).stores({
      products: 'id, codigoBarras, sku, nombre, categoriaId, estado, stock',
      categories: 'id, nombre, estado',
      offlineSales: '++id, offlineId, numeroComprobante, estado, synced, fecha',
      metadata: 'key',
      suppliers: 'id, nombre, ruc, estado',
      purchases: 'id, numeroFactura, proveedorId, fecha, estado',
    });
  }
}

export const db = new JINStockDB();
