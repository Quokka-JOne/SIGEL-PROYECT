import { Router } from 'express';
import { createSale, getSales } from '../controllers/sale.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', createSale);
router.get('/', getSales);

export default router;
