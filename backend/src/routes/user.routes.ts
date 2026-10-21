import { Router } from 'express';
import { getUsers, createUser, toggleUserStatus } from '../controllers/user.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken, requireRole(['ADMINISTRADOR']));

router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:id/status', toggleUserStatus);

export default router;
