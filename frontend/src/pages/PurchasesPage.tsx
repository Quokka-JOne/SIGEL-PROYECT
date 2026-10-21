import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface SupplierItem {
  id: string;
  nombre: string;
  ruc?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  estado: boolean;
}

export interface ProductItem {
  id: string;
  nombre: string;
  sku?: string;
  imagenUrl?: string;
  stock: number;
  costo: number;
  precioVenta: number;
  unidadMedida: string;
}

export interface PurchaseCartItem {
  productoId: string;
  nombre: string;
  sku?: string;
  imagenUrl?: string;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
}

export const PurchasesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMINISTRADOR';

  const [activeTab, setActiveTab] = useState<'NEW_PURCHASE' | 'PURCHASE_HISTORY' | 'SUPPLIERS'>('NEW_PURCHASE');
  
  // Data lists
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [purchasesHistory, setPurchasesHistory] = useState<any[]>([]);

  // New Purchase Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseCartItem[]>([]);
  
  // Selected product to add to purchase
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [addQty, setAddQty] = useState<number>(10);
  const [addCost, setAddCost] = useState<number>(0);

  // Form Submission
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState<boolean>(false);
  const [newSuppData, setNewSuppData] = useState({
    nombre: '',
    ruc: '',
    telefono: '',
    email: '',
    direccion: '',
  });

  const fetchData = async () => {
    const [suppRes, prodRes, purRes] = await Promise.all([
      apiFetch<SupplierItem[]>('/suppliers'),
      apiFetch<ProductItem[]>('/products?includeInactive=true'),
      apiFetch<any[]>('/purchases'),
    ]);

    if (suppRes.success && suppRes.data) {
      setSuppliers(suppRes.data);
      if (suppRes.data.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(suppRes.data[0].id);
      }
    }

    if (prodRes.success && prodRes.data) {
      setProducts(prodRes.data);
      if (prodRes.data.length > 0 && !selectedProductId) {
        setSelectedProductId(prodRes.data[0].id);
        setAddCost(prodRes.data[0].costo);
      }
    }

    if (purRes.success && purRes.data) {
      setPurchasesHistory(purRes.data);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const p = products.find((prod) => prod.id === prodId);
    if (p) {
      setAddCost(p.costo);
    }
  };

  const handleAddProductToPurchase = () => {
    setMessage(null);
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    if (addQty <= 0) {
      setMessage({ type: 'error', text: 'La cantidad a ingresar debe ser mayor a 0.' });
      return;
    }

    if (addCost < 0) {
      setMessage({ type: 'error', text: 'El costo unitario no puede ser negativo.' });
      return;
    }

    setPurchaseItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.productoId === selectedProductId);
      if (existingIdx !== -1) {
        const updated = [...prev];
        const newQty = updated[existingIdx].cantidad + addQty;
        updated[existingIdx] = {
          ...updated[existingIdx],
          cantidad: newQty,
          costoUnitario: addCost,
          subtotal: newQty * addCost,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            productoId: prod.id,
            nombre: prod.nombre,
            sku: prod.sku,
            imagenUrl: prod.imagenUrl,
            cantidad: addQty,
            costoUnitario: addCost,
            subtotal: addQty * addCost,
          },
        ];
      }
    });
  };

  const handleRemovePurchaseItem = (prodId: string) => {
    setPurchaseItems((prev) => prev.filter((item) => item.productoId !== prodId));
  };

  const grandTotalPurchase = purchaseItems.reduce((acc, item) => acc + item.subtotal, 0);

  const handleConfirmPurchase = async () => {
    setMessage(null);
    if (!selectedSupplierId) {
      setMessage({ type: 'error', text: 'Seleccione un proveedor de la lista.' });
      return;
    }

    if (purchaseItems.length === 0) {
      setMessage({ type: 'error', text: 'Agregue al menos un producto a la compra.' });
      return;
    }

    setSubmitting(true);

    const payload = {
      proveedorId: selectedSupplierId,
      numeroFactura: invoiceNumber || `FAC-COMPRA-${Date.now().toString().slice(-6)}`,
      detalles: purchaseItems.map((i) => ({
        productoId: i.productoId,
        cantidad: i.cantidad,
        costoUnitario: i.costoUnitario,
      })),
    };

    const res = await apiFetch('/purchases', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (res.success) {
      setMessage({
        type: 'success',
        text: '¡Compra registrada correctamente! El inventario ha sido actualizado con la nueva ENTRADA de stock.',
      });
      setPurchaseItems([]);
      setInvoiceNumber('');
      fetchData(); // Refresh history and catalog stock!
    } else {
      setMessage({ type: 'error', text: res.message || 'Error al procesar la compra.' });
    }
  };

  const handleCreateSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuppData.nombre.trim()) return;

    setSubmitting(true);
    const res = await apiFetch('/suppliers', {
      method: 'POST',
      body: JSON.stringify(newSuppData),
    });
    setSubmitting(false);

    if (res.success) {
      setIsSupplierModalOpen(false);
      setNewSuppData({ nombre: '', ruc: '', telefono: '', email: '', direccion: '' });
      fetchData();
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-space-xl text-center font-body-md text-on-surface">
        <span className="material-symbols-outlined text-headline-xl text-error mb-2">lock</span>
        <h2 className="text-headline-md font-bold">Acceso Restringido</h2>
        <p className="text-body-sm text-on-surface-variant mt-1">
          Solo los usuarios con rol de <strong>Administrador</strong> tienen permisos para gestionar Compras y Proveedores.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-lg w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-headline-lg text-primary">shopping_cart_checkout</span>
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
              Compras & Reabastecimiento
            </h1>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Ingreso de mercadería por factura de compra. Incrementa automáticamente existencias (ENTRADA Kardex).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="p-1 bg-surface-container-low rounded-xl flex border border-surface-container self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('NEW_PURCHASE')}
            className={`py-2 px-4 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1.5 ${
              activeTab === 'NEW_PURCHASE'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-body-lg">add_shopping_cart</span>
            Registrar Compra
          </button>

          <button
            onClick={() => setActiveTab('PURCHASE_HISTORY')}
            className={`py-2 px-4 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1.5 ${
              activeTab === 'PURCHASE_HISTORY'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-body-lg">history</span>
            Historial
          </button>

          <button
            onClick={() => setActiveTab('SUPPLIERS')}
            className={`py-2 px-4 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1.5 ${
              activeTab === 'SUPPLIERS'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-body-lg">local_shipping</span>
            Proveedores
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-body-sm flex items-center gap-3 shadow-sm ${
            message.type === 'error'
              ? 'bg-error-container border-error text-on-error-container'
              : 'bg-primary-fixed border-primary text-on-primary-fixed'
          }`}
        >
          <span className="material-symbols-outlined text-body-lg">
            {message.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="font-semibold">{message.text}</span>
        </div>
      )}

      {/* TAB 1: REGISTRAR NUEVA COMPRA (ENTRADA DE STOCK) */}
      {activeTab === 'NEW_PURCHASE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
          {/* Left / Main Panel: Purchase Setup & Products */}
          <div className="lg:col-span-2 flex flex-col gap-space-md">
            {/* Supplier & Invoice info card */}
            <div className="p-space-md bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-body-lg text-primary">badge</span>
                  Datos del Proveedor & Factura
                </h3>
                <button
                  onClick={() => setIsSupplierModalOpen(true)}
                  className="text-label-sm font-label-sm text-primary hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-body-sm">person_add</span>
                  + Nuevo Proveedor
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface">Proveedor *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container cursor-pointer"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} {s.ruc ? `(RUC: ${s.ruc})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface">Número de Factura Proveedor</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="ej. FAC-HIS-88942"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container"
                  />
                </div>
              </div>
            </div>

            {/* Add Products to Purchase Bar */}
            <div className="p-space-md bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm flex flex-col gap-space-sm">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-body-lg text-secondary">post_add</span>
                Agregar Artículos a la Compra
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-space-sm items-end">
                <div className="sm:col-span-5 flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface">Producto</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleSelectProductChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container cursor-pointer"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} (Stock actual: {p.stock})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3 flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface">Cantidad Comprada</label>
                  <input
                    type="number"
                    min="1"
                    value={addQty}
                    onChange={(e) => setAddQty(parseInt(e.target.value || '0', 10))}
                    className="w-full px-3 py-2.5 bg-surface-container-low rounded-xl font-numeric text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container"
                  />
                </div>

                <div className="sm:col-span-2 flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface">Costo Unit. C$</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addCost}
                    onChange={(e) => setAddCost(parseFloat(e.target.value || '0'))}
                    className="w-full px-3 py-2.5 bg-surface-container-low rounded-xl font-numeric text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddProductToPurchase}
                    className="w-full py-2.5 px-3 rounded-xl bg-primary text-on-primary font-label-md text-label-md shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center justify-center gap-1 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-body-md">add</span>
                    <span>Agregar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Purchase Details Items Table */}
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm overflow-hidden flex flex-col">
              <div className="p-3.5 border-b border-surface-container bg-surface-container-low font-headline-sm font-bold text-label-lg text-on-surface">
                Detalle de la Orden de Compra ({purchaseItems.length} ítems)
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/50 border-b border-surface-container font-label-sm text-label-sm text-on-surface-variant uppercase">
                      <th className="py-3 px-4">Producto</th>
                      <th className="py-3 px-4 text-center">Cantidad a Sumar</th>
                      <th className="py-3 px-4 text-right">Costo Unitario</th>
                      <th className="py-3 px-4 text-right">Subtotal</th>
                      <th className="py-3 px-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container font-body-sm text-body-sm text-on-surface">
                    {purchaseItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                          No has agregado artículos a esta compra.
                        </td>
                      </tr>
                    ) : (
                      purchaseItems.map((item) => (
                        <tr key={item.productoId} className="hover:bg-surface-container-low/30 transition-colors">
                          <td className="py-3 px-4 font-semibold">
                            {item.nombre}
                            {item.sku && <span className="block text-[10px] text-outline font-mono">SKU: {item.sku}</span>}
                          </td>
                          <td className="py-3 px-4 text-center font-numeric font-bold text-secondary">
                            +{item.cantidad} unidades
                          </td>
                          <td className="py-3 px-4 text-right font-numeric">
                            C$ {item.costoUnitario.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-numeric font-bold text-primary">
                            C$ {item.subtotal.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleRemovePurchaseItem(item.productoId)}
                              className="p-1.5 text-error hover:bg-error-container rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-body-lg">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Panel: Total Summary & Submit */}
          <div className="flex flex-col gap-space-md">
            <div className="p-space-lg bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm flex flex-col gap-space-md">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Resumen de Inversión</h3>

              <div className="flex flex-col gap-2 bg-surface-container-low p-4 rounded-xl border border-surface-container">
                <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                  <span>Ítems agregados:</span>
                  <span className="font-bold text-on-surface">{purchaseItems.length} tipos de producto</span>
                </div>
                <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                  <span>Unidades totales de entrada:</span>
                  <span className="font-bold text-secondary">
                    +{purchaseItems.reduce((acc, i) => acc + i.cantidad, 0)} unidades
                  </span>
                </div>
                <div className="flex justify-between font-numeric font-bold text-on-surface pt-2 border-t border-surface-container mt-1">
                  <span>TOTAL COMPRA (C$):</span>
                  <span className="text-body-lg text-primary">C$ {grandTotalPurchase.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleConfirmPurchase}
                disabled={submitting || purchaseItems.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-primary text-on-primary font-label-md text-label-md shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <span>Registrando Entrada...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-body-lg">inventory</span>
                    <span>Confirmar & Sumar a Inventario</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORIAL DE COMPRAS */}
      {activeTab === 'PURCHASE_HISTORY' && (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm overflow-hidden flex flex-col p-space-md gap-space-md">
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Historial de Compras de Reabastecimiento</h3>

          <div className="overflow-x-auto rounded-xl border border-surface-container">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-surface-container font-label-sm text-label-sm text-on-surface-variant uppercase">
                  <th className="py-3 px-4">No. Factura Proveedor</th>
                  <th className="py-3 px-4">Proveedor</th>
                  <th className="py-3 px-4">Fecha de Registro</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Total Invertido (C$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container font-body-sm text-body-sm text-on-surface">
                {purchasesHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                      No hay compras registradas aún.
                    </td>
                  </tr>
                ) : (
                  purchasesHistory.map((pur) => (
                    <tr key={pur.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-primary">
                        {pur.numeroFactura}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {pur.proveedorNombre || pur.proveedor?.nombre || 'Proveedor Papelera'}
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">
                        {new Date(pur.fecha).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 bg-surface-container-high text-primary rounded-full font-label-sm text-label-sm font-bold">
                          {pur.estado || 'CONFIRMADA'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-numeric font-bold">
                        C$ {pur.total?.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DIRECTORIO DE PROVEEDORES */}
      {activeTab === 'SUPPLIERS' && (
        <div className="flex flex-col gap-space-md">
          <div className="flex justify-between items-center">
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Directorio de Proveedores de Papelería</h3>
            <button
              onClick={() => setIsSupplierModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm shadow-sm hover:bg-primary-container transition-colors flex items-center gap-1.5 active:scale-95"
            >
              <span className="material-symbols-outlined text-body-md">person_add</span>
              <span>+ Registrar Proveedor</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            {suppliers.map((s) => (
              <div key={s.id} className="p-space-md bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm flex flex-col gap-space-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high text-primary flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-body-lg">local_shipping</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="font-label-lg text-label-lg font-bold text-on-surface truncate">{s.nombre}</h4>
                    {s.ruc && <span className="font-mono text-label-sm text-on-surface-variant truncate">RUC: {s.ruc}</span>}
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-body-sm font-body-sm text-on-surface-variant pt-2 border-t border-surface-container">
                  {s.telefono && <p className="flex items-center gap-1"><span className="material-symbols-outlined text-body-sm">call</span> {s.telefono}</p>}
                  {s.email && <p className="flex items-center gap-1"><span className="material-symbols-outlined text-body-sm">mail</span> {s.email}</p>}
                  {s.direccion && <p className="flex items-center gap-1"><span className="material-symbols-outlined text-body-sm">location_on</span> {s.direccion}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REGISTER SUPPLIER MODAL */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl shadow-lg border border-surface-container overflow-hidden p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Registrar Proveedor</h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-body-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSupplierSubmit} className="flex flex-col gap-space-sm">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface">Nombre o Razón Social *</label>
                <input
                  type="text"
                  required
                  value={newSuppData.nombre}
                  onChange={(e) => setNewSuppData({ ...newSuppData, nombre: e.target.value })}
                  placeholder="ej. Distribuidora Papelera"
                  className="w-full px-3.5 py-2 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface">RUC / Cédula Fiscal</label>
                <input
                  type="text"
                  value={newSuppData.ruc}
                  onChange={(e) => setNewSuppData({ ...newSuppData, ruc: e.target.value })}
                  placeholder="ej. J0310000123456"
                  className="w-full px-3.5 py-2 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container"
                />
              </div>

              <div className="grid grid-cols-2 gap-space-sm">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface">Teléfono</label>
                  <input
                    type="text"
                    value={newSuppData.telefono}
                    onChange={(e) => setNewSuppData({ ...newSuppData, telefono: e.target.value })}
                    placeholder="+505 2278-1234"
                    className="w-full px-3.5 py-2 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface">Correo Electrónico</label>
                  <input
                    type="email"
                    value={newSuppData.email}
                    onChange={(e) => setNewSuppData({ ...newSuppData, email: e.target.value })}
                    placeholder="ventas@hispamer.ni"
                    className="w-full px-3.5 py-2 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface">Dirección</label>
                <input
                  type="text"
                  value={newSuppData.direccion}
                  onChange={(e) => setNewSuppData({ ...newSuppData, direccion: e.target.value })}
                  placeholder="Managua, Rotonda Rubén Darío"
                  className="w-full px-3.5 py-2 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-label-md text-label-md text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-colors active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
