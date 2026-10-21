import { db, type LocalProduct, type LocalCategory, type LocalOfflineSale } from '../pwa/db';
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
    // Buscar ventas en cola pendientes o que tuvieron error recuperable
    const pendingSales = await db.offlineSales
      .where('estado')
      .anyOf('PENDIENTE', 'ERROR')
      .toArray();

    for (const sale of pendingSales) {
      processed++;
      // 1. Marcar como SINCRONIZANDO
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
      };

      const res = await apiFetch('/sales', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        // Venta registrada exitosamente o ya existía (idempotencia)
        await db.offlineSales.update(sale.id!, {
          estado: 'SINCRONIZADO',
          synced: 1,
          numeroComprobante: res.data?.numeroComprobante || sale.numeroComprobante,
          error: null,
          updatedAt: new Date().toISOString(),
        });
        successCount++;
      } else if (res.networkError) {
        // Fallo de red: devolver a PENDIENTE para el próximo reintento
        await db.offlineSales.update(sale.id!, {
          estado: 'PENDIENTE',
          updatedAt: new Date().toISOString(),
        });
        errorsCount++;
      } else if (res.code === 'STOCK_INSUFICIENTE') {
        // Conflicto de inventario (Fase 1): marcar en REVISION para intervención del cajero
        await db.offlineSales.update(sale.id!, {
          estado: 'REVISION',
          error: res.message || 'Existencias insuficientes al sincronizar con el servidor.',
          updatedAt: new Date().toISOString(),
        });
        errorsCount++;
      } else {
        // Error de validación u otro error de servidor
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

/**
 * F-02: Guardar catálogo en caché local Dexie
 */
export async function cacheCatalogLocally(products: LocalProduct[], categories: LocalCategory[]): Promise<void> {
  try {
    if (categories && categories.length > 0) {
      await db.categories.bulkPut(categories);
    }
    if (products && products.length > 0) {
      await db.products.bulkPut(products);
    }
    await db.metadata.put({
      key: 'lastCatalogSync',
      value: new Date().toISOString(),
    });
    console.log(`[SyncService] Catálogo sincronizado en Dexie: ${products.length} productos, ${categories.length} categorías.`);
  } catch (err) {
    console.warn('[SyncService] Error al guardar catálogo en Dexie:', err);
  }
}

/**
 * F-02: Obtener catálogo desde caché local Dexie cuando no hay red
 */
export async function getLocalCatalogFromDexie(query?: string, categoryId?: string): Promise<{
  products: LocalProduct[];
  categories: LocalCategory[];
  lastSync: string | null;
}> {
  try {
    let prods = await db.products.toArray();
    const cats = await db.categories.toArray();
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
    return { products: [], categories: [], lastSync: null };
  }
}

/**
 * Inicializador de listeners automáticos para sincronización online
 */
export function initSyncManager() {
  if (typeof window === 'undefined') return;

  // Escuchar cuando el navegador recupera la conexión a internet
  window.addEventListener('online', () => {
    console.log('🌐 [SyncManager] Conexión a Internet detectada. Iniciando sincronización de ventas...');
    syncPendingSales();
  });

  // Disparar sincronización periódica cada 20 segundos si hay pendientes
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
      syncPendingSales();
    }, 2000);
  }
}
