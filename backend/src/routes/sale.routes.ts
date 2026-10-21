import { Router } from 'express';
import { createSale, getSales, anularSale, getDashboardStats } from '../controllers/sale.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createSaleSchema, anularSaleSchema } from '../validators/schemas';

const router = Router();

router.use(authenticateToken);

router.get('/stats', getDashboardStats);
router.post('/', validate(createSaleSchema), createSale);
router.get('/', getSales);
router.patch('/:id/anular', requireRole(['ADMINISTRADOR']), validate(anularSaleSchema), anularSale);

export default router;
