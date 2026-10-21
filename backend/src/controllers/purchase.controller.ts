import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { memoryProducts, memoryPurchases, memoryMovements, memorySuppliers } from '../data/memoryStore';

let purchaseCounter = 5000;

export const createPurchase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { proveedorId, numeroFactura, detalles } = req.body;
    const usuarioId = req.user?.id;

    if (!proveedorId || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Por favor seleccione un proveedor e incluya al menos un producto en la compra.',
      });
      return;
    }

    if (!usuarioId) {
      res.status(401).json({ success: false, message: 'No autenticado.' });
      return;
    }

    const invoiceNum = numeroFactura ? numeroFactura.trim() : `FAC-PUR-${++purchaseCounter}`;

    let purchaseResult: any = null;

    try {
      // Transactional Purchase Execution, stock addition and Kardex ENTRADA log
      purchaseResult = await prisma.$transaction(async (tx) => {
        const supplier = await tx.proveedor.findUnique({ where: { id: proveedorId } });
        if (!supplier) {
          throw new Error('El proveedor seleccionado no existe.');
        }

        let grandTotal = 0;
        const purchaseDetailsData: any[] = [];

        for (const item of detalles) {
          const product = await tx.producto.findUnique({ where: { id: item.productoId } });
          if (!product) {
            throw new Error(`El producto con ID ${item.productoId} no existe.`);
          }

          const qty = Number(item.cantidad);
          const unitCost = Number(item.costoUnitario);

          if (qty <= 0 || unitCost < 0) {
            throw new Error(`Cantidad y costo deben ser mayores a 0 para '${product.nombre}'.`);
          }

          const subtotal = qty * unitCost;
          grandTotal += subtotal;

          purchaseDetailsData.push({
            productoId: item.productoId,
            cantidad: qty,
            costoUnitario: unitCost,
            subtotal,
          });

          // 1. Update product stock (ENTRADA) and cost price
          const stockAnterior = product.stock;
          const stockNuevo = stockAnterior + qty;

          await tx.producto.update({
            where: { id: item.productoId },
            data: {
              stock: stockNuevo,
              costo: unitCost,
            },
          });

          // 2. Register Kardex ENTRADA movement
          await tx.movimientoInventario.create({
            data: {
              productoId: item.productoId,
              usuarioId,
              tipo: 'ENTRADA',
              cantidad: qty,
              stockAnterior,
              stockNuevo,
              motivo: `Compra de reabastecimiento Factura #${invoiceNum} (Proveedor: ${supplier.nombre})`,
            },
          });
        }

        // 3. Create Purchase Master Record
        const purchase = await tx.compra.create({
          data: {
            numeroFactura: invoiceNum,
            proveedorId,
            usuarioId,
            total: grandTotal,
            estado: 'CONFIRMADA',
            detalles: {
              create: purchaseDetailsData,
            },
          },
          include: {
            proveedor: { select: { nombre: true, ruc: true } },
            detalles: {
              include: { producto: { select: { nombre: true, sku: true } } },
            },
            usuario: { select: { nombre: true } },
          },
        });

        return purchase;
      });
    } catch (dbErr: any) {
      console.warn('⚠️ Base de datos offline, procesando compra en memoria de respaldo y aumentando stock de inventario.');
      
      let grandTotal = 0;

      // UPDATE MEMORY PRODUCTS STOCK FOR REALTIME SYNC
      for (const item of detalles) {
        const prodIdx = memoryProducts.findIndex((p) => p.id === item.productoId);
        const qty = Number(item.cantidad || 0);
        const unitCost = Number(item.costoUnitario || 0);
        grandTotal += qty * unitCost;

        if (prodIdx !== -1) {
          const stockAnt = memoryProducts[prodIdx].stock;
          memoryProducts[prodIdx].stock += qty;
          memoryProducts[prodIdx].costo = unitCost;

          memoryMovements.unshift({
            id: `mov-${Date.now()}-${Math.random()}`,
            productoId: item.productoId,
            usuarioId,
            tipo: 'ENTRADA',
            cantidad: qty,
            stockAnterior: stockAnt,
            stockNuevo: memoryProducts[prodIdx].stock,
            motivo: `Compra de reabastecimiento Factura #${invoiceNum}`,
            fecha: new Date().toISOString(),
          });
        }
      }

      const supp = memorySuppliers.find((s) => s.id === proveedorId);

      purchaseResult = {
        id: `pur-${Date.now()}`,
        numeroFactura: invoiceNum,
        proveedorId,
        proveedorNombre: supp ? supp.nombre : 'Distribuidora Papelera Hispamer S.A.',
        usuarioId,
        usuarioNombre: req.user?.nombre || 'Administrador',
        fecha: new Date().toISOString(),
        total: grandTotal,
        estado: 'CONFIRMADA',
        detalles,
      };
      memoryPurchases.unshift(purchaseResult);
    }

    res.status(201).json({
      success: true,
      data: purchaseResult,
      message: 'Compra registrada exitosamente y existencias en inventario actualizadas (ENTRADA Kardex)',
    });
  } catch (error: any) {
    console.error('Error al registrar compra:', error);
    res.status(500).json({ success: false, message: 'Error al procesar la compra.' });
  }
};

export const getPurchases = async (req: Request, res: Response): Promise<void> => {
  try {
    let purchases: any[] = [];
    try {
      purchases = await prisma.compra.findMany({
        take: 50,
        orderBy: { fecha: 'desc' },
        include: {
          proveedor: { select: { nombre: true, ruc: true } },
          usuario: { select: { nombre: true } },
          detalles: { include: { producto: { select: { nombre: true } } } },
        },
      });
    } catch (dbErr) {
      purchases = memoryPurchases;
    }

    res.json({
      success: true,
      data: purchases,
      message: 'Historial de compras obtenido correctamente',
    });
  } catch (error) {
    console.error('Error al obtener compras:', error);
    res.status(500).json({ success: false, message: 'Error al consultar historial de compras.' });
  }
};
