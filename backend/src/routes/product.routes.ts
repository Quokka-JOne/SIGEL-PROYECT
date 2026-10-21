import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
} from '../controllers/product.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', requireRole(['ADMINISTRADOR']), createProduct);
router.put('/:id', requireRole(['ADMINISTRADOR']), updateProduct);
router.patch('/:id/status', requireRole(['ADMINISTRADOR']), toggleProductStatus);

export default router;
