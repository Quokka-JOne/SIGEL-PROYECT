import {
  db,
  DUMMY_PRODUCT_IDS,
  DUMMY_CATEGORY_IDS,
  DUMMY_SUPPLIER_IDS,
  type LocalProduct,
  type LocalCategory,
  type LocalSupplier,
  type LocalSale,
  type LocalUser,
} from '../pwa/db';
import { apiFetch } from './api';

type SyncListener = () => void;
const listeners = new Set<SyncListener>();

export const onSyncChange = (callback: SyncListener) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

const notifyListeners = () => {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error('Error en listener de sincronización:', e);
    }
  });
};

let isSyncing = false;

/**
 * C-01 & F-01: Procesa las ventas offline en cola (PENDIENTE o ERROR)
 */
export async function syncPendingSales(): Promise<{ processed: number; successCount: number; errorsCount: number }> {
  if (isSyncing) {
    return { processed: 0, successCount: 0, errorsCount: 0 };
  }

  isSyncing = true;
  notifyListeners();

  let processed = 0;
  let successCount = 0;
  let errorsCount = 0;

  try {
    const pendingSales = await db.offlineSales
      .where('estado')
      .anyOf('PENDIENTE', 'ERROR')
      .toArray();

    for (const sale of pendingSales) {
      processed++;
      await db.offlineSales.update(sale.id!, {
        estado: 'SINCRONIZANDO',
        updatedAt: new Date().toISOString(),
      });
      notifyListeners();

      const payload = {
        detalles: sale.detalles,
        metodoPago: sale.metodoPago,
        montoPagadoNIO: sale.montoPagadoNIO,
        montoPagadoUSD: sale.montoPagadoUSD,
        cambioNIO: sale.cambioNIO,
        offlineId: sale.offlineId,
        fecha: sale.fecha,
      };

      const res = await apiFetch('/sales', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        await db.offlineSales.update(sale.id!, {
          estado: 'SINCRONIZADO',
          synced: 1,
          numeroComprobante: res.data?.numeroComprobante || sale.numeroComprobante,
          error: null,
          updatedAt: new Date().toISOString(),
        });
        successCount++;
      } else if (res.networkError || (res.status && res.status >= 500)) {
        await db.offlineSales.update(sale.id!, {
          estado: 'PENDIENTE',
          updatedAt: new Date().toISOString(),
        });
        errorsCount++;
      } else if (res.code === 'STOCK_INSUFICIENTE') {
        await db.offlineSales.update(sale.id!, {
          estado: 'REVISION',
          error: res.message || 'Existencias insuficientes al sincronizar con el servidor.',
          updatedAt: new Date().toISOString(),
        });
        errorsCount++;
      } else {
        await db.offlineSales.update(sale.id!, {
          estado: 'ERROR',
          error: res.message || 'Error inesperado del servidor.',
          updatedAt: new Date().toISOString(),
        });
        errorsCount++;
      }

      notifyListeners();
    }
  } catch (err: any) {
    console.error('[SyncService] Excepción durante sincronización:', err);
  } finally {
    isSyncing = false;
    notifyListeners();
  }

  return { processed, successCount, errorsCount };
}

// ─── Las constantes DEFAULT_OFFLINE_* se mantienen solo como referencia de IDs a purgar.
// NUNCA se muestran al usuario como datos reales.
export const DEFAULT_OFFLINE_SUPPLIERS: LocalSupplier[] = [];
export const DEFAULT_OFFLINE_CATEGORIES: LocalCategory[] = [];
export const DEFAULT_OFFLINE_PRODUCTS: LocalProduct[] = [];

/**
 * Purga datos ficticios de Dexie (llamada manual o por migración)
 */
export async function purgeDummyData(): Promise<void> {
  try {
    const [pDel, cDel, sDel] = await Promise.all([
      db.products.where('id').anyOf(DUMMY_PRODUCT_IDS).delete(),
      db.categories.where('id').anyOf(DUMMY_CATEGORY_IDS).delete(),
      db.suppliers.where('id').anyOf(DUMMY_SUPPLIER_IDS).delete(),
    ]);
    if (pDel + cDel + sDel > 0) {
      console.log(`[SyncService] Purga de datos ficticios ejecutada: ${pDel} productos, ${cDel} categorías, ${sDel} proveedores eliminados.`);
    }
    await db.metadata.put({ key: 'dummyDataCleaned', value: 'v6' });
  } catch (e) {
    console.warn('[SyncService] Error en purga de datos ficticios:', e);
  }
}

