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
  redondeoNIO?: number | null;
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

export type SyncEntity = 'CATEGORY' | 'PRODUCT' | 'SUPPLIER';
export type SyncOperationStatus = 'PENDING' | 'SYNCING' | 'ERROR';
export interface LocalSyncOperation {
  operationId: string;
  entity: SyncEntity;
  action: 'CREATE';
  localId: string;
  payload: Record<string, unknown>;
  status: SyncOperationStatus;
  attempts: number;
  nextAttemptAt: string;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
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

/** IDs de pruebas o mock que no deben persistir */
export const DUMMY_PRODUCT_IDS: string[] = ['test-mock-prod-000'];
export const DUMMY_CATEGORY_IDS: string[] = ['test-mock-cat-000'];
export const DUMMY_SUPPLIER_IDS: string[] = ['test-mock-prov-000'];

export class JINStockDB extends Dexie {
  products!: Table<LocalProduct>;
  categories!: Table<LocalCategory>;
  offlineSales!: Table<LocalOfflineSale>;
  suppliers!: Table<LocalSupplier>;
  purchases!: Table<LocalPurchase>;
  metadata!: Table<LocalMetadata>;
  localSales!: Table<LocalSale>;
  localUsers!: Table<LocalUser>;
  syncQueue!: Table<LocalSyncOperation>;

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

    // Versión 6: Esquema optimizado Dexie
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
        // Purgar únicamente mock IDs si existieran
        await tx.table('products').where('id').anyOf(DUMMY_PRODUCT_IDS).delete();
        await tx.table('categories').where('id').anyOf(DUMMY_CATEGORY_IDS).delete();
        await tx.table('suppliers').where('id').anyOf(DUMMY_SUPPLIER_IDS).delete();
        await tx.table('metadata').put({ key: 'dummyDataCleaned', value: 'v6' });
        console.log('[JINStockDB v6] Base de datos local inicializada.');
      });

    // Versión 7: outbox durable para altas offline reintentables.
    this.version(7).stores({
      products: 'id, codigoBarras, sku, nombre, categoriaId, estado, stock',
      categories: 'id, nombre, estado',
      offlineSales: '++id, offlineId, numeroComprobante, estado, synced, fecha',
      metadata: 'key',
      suppliers: 'id, nombre, ruc, estado',
      purchases: 'id, numeroFactura, proveedorId, fecha, estado',
      localSales: 'id, numeroComprobante, fecha, estado, cachedAt',
      localUsers: 'id, nombre, rol, estado, cachedAt',
      syncQueue: 'operationId, entity, status, localId, nextAttemptAt, createdAt',
    }).upgrade(async (tx) => {
      const now = new Date().toISOString();
      const [products, suppliers, categories] = await Promise.all([
        tx.table('products').filter((item: LocalProduct) => item.id.startsWith('prod-local-')).toArray(),
        tx.table('suppliers').filter((item: LocalSupplier) => item.id.startsWith('prov-local-')).toArray(),
        tx.table('categories').filter((item: LocalCategory) => item.id.startsWith('cat-local-')).toArray(),
      ]);
      const operations = [
        ...categories.map((item: LocalCategory) => ({ entity: 'CATEGORY' as const, localId: item.id, payload: { nombre: item.nombre, descripcion: item.descripcion || undefined } })),
        ...suppliers.map((item: LocalSupplier) => ({ entity: 'SUPPLIER' as const, localId: item.id, payload: { nombre: item.nombre, ruc: item.ruc, telefono: item.telefono, email: item.email, direccion: item.direccion } })),
        ...products.map((item: LocalProduct) => ({ entity: 'PRODUCT' as const, localId: item.id, payload: { nombre: item.nombre, codigoBarras: item.codigoBarras, sku: item.sku, descripcion: item.descripcion, imagenUrl: item.imagenUrl, categoriaId: item.categoriaId, precioVenta: item.precioVenta, costo: item.costo, stock: item.stock, stockMinimo: item.stockMinimo, unidadMedida: item.unidadMedida } })),
      ];
      await tx.table('syncQueue').bulkPut(operations.map((item) => ({
        ...item,
        operationId: `migrated-${item.localId}`,
        action: 'CREATE' as const,
        status: 'PENDING' as const,
        attempts: 0,
        nextAttemptAt: now,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      })));
    });
  }
}

export const db = new JINStockDB();
