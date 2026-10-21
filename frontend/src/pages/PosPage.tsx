import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { db, type LocalOfflineSale } from '../pwa/db';
import {
  cacheCatalogLocally,
  getLocalCatalogFromDexie,
  syncPendingSales,
  onSyncChange,
} from '../services/syncService';

export interface PosProduct {
  id: string;
  codigoBarras?: string;
  sku?: string;
  nombre: string;
  imagenUrl?: string;
  categoriaId: string;
  categoriaNombre?: string;
  precioVenta: number;
  costo: number;
  stock: number;
  unidadMedida: string;
  estado: boolean;
}

export interface CartItem {
  producto: PosProduct;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

const EXCHANGE_RATE_USD_NIO = 36.62; // Tasa de cambio BCN

export const PosPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; nombre: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(!navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Cart & Checkout state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MULTIDIVISA'>('EFECTIVO');
  const [cashNIO, setCashNIO] = useState<string>('');
  const [cashUSD, setCashUSD] = useState<string>('');

  // Customer details
  const [customerName, setCustomerName] = useState<string>('Consumidor Final');
  const [customerRUC, setCustomerRUC] = useState<string>('');
  const [isEditingCustomer, setIsEditingCustomer] = useState<boolean>(false);

  // Checkout process
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // Offline queue modal
  const [pendingSalesCount, setPendingSalesCount] = useState<number>(0);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState<boolean>(false);
  const [offlineSalesList, setOfflineSalesList] = useState<LocalOfflineSale[]>([]);
  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await db.offlineSales
        .where('estado')
        .anyOf('PENDIENTE', 'SINCRONIZANDO', 'ERROR', 'REVISION')
        .count();
      setPendingSalesCount(count);

      const allOffline = await db.offlineSales.orderBy('id').reverse().toArray();
      setOfflineSalesList(allOffline);
    } catch (e) {
      console.warn('Error reading offline sales:', e);
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();
    const unsub = onSyncChange(() => {
      refreshPendingCount();
    });

    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshPendingCount]);

  // F-02: Cargar catálogo desde API y respaldar en Dexie, o cargar desde Dexie si offline
  const fetchCatalog = async () => {
    setLoading(true);
    setErrorMessage(null);

    let query = '?includeInactive=false';
    if (searchTerm) query += `&search=${encodeURIComponent(searchTerm)}`;
    if (selectedCategory && selectedCategory !== 'all') query += `&categoriaId=${encodeURIComponent(selectedCategory)}`;

    const [prodRes, catRes] = await Promise.all([
      apiFetch<PosProduct[]>(`/products${query}`),
      apiFetch<Array<{ id: string; nombre: string }>>('/categories'),
    ]);

    if (prodRes.success && prodRes.data) {
      setProducts(prodRes.data.filter((p) => p.stock > 0));
      setIsOfflineMode(false);

      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }

      // Guardar en almacenamiento local Dexie (F-02)
      cacheCatalogLocally(prodRes.data as any, (catRes.data || []) as any);
    } else if (prodRes.networkError) {
      // C-01 & F-02: Servidor sin conexión, leer del almacenamiento local Dexie
      setIsOfflineMode(true);
      const local = await getLocalCatalogFromDexie(searchTerm, selectedCategory);
      setProducts(local.products.filter((p) => p.stock > 0) as any);
      setCategories(local.categories as any);
      setLastSyncTime(local.lastSync);
    } else {
      setErrorMessage(prodRes.message || 'Error al consultar catálogo.');
    }

    setLoading(false);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchCatalog();
    }, 200);
    return () => clearTimeout(handler);
  }, [searchTerm, selectedCategory]);

  // Cart operations
  const addToCart = (product: PosProduct) => {
    setErrorMessage(null);
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.producto.id === product.id);

      if (existingIndex !== -1) {
        const currentQty = prevCart[existingIndex].cantidad;
        if (currentQty + 1 > product.stock) {
          setErrorMessage(`Existencias máximas alcanzadas (${product.stock}) para '${product.nombre}'.`);
          return prevCart;
        }

        const updatedCart = [...prevCart];
        const newQty = currentQty + 1;
        updatedCart[existingIndex] = {
          ...updatedCart[existingIndex],
          cantidad: newQty,
          subtotal: Number((newQty * product.precioVenta).toFixed(2)),
        };
        return updatedCart;
      } else {
        return [
          ...prevCart,
          {
            producto: product,
            cantidad: 1,
            precioUnitario: product.precioVenta,
            subtotal: Number(product.precioVenta.toFixed(2)),
          },
        ];
      }
    });
  };

  const updateQuantity = (productId: string, newQty: number) => {
    setErrorMessage(null);
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prevCart) => {
      return prevCart.map((item) => {
        if (item.producto.id === productId) {
          if (newQty > item.producto.stock) {
            setErrorMessage(`Stock límite alcanzado (${item.producto.stock}) para '${item.producto.nombre}'.`);
            return item;
          }
          return {
            ...item,
            cantidad: newQty,
            subtotal: Number((newQty * item.precioUnitario).toFixed(2)),
          };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.producto.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCashNIO('');
    setCashUSD('');
    setErrorMessage(null);
  };

  // F-07: Soporte para escáner USB de código de barras
  const handleBarcodeSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();
      const code = searchTerm.trim().toLowerCase();
      const matchedProduct = products.find(
        (p) =>
          (p.codigoBarras && p.codigoBarras.toLowerCase() === code) ||
          (p.sku && p.sku.toLowerCase() === code) ||
          p.nombre.toLowerCase() === code
      );

      if (matchedProduct) {
        addToCart(matchedProduct);
        setSearchTerm('');
      }
    }
  };

  // Calculations
  const totalNIO = Number(cart.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
  const totalUSD = Number((totalNIO / EXCHANGE_RATE_USD_NIO).toFixed(2));

  const paidNIOVal = parseFloat(cashNIO) || 0;
  const paidUSDVal = parseFloat(cashUSD) || 0;
  const effectivePaidInNIO = paidNIOVal + (paidUSDVal * EXCHANGE_RATE_USD_NIO);
  const changeNIO = effectivePaidInNIO > totalNIO ? Number((effectivePaidInNIO - totalNIO).toFixed(2)) : 0;

  // C-01 & C-02: Procesamiento estricto distinguiendo rechazo del servidor vs fallo de red
  const handleConfirmSale = async () => {
    if (cart.length === 0) {
      setErrorMessage('Agregue productos al carrito antes de cobrar.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const payload = {
      detalles: cart.map((i) => ({
        productoId: i.producto.id,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        subtotal: i.subtotal,
      })),
      metodoPago: paymentMethod,
      montoPagadoNIO: paidNIOVal > 0 ? paidNIOVal : totalNIO,
      montoPagadoUSD: paidUSDVal > 0 ? paidUSDVal : null,
      cambioNIO: changeNIO,
    };

    try {
      const res = await apiFetch('/sales', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success && res.data) {
        // Venta procesada en línea en el servidor exitosamente
        setCompletedSale(res.data);
        setIsReceiptModalOpen(true);
        clearCart();
        fetchCatalog();
      } else if (res.networkError) {
        // C-02 Punto 2: Fallback offline ÚNICAMENTE cuando networkError es true
        console.warn('⚡ [POS Offline] Servidor inaccesible. Guardando venta localmente en Dexie.');
        const offlineSaleId = `off-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const localReceiptNumber = `FAC-OFF-${Math.floor(1000 + Math.random() * 9000)}`;

        const offlineRecord: LocalOfflineSale = {
          offlineId: offlineSaleId,
          numeroComprobante: localReceiptNumber,
          usuarioId: user?.id || 'usr-offline',
          fecha: new Date().toISOString(),
          total: totalNIO,
          metodoPago: paymentMethod,
          montoPagadoNIO: paidNIOVal > 0 ? paidNIOVal : totalNIO,
          montoPagadoUSD: paidUSDVal > 0 ? paidUSDVal : null,
          cambioNIO: changeNIO,
          detalles: cart.map((i) => ({
            productoId: i.producto.id,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
            subtotal: i.subtotal,
          })),
          estado: 'PENDIENTE',
          synced: 0,
          createdAt: new Date().toISOString(),
        };

        await db.offlineSales.add(offlineRecord);

        // Actualizar stock local en Dexie para reducir sobreventa offline (F-02)
        for (const item of cart) {
          const localProd = await db.products.get(item.producto.id);
          if (localProd) {
            await db.products.update(item.producto.id, {
              stock: Math.max(0, localProd.stock - item.cantidad),
            });
          }
        }

        // Descontar stock visual en pantalla
        setProducts((prev) =>
          prev.map((p) => {
            const inCart = cart.find((c) => c.producto.id === p.id);
            return inCart ? { ...p, stock: Math.max(0, p.stock - inCart.cantidad) } : p;
          })
        );

        setCompletedSale({
          ...offlineRecord,
          isOffline: true,
          detalles: cart.map((c) => ({
            producto: { nombre: c.producto.nombre, sku: c.producto.sku },
            cantidad: c.cantidad,
            precioUnitario: c.precioUnitario,
            subtotal: c.subtotal,
          })),
        });

        setIsReceiptModalOpen(true);
        clearCart();
        refreshPendingCount();
      } else {
        // C-02 Punto 2: El servidor respondió con 400/409/422 (ej. Existencias insuficientes)
        // NO GUARDAR EN OFFLINE y mostrar el mensaje al cajero
        setErrorMessage(res.message || 'Error del servidor al registrar la venta.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error inesperado.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncingNow(true);
    await syncPendingSales();
    await refreshPendingCount();
    setIsSyncingNow(false);
  };

  const iva = Number((totalNIO * 0.15).toFixed(2));
  const subtotalBeforeIva = Number((totalNIO - iva).toFixed(2));

  return (
    <div className="flex flex-col w-full font-body">
      {/* PWA Offline-First Status Strip (C-01 & F-01) */}
      <div className="w-full bg-[#1c1b22] border border-[#2d2c35] px-4 py-3 rounded-2xl mb-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isOfflineMode ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                isOfflineMode ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            ></span>
          </span>
          <span className={`text-sm font-bold ${isOfflineMode ? 'text-amber-400' : 'text-emerald-400'}`}>
            {isOfflineMode ? 'Modo Offline (Sin Internet)' : 'Modo Online (Conectado)'}
          </span>
          <span className="hidden sm:inline-block text-gray-600">•</span>
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-purple-400">storage</span>
            Base local Dexie activa {lastSyncTime ? `(Sinc: ${new Date(lastSyncTime).toLocaleTimeString()})` : ''}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Cola de ventas offline */}
          <button
            onClick={() => setIsQueueModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-colors ${
              pendingSalesCount > 0
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">sync</span>
            <span>Ventas en cola: <strong>{pendingSalesCount}</strong></span>
          </button>

          <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-purple-300 font-semibold">
            Caja: {user?.nombre || 'Cajero'}
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="w-full bg-red-950/80 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl mb-4 flex items-center justify-between gap-3 text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-medium">
            <span className="material-symbols-outlined text-red-400">error</span>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-300 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Main Grid: Products + Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Catalog & Fast Entry (col-span-8) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Barcode & Search Bar */}
          <div className="bg-[#1c1b22] p-3 rounded-2xl border border-[#2d2c35] flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-md">
            <div className="relative flex-1 flex items-center bg-[#100f14] border border-[#2d2c35] rounded-xl px-4 py-2.5 focus-within:border-purple-500 transition-colors">
              <span className="material-symbols-outlined text-purple-400 mr-2 text-[22px]">barcode_scanner</span>
              <input
                autoFocus
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleBarcodeSearchKeyDown}
                placeholder="Escanear código de barras o buscar producto... [Presione Enter para agregar]"
                className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
              />
            </div>

            {/* Category filter */}
            <div className="sm:w-56">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-[#100f14] border border-[#2d2c35] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="all">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Catalog Grid */}
          <div className="bg-[#1c1b22] p-4 rounded-2xl border border-[#2d2c35] min-h-[460px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">inventory_2</span>
                Catálogo de Productos ({products.length} disponibles)
              </h2>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Cargando inventario...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <span className="material-symbols-outlined text-5xl mb-2 text-gray-600">search_off</span>
                <p className="text-sm">No se encontraron productos disponibles en el catálogo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {products.map((product) => {
                  const inCartItem = cart.find((i) => i.producto.id === product.id);
                  const remaining = product.stock - (inCartItem ? inCartItem.cantidad : 0);

                  return (
                    <div
                      key={product.id}
                      onClick={() => remaining > 0 && addToCart(product)}
                      className={`relative bg-[#100f14] border rounded-2xl p-3 flex flex-col justify-between transition-all cursor-pointer ${
                        remaining > 0
                          ? 'border-[#2d2c35] hover:border-purple-500 hover:scale-[1.01] shadow-sm'
                          : 'border-red-950/40 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div>
                        {product.imagenUrl && (
                          <div className="w-full h-24 rounded-xl overflow-hidden mb-2.5 bg-black/40">
                            <img
                              src={product.imagenUrl}
                              alt={product.nombre}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                          {product.categoriaNombre || 'General'}
                        </span>
                        <h4 className="text-xs font-semibold text-white line-clamp-2 mt-0.5" title={product.nombre}>
                          {product.nombre}
                        </h4>
                        {product.sku && (
                          <span className="text-[11px] text-gray-500 block mt-0.5">SKU: {product.sku}</span>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-gray-400 font-normal">Precio:</span>
                          <p className="text-sm font-bold text-white leading-tight">
                            C$ {product.precioVenta.toFixed(2)}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            remaining <= 5
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {remaining} disp.
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Order Cart & Checkout (col-span-4) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-[#1c1b22] p-5 rounded-2xl border border-[#2d2c35] flex flex-col gap-4 sticky top-4 shadow-xl">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400 text-2xl">shopping_cart</span>
                <h3 className="text-base font-bold text-white">Carrito de Venta</h3>
              </div>
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full font-semibold">
                {cart.reduce((s, i) => s + i.cantidad, 0)} artículos
              </span>
            </div>

            {/* Cart Items List */}
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                  <span className="material-symbols-outlined text-4xl mb-1 text-gray-600">add_shopping_cart</span>
                  <p className="text-xs">El carrito está vacío. Haga clic en los productos para agregarlos.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.producto.id}
                    className="bg-[#100f14] p-3 rounded-xl border border-[#2d2c35] flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-semibold text-white truncate" title={item.producto.nombre}>
                        {item.producto.nombre}
                      </h5>
                      <span className="text-[11px] text-gray-400">
                        C$ {item.precioUnitario.toFixed(2)} c/u
                      </span>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.producto.id, item.cantidad - 1)}
                        className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center text-xs"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-white w-6 text-center">{item.cantidad}</span>
                      <button
                        onClick={() => updateQuantity(item.producto.id, item.cantidad + 1)}
                        className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center text-xs"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right shrink-0 min-w-[65px]">
                      <span className="text-xs font-bold text-white block">C$ {item.subtotal.toFixed(2)}</span>
                      <button
                        onClick={() => removeFromCart(item.producto.id)}
                        className="text-[10px] text-red-400 hover:text-red-300"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="pt-2 border-t border-white/10">
              <label className="text-xs text-gray-400 font-semibold mb-2 block">Método de Pago:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'EFECTIVO', label: 'Efectivo C$', icon: 'payments' },
                  { id: 'MULTIDIVISA', label: 'Dólares $', icon: 'currency_exchange' },
                  { id: 'TARJETA', label: 'Tarjeta', icon: 'credit_card' },
                  { id: 'TRANSFERENCIA', label: 'Transf.', icon: 'account_balance' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      paymentMethod === m.id
                        ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                        : 'bg-[#100f14] text-gray-300 border-[#2d2c35] hover:bg-white/5'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Input & Change calculation */}
            {(paymentMethod === 'EFECTIVO' || paymentMethod === 'MULTIDIVISA') && (
              <div className="bg-[#100f14] p-3 rounded-xl border border-[#2d2c35] flex flex-col gap-2">
                {paymentMethod === 'EFECTIVO' && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-medium">Efectivo Recibido:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 font-bold">C$</span>
                      <input
                        type="number"
                        value={cashNIO}
                        onChange={(e) => setCashNIO(e.target.value)}
                        placeholder={totalNIO.toFixed(2)}
                        className="w-24 bg-[#1c1b22] text-right text-white font-bold rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'MULTIDIVISA' && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-medium">Dólares Recibidos ($):</span>
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-400 font-bold">$</span>
                      <input
                        type="number"
                        value={cashUSD}
                        onChange={(e) => setCashUSD(e.target.value)}
                        placeholder={totalUSD.toFixed(2)}
                        className="w-24 bg-[#1c1b22] text-right text-white font-bold rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-white/5">
                  <span className="text-emerald-400 font-bold">Cambio a Entregar:</span>
                  <span className="text-sm font-extrabold text-emerald-400">C$ {changeNIO.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Totals Breakdown */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal sin IVA:</span>
                <span className="text-white font-semibold">C$ {subtotalBeforeIva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>IVA Nicaragua (15%):</span>
                <span className="text-white font-semibold">C$ {iva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-white/5">
                <div>
                  <span className="text-xs font-bold text-gray-300 block uppercase">Total a Pagar</span>
                  <span className="text-[10px] text-gray-500">T.C. BCN: C$ {EXCHANGE_RATE_USD_NIO}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-purple-400 block leading-none">
                    C$ {totalNIO.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">≈ ${totalUSD.toFixed(2)} USD</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <button
              onClick={handleConfirmSale}
              disabled={submitting || cart.length === 0}
              className="w-full py-3.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-lg shadow-purple-900/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              <span>{submitting ? 'Procesando Venta...' : 'Cobrar e Imprimir Comprobante'}</span>
            </button>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="w-full py-2 text-xs text-red-400 hover:text-red-300 transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Vaciar Carrito
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL COLA OFFLINE (C-01 & F-01) */}
      {isQueueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1b22] border border-[#2d2c35] w-full max-w-2xl rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400 text-2xl">sync</span>
                <div>
                  <h3 className="text-base font-bold text-white">Cola de Sincronización Offline</h3>
                  <p className="text-xs text-gray-400">
                    Ventas almacenadas localmente en Dexie IndexedDB
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQueueModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex items-center justify-between bg-[#100f14] p-3 rounded-xl border border-[#2d2c35]">
              <span className="text-xs text-gray-300">
                Estado de conexión: <strong>{isOfflineMode ? 'Sin Conexión' : 'Conectado al Servidor'}</strong>
              </span>
              <button
                onClick={handleManualSync}
                disabled={isSyncingNow || isOfflineMode}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                <span className={`material-symbols-outlined text-sm ${isSyncingNow ? 'animate-spin' : ''}`}>
                  sync
                </span>
                {isSyncingNow ? 'Sincronizando...' : 'Sincronizar Ahora'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {offlineSalesList.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">
                  No hay ventas registradas en la cola offline.
                </div>
              ) : (
                offlineSalesList.map((sale) => (
                  <div
                    key={sale.offlineId}
                    className="bg-[#100f14] p-3 rounded-xl border border-[#2d2c35] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{sale.numeroComprobante}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sale.estado === 'SINCRONIZADO'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : sale.estado === 'SINCRONIZANDO'
                              ? 'bg-blue-500/20 text-blue-300 animate-pulse'
                              : sale.estado === 'REVISION'
                              ? 'bg-rose-500/20 text-rose-300'
                              : sale.estado === 'ERROR'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {sale.estado}
                        </span>
                      </div>
                      <span className="text-gray-500 block text-[11px] mt-0.5">
                        {new Date(sale.fecha).toLocaleString()} • {sale.detalles.length} productos • {sale.metodoPago}
                      </span>
                      {sale.error && (
                        <span className="text-rose-400 block text-[11px] mt-0.5">
                          Motivo: {sale.error}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-purple-300 text-sm block">C$ {sale.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT TICKET MODAL (F-08) */}
      {isReceiptModalOpen && completedSale && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            id="receipt-ticket-printable"
            className="bg-[#1c1b22] border border-[#2d2c35] w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-white print:bg-white print:text-black print:p-2 print:border-none"
          >
            {/* Header Ticket */}
            <div className="text-center pb-3 border-b border-dashed border-gray-700">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center overflow-hidden mb-2">
                <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
              </div>
              <h3 className="font-bold text-base">Librería Bendición de Dios</h3>
              <p className="text-xs text-gray-400">JINStock POS Nicaragua</p>
              <div className="mt-2 inline-block bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-bold">
                {completedSale.numeroComprobante}
              </div>
              {completedSale.isOffline && (
                <span className="block mt-1 text-[11px] text-amber-400 font-semibold">
                  (Emitido sin conexión - En cola local)
                </span>
              )}
            </div>

            {/* Date & Cashier info */}
            <div className="flex justify-between text-xs text-gray-400 pb-2 border-b border-dashed border-gray-700">
              <span>Cajero: {user?.nombre || 'Caja Central'}</span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>

            {/* Items Table */}
            <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
              {completedSale.detalles?.map((det: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <div className="flex-1 pr-2">
                    <span className="font-semibold block">{det.producto?.nombre || 'Artículo escolar'}</span>
                    <span className="text-gray-400 text-[11px]">
                      {det.cantidad} x C$ {det.precioUnitario?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <span className="font-bold">C$ {det.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
              ))}
            </div>

            {/* Totals Summary */}
            <div className="pt-3 border-t border-dashed border-gray-700 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Método de Pago:</span>
                <span className="font-semibold text-white">{completedSale.metodoPago}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-white/5">
                <span>TOTAL PAGADO:</span>
                <span className="text-purple-400">C$ {completedSale.total?.toFixed(2)}</span>
              </div>
              {completedSale.cambioNIO > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>SU CAMBIO:</span>
                  <span>C$ {completedSale.cambioNIO.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500 text-[11px]">
                <span>Equivalente en Dólares ($):</span>
                <span>$ {(completedSale.total / EXCHANGE_RATE_USD_NIO).toFixed(2)} USD</span>
              </div>
            </div>

            {/* Actions (Hidden when printing) */}
            <div className="pt-3 flex gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Imprimir
              </button>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="flex-1 py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