/**
 * F-02: Guardar catálogo en caché local Dexie.
 * Modo "reemplazante total" — borra todo lo que no vino del servidor.
 * Esto garantiza que offline = exactamente lo que está en línea.
 */
export async function cacheCatalogLocally(
  products: LocalProduct[],
  categories: LocalCategory[],
  clearExisting: boolean = true,
): Promise<void> {
  try {
    if (categories && categories.length > 0) {
      await db.transaction('rw', db.categories, async () => {
        if (clearExisting) {
          await db.categories.clear();
        }
        await db.categories.bulkPut(categories);
      });
    }

    if (products && products.length > 0) {
      await db.transaction('rw', db.products, async () => {
        // Preservar productos creados localmente en modo offline que aún no han subido a Neon
        const pendingLocal = await db.products.filter((p) => p.id.startsWith('prod-local-')).toArray();
        if (clearExisting) {
          await db.products.clear();
        }
        await db.products.bulkPut([...products, ...pendingLocal]);
      });
    }

    await db.metadata.put({
      key: 'lastCatalogSync',
      value: new Date().toISOString(),
    });
    await db.metadata.put({ key: 'dummyDataCleaned', value: 'v6' });

    console.log(`[SyncService] Catálogo sincronizado en Dexie (clearExisting=${clearExisting}): ${products.length} productos, ${categories.length} categorías.`);
  } catch (err) {
    console.warn('[SyncService] Error al guardar catálogo en Dexie:', err);
  }
}

/**
 * F-02: Guardar proveedores en caché local (reemplazo limpio, preservando pendientes offline)
 */
export async function cacheSuppliersLocally(suppliers: LocalSupplier[]): Promise<void> {
  try {
    if (suppliers && suppliers.length > 0) {
      await db.transaction('rw', db.suppliers, async () => {
        // Preservar proveedores creados localmente en modo offline
        const pendingLocal = await db.suppliers.filter((s) => s.id.startsWith('prov-local-')).toArray();
        await db.suppliers.clear();
        await db.suppliers.bulkPut([...suppliers, ...pendingLocal]);
      });
      await db.metadata.put({ key: 'lastSuppliersSync', value: new Date().toISOString() });
      console.log(`[SyncService] ${suppliers.length} proveedores sincronizados en Dexie.`);
    }
  } catch (err) {
    console.warn('[SyncService] Error cacheando proveedores:', err);
  }
}

/**
 * Ya no se inicializa con datos ficticios. Si Dexie está vacío sin conexión,
 * el usuario verá una pantalla de "Sin datos — conéctate para sincronizar".
 */
export async function ensureLocalCatalogInitialized(): Promise<void> {
  // Solo purgar datos ficticios si quedaron de versiones anteriores
  await purgeDummyData();
}

/**
 * Obtener proveedores desde caché local Dexie.
 * Retorna array vacío si no hay datos reales — nunca retorna ficticios.
 */
export async function getLocalSuppliersFromDexie(): Promise<LocalSupplier[]> {
  try {
    await purgeDummyData();
    const supps = await db.suppliers.toArray();
    return supps;
  } catch (err) {
    console.warn('[SyncService] Error obteniendo proveedores de Dexie:', err);
    return [];
  }
}

/**
 * F-02: Obtener catálogo desde caché local Dexie cuando no hay red.
 * Solo retorna datos que vinieron del servidor (nunca ficticios).
 */
export async function getLocalCatalogFromDexie(query?: string, categoryId?: string): Promise<{
  products: LocalProduct[];
  categories: LocalCategory[];
  lastSync: string | null;
}> {
  try {
    await purgeDummyData();

    let prods = await db.products.toArray();
    let cats = await db.categories.toArray();

    const meta = await db.metadata.get('lastCatalogSync');

    // Filtros locales
    if (categoryId && categoryId !== 'all') {
      prods = prods.filter((p) => p.categoriaId === categoryId);
    }

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      prods = prods.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.codigoBarras && p.codigoBarras.includes(q))
      );
    }

    return {
      products: prods,
      categories: cats,
      lastSync: meta?.value || null,
    };
  } catch (err) {
    console.error('[SyncService] Error leyendo Dexie local:', err);
    return {
      products: [],
      categories: [],
      lastSync: null,
    };
  }
}

/**
 * Refrescar catálogo completo desde el servidor (reemplazo total)
 * Se llama al volver a estar online y periódicamente.
 */
