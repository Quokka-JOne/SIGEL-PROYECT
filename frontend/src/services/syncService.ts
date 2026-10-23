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
      } else if (res.networkError || (res.status && res.status >= 500)) {
        // Fallo de red o servidor 5xx: devolver a PENDIENTE para el próximo reintento automático
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

export const DEFAULT_OFFLINE_CATEGORIES: LocalCategory[] = [
  { id: 'cat-001', nombre: 'Cuadernos y Libretas', descripcion: 'Cuadernos universitarios y libretas escolares', estado: true },
  { id: 'cat-002', nombre: 'Escritura y Corrección', descripcion: 'Lápices, lapiceros y borradores', estado: true },
  { id: 'cat-003', nombre: 'Papelería y Resmas', descripcion: 'Resmas bond y cartulinas', estado: true },
  { id: 'cat-004', nombre: 'Mochilas y Estuches', descripcion: 'Mochilas escolares y cartucheras', estado: true },
  { id: 'cat-005', nombre: 'Arte y Manualidades', descripcion: 'Pinturas acrílicas, colores y pinceles', estado: true },
];

export const DEFAULT_OFFLINE_PRODUCTS: LocalProduct[] = [
  {
    id: 'prod-001',
    nombre: 'Cuaderno Universitario Líder 200 Págs Cosido Rayado',
    codigoBarras: '7411002230012',
    sku: 'CUAD-LID-200R',
    descripcion: 'Cuaderno con pasta dura resistente, papel bond blanco de alta blancura',
    categoriaId: 'cat-001',
    categoriaNombre: 'Cuadernos y Libretas',
    precioVenta: 75.0,
    costo: 50.0,
    stock: 120,
    stockMinimo: 15,
    unidadMedida: 'Unidad',
    estado: true,
  },
  {
    id: 'prod-002',
    nombre: 'Cuaderno Universitario Líder 200 Págs Cuadriculado',
    codigoBarras: '7411002230029',
    sku: 'CUAD-LID-200C',
    descripcion: 'Cuaderno espiral cuadro grande para matemáticas y cálculo',
    categoriaId: 'cat-001',
    categoriaNombre: 'Cuadernos y Libretas',
    precioVenta: 78.0,
    costo: 52.0,
    stock: 95,
    stockMinimo: 15,
    unidadMedida: 'Unidad',
    estado: true,
  },
  {
    id: 'prod-003',
    nombre: 'Resma Papel Bond Chamex Carta 75g (500 Hojas)',
    codigoBarras: '7891048035222',
    sku: 'PAP-CHAM-75C',
    descripcion: 'Papel bond multiuso para fotocopias e impresiones de nitidez láser',
    categoriaId: 'cat-003',
    categoriaNombre: 'Papelería y Resmas',
    precioVenta: 185.0,
    costo: 140.0,
    stock: 45,
    stockMinimo: 10,
    unidadMedida: 'Resma',
    estado: true,
  },
  {
    id: 'prod-004',
    nombre: 'Caja Lapiceros Bic Cristal Azul (12 Unidades)',
    codigoBarras: '070330113884',
    sku: 'LAP-BIC-AZ12',
    descripcion: 'Punta media 1.0mm, tinta suave duradera clásica de uso escolar y oficina',
    categoriaId: 'cat-002',
    categoriaNombre: 'Escritura y Corrección',
    precioVenta: 120.0,
    costo: 85.0,
    stock: 60,
    stockMinimo: 10,
    unidadMedida: 'Caja',
    estado: true,
  },
  {
    id: 'prod-005',
    nombre: 'Caja Lápices de Color Prismacolor Junior 24 Colores',
    codigoBarras: '7501006528741',
    sku: 'COL-PRIS-24',
    descripcion: 'Minas suaves y resistentes de 4mm, colores intensos y mezclables',
    categoriaId: 'cat-005',
    categoriaNombre: 'Arte y Manualidades',
    precioVenta: 260.0,
    costo: 195.0,
    stock: 25,
    stockMinimo: 5,
    unidadMedida: 'Caja',
    estado: true,
  },
  {
    id: 'prod-006',
    nombre: 'Mochila Escolar Totto Acuarela Resistente',
    codigoBarras: '7704758362145',
    sku: 'MOC-TOT-ACU',
    descripcion: 'Compartimento para laptop 14", lona impermeable y correas ergonómicas',
    categoriaId: 'cat-004',
    categoriaNombre: 'Mochilas y Estuches',
    precioVenta: 950.0,
    costo: 720.0,
    stock: 8,
    stockMinimo: 3,
    unidadMedida: 'Unidad',
    estado: true,
  },
  {
    id: 'prod-007',
    nombre: 'Borrador de Nata Pelikan Blanco Grande WS-30',
    codigoBarras: '4012700720444',
    sku: 'BOR-PEL-WS30',
    descripcion: 'No mancha ni rompe el papel, libre de látex y residuos suaves',
    categoriaId: 'cat-002',
    categoriaNombre: 'Escritura y Corrección',
    precioVenta: 15.0,
    costo: 8.5,
    stock: 80,
    stockMinimo: 20,
    unidadMedida: 'Unidad',
    estado: true,
  },
];

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
 * Inicializar catálogo predeterminado si Dexie está vacío
 */
export async function ensureLocalCatalogInitialized(): Promise<void> {
  try {
    const prodCount = await db.products.count();
    if (prodCount === 0) {
      console.log('⚡ [SyncService] Inicializando catálogo predeterminado en Dexie para funcionamiento offline...');
      await cacheCatalogLocally(DEFAULT_OFFLINE_PRODUCTS, DEFAULT_OFFLINE_CATEGORIES);
    }
  } catch (err) {
    console.warn('[SyncService] Error verificando catálogo local Dexie:', err);
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
    let cats = await db.categories.toArray();

    // Si Dexie está vacío, auto-poblar con catálogo inicial
    if (prods.length === 0) {
      await ensureLocalCatalogInitialized();
      prods = await db.products.toArray();
      cats = await db.categories.toArray();
    }

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
      products: DEFAULT_OFFLINE_PRODUCTS,
      categories: DEFAULT_OFFLINE_CATEGORIES,
      lastSync: new Date().toISOString(),
    };
  }
}

/**
 * Refrescar catálogo en segundo plano desde el servidor
 */
export async function refreshCatalogInBackground(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    const [pRes, cRes] = await Promise.all([
      apiFetch<LocalProduct[]>('/products?includeInactive=false'),
      apiFetch<LocalCategory[]>('/categories'),
    ]);
    if (pRes.success && pRes.data && pRes.data.length > 0) {
      await cacheCatalogLocally(pRes.data, cRes.data || []);
    }
  } catch (e) {
    // Silencioso en segundo plano
  }
}

/**
 * Inicializador de listeners automáticos para sincronización online
 */
export function initSyncManager() {
  if (typeof window === 'undefined') return;

  // Garantizar catálogo base local de inmediato
  ensureLocalCatalogInitialized();

  // Escuchar cuando el navegador recupera la conexión a internet
  window.addEventListener('online', () => {
    console.log('🌐 [SyncManager] Conexión a Internet detectada. Sincronizando catálogo y ventas...');
    refreshCatalogInBackground();
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
      refreshCatalogInBackground();
      syncPendingSales();
    }, 2000);
  }
}
