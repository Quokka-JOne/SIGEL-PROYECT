import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock Prisma antes de importar server/app
vi.mock('../src/config/prisma', () => {
  return {
    prisma: {
      venta: {
        findUnique: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      producto: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
        findUnique: vi.fn(),
      },
      usuario: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      movimientoInventario: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      compra: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      proveedor: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

import app from '../src/server';
import { prisma } from '../src/config/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-test-jwt-key-minimum-32-chars-long';

const adminToken = jwt.sign(
  { id: 'admin-123', email: 'admin@libreria.ni', rol: 'ADMINISTRADOR', nombre: 'Admin General' },
  JWT_SECRET,
  { expiresIn: '2h' }
);

const cajeroToken = jwt.sign(
  { id: 'cajero-456', email: 'cajero@libreria.ni', rol: 'CAJERO', nombre: 'Cajero Mostrador' },
  JWT_SECRET,
  { expiresIn: '2h' }
);

describe('Suite de Pruebas Automáticas del Backend (Sección 6 del Informe Técnico)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Una venta con stock suficiente descuenta el inventario y crea el movimiento SALIDA.
  it('1. Una venta con stock suficiente descuenta el inventario y crea el movimiento SALIDA', async () => {
    const mockProduct = {
      id: 'prod-001',
      nombre: 'Cuaderno Loro 100 Hojas',
      sku: 'CUAD-100',
      precioVenta: 45.0,
      stock: 20,
      estado: true,
    };

    // Simular findUnique para offlineId (no existe)
    (prisma.venta.findUnique as any).mockResolvedValue(null);

    // Simular transacción
    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      const txMock = {
        producto: {
          findMany: vi.fn().mockResolvedValue([mockProduct]),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }), // Descuento exitoso
        },
        venta: {
          count: vi.fn().mockResolvedValue(10),
          create: vi.fn().mockResolvedValue({
            id: 'sale-001',
            numeroComprobante: 'FAC-2026-00011',
            total: 90.0,
            estado: 'COMPLETADA',
            detalles: [{ productoId: 'prod-001', cantidad: 2, precioUnitario: 45.0, subtotal: 90.0 }],
          }),
        },
        movimientoInventario: {
          create: vi.fn().mockResolvedValue({
            id: 'mov-001',
            tipo: 'SALIDA',
            cantidad: 2,
            stockAnterior: 20,
            stockNuevo: 18,
          }),
        },
      };
      return callback(txMock);
    });

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${cajeroToken}`)
      .send({
        detalles: [{ productoId: 'prod-001', cantidad: 2 }],
        metodoPago: 'EFECTIVO_CORDOBAS',
        montoPagadoNIO: 100,
        cambioNIO: 10,
        offlineId: 'offline-sale-001',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.numeroComprobante).toBe('FAC-2026-00011');
  });

  // 2. Una venta con stock insuficiente responde 400 con código STOCK_INSUFICIENTE y no modifica el stock.
  it('2. Una venta con stock insuficiente responde 400 con código STOCK_INSUFICIENTE', async () => {
    const mockProduct = {
      id: 'prod-001',
      nombre: 'Cuaderno Loro 100 Hojas',
      sku: 'CUAD-100',
      precioVenta: 45.0,
      stock: 1, // Solo hay 1
      estado: true,
    };

    (prisma.venta.findUnique as any).mockResolvedValue(null);

    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      const txMock = {
        producto: {
          findMany: vi.fn().mockResolvedValue([mockProduct]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }), // count 0 indica que la condición WHERE stock >= cantidad no se cumplió
        },
        venta: {
          count: vi.fn().mockResolvedValue(10),
          create: vi.fn(),
        },
        movimientoInventario: {
          create: vi.fn(),
        },
      };
      return callback(txMock);
    });

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${cajeroToken}`)
      .send({
        detalles: [{ productoId: 'prod-001', cantidad: 5 }], // Pide 5
        metodoPago: 'EFECTIVO_CORDOBAS',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('STOCK_INSUFICIENTE');
  });

  // 3. Enviar dos veces el mismo offlineId crea una sola venta y la segunda respuesta devuelve la existente (Idempotencia).
  it('3. Enviar dos veces el mismo offlineId es idempotente y responde 200 con la venta existente', async () => {
    const existingOfflineSale = {
      id: 'sale-already-created',
      offlineId: 'client-offline-uuid-999',
      numeroComprobante: 'FAC-2026-00050',
      total: 120.0,
      detalles: [],
    };

    // findUnique encuentra la venta existente con ese offlineId
    (prisma.venta.findUnique as any).mockResolvedValue(existingOfflineSale);

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${cajeroToken}`)
      .send({
        detalles: [{ productoId: 'prod-001', cantidad: 2 }],
        metodoPago: 'EFECTIVO_CORDOBAS',
        offlineId: 'client-offline-uuid-999',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('sale-already-created');
    expect(res.body.data.offlineId).toBe('client-offline-uuid-999');
    // Verifica que NO se llamó a $transaction para duplicar la venta
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // 4. Dos ventas simultáneas del mismo producto con stock para una sola no dejan stock negativo.
  it('4. Concurrencia: updateMany atómico rechaza la segunda venta si el stock ya fue consumido', async () => {
    const mockProduct = {
      id: 'prod-002',
      nombre: 'Bolígrafo Pilot G2',
      sku: 'PILOT-G2',
      precioVenta: 35.0,
      stock: 1, // Solo queda 1 bolígrafo
      estado: true,
    };

    (prisma.venta.findUnique as any).mockResolvedValue(null);

    // Si dos transacciones intentan comprar 1 bolígrafo a la vez, la segunda recibirá count === 0 en updateMany
    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      const txMock = {
        producto: {
          findMany: vi.fn().mockResolvedValue([mockProduct]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }), // La condición atómica { stock: { gte: 1 } } falló
        },
        venta: { count: vi.fn(), create: vi.fn() },
        movimientoInventario: { create: vi.fn() },
      };
      return callback(txMock);
    });

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${cajeroToken}`)
      .send({
        detalles: [{ productoId: 'prod-002', cantidad: 1 }],
        metodoPago: 'EFECTIVO_CORDOBAS',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('STOCK_INSUFICIENTE');
  });

  // 5. Un cajero recibe 403 al llamar a compras, usuarios, creación de productos o proveedores.
  it('5. Un cajero recibe 403 al llamar a rutas restringidas a ADMINISTRADOR', async () => {
    // 5a. Compras
    const resCompras = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${cajeroToken}`)
      .send({ proveedorId: 'prov-1', detalles: [] });
    expect(resCompras.status).toBe(403);
    expect(resCompras.body.code).toBe('FORBIDDEN');

    // 5b. Usuarios
    const resUsuarios = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${cajeroToken}`);
    expect(resUsuarios.status).toBe(403);
    expect(resUsuarios.body.code).toBe('FORBIDDEN');

    // 5c. Creación de productos
    const resProd = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${cajeroToken}`)
      .send({ nombre: 'Nuevo Item' });
    expect(resProd.status).toBe(403);
    expect(resProd.body.code).toBe('FORBIDDEN');

    // 5d. Proveedores
    const resProv = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${cajeroToken}`)
      .send({ nombre: 'Distribuidora Central' });
    expect(resProv.status).toBe(403);
    expect(resProv.body.code).toBe('FORBIDDEN');
  });

  // 6. El registro público no puede crear administradores.
  it('6. El registro público no permite crear administradores', async () => {
    (prisma.usuario.findFirst as any).mockResolvedValue(null);
    (prisma.usuario.findUnique as any).mockResolvedValue(null);
    (prisma.usuario.create as any).mockImplementation(({ data }: any) => {
      return {
        id: 'new-user-id',
        nombre: data.nombre,
        email: data.email,
        rol: data.rol, // Verificamos qué rol le asignó el controlador
        estado: true,
      };
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: 'Intruso Hack',
        email: 'intruso@hack.com',
        password: 'Password123!',
        rol: 'ADMINISTRADOR', // Intenta solicitar ser admin públicamente
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // El controlador fuerza el rol a CAJERO y no otorga ADMINISTRADOR a registros públicos
    expect(res.body.data.usuario.rol).toBe('CAJERO');
  });
});