export async function refreshCatalogInBackground(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    const [pRes, cRes, sRes] = await Promise.all([
      apiFetch<LocalProduct[]>('/products?includeInactive=false&all=true'),
      apiFetch<LocalCategory[]>('/categories'),
      apiFetch<LocalSupplier[]>('/suppliers'),
    ]);

    if (pRes.success && pRes.data && pRes.data.length > 0) {
      await cacheCatalogLocally(pRes.data, cRes.data || []);
    }

    if (sRes.success && sRes.data && sRes.data.length > 0) {
      await cacheSuppliersLocally(sRes.data);
    }

    console.log('[SyncService] Catálogo refrescado desde el servidor.');
  } catch (e) {
    // Silencioso en segundo plano
  }
}

/**
 * Inicializador de listeners automáticos para sincronización online
 */
export function initSyncManager() {
  if (typeof window === 'undefined') return;

  // Al arrancar: purgar datos ficticios y resincronizar en segundo plano si hay internet
  purgeDummyData().then(() => {
    if (navigator.onLine) {
      syncAllFromServer().catch(() => {});
    }
  });

  // Escuchar cuando el navegador recupera la conexión a internet
  window.addEventListener('online', () => {
    console.log('🌐 [SyncManager] Conexión a Internet detectada. Sincronizando catálogo completo y ventas...');
    syncAllFromServer().catch(() => {});
    syncPendingSales();
  });

  // Sincronización periódica cada 20 segundos si hay ventas pendientes
  setInterval(async () => {
    if (navigator.onLine) {
      const pendingCount = await db.offlineSales
        .where('estado')
        .anyOf('PENDIENTE')
        .count();

      if (pendingCount > 0) {
        syncPendingSales();
      }
    }
  }, 20000);

  // Sincronizar inmediatamente al cargar si hay conexión
  if (navigator.onLine) {
    setTimeout(() => {
      syncAllFromServer().catch(() => {});
      syncPendingSales();
    }, 1500);
  }
}

/**
 * Cachear ventas del servidor en Dexie para modo offline (reemplazo limpio)
 */
export async function cacheSalesLocally(sales: any[]): Promise<void> {
  try {
    const now = new Date().toISOString();
    const localSales: LocalSale[] = (sales || []).map((s) => ({
      id: String(s.id),
      numeroComprobante: s.numeroComprobante || '',
      fecha: s.fecha || s.createdAt || now,
      total: Number(s.total) || 0,
      estado: s.estado || 'COMPLETADO',
      metodoPago: s.metodoPago || '',
      clienteNombre: s.clienteNombre ?? null,
      usuarioNombre: s.usuario?.nombre || s.usuarioNombre || 'Sistema',
      detalles: (s.detalles || []).map((d: any) => ({
        productoId: String(d.productoId || d.producto?.id || ''),
        productoNombre: d.producto?.nombre || d.productoNombre || `Producto ${d.productoId}`,
        cantidad: Number(d.cantidad) || 0,
        precioUnitario: Number(d.precioUnitario) || 0,
        subtotal: Number(d.subtotal) || 0,
      })),
      cachedAt: now,
    }));

    await db.transaction('rw', db.localSales, async () => {
      await db.localSales.clear();
      if (localSales.length > 0) {
        await db.localSales.bulkPut(localSales);
      }
    });

    await db.metadata.put({ key: 'lastSalesSync', value: now });
    console.log(`[SyncService] ${localSales.length} ventas cacheadas en Dexie (reemplazo limpio).`);
  } catch (err) {
    console.warn('[SyncService] Error cacheando ventas:', err);
  }
}

/**
 * Obtener ventas cacheadas de Dexie (modo offline)
 */
export async function getCachedSales(): Promise<LocalSale[]> {
  try {
    const sales = await db.localSales.orderBy('fecha').reverse().toArray();
    return sales;
  } catch (err) {
    console.warn('[SyncService] Error obteniendo ventas cacheadas:', err);
    return [];
  }
}

/**
 * Cachear compras del servidor en Dexie para modo offline (reemplazo limpio)
 */
export async function cachePurchasesLocally(purchases: any[]): Promise<void> {
  try {
    await db.transaction('rw', db.purchases, async () => {
      await db.purchases.clear();
      if (purchases && purchases.length > 0) {
        await db.purchases.bulkPut(purchases);
      }
    });
    console.log(`[SyncService] ${(purchases || []).length} compras cacheadas en Dexie.`);
  } catch (err) {
    console.warn('[SyncService] Error cacheando compras:', err);
  }
}

/**
 * Cachear usuarios del servidor en Dexie para modo offline (reemplazo limpio)
 */
