import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
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

dotenv.config();

// C-05: El servidor DEBE fallar al arrancar si falta JWT_SECRET (sin fallback inseguro)
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: La variable de entorno JWT_SECRET no está definida. Configure una clave segura de al menos 32 caracteres.');
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
    ],
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

// C-05 & T-04: Health check seguro (sin datos sensibles ni pistas de credenciales)
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Servidor JINStock Backend operativo',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
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

// Arrancar servidor solo si no estamos en entorno de testing
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 JINStock Backend corriendo en http://localhost:${PORT}`);
    startNeonKeepAlive();
  });
}

export default app;
