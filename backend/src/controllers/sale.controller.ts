import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { memoryProducts, memorySales, memoryMovements } from '../data/memoryStore';

let invoiceCounter = 1000;

export const createSale = async (req: Request, res: Response): Promise<void> => {
  try {
    const { detalles, metodoPago, montoPagadoNIO, montoPagadoUSD, cambioNIO, offlineId } = req.body;
    const usuarioId = req.user?.id;

    if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
      res.status(400).json({ success: false, message: 'El carrito de venta no contiene ningún producto.' });
      return;
    }

    if (!usuarioId) {
      res.status(401).json({ success: false, message: 'No autenticado.' });
      return;
    }

    // Generate receipt number
    const numeroComprobante = `FAC-${new Date().getFullYear()}-${String(++invoiceCounter).padStart(5, '0')}`;

    let saleResult: any = null;

    try {
      // Execute strict transactional sale, stock deduction and Kardex SALIDA log
      saleResult = await prisma.$transaction(async (tx) => {
        let grandTotal = 0;

        // 1. Validate stock availability for each item
        for (const item of detalles) {
          const product = await tx.producto.findUnique({ where: { id: item.productoId } });

          if (!product) {
            throw new Error(`El producto con ID ${item.productoId} no existe en el catálogo.`);
          }

          if (!product.estado) {
            throw new Error(`El producto '${product.nombre}' está inactivo y no se puede vender.`);
          }

          if (product.stock < item.cantidad) {
            throw new Error(
              `Existencias insuficientes para '${product.nombre}'. Disponibles: ${product.stock}, solicitadas: ${item.cantidad}.`
            );
          }
        }

        // 2. Prepare sales details & calculate totals
        const saleDetailsData = [];
        for (const item of detalles) {
          const product = await tx.producto.findUnique({ where: { id: item.productoId } });
          const price = product!.precioVenta;
          const subtotal = price * item.cantidad;
          grandTotal += subtotal;

          saleDetailsData.push({
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: price,
            subtotal,
          });

          // 3. Deduct product inventory
          const stockAnterior = product!.stock;
          const stockNuevo = stockAnterior - item.cantidad;

          await tx.producto.update({
            where: { id: item.productoId },
            data: { stock: stockNuevo },
          });

          // 4. Log Inventory Movement (SALIDA)
          await tx.movimientoInventario.create({
            data: {
              productoId: item.productoId,
              usuarioId,
              tipo: 'SALIDA',
              cantidad: item.cantidad,
              stockAnterior,
              stockNuevo,
              motivo: `Venta registrada en POS Comprobante #${numeroComprobante}`,
            },
          });
        }

        // 5. Create Sale Master Record
        const sale = await tx.venta.create({
          data: {
            numeroComprobante,
            usuarioId,
            total: grandTotal,
            metodoPago: metodoPago || 'EFECTIVO',
            montoPagadoNIO: montoPagadoNIO ? Number(montoPagadoNIO) : null,
            montoPagadoUSD: montoPagadoUSD ? Number(montoPagadoUSD) : null,
            cambioNIO: cambioNIO ? Number(cambioNIO) : null,
            estado: 'COMPLETADA',
            offlineId: offlineId || null,
            synced: true,
            detalles: {
              create: saleDetailsData,
            },
          },
          include: {
            detalles: {
              include: { producto: { select: { nombre: true, sku: true } } },
            },
            usuario: { select: { nombre: true } },
          },
        });

        return sale;
      });
    } catch (dbErr: any) {
      if (dbErr.message && dbErr.message.includes('insuficientes')) {
        res.status(400).json({ success: false, message: dbErr.message });
        return;
      }

      console.warn('⚠️ Base de datos offline, procesando venta en memoria de respaldo y descontando stock.');

      let grandTotal = 0;

      // UPDATE MEMORY PRODUCTS STOCK (SALIDA)
      for (const item of detalles) {
        const prodIdx = memoryProducts.findIndex((p) => p.id === item.productoId);
        const qty = Number(item.cantidad || 0);

        if (prodIdx !== -1) {
          if (memoryProducts[prodIdx].stock < qty) {
            res.status(400).json({
              success: false,
              message: `Existencias insuficientes para '${memoryProducts[prodIdx].nombre}'. Disponibles: ${memoryProducts[prodIdx].stock}, solicitadas: ${qty}.`,
            });
            return;
          }

          const stockAnt = memoryProducts[prodIdx].stock;
          memoryProducts[prodIdx].stock -= qty;

          const unitPrice = item.precioUnitario || memoryProducts[prodIdx].precioVenta;
          grandTotal += qty * unitPrice;

          memoryMovements.unshift({
            id: `mov-${Date.now()}-${Math.random()}`,
            productoId: item.productoId,
            usuarioId,
            tipo: 'SALIDA',
            cantidad: qty,
            stockAnterior: stockAnt,
            stockNuevo: memoryProducts[prodIdx].stock,
            motivo: `Venta registrada en POS Comprobante #${numeroComprobante}`,
            fecha: new Date().toISOString(),
          });
        }
      }

      saleResult = {
        id: `vta-${Date.now()}`,
        numeroComprobante,
        usuarioId,
        usuarioNombre: req.user?.nombre || 'Cajero Estación',
        fecha: new Date().toISOString(),
        total: grandTotal,
        metodoPago: metodoPago || 'EFECTIVO',
        montoPagadoNIO: montoPagadoNIO ? Number(montoPagadoNIO) : null,
        montoPagadoUSD: montoPagadoUSD ? Number(montoPagadoUSD) : null,
        cambioNIO: cambioNIO ? Number(cambioNIO) : null,
        detalles,
        synced: true,
      };
      memorySales.unshift(saleResult);
    }

    res.status(201).json({
      success: true,
      data: saleResult,
      message: 'Venta procesada y comprobante generado exitosamente',
    });
  } catch (error: any) {
    console.error('Error al procesar la venta:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor al procesar la venta.',
    });
  }
};

export const getSales = async (req: Request, res: Response): Promise<void> => {
  try {
    let sales: any[] = [];
    try {
      sales = await prisma.venta.findMany({
        take: 50,
        orderBy: { fecha: 'desc' },
        include: {
          usuario: { select: { nombre: true } },
          detalles: { include: { producto: { select: { nombre: true } } } },
        },
      });
    } catch (dbErr) {
      sales = memorySales;
    }

    res.json({
      success: true,
      data: sales,
      message: 'Historial de ventas obtenido correctamente',
    });
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ success: false, message: 'Error al consultar historial de ventas.' });
  }
};
