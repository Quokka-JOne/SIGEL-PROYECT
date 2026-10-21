import Dexie, { type Table } from 'dexie';

export interface LocalProduct {
  id: string;
  codigoBarras?: string;
  sku?: string;
  nombre: string;
  descripcion?: string;
  categoriaId: string;
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
  descripcion?: string;
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
  detalles: Array<{
    productoId: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  synced: number; // 0 for false, 1 for true
  createdAt: string;
}

export class JINStockDB extends Dexie {
  products!: Table<LocalProduct>;
  categories!: Table<LocalCategory>;
  offlineSales!: Table<LocalOfflineSale>;

  constructor() {
    super('JINStockDB');
    this.version(1).stores({
      products: 'id, codigoBarras, sku, nombre, categoriaId, estado',
      categories: 'id, nombre, estado',
      offlineSales: '++id, offlineId, numeroComprobante, synced, fecha',
    });
  }
}

export const db = new JINStockDB();