export async function cacheUsersLocally(users: any[]): Promise<void> {
  try {
    const now = new Date().toISOString();
    const localUsers: LocalUser[] = (users || []).map((u) => ({
      id: String(u.id),
      nombre: u.nombre || '',
      email: u.email || '',
      rol: u.rol || 'CAJERO',
      estado: Boolean(u.estado),
      verificado: Boolean(u.verificado),
      createdAt: u.createdAt,
      cachedAt: now,
    }));

    await db.transaction('rw', db.localUsers, async () => {
      await db.localUsers.clear();
      if (localUsers.length > 0) {
        await db.localUsers.bulkPut(localUsers);
      }
    });

    await db.metadata.put({ key: 'lastUsersSync', value: now });
    console.log(`[SyncService] ${localUsers.length} usuarios cacheados en Dexie (reemplazo limpio).`);
  } catch (err) {
    console.warn('[SyncService] Error cacheando usuarios:', err);
  }
}

/**
 * Obtener usuarios cacheados de Dexie (modo offline)
 */
export async function getCachedUsers(): Promise<LocalUser[]> {
  try {
    const users = await db.localUsers.toArray();
    return users;
  } catch (err) {
    console.warn('[SyncService] Error obteniendo usuarios cacheados:', err);
    return [];
  }
}

/**
 * Sincronización maestra total: descarga todos los datos reales de Neon y
 * actualiza todas las tablas de Dexie de forma limpia por reemplazo.
 */
export async function syncAllFromServer(): Promise<{ success: boolean; message: string; details?: any }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, message: 'Sin conexión a Internet.' };
  }

  try {
    await purgeDummyData();

    // 1. Subir a Neon los proveedores creados localmente en offline
    const pendingSupps = await db.suppliers.filter((s) => s.id.startsWith('prov-local-')).toArray();
    for (const sup of pendingSupps) {
      try {
        const res = await apiFetch<any>('/suppliers', {
          method: 'POST',
          body: JSON.stringify({
            nombre: sup.nombre,
            ruc: sup.ruc || undefined,
            telefono: sup.telefono || undefined,
            email: sup.email || undefined,
            direccion: sup.direccion || undefined,
          }),
        });
        if (res.success) {
          await db.suppliers.delete(sup.id);
        }
      } catch {}
    }

    // 2. Subir a Neon los productos creados localmente en offline
    const pendingProds = await db.products.filter((p) => p.id.startsWith('prod-local-')).toArray();
    for (const prod of pendingProds) {
      try {
        const res = await apiFetch<any>('/products', {
          method: 'POST',
          body: JSON.stringify({
            nombre: prod.nombre,
            codigoBarras: prod.codigoBarras || undefined,
            sku: prod.sku || undefined,
            descripcion: prod.descripcion || undefined,
            imagenUrl: prod.imagenUrl || undefined,
            categoriaId: prod.categoriaId,
            precioVenta: prod.precioVenta,
            costo: prod.costo,
            stock: prod.stock,
            stockMinimo: prod.stockMinimo,
            unidadMedida: prod.unidadMedida || 'Unidad',
          }),
        });
        if (res.success) {
          await db.products.delete(prod.id);
        }
      } catch {}
    }

    const [pRes, cRes, sRes, uRes, salesRes, purRes] = await Promise.all([
      apiFetch<LocalProduct[]>('/products?includeInactive=false&all=true'),
      apiFetch<LocalCategory[]>('/categories'),
      apiFetch<LocalSupplier[]>('/suppliers?includeInactive=true'),
      apiFetch<any[]>('/users'),
      apiFetch<any[]>('/sales?limit=50'),
      apiFetch<any[]>('/purchases'),
    ]);

    let prodCount = 0;
    let suppCount = 0;
    let userCount = 0;

    if (pRes.success && pRes.data) {
      await cacheCatalogLocally(pRes.data, cRes.data || [], true);
      prodCount = pRes.data.length;
    }

    if (sRes.success && sRes.data) {
      await cacheSuppliersLocally(sRes.data);
      suppCount = sRes.data.length;
    }

    if (uRes.success && uRes.data) {
      await cacheUsersLocally(uRes.data);
      userCount = uRes.data.length;
    }

    if (salesRes.success && salesRes.data) {
      await cacheSalesLocally(salesRes.data);
    }

    if (purRes.success && purRes.data) {
      await cachePurchasesLocally(purRes.data);
    }

    notifyListeners();

    return {
      success: true,
      message: `Sincronización completa con Neon: ${prodCount} productos, ${suppCount} proveedores, ${userCount} usuarios.`,
      details: { prodCount, suppCount, userCount },
    };
  } catch (err: any) {
    console.error('[SyncService] Error en syncAllFromServer:', err);
    return { success: false, message: err?.message || 'Error durante la sincronización total.' };
  }
}
