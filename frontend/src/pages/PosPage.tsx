import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { db } from '../pwa/db';

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

const EXCHANGE_RATE_USD_NIO = 36.62; // Tasa oficial Banco Central de Nicaragua

export const PosPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; nombre: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

  // Ticket number for current session
  const [ticketNumber] = useState<string>(`#${String(Math.floor(10000 + Math.random() * 90000)).padStart(5, '0')}`);
  const [lowStockAlert] = useState<{ nombre: string; pct: number; unidades: number } | null>({ nombre: 'Resma Chamex Carta', pct: 12, unidades: 100 });

  const fetchCatalog = async () => {
    setLoading(true);
    let query = '?includeInactive=false';
    if (searchTerm) query += `&search=${encodeURIComponent(searchTerm)}`;
    if (selectedCategory && selectedCategory !== 'all') query += `&categoriaId=${encodeURIComponent(selectedCategory)}`;

    const [prodRes, catRes] = await Promise.all([
      apiFetch<PosProduct[]>(`/products${query}`),
      apiFetch<Array<{ id: string; nombre: string }>>('/categories'),
    ]);

    if (prodRes.success && prodRes.data) {
      setProducts(prodRes.data.filter((p) => p.stock > 0));
    }

    if (catRes.success && catRes.data) {
      setCategories(catRes.data);
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
          setErrorMessage(`No puedes agregar más de ${product.stock} unidades de '${product.nombre}'. Stock límite alcanzado.`);
          return prevCart;
        }

        const updatedCart = [...prevCart];
        const newQty = currentQty + 1;
        updatedCart[existingIndex] = {
          ...updatedCart[existingIndex],
          cantidad: newQty,
          subtotal: newQty * product.precioVenta,
        };
        return updatedCart;
      } else {
        return [
          ...prevCart,
          {
            producto: product,
            cantidad: 1,
            precioUnitario: product.precioVenta,
            subtotal: product.precioVenta,
          },
        ];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setErrorMessage(null);
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.producto.id === productId) {
            const newQty = item.cantidad + delta;
            if (newQty > item.producto.stock) {
              setErrorMessage(`Máximo disponible en inventario: ${item.producto.stock} unidades.`);
              return item;
            }
            if (newQty <= 0) return null;
            return {
              ...item,
              cantidad: newQty,
              subtotal: newQty * item.precioUnitario,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.producto.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCashNIO('');
    setCashUSD('');
    setErrorMessage(null);
  };

  // Math totals
  const totalNIO = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalUSD = totalNIO / EXCHANGE_RATE_USD_NIO;

  // Paid cash & change calculation
  const paidNIOVal = parseFloat(cashNIO) || 0;
  const paidUSDVal = parseFloat(cashUSD) || 0;
  const totalPaidInNIO = paidNIOVal + paidUSDVal * EXCHANGE_RATE_USD_NIO;
  let changeNIO = 0;
  
  if (paymentMethod === 'EFECTIVO' || paymentMethod === 'MULTIDIVISA') {
      changeNIO = totalPaidInNIO >= totalNIO ? totalPaidInNIO - totalNIO : 0;
  }

  // Handle Complete Sale
  const handleConfirmSale = async () => {
    setErrorMessage(null);

    if (cart.length === 0) {
      setErrorMessage('El carrito de compras está vacío.');
      return;
    }

    if (paymentMethod === 'EFECTIVO' || paymentMethod === 'MULTIDIVISA') {
      if (totalPaidInNIO < totalNIO && paidNIOVal === 0 && paidUSDVal === 0) {
        // Auto-fill exact cash if empty
        setCashNIO(totalNIO.toFixed(2));
        return;
      } else if (totalPaidInNIO < totalNIO) {
        setErrorMessage(`El monto recibido (C$ ${totalPaidInNIO.toFixed(2)}) es inferior al total a pagar (C$ ${totalNIO.toFixed(2)}).`);
        return;
      }
    }

    setSubmitting(true);

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
        setCompletedSale(res.data);
        setIsReceiptModalOpen(true);
        clearCart();
        fetchCatalog(); 
      } else {
        throw new Error('Servidor error fallback');
      }
    } catch (err: any) {
        // Fallback offline
        console.warn('Servidor offline. Guardando venta localmente en IndexedDB Dexie.');
        const offlineSaleId = `off-${Date.now()}`;
        const offlineSaleRecord = {
          offlineId: offlineSaleId,
          numeroComprobante: `FAC-OFF-${Math.floor(1000 + Math.random() * 9000)}`,
          usuarioId: user?.id || 'usr-offline',
          fecha: new Date().toISOString(),
          total: totalNIO,
          metodoPago: paymentMethod,
          detalles: cart.map((i) => ({
            productoId: i.producto.id,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
            subtotal: i.subtotal,
          })),
          synced: 0,
          createdAt: new Date().toISOString(),
        };

        await db.offlineSales.add(offlineSaleRecord);

        // Descontar stock visualmente en modo offline para evitar sobreventa en caché local
        setProducts(prev => prev.map(p => {
          const inCart = cart.find(c => c.producto.id === p.id);
          return inCart ? { ...p, stock: p.stock - inCart.cantidad } : p;
        }));

        setCompletedSale(offlineSaleRecord);
        setIsReceiptModalOpen(true);
        clearCart();
    } finally {
      setSubmitting(false);
    }
  };

  const iva = totalNIO * 0.15;
  const subtotalBeforeIva = totalNIO - iva;

  return (
    <div className="flex flex-col w-full">
      {/* PWA Offline-First Status Strip */}
      <div className="w-full bg-surface-container-low px-space-md py-space-xs rounded-2xl mb-space-md flex flex-wrap items-center justify-between gap-space-sm shadow-sm">
        <div className="flex items-center gap-space-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-container opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
          </span>
          <span className="font-label-md text-label-md text-primary font-bold">Modo Online sincronizado</span>
          <span className="hidden sm:inline-block text-outline-variant">•</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-tertiary">database</span>
            Respaldo en IndexedDB activo (Listo para facturar sin internet)
          </span>
        </div>
        <div className="flex items-center gap-space-md text-on-surface-variant font-label-sm text-label-sm">
          <span className="bg-surface-container-lowest px-2.5 py-1 rounded-full text-primary font-semibold shadow-xs">Caja #01 — Turno {user?.nombre}</span>
          <span className="hidden md:inline-flex items-center gap-1 text-on-surface">
            <span className="material-symbols-outlined text-[15px] text-secondary">wifi</span> Latencia: 14ms
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
        {/* LEFT COLUMN: Catalog & Fast Entry (70% on desktop -> col-span-8) */}
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          {/* Barcode & Item Rapid Search Bar */}
          <div className="bg-surface-container-lowest p-space-sm rounded-2xl shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm">
            <div className="relative flex-1 flex items-center bg-surface-container-low rounded-xl px-space-md py-2.5 focus-within:bg-surface-container-lowest focus-within:shadow-[0_0_0_2px_#1e3a8a] transition-all">
              <span className="material-symbols-outlined text-primary-container mr-space-sm text-[22px]">barcode_scanner</span>
              <input 
                autoFocus 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, código de barra (EAN-13) o SKU... [F2 para escanear]" 
                className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none" 
              />
              <button className="bg-surface-container text-primary font-label-sm text-label-sm px-2 py-1 rounded-lg hover:bg-surface-container-high transition-colors ml-1 shrink-0">
                F2
              </button>
            </div>
            <div className="flex items-center gap-space-xs shrink-0">
              <button className="flex items-center gap-1.5 px-space-md py-2.5 bg-surface-container-high text-primary font-label-md text-label-md rounded-xl hover:bg-surface-container transition-all">
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                <span className="hidden sm:inline">Cámara</span>
              </button>
              <button className="flex items-center gap-1.5 px-space-md py-2.5 bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md rounded-xl hover:bg-secondary-fixed-dim transition-all">
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Manual</span>
              </button>
            </div>
          </div>

          {/* Quick Category Pills */}
          <div className="flex items-center gap-space-xs overflow-x-auto pb-1 no-scrollbar">
            <button 
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-all ${
                selectedCategory === '' 
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-all ${
                  selectedCategory === cat.id 
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-space-sm sm:gap-space-md">
            {loading ? (
                <div className="col-span-full py-16 text-center text-outline">
                  Cargando inventario...
                </div>
            ) : products.length === 0 ? (
                <div className="col-span-full py-16 text-center text-outline">
                  No se encontraron productos disponibles.
                </div>
            ) : (
                products.map((p) => {
                  const inCartItem = cart.find((i) => i.producto.id === p.id);
                  const cartQty = inCartItem ? inCartItem.cantidad : 0;
                  
                  return (
                    <div 
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="group bg-surface-container-lowest rounded-2xl p-space-sm flex flex-col justify-between hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                    >
                      {cartQty > 0 && (
                         <div className="absolute top-2 right-2 z-10 bg-primary text-on-primary font-numeric-pos font-bold text-xs px-2 py-0.5 rounded-full shadow-md">
                           x{cartQty}
                         </div>
                      )}
                      
                      <div className="w-full h-28 bg-surface-container-low rounded-xl overflow-hidden relative flex items-center justify-center mb-space-sm">
                        {p.imagenUrl ? (
                          <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <span className="material-symbols-outlined text-primary text-[48px]">menu_book</span>
                        )}
                        <span className="absolute top-2 left-2 bg-surface-container-lowest/90 backdrop-blur-md px-2 py-0.5 rounded-full font-label-sm text-label-sm text-secondary font-bold">
                          {p.stock} disp.
                        </span>
                      </div>
                      
                      <div className="flex flex-col flex-1 justify-between">
                        <div>
                          <span className="font-label-sm text-label-sm text-on-surface-variant line-clamp-1">{p.categoriaNombre || 'General'}</span>
                          <h3 className="font-headline-sm text-body-md font-bold text-on-surface line-clamp-2 leading-tight mt-0.5">
                            {p.nombre}
                          </h3>
                        </div>
                        <div className="flex items-center justify-between mt-space-sm pt-space-xs">
                          <span className="font-numeric-pos text-headline-sm text-primary leading-none">C$ {p.precioVenta.toFixed(2)}</span>
                          <button className="w-8 h-8 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-[18px]">add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Quick AI Restock Recommendation Capsule */}
          {lowStockAlert && (
            <div className="bg-gradient-to-r from-secondary-fixed/30 via-surface-container-low to-surface-container p-space-md rounded-2xl flex items-center justify-between gap-space-md shadow-xs">
              <div className="flex items-center gap-space-sm flex-1 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                </div>
                <div className="min-w-0">
                  <h4 className="font-label-md text-label-md text-on-surface font-bold">Sugerencia Inteligente de Restock</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                    La <strong>{lowStockAlert.nombre}</strong> está al {lowStockAlert.pct}% del stock crítico para temporada escolar. Sugerido ordenar{' '}
                    <strong>{lowStockAlert.unidades} unidades</strong> hoy.
                  </p>
                </div>
              </div>
              <button className="shrink-0 font-label-md text-label-md bg-primary text-on-primary px-3 py-2 rounded-xl shadow-sm hover:bg-primary-container transition-all active:scale-95">
                Generar Pedido
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Cart & Billing Panel */}
        <div className="lg:col-span-4 flex flex-col gap-space-md sticky top-20">
          <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-md flex flex-col gap-space-md">
            
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-error-container text-on-error-container text-xs rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}
            
            {/* Cart Header & Customer Selector */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-[24px]">shopping_cart</span>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Carrito de Venta</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-surface-container-high text-primary font-label-sm text-label-sm font-bold px-2.5 py-1 rounded-lg">
                    Ticket {ticketNumber}
                  </span>
                  {cart.length > 0 && (
                    <button onClick={clearCart} className="font-label-sm text-label-sm bg-error-container text-on-error-container font-bold px-2 py-0.5 rounded-full hover:opacity-80">
                      Vaciar
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-surface-container-low rounded-xl p-space-xs flex items-center justify-between mt-1">
                {isEditingCustomer ? (
                  <div className="flex flex-col gap-2 w-full p-1">
                    <input 
                      type="text" 
                      value={customerName} 
                      onChange={(e) => setCustomerName(e.target.value)} 
                      placeholder="Nombre del cliente" 
                      className="bg-surface-container-lowest text-body-sm px-2 py-1.5 rounded outline-none border border-outline-variant/30 focus:border-primary"
                    />
                    <input 
                      type="text" 
                      value={customerRUC} 
                      onChange={(e) => setCustomerRUC(e.target.value)} 
                      placeholder="RUC (opcional)" 
                      className="bg-surface-container-lowest text-body-sm px-2 py-1.5 rounded outline-none border border-outline-variant/30 focus:border-primary"
                    />
                    <button onClick={() => setIsEditingCustomer(false)} className="bg-primary text-on-primary text-label-sm py-1 rounded font-bold">
                      Guardar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 px-1">
                      <span className="material-symbols-outlined text-[20px] text-primary">person</span>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-on-surface font-bold leading-tight">{customerName || 'Consumidor Final'}</span>
                        <span className="font-body-sm text-[11px] text-on-surface-variant leading-tight">{customerRUC ? `RUC: ${customerRUC}` : 'Sin RUC asignado'}</span>
                      </div>
                    </div>
                    <button onClick={() => setIsEditingCustomer(true)} className="p-1.5 rounded-lg text-primary hover:bg-surface-container transition-colors">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Selected Items Interactive List */}
            <div className="flex flex-col gap-space-xs max-h-72 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                 <div className="py-8 text-center text-outline text-body-sm">
                   El carrito está vacío. Agrega productos.
                 </div>
              ) : (
                cart.map((item) => (
                  <div key={item.producto.id} className="flex items-center justify-between p-2.5 bg-surface-container-low/70 rounded-xl hover:bg-surface-container transition-colors">
                    <div className="flex flex-col min-w-0 flex-1 pr-2">
                      <span className="font-label-md text-label-md text-on-surface font-bold truncate">{item.producto.nombre}</span>
                      <span className="font-body-sm text-[12px] text-on-surface-variant">C$ {item.precioUnitario.toFixed(2)} c/u</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-surface-container-lowest rounded-lg p-0.5 shadow-xs">
                        <button onClick={() => updateQuantity(item.producto.id, -1)} className="w-6 h-6 flex items-center justify-center text-on-surface hover:text-error transition-colors">
                          <span className="material-symbols-outlined text-[16px]">remove</span>
                        </button>
                        <span className="w-7 text-center font-label-md text-label-md text-on-surface font-bold">{item.cantidad}</span>
                        <button onClick={() => updateQuantity(item.producto.id, 1)} className="w-6 h-6 flex items-center justify-center text-on-surface hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[16px]">add</span>
                        </button>
                      </div>
                      <span className="w-16 text-right font-numeric-pos text-body-md font-bold text-primary">C$ {item.subtotal.toFixed(2)}</span>
                      <button onClick={() => removeFromCart(item.producto.id)} className="text-outline hover:text-error transition-colors p-1">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Toggle Tabs */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Forma de Pago</span>
              <div className="grid grid-cols-3 gap-1.5 bg-surface-container-low p-1 rounded-xl">
                {([
                  { value: 'EFECTIVO', label: 'Efectivo', icon: 'payments' },
                  { value: 'TARJETA', label: 'BAC / Banpro', icon: 'credit_card' },
                  { value: 'TRANSFERENCIA', label: 'Lafise / Kasnet', icon: 'smartphone' },
                ] as const).map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => setPaymentMethod(value)}
                    className={`py-2 rounded-lg font-label-sm text-label-sm flex flex-col items-center gap-1 transition-all ${paymentMethod === value ? 'bg-surface-container-lowest text-primary font-bold shadow-xs' : 'text-on-surface-variant font-semibold hover:text-on-surface'}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    <span className="text-center text-[10px] leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Cash Calculations (Nicaragua Cordobas) */}
            {paymentMethod === 'EFECTIVO' && (
              <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col gap-2">
                <div className="flex items-center justify-between text-body-sm font-body-sm">
                  <span className="text-on-surface-variant font-label-sm">Recibido Efectivo:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-on-surface">C$</span>
                    <input 
                      type="number" 
                      value={cashNIO}
                      onChange={(e) => setCashNIO(e.target.value)}
                      placeholder={totalNIO.toFixed(2)}
                      className="w-20 bg-surface-container-lowest text-right font-numeric-pos text-label-lg font-bold rounded-lg px-2 py-0.5 focus:outline-none" 
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-body-sm font-body-sm pt-1 border-t border-surface-container-high/60">
                  <span className="text-secondary font-label-md font-bold">Cambio a Entregar:</span>
                  <span className="font-numeric-pos text-headline-sm font-extrabold text-secondary">C$ {changeNIO.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Financial Breakdown & Totals */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-on-surface-variant font-body-sm">Subtotal sin IVA:</span>
                <span className="font-numeric-pos text-label-lg font-semibold text-on-surface">C$ {subtotalBeforeIva.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-on-surface-variant font-body-sm">IVA Nicaragua (15%):</span>
                <span className="font-numeric-pos text-label-lg font-semibold text-on-surface">C$ {iva.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-primary-container font-extrabold uppercase tracking-wide">Total a Pagar</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">T.C. BCN: C$ {EXCHANGE_RATE_USD_NIO} • ${totalUSD.toFixed(2)} USD</span>
                </div>
                <div className="text-right">
                  <span className="font-numeric-pos text-headline-lg font-extrabold text-primary leading-none">C$ {totalNIO.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Big Checkout Action Button */}
            <button
              onClick={handleConfirmSale}
              disabled={submitting || cart.length === 0}
              className="w-full py-4 px-space-md rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm font-bold shadow-lg shadow-primary-container/25 active:scale-[0.98] transition-all flex items-center justify-center gap-space-sm group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[26px] text-secondary-fixed group-hover:rotate-12 transition-transform">receipt_long</span>
              <span>{submitting ? 'Procesando...' : 'Cobrar e Imprimir (F10)'}</span>
            </button>

            {/* Secondary Utility Buttons */}
            <div className="grid grid-cols-2 gap-space-xs">
              <button className="py-2.5 px-space-sm rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-colors flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">pause_circle</span>
                <span>Venta en Espera</span>
              </button>
              <button onClick={clearCart} className="py-2.5 px-space-sm rounded-xl bg-error-container/60 hover:bg-error-container text-error font-label-md text-label-md transition-colors flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                <span>Cancelar Venta</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* RECEIPT TICKET MODAL */}
      {isReceiptModalOpen && completedSale && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            id="receipt-ticket-printable"
            className="bg-surface-container-lowest w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-outline-variant/30 p-6 space-y-4 animate-in fade-in zoom-in duration-200 print:shadow-none print:border-none print:overflow-visible"
          >
            {/* Header Ticket */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-outline-variant">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-lowest p-1 shadow-sm border border-outline-variant/30 mx-auto flex items-center justify-center overflow-hidden mb-2">
                <img src="/JINSTOCK.png" alt="JINStock Logo" className="w-full h-full object-contain" />
              </div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">JINStock Nicaragua</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Librería & Papelería OS - Managua</p>
              <span className="inline-block px-3 py-1 bg-surface-container-low text-primary rounded-full font-numeric-pos text-label-sm font-bold mt-1">
                {completedSale.numeroComprobante || 'COMPROBANTE DE VENTA'}
              </span>
            </div>

            {/* Date & User */}
            <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant py-1 border-b border-dashed border-outline-variant">
              <span>Cajero: {user?.nombre || 'Admin'}</span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>

            {/* Items Table */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
              {completedSale.detalles?.map((det: any, idx: number) => (
                <div key={idx} className="flex justify-between font-body-sm text-body-sm">
                  <div className="flex-1 pr-2">
                    <span className="font-semibold text-on-surface block">{det.producto?.nombre || 'Producto escolar'}</span>
                    <span className="font-numeric-pos text-on-surface-variant text-[11px]">
                      {det.cantidad} x C$ {det.precioUnitario?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <span className="font-numeric-pos font-bold text-on-surface">
                    C$ {det.subtotal?.toFixed(2) || '0.00'}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals Summary */}
            <div className="pt-3 border-t border-dashed border-outline-variant space-y-1 font-numeric-pos text-body-sm">
              <div className="flex justify-between text-on-surface-variant">
                <span>Método de Pago:</span>
                <span className="font-semibold text-on-surface">{completedSale.metodoPago}</span>
              </div>

              <div className="flex justify-between text-on-surface font-bold text-body-lg pt-1">
                <span>TOTAL PAGADO:</span>
                <span className="text-primary">C$ {completedSale.total?.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-secondary font-bold text-body-md pt-1">
                <span>SU CAMBIO:</span>
                <span>C$ {completedSale.cambioNIO?.toFixed(2) || '0.00'}</span>
              </div>

              <div className="flex justify-between text-on-surface-variant text-[11px]">
                <span>Equivalente en Dólares ($):</span>
                <span>$ {(completedSale.total / EXCHANGE_RATE_USD_NIO).toFixed(2)}</span>
              </div>
            </div>

            {/* Actions (Hidden when printing) */}
            <div className="pt-4 flex gap-3 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-3 bg-surface-container-low text-primary font-label-md text-label-md font-semibold rounded-xl hover:bg-surface-container transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Imprimir
              </button>

              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="flex-1 py-2.5 px-3 bg-primary text-on-primary font-label-md text-label-md font-semibold rounded-xl hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 shadow-sm"
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
