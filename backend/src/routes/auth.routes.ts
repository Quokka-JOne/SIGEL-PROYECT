import { Router } from 'express';
import { login, register, getMe, seedInitialUsers } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticateToken, getMe);
router.post('/seed', seedInitialUsers);

export default router;
