import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import categoryRoutes from './routes/category.routes';
import productRoutes from './routes/product.routes';
import saleRoutes from './routes/sale.routes';
import supplierRoutes from './routes/supplier.routes';
import purchaseRoutes from './routes/purchase.routes';
import userRoutes from './routes/user.routes';
import { prisma } from './config/prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// API root endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API REST de JINStock Nicaragua - Sistema de Gestión PWA',
    version: '2.4.8',
    endpoints: [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/me',
      '/api/auth/seed',
      '/api/categories',
      '/api/products',
      '/api/sales',
      '/api/suppliers',
      '/api/purchases',
      '/api/users',
      '/api/health'
    ]
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Servidor JINStock Backend operativo',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    smtp: {
      userConfigured: !!process.env.SMTP_USER,
      passConfigured: !!process.env.SMTP_PASS,
      userHint: process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 4) + '***' : 'NOT SET',
    },
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 JINStock Backend corriendo en http://localhost:${PORT}`);
  
  // Neon Keep-Alive (Ping every 3 minutes to prevent Auto-Suspend)
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ [Keep-Alive] Neon DB pinged successfully.');
    } catch (error) {
      console.warn('⚠️ [Keep-Alive] Error al hacer ping a Neon:', error);
    }
  }, 3 * 60 * 1000); // 3 minutes
});

export default app;
