import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import authRoutes from './routes/auth.routes';
import categoryRoutes from './routes/category.routes';
import productRoutes from './routes/product.routes';
import saleRoutes from './routes/sale.routes';
import supplierRoutes from './routes/supplier.routes';
import purchaseRoutes from './routes/purchase.routes';
import userRoutes from './routes/user.routes';
import reportRoutes from './routes/report.routes';
import { prisma } from './config/prisma';
import { errorHandler } from './middlewares/error.middleware';
import { INITIAL_CATEGORIES, INITIAL_SUPPLIERS, INITIAL_PRODUCTS } from './data/seedCatalog';

dotenv.config();

import { logger, requestLogger } from './utils/logger';

// C-05: El servidor DEBE fallar al arrancar si falta JWT_SECRET (sin fallback inseguro)
if (!process.env.JWT_SECRET) {
  logger.error('❌ FATAL: La variable de entorno JWT_SECRET no está definida. Configure una clave segura de al menos 32 caracteres.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

// Seguridad con Helmet y CORS restringido (C-05)
app.use(helmet());
const allowedOrigin = process.env.CORS_ORIGIN;
app.use(
  cors({
    origin: allowedOrigin ? allowedOrigin.split(',') : '*',
    credentials: true,
  })
);
app.use(express.json());

// Fase 6: Middleware de logging estructurado JSON con latencias y estado HTTP
app.use(requestLogger);

// CP-01: Health check seguro y multiruta (/api/health, /health, /status)
const healthHandler = (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Servidor JINStock Backend operativo',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);
app.get('/status', healthHandler);

// API root endpoint informativo
app.get('/api', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API REST de JINStock Nicaragua - Sistema de Gestión PWA Offline-First',
    version: '2.5.0',
    endpoints: [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/me',
      '/api/categories',
      '/api/products',
      '/api/sales',
      '/api/suppliers',
      '/api/purchases',
      '/api/users',
      '/api/reports',
      '/api/health',
      '/api/logs',
    ],
  });
});

// Fase 6 (Monitoreo y logs): Endpoint de auditoría técnica para coevaluación
app.get('/api/logs', (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const type = req.query.type === 'error' ? 'error' : 'all';
  const logs = logger.getRecentLogs(limit, type);

  res.json({
    success: true,
    count: logs.length,
    filter: type,
    data: logs,
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);

// Manejador centralizado de errores (T-04)
app.use(errorHandler);

// T-12: Keep-alive modular y configurable para Neon PostgreSQL
let keepAliveTimer: NodeJS.Timeout | null = null;
const startNeonKeepAlive = () => {
  if (process.env.ENABLE_KEEP_ALIVE !== 'true') {
    return;
  }
  const intervalMs = Number(process.env.KEEP_ALIVE_INTERVAL_MS) || 3 * 60 * 1000;
  keepAliveTimer = setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err: any) {
      console.warn('⚠️ [Keep-Alive] Neon ping omitido o base desconectada:', err.message);
    }
  }, intervalMs);
};

// Asegurar que usuarios iniciales (Admin y Cajero) y catálogo básico existan
const ensureInitialData = async () => {
  try {
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@jinstock.ni';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin.2026!Secure';
    const adminName = process.env.INITIAL_ADMIN_NAME || 'Administrador JINStock';

    const cajeroEmail = 'cajero@jinstock.ni';
    const cajeroPassword = 'cajero123';
    const cajeroName = 'Cajero Estación Central';

    // 1. Administrador inicial
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const existingAdmin = await prisma.usuario.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      await prisma.usuario.create({
        data: {
          nombre: adminName,
          email: adminEmail,
          passwordHash: adminHash,
          rol: 'ADMINISTRADOR',
          estado: true,
          verificado: true,
        },
      });
      console.log(`✅ [Init] Administrador inicial creado: ${adminEmail}`);
    } else {
      await prisma.usuario.update({
        where: { email: adminEmail },
        data: {
          passwordHash: adminHash,
          rol: 'ADMINISTRADOR',
          estado: true,
          verificado: true,
        },
      });
      console.log(`✅ [Init] Administrador verificado y listo: ${adminEmail}`);
    }

    // 2. Cajero inicial
    const cajeroHash = await bcrypt.hash(cajeroPassword, 10);
    const existingCajero = await prisma.usuario.findUnique({
      where: { email: cajeroEmail },
    });

    if (!existingCajero) {
      await prisma.usuario.create({
        data: {
          nombre: cajeroName,
          email: cajeroEmail,
          passwordHash: cajeroHash,
          rol: 'CAJERO',
          estado: true,
          verificado: true,
        },
      });
      console.log(`✅ [Init] Cajero inicial creado: ${cajeroEmail}`);
    } else {
      await prisma.usuario.update({
        where: { email: cajeroEmail },
        data: {
          passwordHash: cajeroHash,
          rol: 'CAJERO',
          estado: true,
          verificado: true,
        },
      });
      console.log(`✅ [Init] Cajero verificado y listo: ${cajeroEmail}`);
    }

    // 3. Sembrar catálogo si la base de datos no tiene categorías
    const catCount = await prisma.categoria.count();
    if (catCount === 0) {
      console.log('📦 Sembrando catálogo inicial de papelería...');
      for (const cat of INITIAL_CATEGORIES) {
        await prisma.categoria.upsert({
          where: { id: cat.id },
          update: { nombre: cat.nombre, descripcion: cat.descripcion },
          create: { ...cat, estado: true },
        });
      }
      for (const sup of INITIAL_SUPPLIERS) {
        await prisma.proveedor.upsert({
          where: { id: sup.id },
          update: { nombre: sup.nombre, ruc: sup.ruc, telefono: sup.telefono, email: sup.email, direccion: sup.direccion },
          create: { ...sup },
        });
      }
      for (const prod of INITIAL_PRODUCTS) {
        await prisma.producto.upsert({
          where: { id: prod.id },
          update: {
            nombre: prod.nombre,
            precioVenta: prod.precioVenta,
            costo: prod.costo,
            stock: prod.stock,
            stockMinimo: prod.stockMinimo,
          },
          create: { ...prod },
        });
      }
      console.log('✅ Catálogo inicial listo.');
    }
  } catch (err: any) {
    console.warn('⚠️ [Init] Auto-seed omitido o error:', err.message);
  }
};

// Arrancar servidor solo si no estamos en entorno de testing
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    logger.info(`🚀 JINStock Backend activo en http://localhost:${PORT}`, { port: PORT, env: process.env.NODE_ENV || 'development' });
    startNeonKeepAlive();
    await ensureInitialData();
  });
}

export default app;
