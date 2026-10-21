import { Router } from 'express';
import { createPurchase, getPurchases } from '../controllers/purchase.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', requireRole(['ADMINISTRADOR']), createPurchase);
router.get('/', requireRole(['ADMINISTRADOR']), getPurchases);

export default router;
