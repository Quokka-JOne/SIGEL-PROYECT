import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, register, getMe, verifyEmail } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema, registerSchema, verifyEmailSchema } from '../validators/schemas';

const router = Router();

// C-05: Rate limit en login para evitar ataques de fuerza bruta
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // 20 intentos por IP
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Demasiados intentos de inicio de sesión. Por favor intente más tarde (15 min).',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/register', validate(registerSchema), register);
router.post('/verify', validate(verifyEmailSchema), verifyEmail);
router.get('/me', authenticateToken, getMe);

export default router;
