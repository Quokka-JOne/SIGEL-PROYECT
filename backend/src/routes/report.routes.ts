import { Router } from 'express';
import {
  getSalesReport,
  getPurchasesReport,
  getTopProductsReport,
  getDailyCashClosing,
} from '../controllers/report.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

// Cierre de caja diario disponible tanto para CAJERO (su caja) como ADMINISTRADOR (todas o por cajero)
router.get('/cash-closing', getDailyCashClosing);

// Reportes gerenciales (solo ADMINISTRADOR)
router.get('/sales', requireRole(['ADMINISTRADOR']), getSalesReport);
router.get('/purchases', requireRole(['ADMINISTRADOR']), getPurchasesReport);
router.get('/top-products', requireRole(['ADMINISTRADOR']), getTopProductsReport);

export default router;
