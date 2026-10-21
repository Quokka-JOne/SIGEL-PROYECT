import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';

export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, categoriaId, lowStock, includeInactive } = req.query;

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

    let products = await prisma.producto.findMany({
      where,
      include: { categoria: { select: { id: true, nombre: true } } },
      orderBy: { nombre: 'asc' },
    });

    if (lowStock === 'true') {
      products = products.filter((p) => p.stock <= p.stockMinimo);
    }

    const formatted = products.map((p) => ({
      ...p,
      categoriaNombre: p.categoria?.nombre || 'General',
    }));

    res.json({
      success: true,
      data: formatted,
      message: 'Catálogo de productos obtenido correctamente.',
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: true,
        movimientos: {
          take: 20,
          orderBy: { fecha: 'desc' },
          include: { usuario: { select: { nombre: true } } },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado.');
    }

    res.json({
      success: true,
      data: product,
      message: 'Detalle de producto obtenido correctamente.',
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const initialStock = Number(stock || 0);
    const minStock = Number(stockMinimo || 5);
    const salePrice = Number(precioVenta);
    const costPrice = Number(costo);

    const newProduct = await prisma.$transaction(async (tx) => {
      // Validar categoría existente
      const category = await tx.categoria.findUnique({ where: { id: categoriaId } });
      if (!category) {
        throw new NotFoundError('La categoría seleccionada no existe.');
      }

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
            motivo: 'Inventario inicial al registrar el producto',
          },
        });
      }

      return prod;
    });

    res.status(201).json({
      success: true,
      data: newProduct,
      message: 'Producto registrado correctamente.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.producto.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Producto no encontrado.');
    }

    const updatedProduct = await prisma.producto.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.codigoBarras !== undefined && { codigoBarras: data.codigoBarras ? data.codigoBarras.trim() : null }),
        ...(data.sku !== undefined && { sku: data.sku ? data.sku.trim() : null }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion ? data.descripcion.trim() : null }),
        ...(data.imagenUrl !== undefined && { imagenUrl: data.imagenUrl ? data.imagenUrl.trim() : null }),
        ...(data.categoriaId && { categoriaId: data.categoriaId }),
        ...(data.precioVenta !== undefined && { precioVenta: Number(data.precioVenta) }),
        ...(data.costo !== undefined && { costo: Number(data.costo) }),
        ...(data.stockMinimo !== undefined && { stockMinimo: Number(data.stockMinimo) }),
        ...(data.unidadMedida && { unidadMedida: data.unidadMedida }),
        ...(data.estado !== undefined && { estado: Boolean(data.estado) }),
      },
      include: {
        categoria: { select: { id: true, nombre: true } },
      },
    });

    res.json({
      success: true,
      data: updatedProduct,
      message: 'Producto actualizado correctamente.',
    });
  } catch (error) {
    next(error);
  }
};

export const toggleProductStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const current = await prisma.producto.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundError('Producto no encontrado.');
    }

    const updatedProduct = await prisma.producto.update({
      where: { id },
      data: { estado: !current.estado },
    });

    res.json({
      success: true,
      data: updatedProduct,
      message: `Producto ${updatedProduct.estado ? 'activado' : 'desactivado'} correctamente.`,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.producto.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            detallesVenta: true,
            detallesCompra: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado.');
    }

    // Si tiene ventas o compras históricas, no se puede borrar físicamente para proteger auditoría y contabilidad
    if (product._count.detallesVenta > 0 || product._count.detallesCompra > 0) {
      await prisma.producto.update({
        where: { id },
        data: { estado: false },
      });

      res.status(400).json({
        success: false,
        message: 'No es posible eliminar el producto porque tiene ventas o compras registradas en el historial. El producto fue DESACTIVADO para que no aparezca en el POS ni se pueda vender.',
      });
      return;
    }

    // Si no tiene registros contables asociados, se eliminan los movimientos y el producto permanentemente
    await prisma.$transaction([
      prisma.movimientoInventario.deleteMany({ where: { productoId: id } }),
      prisma.producto.delete({ where: { id } }),
    ]);

    res.json({
      success: true,
      message: 'Producto eliminado permanentemente del sistema.',
    });
  } catch (error) {
    next(error);
  }
};

// T-06: Ajuste manual de inventario (conteo físico, merma, daño) con motivo obligatorio
export const adjustProductStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productoId, cantidad, motivo } = req.body;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      throw new ForbiddenError('No autenticado.');
    }

    const adjustmentAmount = Number(cantidad);
    if (!Number.isInteger(adjustmentAmount) || adjustmentAmount === 0) {
      throw new ValidationError('La cantidad de ajuste debe ser un entero diferente de 0.');
    }

    if (!motivo || !motivo.trim()) {
      throw new ValidationError('El motivo del ajuste es obligatorio.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const prod = await tx.producto.findUnique({ where: { id: productoId } });
      if (!prod) {
        throw new NotFoundError('Producto no encontrado.');
      }

      const stockAnterior = prod.stock;
      const stockNuevo = stockAnterior + adjustmentAmount;

      if (stockNuevo < 0) {
        throw new ValidationError(`El ajuste resultaría en un stock negativo (${stockNuevo}). El stock actual es ${stockAnterior}.`);
      }

      const updated = await tx.producto.update({
        where: { id: productoId },
        data: { stock: stockNuevo },
      });

      const mov = await tx.movimientoInventario.create({
        data: {
          productoId,
          usuarioId,
          tipo: 'AJUSTE',
          cantidad: Math.abs(adjustmentAmount),
          stockAnterior,
          stockNuevo,
          motivo: motivo.trim(),
        },
      });

      return { product: updated, movement: mov };
    });

    res.json({
      success: true,
      data: result,
      message: `Ajuste de inventario aplicado correctamente. Nuevo stock: ${result.product.stock}.`,
    });
  } catch (error) {
    next(error);
  }
};

// T-07: Consulta paginada y filtrable del historial de movimientos Kardex
export const getInventoryMovements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productoId, tipo, desde, hasta, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (productoId) where.productoId = String(productoId);
    if (tipo) where.tipo = String(tipo);
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(String(desde));
      if (hasta) {
        const hastaDate = new Date(String(hasta));
        hastaDate.setHours(23, 59, 59, 999);
        where.fecha.lte = hastaDate;
      }
    }

    const [movements, total] = await Promise.all([
      prisma.movimientoInventario.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { fecha: 'desc' },
        include: {
          producto: { select: { id: true, nombre: true, sku: true, unidadMedida: true } },
          usuario: { select: { id: true, nombre: true, email: true } },
        },
      }),
      prisma.movimientoInventario.count({ where }),
    ]);

    res.json({
      success: true,
      data: movements,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      message: 'Historial de movimientos Kardex obtenido correctamente.',
    });
  } catch (error) {
    next(error);
  }
};
