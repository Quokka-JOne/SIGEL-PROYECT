import { Router } from 'express';
import { getUsers, createUser, toggleUserStatus } from '../controllers/user.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createUserSchema } from '../validators/schemas';

const router = Router();

router.use(authenticateToken, requireRole(['ADMINISTRADOR']));

router.get('/', getUsers);
router.post('/', validate(createUserSchema), createUser);
router.patch('/:id/status', toggleUserStatus);

export default router;
