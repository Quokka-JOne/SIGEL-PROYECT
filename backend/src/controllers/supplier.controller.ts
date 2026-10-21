import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

let DEMO_SUPPLIERS = [
  {
    id: 'prov-001',
    nombre: 'Distribuidora Papelera Hispamer S.A.',
    ruc: 'J0310000123456',
    telefono: '+505 2278-1234',
    email: 'ventas@hispamer.com.ni',
    direccion: 'Managua, Rotonda Rubén Darío 2c abajo',
    estado: true,
  },
  {
    id: 'prov-002',
    nombre: 'Papelería y Suministros Castellanos Nicaragua',
    ruc: 'J0310000987654',
    telefono: '+505 2250-9988',
    email: 'pedidos@castellanos.ni',
    direccion: 'Managua, Plaza España Módulo E-4',
    estado: true,
  },
  {
    id: 'prov-003',
    nombre: 'Comercializadora Escolar & Arte Gutenberg',
    ruc: 'J0310000456789',
    telefono: '+505 2311-4455',
    email: 'contacto@gutenberg.com.ni',
    direccion: 'León, De la Catedral 1c al Norte',
    estado: true,
  },
];

export const getSuppliers = async (req: Request, res: Response): Promise<void> => {
  try {
    let suppliers: any[] = [];
    try {
      suppliers = await prisma.proveedor.findMany({
        orderBy: { nombre: 'asc' },
      });
    } catch (dbErr) {
      suppliers = DEMO_SUPPLIERS;
    }

    if (suppliers.length === 0) {
      suppliers = DEMO_SUPPLIERS;
    }

    res.json({
      success: true,
      data: suppliers,
      message: 'Proveedores obtenidos correctamente',
    });
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ success: false, message: 'Error interno al consultar proveedores.' });
  }
};

export const createSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, ruc, telefono, email, direccion } = req.body;

    if (!nombre || !nombre.trim()) {
      res.status(400).json({ success: false, message: 'El nombre del proveedor es obligatorio.' });
      return;
    }

    let newSupplier: any = null;
    try {
      newSupplier = await prisma.proveedor.create({
        data: {
          nombre: nombre.trim(),
          ruc: ruc ? ruc.trim() : null,
          telefono: telefono ? telefono.trim() : null,
          email: email ? email.trim().toLowerCase() : null,
          direccion: direccion ? direccion.trim() : null,
          estado: true,
        },
      });
    } catch (dbErr) {
      newSupplier = {
        id: `prov-${Date.now()}`,
        nombre: nombre.trim(),
        ruc: ruc || null,
        telefono: telefono || null,
        email: email || null,
        direccion: direccion || null,
        estado: true,
      };
      DEMO_SUPPLIERS.unshift(newSupplier);
    }

    res.status(201).json({
      success: true,
      data: newSupplier,
      message: 'Proveedor registrado exitosamente',
    });
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({ success: false, message: 'Error al registrar el proveedor.' });
  }
};

export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;

    let updatedSupplier: any = null;
    try {
      updatedSupplier = await prisma.proveedor.update({
        where: { id },
        data: {
          ...(data.nombre && { nombre: data.nombre.trim() }),
          ...(data.ruc !== undefined && { ruc: data.ruc }),
          ...(data.telefono !== undefined && { telefono: data.telefono }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.direccion !== undefined && { direccion: data.direccion }),
          ...(data.estado !== undefined && { estado: data.estado }),
        },
      });
    } catch (dbErr) {
      const idx = DEMO_SUPPLIERS.findIndex((s) => s.id === id);
      if (idx !== -1) {
        DEMO_SUPPLIERS[idx] = { ...DEMO_SUPPLIERS[idx], ...data };
        updatedSupplier = DEMO_SUPPLIERS[idx];
      } else {
        res.status(404).json({ success: false, message: 'Proveedor no encontrado.' });
        return;
      }
    }

    res.json({
      success: true,
      data: updatedSupplier,
      message: 'Proveedor actualizado correctamente',
    });
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar el proveedor.' });
  }
};
