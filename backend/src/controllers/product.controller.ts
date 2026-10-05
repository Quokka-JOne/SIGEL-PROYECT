import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { memoryProducts } from '../data/memoryStore';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, categoriaId, lowStock, includeInactive } = req.query;

    let products: any[] = [];

    try {
      const where: any = {};

      if (includeInactive !== 'true') {
        where.estado = true;
      }

      if (categoriaId) {
        where.categoriaId = String(categoriaId);
      }

      if (search) {
        const query = String(search).trim();
        where.OR = [
          { nombre: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
          { codigoBarras: { contains: query, mode: 'insensitive' } },
        ];
      }

      const dbProducts = await prisma.producto.findMany({
        where,
        include: { categoria: { select: { id: true, nombre: true } } },
        orderBy: { nombre: 'asc' },
      });

      products = dbProducts.map((p) => ({
        ...p,
        categoriaNombre: p.categoria?.nombre || 'General',
      }));
    } catch (dbErr) {
      products = [...memoryProducts];

      if (includeInactive !== 'true') {
        products = products.filter((p) => p.estado);
      }

      if (categoriaId) {
        products = products.filter((p) => p.categoriaId === categoriaId);
      }

      if (search) {
        const q = String(search).toLowerCase().trim();
        products = products.filter(
          (p) =>
            p.nombre.toLowerCase().includes(q) ||
            (p.sku && p.sku.toLowerCase().includes(q)) ||
            (p.codigoBarras && p.codigoBarras.includes(q))
        );
      }
    }

    if (lowStock === 'true') {
      products = products.filter((p) => p.stock <= p.stockMinimo);
    }

    res.json({
      success: true,
      data: products,
      message: 'Catálogo de productos obtenido correctamente',
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ success: false, message: 'Error interno al consultar productos.' });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    let product: any = null;
    try {
      product = await prisma.producto.findUnique({
        where: { id },
        include: { categoria: true, movimientos: { take: 10, orderBy: { fecha: 'desc' } } },
      });
    } catch (dbErr) {
      product = memoryProducts.find((p) => p.id === id);
    }

    if (!product) {
      res.status(404).json({ success: false, message: 'Producto no encontrado.' });
      return;
    }

    res.json({ success: true, data: product, message: 'Producto obtenido correctamente' });
  } catch (error) {
    console.error('Error al obtener detalle de producto:', error);
    res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      nombre,
      codigoBarras,
      sku,
      descripcion,
      imagenUrl,
      categoriaId,
      precioVenta,
      costo,
      stock,
      stockMinimo,
      unidadMedida,
    } = req.body;

    if (!nombre || !categoriaId || precioVenta === undefined || costo === undefined) {
      res.status(400).json({
        success: false,
        message: 'Nombre, categoría, precio de venta y costo son obligatorios.',
      });
      return;
    }

    const initialStock = Number(stock || 0);
    const minStock = Number(stockMinimo || 5);
    const salePrice = Number(precioVenta);
    const costPrice = Number(costo);

    if (salePrice <= 0 || costPrice < 0) {
      res.status(400).json({
        success: false,
        message: 'El precio de venta debe ser mayor a 0 y el costo no puede ser negativo.',
      });
      return;
    }

    let newProduct: any = null;

    try {
      newProduct = await prisma.$transaction(async (tx) => {
        const prod = await tx.producto.create({
          data: {
            nombre: nombre.trim(),
            codigoBarras: codigoBarras ? codigoBarras.trim() : null,
            sku: sku ? sku.trim() : null,
            descripcion: descripcion ? descripcion.trim() : null,
            imagenUrl: imagenUrl ? imagenUrl.trim() : null,
            categoriaId,
            precioVenta: salePrice,
            costo: costPrice,
            stock: initialStock,
            stockMinimo: minStock,
            unidadMedida: unidadMedida || 'Unidad',
            estado: true,
          },
        });

        if (initialStock > 0 && req.user?.id) {
          await tx.movimientoInventario.create({
            data: {
              productoId: prod.id,
              usuarioId: req.user.id,
              tipo: 'ENTRADA',
              cantidad: initialStock,
              stockAnterior: 0,
              stockNuevo: initialStock,
              motivo: 'Inventario inicial al crear el producto en el catálogo',
            },
          });
        }

        return prod;
      });
    } catch (dbErr) {
      newProduct = {
        id: `prod-${Date.now()}`,
        codigoBarras: codigoBarras || null,
        sku: sku || `SKU-${Date.now()}`,
        nombre: nombre.trim(),
        descripcion: descripcion || null,
        imagenUrl: imagenUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
        categoriaId,
        categoriaNombre: 'General',
        precioVenta: salePrice,
        costo: costPrice,
        stock: initialStock,
        stockMinimo: minStock,
        unidadMedida: unidadMedida || 'Unidad',
        estado: true,
      };
      memoryProducts.unshift(newProduct);
    }

    res.status(201).json({
      success: true,
      data: newProduct,
      message: 'Producto registrado correctamente con foto de presentación',
    });
  } catch (error) {
    console.error('Error al registrar producto:', error);
    res.status(500).json({ success: false, message: 'Error al registrar el producto.' });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;

    let updatedProduct: any = null;

    try {
      updatedProduct = await prisma.producto.update({
        where: { id },
        data: {
          ...(data.nombre && { nombre: data.nombre.trim() }),
          ...(data.codigoBarras !== undefined && { codigoBarras: data.codigoBarras }),
          ...(data.sku !== undefined && { sku: data.sku }),
          ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
          ...(data.imagenUrl !== undefined && { imagenUrl: data.imagenUrl }),
          ...(data.categoriaId && { categoriaId: data.categoriaId }),
          ...(data.precioVenta !== undefined && { precioVenta: Number(data.precioVenta) }),
          ...(data.costo !== undefined && { costo: Number(data.costo) }),
          ...(data.stockMinimo !== undefined && { stockMinimo: Number(data.stockMinimo) }),
          ...(data.unidadMedida && { unidadMedida: data.unidadMedida }),
          ...(data.estado !== undefined && { estado: data.estado }),
        },
      });
    } catch (dbErr) {
      const idx = memoryProducts.findIndex((p) => p.id === id);
      if (idx !== -1) {
        memoryProducts[idx] = { ...memoryProducts[idx], ...data };
        updatedProduct = memoryProducts[idx];
      } else {
        res.status(404).json({ success: false, message: 'Producto no encontrado.' });
        return;
      }
    }

    res.json({
      success: true,
      data: updatedProduct,
      message: 'Producto actualizado correctamente',
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ success: false, message: 'Error interno al actualizar producto.' });
  }
};

export const toggleProductStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    let updatedProduct: any = null;

    try {
      const current = await prisma.producto.findUnique({ where: { id } });
      if (!current) {
        res.status(404).json({ success: false, message: 'Producto no encontrado.' });
        return;
      }

      updatedProduct = await prisma.producto.update({
        where: { id },
        data: { estado: !current.estado },
      });
    } catch (dbErr) {
      const idx = memoryProducts.findIndex((p) => p.id === id);
      if (idx !== -1) {
        memoryProducts[idx].estado = !memoryProducts[idx].estado;
        updatedProduct = memoryProducts[idx];
      } else {
        res.status(404).json({ success: false, message: 'Producto no encontrado.' });
        return;
      }
    }

    res.json({
      success: true,
      data: updatedProduct,
      message: `Producto ${updatedProduct.estado ? 'activado' : 'desactivado'} correctamente`,
    });
  } catch (error) {
    console.error('Error al cambiar estado de producto:', error);
    res.status(500).json({ success: false, message: 'Error al cambiar estado.' });
  }
};
