import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { Rol } from '@prisma/client';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors';

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
