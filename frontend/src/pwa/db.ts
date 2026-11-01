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

/** Ventas del servidor cacheadas localmente para acceso offline */
export interface LocalSale {
  id: string;
  numeroComprobante: string;
  fecha: string;
  total: number;
  estado: string;
  metodoPago: string;
  clienteNombre?: string | null;
  usuarioNombre?: string;
  detalles: Array<{
    productoId: string;
    productoNombre?: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  cachedAt: string;
}

/** Usuarios cacheados localmente para acceso offline */
export interface LocalUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  estado: boolean;
  verificado?: boolean;
  createdAt?: string;
  cachedAt: string;
}

/** IDs de datos ficticios que nunca deben persistir ni mostrarse al usuario */
export const DUMMY_PRODUCT_IDS = ['prod-001', 'prod-002', 'prod-003', 'prod-004', 'prod-005', 'prod-006', 'prod-007'];
export const DUMMY_CATEGORY_IDS = ['cat-001', 'cat-002', 'cat-003', 'cat-004', 'cat-005'];
export const DUMMY_SUPPLIER_IDS = ['prov-001', 'prov-002', 'prov-003'];

export class JINStockDB extends Dexie {
  products!: Table<LocalProduct>;
  categories!: Table<LocalCategory>;
  offlineSales!: Table<LocalOfflineSale>;
  suppliers!: Table<LocalSupplier>;
  purchases!: Table<LocalPurchase>;
  metadata!: Table<LocalMetadata>;
  localSales!: Table<LocalSale>;
  localUsers!: Table<LocalUser>;

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

    // Versión 4: Caché de ventas del servidor y usuarios para modo offline
    this.version(4).stores({
      products: 'id, codigoBarras, sku, nombre, categoriaId, estado, stock',
      categories: 'id, nombre, estado',
      offlineSales: '++id, offlineId, numeroComprobante, estado, synced, fecha',
      metadata: 'key',
      suppliers: 'id, nombre, ruc, estado',
      purchases: 'id, numeroFactura, proveedorId, fecha, estado',
      localSales: 'id, numeroComprobante, fecha, estado, cachedAt',
      localUsers: 'id, nombre, rol, estado, cachedAt',
    });

    // Versión 5: Limpieza de datos ficticios de instalaciones previas.
    this.version(5)
      .stores({
        products: 'id, codigoBarras, sku, nombre, categoriaId, estado, stock',
        categories: 'id, nombre, estado',
        offlineSales: '++id, offlineId, numeroComprobante, estado, synced, fecha',
        metadata: 'key',
        suppliers: 'id, nombre, ruc, estado',
        purchases: 'id, numeroFactura, proveedorId, fecha, estado',
        localSales: 'id, numeroComprobante, fecha, estado, cachedAt',
        localUsers: 'id, nombre, rol, estado, cachedAt',
      })
      .upgrade(async (tx) => {
        await tx.table('products').where('id').anyOf(DUMMY_PRODUCT_IDS).delete();
        await tx.table('categories').where('id').anyOf(DUMMY_CATEGORY_IDS).delete();
        await tx.table('suppliers').where('id').anyOf(DUMMY_SUPPLIER_IDS).delete();
        await tx.table('metadata').put({ key: 'dummyDataCleaned', value: 'v5' });
      });

    // Versión 6: Limpieza profunda y definitiva de todos los datos ficticios y tablas obsoletas en Dexie
    this.version(6)
      .stores({
        products: 'id, codigoBarras, sku, nombre, categoriaId, estado, stock',
        categories: 'id, nombre, estado',
        offlineSales: '++id, offlineId, numeroComprobante, estado, synced, fecha',
        metadata: 'key',
        suppliers: 'id, nombre, ruc, estado',
        purchases: 'id, numeroFactura, proveedorId, fecha, estado',
        localSales: 'id, numeroComprobante, fecha, estado, cachedAt',
        localUsers: 'id, nombre, rol, estado, cachedAt',
      })
      .upgrade(async (tx) => {
        // Purgar productos ficticios
        await tx.table('products').where('id').anyOf(DUMMY_PRODUCT_IDS).delete();
        // Purgar categorías ficticias
        await tx.table('categories').where('id').anyOf(DUMMY_CATEGORY_IDS).delete();
        // Purgar TODOS los proveedores ficticios (prov-001, prov-002, prov-003)
        await tx.table('suppliers').where('id').anyOf(['prov-001', 'prov-002', 'prov-003']).delete();
        // Vaciar usuarios y ventas locales cacheadas para forzar recarga limpia desde Neon
        await tx.table('localUsers').clear();
        await tx.table('localSales').clear();
        await tx.table('metadata').put({ key: 'dummyDataCleaned', value: 'v6' });
        console.log('[JINStockDB v6] Purgados datos locales obsoletos y ficticios.');
      });
  }
}

export const db = new JINStockDB();
