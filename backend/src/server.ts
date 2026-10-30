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
import { authenticateToken, requireRole } from './middlewares/auth.middleware';
import { INITIAL_CATEGORIES, INITIAL_SUPPLIERS, INITIAL_PRODUCTS } from './data/seedCatalog';

dotenv.config();

import { logger, requestLogger } from './utils/logger';

// C-05: El servidor DEBE fallar al arrancar si falta JWT_SECRET (sin fallback inseguro)
if (!process.env.JWT_SECRET) {
  logger.error('❌ FATAL: La variable de entorno JWT_SECRET no está definida. Configure una clave segura de al menos 32 caracteres.');
  process.exit(1);
}

const app = express();
// Render + Cloudflare actúan como proxy en cadena (Cloudflare -> Render Ingress -> Container)
// Confiar únicamente en el número de saltos declarado para evitar evadir rate limits
// mediante un X-Forwarded-For controlado por el cliente.
const configuredProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? (process.env.NODE_ENV === 'production' ? 2 : 0));
const trustProxyHops = Number.isInteger(configuredProxyHops) && configuredProxyHops >= 0 ? configuredProxyHops : 0;
app.set('trust proxy', trustProxyHops);
const PORT = process.env.PORT || 4000;

// En producción, CORS_ORIGIN es obligatorio y no debe ser comodín (*)
const allowedOrigin = process.env.CORS_ORIGIN;
if (process.env.NODE_ENV === 'production' && (!allowedOrigin || allowedOrigin.trim() === '*')) {
  logger.error('❌ FATAL: En entorno de producción (NODE_ENV=production), la variable CORS_ORIGIN debe estar definida con dominios específicos y no puede ser "*".');
  process.exit(1);
}

// Seguridad con Helmet y CORS restringido (C-05)
app.use(helmet());
const allowedOrigins = allowedOrigin
  ? allowedOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : (process.env.NODE_ENV === 'production' ? false : '*'),
    credentials: true,
  })
);

// FASE 4: Middleware de logging estructurado JSON con X-Request-Id y latencias
app.use(requestLogger);
app.use(express.json());

// CP-01 & FASE 3: Health check con chequeo ligero de base de datos (SELECT 1 con timeout de 2s).
// El resultado saludable se reutiliza unos segundos para que el monitoreo concurrente
// no abra una consulta independiente a PostgreSQL por cada sonda.
const healthCacheTtlMs = process.env.NODE_ENV === 'test'
  ? 0
  : Math.max(0, Number(process.env.HEALTH_CACHE_TTL_MS) || 5000);
let lastHealthyCheckAt = 0;
let healthCheckInFlight: Promise<void> | null = null;
const checkDatabaseHealth = async (): Promise<void> => {
  if (!healthCheckInFlight) {
    healthCheckInFlight = Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 2000)),
    ])
      .then(() => {
        lastHealthyCheckAt = Date.now();
      })
      .finally(() => {
        healthCheckInFlight = null;
      });
  }
  await healthCheckInFlight;
};
const healthHandler = async (req: Request, res: Response) => {
  const now = Date.now();
  if (healthCacheTtlMs === 0 || now - lastHealthyCheckAt >= healthCacheTtlMs) {
    try {
      await checkDatabaseHealth();
    } catch (err: any) {
      logger.warn('Health check: Base de datos no disponible o demoró más de 2 segundos', { error: err.message });
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        message: 'El servicio de base de datos no se encuentra disponible temporalmente.',
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    success: true,
    message: 'Servidor JINStock Backend operativo',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
  });
};
// Liveness no depende de PostgreSQL: permite distinguir proceso activo de servicio listo.
app.get('/api/live', (_req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).json({ success: true, status: 'alive' });
});
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);
app.get('/status', healthHandler);

// API root endpoint informativo
app.get('/api', (req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=60, s-maxage=60');
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

// Fase 6 (Monitoreo y logs): Endpoint de auditoría técnica para coevaluación (asíncrono)
app.get('/api/logs', authenticateToken, requireRole(['ADMINISTRADOR']), async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const type = req.query.type === 'error' ? 'error' : 'all';
  const logs = await logger.getRecentLogs(limit, type);

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

// Rutas inexistentes -> 404 JSON consistente
app.use((req: Request, res: Response) => {
  const requestId = (req as any).id || (req.headers['x-request-id'] as string);
  res.status(404).json({
    success: false,
    code: 'RUTA_NO_ENCONTRADA',
    message: `La ruta ${req.method} ${req.originalUrl} no existe.`,
    ...(requestId ? { requestId } : {}),
  });
});

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
    // C-05: El admin inicial solo se crea si el entorno define email y contraseña.
    // Nunca se usan valores por defecto ni se sobrescribe la contraseña de un usuario existente.
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
    const adminName = process.env.INITIAL_ADMIN_NAME || 'Administrador JINStock';

    if (adminEmail && adminPassword) {
      const existingAdmin = await prisma.usuario.findUnique({
        where: { email: adminEmail },
      });

      if (!existingAdmin) {
        await prisma.usuario.create({
          data: {
            nombre: adminName,
            email: adminEmail,
            passwordHash: await bcrypt.hash(adminPassword, 10),
            rol: 'ADMINISTRADOR',
            estado: true,
            verificado: true,
          },
        });
        logger.info('Administrador inicial creado', { email: adminEmail });
      }
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
