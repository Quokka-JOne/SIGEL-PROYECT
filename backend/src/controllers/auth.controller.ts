import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { sendVerificationOtp } from '../utils/neonAuth';
import { ConflictError, NotFoundError, UnauthorizedError, ForbiddenError, ValidationError } from '../utils/errors';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return secret;
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Por favor proporcione su correo y contraseña.');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Consultar usuario en base de datos real (sin fallback en memoria falso)
    const user = await prisma.usuario.findUnique({
      where: { email: cleanEmail },
    });

    // Anti-enumeración de usuarios: mismo error y código para usuario inexistente o desactivado
    if (!user || !user.estado) {
      throw new UnauthorizedError('Credenciales inválidas. Verifique su correo o contraseña.');
    }

    // Si el usuario requiere verificación y no está verificado
    if (user.verificado === false) {
      res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Por favor, verifique su correo electrónico antes de iniciar sesión.',
        requireVerification: true,
        email: user.email,
      });
      return;
    }

    // C-05: Validación exclusiva con bcrypt (sin credenciales de respaldo)
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Credenciales inválidas. Verifique su correo o contraseña.');
    }

    const payload = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    };

    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' });

    res.json({
      success: true,
      data: {
        token,
        usuario: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
        },
      },
      message: 'Inicio de sesión exitoso',
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      throw new ValidationError('Nombre, correo electrónico y contraseña son obligatorios.');
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await prisma.usuario.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      throw new ConflictError('Ya existe un usuario registrado con este correo electrónico.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const codigoConfirmacion = Math.floor(100000 + Math.random() * 900000).toString();

    // C-05: El registro público crea exclusivamente rol CAJERO. Los administradores se crean vía CLI seed o /users
    const assignedRol = 'CAJERO';

    const isTest = process.env.NODE_ENV === 'test';
    const hasSmtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS) && !isTest;
    const hasNeonAuth = Boolean(process.env.NEON_AUTH_URL);
    // Si hay Neon Auth o SMTP configurado y no es test, exigir verificación
    const shouldRequireVerification = (hasNeonAuth || hasSmtpConfigured) && !isTest;

    const newUser = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        email: cleanEmail,
        passwordHash,
        rol: assignedRol,
        estado: true,
        verificado: !shouldRequireVerification,
        codigoConfirmacion: shouldRequireVerification ? codigoConfirmacion : null,
      },
    });

    if (shouldRequireVerification) {
      const otpRes = await sendVerificationOtp(cleanEmail, codigoConfirmacion);
      if (!otpRes.success && process.env.NODE_ENV === 'production' && !otpRes.code) {
        await prisma.usuario.delete({ where: { id: newUser.id } });
        res.status(502).json({
          success: false,
          code: 'EMAIL_DELIVERY_FAILED',
          message: otpRes.message || 'No se pudo enviar el código de verificación. Intente nuevamente más tarde.',
        });
        return;
      }
      res.status(201).json({
        success: true,
        message: otpRes.message || 'Cuenta creada. Por favor revise su correo e ingrese el código de verificación.',
        requireVerification: true,
        email: newUser.email,
        ...(otpRes.code ? { devCode: otpRes.code } : {}),
      });
      return;
    }
      res.status(201).json({
        success: true,
        message: otpRes.message || 'Cuenta creada. Por favor revise su correo e ingrese el código de verificación.',
        requireVerification: true,
        email: newUser.email,
        ...(otpRes.code ? { devCode: otpRes.code } : {}),
      });
      return;
    }

    const payload = {
      id: newUser.id,
      email: newUser.email,
      nombre: newUser.nombre,
      rol: newUser.rol,
    };

    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' });

    res.status(201).json({
      success: true,
      data: {
        token,
        usuario: {
          id: newUser.id,
          nombre: newUser.nombre,
          email: newUser.email,
          rol: newUser.rol,
        },
      },
      message: 'Cuenta de cajero registrada y activada exitosamente.',
    });
  } catch (error) {
    next(error);
  }
};

export const resendVerificationCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new ValidationError('El correo electrónico es requerido.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.usuario.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      // Anti-enumeración de usuarios
      res.json({
        success: true,
        message: 'Si la cuenta existe y está pendiente de verificación, se ha enviado un nuevo código.',
      });
      return;
    }

    if (user.verificado) {
      res.json({
        success: true,
        alreadyVerified: true,
        message: 'Esta cuenta ya está verificada. Puede iniciar sesión directamente.',
      });
      return;
    }

    const nuevoCodigo = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.usuario.update({
      where: { email: cleanEmail },
      data: { codigoConfirmacion: nuevoCodigo },
    });

    const otpRes = await sendVerificationOtp(cleanEmail, nuevoCodigo);

    res.json({
      success: true,
      message: otpRes.message || 'Nuevo código de verificación enviado a su correo.',
      requireVerification: true,
      email: cleanEmail,
      ...(otpRes.code ? { devCode: otpRes.code } : {}),
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      throw new ValidationError('Faltan datos de verificación (correo y código requeridos).');
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.usuario.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado.');
    }

    if (user.verificado) {
      const payload = {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      };
      const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' });
      res.json({
        success: true,
        data: {
          token,
          usuario: {
            id: user.id,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol,
          },
        },
        message: 'La cuenta ya ha sido verificada previamente. Sesión iniciada.',
      });
      return;
    }

    if (!user.codigoConfirmacion || user.codigoConfirmacion !== code.trim()) {
      throw new ValidationError('Código de confirmación incorrecto.');
    }

    // Comprobar expiración del código (15 minutos)
    const CODE_EXPIRATION_MS = 15 * 60 * 1000;
    const timeSinceUpdate = Date.now() - new Date(user.updatedAt).getTime();
    if (timeSinceUpdate > CODE_EXPIRATION_MS) {
      throw new ValidationError('El código de verificación ha expirado (validez de 15 minutos). Por favor solicite un nuevo código.');
    }

    const updatedUser = await prisma.usuario.update({
      where: { email: cleanEmail },
      data: { verificado: true, codigoConfirmacion: null },
    });

    const payload = {
      id: updatedUser.id,
      email: updatedUser.email,
      nombre: updatedUser.nombre,
      rol: updatedUser.rol,
    };
    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' });

    res.json({
      success: true,
      data: {
        token,
        usuario: {
          id: updatedUser.id,
          nombre: updatedUser.nombre,
          email: updatedUser.email,
          rol: updatedUser.rol,
        },
      },
      message: 'Correo verificado y sesión iniciada.',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('No autenticado.');
    }

    const user = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        estado: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado.');
    }

    res.json({
      success: true,
      data: user,
      message: 'Perfil de usuario obtenido correctamente',
    });
  } catch (error) {
    next(error);
  }
};
