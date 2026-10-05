import { Router } from 'express';
import { getCategories, createCategory, updateCategory } from '../controllers/category.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getCategories);
router.post('/', requireRole(['ADMINISTRADOR']), createCategory);
router.put('/:id', requireRole(['ADMINISTRADOR']), updateCategory);

export default router;
