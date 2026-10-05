import { Router } from 'express';
import { getSuppliers, createSupplier, updateSupplier } from '../controllers/supplier.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getSuppliers);
router.post('/', requireRole(['ADMINISTRADOR']), createSupplier);
router.put('/:id', requireRole(['ADMINISTRADOR']), updateSupplier);

export default router;
