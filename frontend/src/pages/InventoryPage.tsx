import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface ProductItem {
  id: string;
  codigoBarras?: string;
  sku?: string;
  nombre: string;
  descripcion?: string;
  imagenUrl?: string;
  categoriaId: string;
  categoriaNombre?: string;
  precioVenta: number;
  costo: number;
  stock: number;
  stockMinimo: number;
  unidadMedida: string;
  estado: boolean;
}

export interface CategoryItem {
  id: string;
  nombre: string;
  descripcion?: string;
}

export const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMINISTRADOR';

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    nombre: '',
    codigoBarras: '',
    sku: '',
    descripcion: '',
    imagenUrl: '',
    categoriaId: '',
    precioVenta: '',
    costo: '',
    stock: '',
    stockMinimo: '5',
    unidadMedida: 'Unidad',
  });

  const fetchCategories = async () => {
    const res = await apiFetch<CategoryItem[]>('/categories');
    if (res.success && res.data && res.data.length > 0) {
      setCategories(res.data);
      if (!formData.categoriaId) {
        setFormData((prev) => ({ ...prev, categoriaId: res.data![0].id }));
      }
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    let query = '?includeInactive=true';
    if (searchTerm) query += `&search=${encodeURIComponent(searchTerm)}`;
    if (selectedCategory && selectedCategory !== 'all') query += `&categoriaId=${encodeURIComponent(selectedCategory)}`;
    if (statusFilter === 'low') query += `&lowStock=true`;
    if (statusFilter === 'out') query += `&outOfStock=true`;

    const res = await apiFetch<ProductItem[]>(`/products${query}`);
    if (res.success && res.data) {
      setProducts(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm, selectedCategory, statusFilter]);

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormError(null);
    setFormSuccess(null);
    setFormData({
      nombre: '',
      codigoBarras: '',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      descripcion: '',
      imagenUrl: '',
      categoriaId: categories.length > 0 ? categories[0].id : '',
      precioVenta: '',
      costo: '',
      stock: '10',
      stockMinimo: '5',
      unidadMedida: 'Unidad',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod: ProductItem) => {
    setEditingProduct(prod);
    setFormError(null);
    setFormSuccess(null);
    setFormData({
      nombre: prod.nombre,
      codigoBarras: prod.codigoBarras || '',
      sku: prod.sku || '',
      descripcion: prod.descripcion || '',
      imagenUrl: prod.imagenUrl || '',
      categoriaId: prod.categoriaId,
      precioVenta: String(prod.precioVenta),
      costo: String(prod.costo),
      stock: String(prod.stock),
      stockMinimo: String(prod.stockMinimo),
      unidadMedida: prod.unidadMedida || 'Unidad',
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (prod: ProductItem) => {
    if (!isAdmin) return;
    const res = await apiFetch(`/products/${prod.id}/status`, { method: 'PATCH' });
    if (res.success) {
      fetchProducts();
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormLoading(true);

    const price = parseFloat(formData.precioVenta);
    const cost = parseFloat(formData.costo);
    const stock = parseInt(formData.stock || '0', 10);
    const minStock = parseInt(formData.stockMinimo || '5', 10);

    const payload = {
      nombre: formData.nombre,
      codigoBarras: formData.codigoBarras || null,
      sku: formData.sku || null,
      descripcion: formData.descripcion || null,
      imagenUrl: formData.imagenUrl || null,
      categoriaId: formData.categoriaId || (categories.length > 0 ? categories[0].id : ''),
      precioVenta: price,
      costo: cost,
      stock,
      stockMinimo: minStock,
      unidadMedida: formData.unidadMedida,
    };

    try {
      let res;
      if (editingProduct) {
        res = await apiFetch(`/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch('/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.success) {
        setFormSuccess(editingProduct ? 'Producto actualizado' : 'Producto creado');
        setTimeout(() => {
          setIsModalOpen(false);
          fetchProducts();
        }, 600);
      } else {
        setFormError(res.message || 'Error al guardar.');
      }
    } catch (err: any) {
      setFormError('Error de conexión.');
    } finally {
      setFormLoading(false);
    }
  };

  // KPI Calculations
  const totalProductsCount = products.length;
  const totalUnitsInStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const lowStockAlertCount = products.filter((p) => p.stock <= p.stockMinimo && p.stock > 0).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const totalInventoryValueNIO = products.reduce((acc, p) => acc + (p.stock * p.costo), 0);

  return (
    <div className="flex flex-col w-full">
      {/* Top Header & Actions */}
      <section className="w-full flex flex-col gap-space-lg mb-space-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm uppercase tracking-wider">
                Bodega • Almacén Central
              </span>
              <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                Sync Local IndexedDB: Al Día
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
              Control y Kardex de Inventario
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Supervisión en tiempo real de existencias, cálculo de costo promedio y rotación.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-space-sm">
            {isAdmin && (
              <button 
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 px-space-lg py-2.5 rounded-xl bg-primary-container text-surface-container-lowest hover:opacity-95 shadow-md active:scale-95 transition-all font-label-lg text-label-lg font-bold"
              >
                <span className="material-symbols-outlined text-body-lg">add_box</span>
                <span>Nuevo Producto / Entrada</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          <div className="relative overflow-hidden bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col justify-between">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-surface-container-high/60 pointer-events-none"></div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface-variant">Valor Total en Almacén</span>
                <span className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight mt-1">
                  C$ {totalInventoryValueNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary shadow-sm">
                <span className="material-symbols-outlined text-headline-sm">account_balance_wallet</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 pt-2">
              <span className="font-body-sm text-body-sm text-on-surface-variant">{totalUnitsInStock} unidades en existencia</span>
            </div>
          </div>

          <div className="relative overflow-hidden bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col justify-between">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-secondary-fixed/40 pointer-events-none"></div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface-variant">Productos en Catálogo</span>
                <span className="font-headline-xl text-headline-xl text-on-secondary-container font-bold tracking-tight mt-1">
                  {totalProductsCount} <span className="font-body-lg text-body-lg font-normal text-on-surface-variant">items</span>
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-container shadow-sm">
                <span className="material-symbols-outlined text-headline-sm">category</span>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col justify-between">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-error-container/30 pointer-events-none"></div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface-variant">Alertas de Stock</span>
                <span className="font-headline-sm text-headline-sm text-error font-bold mt-1">
                  {lowStockAlertCount} bajo stock, {outOfStockCount} agotados
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-error-container flex items-center justify-center text-on-error-container shadow-sm">
                <span className="material-symbols-outlined text-headline-sm">warning</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Ribbon */}
      <section className="w-full mb-space-lg">
        <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0">
            <button 
              onClick={() => setStatusFilter('all')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full font-label-md text-label-md transition-all ${statusFilter === 'all' ? 'bg-primary-container text-surface-container-lowest' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
            >
              <span>Todos</span>
            </button>
            <button 
              onClick={() => setStatusFilter('low')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full font-label-md text-label-md transition-all ${statusFilter === 'low' ? 'bg-primary-container text-surface-container-lowest' : 'bg-surface-container hover:bg-surface-container-high text-error font-semibold'}`}
            >
              <span className="w-2 h-2 rounded-full bg-error"></span>
              <span>Stock Bajo</span>
            </button>
            <button 
              onClick={() => setStatusFilter('out')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full font-label-md text-label-md transition-all ${statusFilter === 'out' ? 'bg-primary-container text-surface-container-lowest' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'}`}
            >
              <span className="w-2 h-2 rounded-full bg-outline"></span>
              <span>Agotados</span>
            </button>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-space-sm shrink-0">
            <div className="relative flex-1 sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-body-lg pointer-events-none">filter_alt</span>
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-container-low pl-9 pr-3 py-2 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest shadow-inner" 
                placeholder="Filtrar por SKU o nombre..." 
              />
            </div>
            <div className="relative">
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-surface-container-low text-on-surface font-label-sm text-label-sm py-2 px-3 pr-8 rounded-xl focus:outline-none cursor-pointer appearance-none"
              >
                <option value="all">Todas las Categorías</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-body-sm">expand_more</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Bento Section: Products Table */}
      <div className="grid grid-cols-1 xl:grid-cols-1 gap-space-lg items-start">
        <div className="flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
            <div className="px-space-lg py-space-md bg-surface-container-low/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-headline-sm">table_chart</span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">Catálogo de Existencias en Tiempo Real</span>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                    <th className="py-3 px-space-md">SKU / Código</th>
                    <th className="py-3 px-space-md">Producto</th>
                    <th className="py-3 px-space-md">Categoría</th>
                    <th className="py-3 px-space-md text-right">Stock</th>
                    <th className="py-3 px-space-md text-right">Costo</th>
                    <th className="py-3 px-space-md text-right">P. Venta</th>
                    <th className="py-3 px-space-md text-center">Estado</th>
                    <th className="py-3 px-space-md text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container font-body-sm text-body-sm text-on-surface">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-outline">Cargando catálogo...</td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-outline">No se encontraron productos.</td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const isLow = p.stock > 0 && p.stock <= p.stockMinimo;
                      const isOut = p.stock === 0;

                      return (
                        <tr key={p.id} className="hover:bg-surface-container-low/40 transition-colors group">
                          <td className="py-3.5 px-space-md">
                            <div className="flex flex-col">
                              <span className="font-numeric-pos font-bold text-label-md text-primary tracking-tight">{p.sku || p.codigoBarras || '-'}</span>
                              <span className="font-label-sm text-label-sm text-outline">{p.sku ? 'SKU' : 'EAN'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-space-md">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-primary overflow-hidden">
                                {p.imagenUrl ? (
                                  <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="material-symbols-outlined text-body-lg">inventory_2</span>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-label-lg text-label-lg font-bold text-on-surface truncate">{p.nombre}</span>
                                <span className="font-label-sm text-label-sm text-on-surface-variant truncate max-w-[200px]">{p.descripcion || '-'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-space-md">
                            <span className="inline-flex items-center gap-1 font-label-sm text-label-sm px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant font-medium">
                              {p.categoriaNombre || 'General'}
                            </span>
                          </td>
                          <td className="py-3.5 px-space-md text-right">
                            <div className="flex flex-col items-end">
                              <span className={`font-numeric-pos font-bold text-label-lg ${isOut ? 'text-outline' : isLow ? 'text-error' : 'text-on-surface'}`}>
                                {p.stock} <span className="font-label-sm text-label-sm font-normal opacity-70">uds</span>
                              </span>
                              <span className="font-label-sm text-label-sm text-outline">Mín: {p.stockMinimo}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-space-md text-right font-label-md text-label-md text-on-surface-variant">
                            C$ {p.costo.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-space-md text-right font-label-lg text-label-lg font-bold text-primary">
                            C$ {p.precioVenta.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-space-md text-center">
                            {isOut ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-outline"></span> Agotado
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span> Stock Bajo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Disponible
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-space-md text-center">
                            {isAdmin && (
                              <div className="inline-flex items-center gap-1">
                                <button onClick={() => handleOpenEditModal(p)} className="p-1.5 rounded-lg text-secondary hover:bg-surface-container transition-colors" title="Editar">
                                  <span className="material-symbols-outlined text-body-lg">edit</span>
                                </button>
                                <button onClick={() => handleToggleStatus(p)} className={`p-1.5 rounded-lg transition-colors ${p.estado ? 'text-error hover:bg-error-container' : 'text-primary hover:bg-primary-container'}`} title={p.estado ? 'Desactivar' : 'Activar'}>
                                  <span className="material-symbols-outlined text-body-lg">{p.estado ? 'visibility_off' : 'visibility'}</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal is kept simple for this step, to avoid excess complexity in single file replacement */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl p-space-lg shadow-xl flex flex-col gap-space-md animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-headline-sm">{editingProduct ? 'edit' : 'add'}</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container">
                <span className="material-symbols-outlined text-headline-sm">close</span>
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-3 font-body-sm text-body-sm">
              <label className="flex flex-col gap-1">
                <span className="font-label-md text-label-md text-on-surface">Nombre *</span>
                <input required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="bg-surface-container-low p-2.5 rounded-xl text-on-surface focus:outline-none" />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                <label className="flex flex-col gap-1">
                  <span className="font-label-md text-label-md text-on-surface">URL de Imagen</span>
                  <input value={formData.imagenUrl} onChange={e => setFormData({...formData, imagenUrl: e.target.value})} className="bg-surface-container-low p-2.5 rounded-xl text-on-surface focus:outline-none" placeholder="ej. https://ejemplo.com/img.png" />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-label-md text-label-md text-on-surface">Categoría *</span>
                  <select required value={formData.categoriaId} onChange={e => setFormData({...formData, categoriaId: e.target.value})} className="bg-surface-container-low p-2.5 rounded-xl text-on-surface focus:outline-none cursor-pointer">
                    <option value="" disabled>Seleccione una categoría</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </label>
              </div>
              
              <div className="grid grid-cols-2 gap-space-sm">
                <label className="flex flex-col gap-1">
                  <span className="font-label-md text-label-md text-on-surface">Precio (C$) *</span>
                  <input required type="number" step="0.01" value={formData.precioVenta} onChange={e => setFormData({...formData, precioVenta: e.target.value})} className="bg-surface-container-low p-2.5 rounded-xl text-on-surface focus:outline-none" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-label-md text-label-md text-on-surface">Costo (C$) *</span>
                  <input required type="number" step="0.01" value={formData.costo} onChange={e => setFormData({...formData, costo: e.target.value})} className="bg-surface-container-low p-2.5 rounded-xl text-on-surface focus:outline-none" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-space-sm">
                <label className="flex flex-col gap-1">
                  <span className="font-label-md text-label-md text-on-surface">Stock</span>
                  <input type="number" required disabled={!!editingProduct} value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="bg-surface-container-low p-2.5 rounded-xl text-on-surface focus:outline-none disabled:opacity-50" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-label-md text-label-md text-on-surface">Stock Mínimo</span>
                  <input type="number" required value={formData.stockMinimo} onChange={e => setFormData({...formData, stockMinimo: e.target.value})} className="bg-surface-container-low p-2.5 rounded-xl text-on-surface focus:outline-none" />
                </label>
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl bg-surface-container font-label-md text-label-md text-on-surface hover:bg-surface-container-high transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 rounded-xl bg-primary-container text-surface-container-lowest font-label-md text-label-md font-bold shadow-md hover:opacity-95">
                  {formLoading ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
