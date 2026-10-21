import { Router } from 'express';
import { login, register, getMe, seedInitialUsers, verifyEmail } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/verify', verifyEmail);
router.get('/me', authenticateToken, getMe);
router.post('/seed', seedInitialUsers);

export default router;
