import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { Rol } from '@prisma/client';

let DEMO_USERS_LIST = [
  {
    id: 'usr-admin-demo-001',
    nombre: 'Administrador Principal',
    email: 'admin@jinstock.ni',
    rol: 'ADMINISTRADOR' as Rol,
    estado: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-cajero-demo-002',
    nombre: 'Cajero Estación Central',
    email: 'cajero@jinstock.ni',
    rol: 'CAJERO' as Rol,
    estado: true,
    createdAt: new Date().toISOString(),
  },
];

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    let users: any[] = [];
    try {
      users = await prisma.usuario.findMany({
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
          estado: true,
          createdAt: true,
        },
        orderBy: { nombre: 'asc' },
      });
    } catch (dbErr) {
      users = DEMO_USERS_LIST;
    }

    res.json({
      success: true,
      data: users,
      message: 'Usuarios obtenidos correctamente',
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ success: false, message: 'Error interno al consultar usuarios.' });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      res.status(400).json({
        success: false,
        message: 'Nombre, correo electrónico y contraseña son campos obligatorios.',
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const assignedRol: Rol = rol === 'ADMINISTRADOR' ? 'ADMINISTRADOR' : 'CAJERO';
    const passwordHash = await bcrypt.hash(password, 10);

    let newUser: any = null;

    try {
      const existing = await prisma.usuario.findUnique({ where: { email: cleanEmail } });
      if (existing) {
        res.status(409).json({ success: false, message: 'Ya existe un usuario registrado con este correo.' });
        return;
      }

      newUser = await prisma.usuario.create({
        data: {
          nombre: nombre.trim(),
          email: cleanEmail,
          passwordHash,
          rol: assignedRol,
          estado: true,
        },
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
          estado: true,
          createdAt: true,
        },
      });
    } catch (dbErr) {
      newUser = {
        id: `usr-${Date.now()}`,
        nombre: nombre.trim(),
        email: cleanEmail,
        rol: assignedRol,
        estado: true,
        createdAt: new Date().toISOString(),
      };
      DEMO_USERS_LIST.push(newUser);
    }

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'Usuario registrado exitosamente',
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ success: false, message: 'Error al registrar usuario.' });
  }
};

export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    let updatedUser: any = null;

    try {
      const current = await prisma.usuario.findUnique({ where: { id } });
      if (!current) {
        res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        return;
      }

      updatedUser = await prisma.usuario.update({
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
    } catch (dbErr) {
      const idx = DEMO_USERS_LIST.findIndex((u) => u.id === id);
      if (idx !== -1) {
        DEMO_USERS_LIST[idx].estado = !DEMO_USERS_LIST[idx].estado;
        updatedUser = DEMO_USERS_LIST[idx];
      } else {
        res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        return;
      }
    }

    res.json({
      success: true,
      data: updatedUser,
      message: `Usuario ${updatedUser.estado ? 'activado' : 'desactivado'} correctamente`,
    });
  } catch (error) {
    console.error('Error al cambiar estado de usuario:', error);
    res.status(500).json({ success: false, message: 'Error interno.' });
  }
};
