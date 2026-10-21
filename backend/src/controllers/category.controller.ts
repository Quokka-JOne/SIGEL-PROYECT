import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// Fallback in-memory categories if DB connection is offline
const DEMO_CATEGORIES = [
  { id: 'cat-001', nombre: 'Cuadernos y Libreta', descripcion: 'Cuadernos engargolados, cosidos, universitarios y de materias', estado: true },
  { id: 'cat-002', nombre: 'Escritura y Corrección', descripcion: 'Lápices, lapiceros, marcadores, resaltadores y borradores', estado: true },
  { id: 'cat-003', nombre: 'Papelería y Resmas', descripcion: 'Resmas bond, cartulinas, foamy, papel de construcción y de regalo', estado: true },
  { id: 'cat-004', nombre: 'Mochilas y Estuches', descripcion: 'Mochilas escolares, cartucheras, loncheras y bultos', estado: true },
  { id: 'cat-005', nombre: 'Arte y Manualidades', descripcion: 'Pinturas acrílicas, acuarelas, pinceles, silicona y plastilina', estado: true },
];

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { includeInactive } = req.query;

    let categories: any[] = [];
    try {
      const whereClause = includeInactive === 'true' ? {} : { estado: true };
      categories = await prisma.categoria.findMany({
        where: whereClause,
        orderBy: { nombre: 'asc' },
        include: {
          _count: {
            select: { productos: true },
          },
        },
      });
    } catch (dbErr) {
      console.warn('⚠️ DB offline, retornando categorías de demostración.');
      categories = DEMO_CATEGORIES;
    }

    if (categories.length === 0) {
      categories = DEMO_CATEGORIES;
    }

    res.json({
      success: true,
      data: categories,
      message: 'Categorías obtenidas correctamente',
    });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ success: false, message: 'Error interno al obtener categorías.' });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre || !nombre.trim()) {
      res.status(400).json({ success: false, message: 'El nombre de la categoría es obligatorio.' });
      return;
    }

    const cleanNombre = nombre.trim();

    let category: any = null;
    try {
      const existing = await prisma.categoria.findUnique({ where: { nombre: cleanNombre } });
      if (existing) {
        res.status(409).json({ success: false, message: 'Ya existe una categoría con este nombre.' });
        return;
      }

      category = await prisma.categoria.create({
        data: {
          nombre: cleanNombre,
          descripcion: descripcion ? descripcion.trim() : null,
          estado: true,
        },
      });
    } catch (dbErr) {
      category = {
        id: `cat-${Date.now()}`,
        nombre: cleanNombre,
        descripcion: descripcion ? descripcion.trim() : null,
        estado: true,
      };
      DEMO_CATEGORIES.push(category);
    }

    res.status(201).json({
      success: true,
      data: category,
      message: 'Categoría creada exitosamente',
    });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ success: false, message: 'Error interno al crear categoría.' });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, estado } = req.body;

    let updatedCategory: any = null;
    try {
      updatedCategory = await prisma.categoria.update({
        where: { id },
        data: {
          ...(nombre && { nombre: nombre.trim() }),
          ...(descripcion !== undefined && { descripcion: descripcion ? descripcion.trim() : null }),
          ...(estado !== undefined && { estado }),
        },
      });
    } catch (dbErr) {
      const catIndex = DEMO_CATEGORIES.findIndex((c) => c.id === id);
      if (catIndex !== -1) {
        if (nombre) DEMO_CATEGORIES[catIndex].nombre = nombre.trim();
        if (descripcion !== undefined) DEMO_CATEGORIES[catIndex].descripcion = descripcion;
        if (estado !== undefined) DEMO_CATEGORIES[catIndex].estado = estado;
        updatedCategory = DEMO_CATEGORIES[catIndex];
      } else {
        res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
        return;
      }
    }

    res.json({
      success: true,
      data: updatedCategory,
      message: 'Categoría actualizada correctamente',
    });
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar categoría.' });
  }
};
