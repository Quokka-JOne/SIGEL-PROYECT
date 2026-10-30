import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { Rol } from '@prisma/client';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';

export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        estado: true,
        verificado: true,
        createdAt: true,
      },
      orderBy: { nombre: 'asc' },
    });

    res.json({
      success: true,
      data: users,
      message: 'Usuarios obtenidos correctamente.',
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      throw new ValidationError('Nombre, correo electrónico y contraseña son obligatorios.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const assignedRol: Rol = rol === 'ADMINISTRADOR' ? 'ADMINISTRADOR' : 'CAJERO';

    const existing = await prisma.usuario.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      throw new ConflictError('Ya existe un usuario registrado con este correo electrónico.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        email: cleanEmail,
        passwordHash,
        rol: assignedRol,
        estado: true,
        verificado: true, // Usuarios creados por el administrador quedan activos y verificados
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        estado: true,
        verificado: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: newUser,
      message: `Usuario ${newUser.nombre} (${newUser.rol}) registrado exitosamente.`,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      throw new ValidationError('No puede desactivar su propio usuario administrador en sesión.');
    }

    const current = await prisma.usuario.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundError('Usuario no encontrado.');
    }

    const updatedUser = await prisma.usuario.update({
      where: { id },
      data: { estado: !current.estado },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        estado: true,
      },
    });

    res.json({
      success: true,
      data: updatedUser,
      message: `Usuario '${updatedUser.nombre}' ${updatedUser.estado ? 'activado' : 'desactivado'} correctamente.`,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      throw new ValidationError('No puede eliminar su propia cuenta de administrador en sesión.');
    }

    const user = await prisma.usuario.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            ventas: true,
            compras: true,
            movimientos: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado.');
    }

    // Proteger cuenta principal de administrador del sistema
    if (user.email === 'admin@jinstock.ni' || (process.env.INITIAL_ADMIN_EMAIL && user.email === process.env.INITIAL_ADMIN_EMAIL)) {
      throw new ForbiddenError('No está permitido eliminar la cuenta raíz de administración del sistema.');
    }

    // Integridad contable: Si el usuario tiene ventas o compras históricas, no se debe borrar físicamente
    const totalRegistros = user._count.ventas + user._count.compras + user._count.movimientos;
    if (totalRegistros > 0) {
      throw new ConflictError(
        `No se puede eliminar permanentemente al usuario porque tiene historial operativo (${user._count.ventas} ventas, ${user._count.compras} compras, ${user._count.movimientos} movimientos de inventario). Puede desactivarlo para revocar su acceso sin comprometer la integridad contable.`
      );
    }

    await prisma.usuario.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: `Usuario '${user.nombre}' (${user.email}) eliminado permanentemente del sistema.`,
    });
  } catch (error) {
    next(error);
  }
};

