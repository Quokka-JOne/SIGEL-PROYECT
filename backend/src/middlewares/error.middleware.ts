import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response headers have already been sent, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  // Known custom application error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Prisma unique constraint violation (e.g. P2002)
  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'campo único';
    res.status(409).json({
      success: false,
      code: 'DUPLICATE_KEY',
      message: `Ya existe un registro con el mismo valor para: ${target}.`,
    });
    return;
  }

  // Prisma record not found (e.g. P2025)
  if (err.code === 'P2025') {
    res.status(404).json({
      success: false,
      code: 'NO_ENCONTRADO',
      message: 'El registro solicitado no fue encontrado en la base de datos.',
    });
    return;
  }

  // Default internal server error (never leak raw stack or sensitive database connection strings)
  console.error('[ErrorHandler] Error no controlado:', err.message || err);
  res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Error interno del servidor. Intente nuevamente más tarde.',
  });
};
