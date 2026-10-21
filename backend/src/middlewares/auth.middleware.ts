import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Rol } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'jinstock-jwt-super-secret-key-nicaragua-2026';

export interface TokenPayload {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Acceso no autorizado. Token de autenticación no provisto.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Token de autenticación inválido o expirado.',
    });
  }
};

export const requireRole = (allowedRoles: Rol[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'No autenticado.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.rol)) {
      res.status(403).json({
        success: false,
        message: 'Acceso denegado. Permisos insuficientes para realizar esta operación.',
      });
      return;
    }

    next();
  };
};
