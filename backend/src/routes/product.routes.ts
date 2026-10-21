import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
  adjustProductStock,
  getInventoryMovements,
} from '../controllers/product.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createProductSchema,
  updateProductSchema,
  inventoryAdjustmentSchema,
} from '../validators/schemas';

const router = Router();

router.use(authenticateToken);

router.get('/', getProducts);
router.get('/movements', getInventoryMovements);
router.get('/:id', getProductById);
router.post('/', requireRole(['ADMINISTRADOR']), validate(createProductSchema), createProduct);
router.put('/:id', requireRole(['ADMINISTRADOR']), validate(updateProductSchema), updateProduct);
router.patch('/:id/status', requireRole(['ADMINISTRADOR']), toggleProductStatus);
router.post('/adjust', requireRole(['ADMINISTRADOR']), validate(inventoryAdjustmentSchema), adjustProductStock);

export default router;
