/**
 * Semilla de datos base de JINStock.
 *
 * Solo carga los catálogos que el sistema necesita para arrancar:
 * los dos roles de la especificación §4 y las categorías de ejemplo del §6.
 *
 * El usuario administrador inicial se crea en la FASE 3 (autenticación),
 * cuando exista el servicio de hashing con bcrypt. Sembrar acá una
 * contraseña obligaría a agregar bcrypt antes de tiempo y, peor, a dejar
 * una credencial conocida en el repositorio.
 *
 * Es idempotente: `upsert` por nombre permite correrla varias veces.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROLES = [
  {
    nombre: "ADMINISTRADOR",
    descripcion:
      "Gestiona productos, categorías, proveedores, compras, inventario y usa el módulo de IA.",
  },
  {
    nombre: "CAJERO",
    descripcion:
      "Consulta productos y precios, y registra ventas con o sin conexión.",
  },
] as const;

const CATEGORIAS = [
  "Cuadernos",
  "Lápices",
  "Lapiceros",
  "Mochilas",
  "Arte",
  "Manualidades",
  "Papelería",
  "Oficina",
  "Escolar",
] as const;

async function main() {
  for (const rol of ROLES) {
    await prisma.rol.upsert({
      where: { nombre: rol.nombre },
      update: { descripcion: rol.descripcion },
      create: rol,
    });
  }
  console.log(`Roles sembrados: ${ROLES.length}`);

  for (const nombre of CATEGORIAS) {
    await prisma.categoria.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }
  console.log(`Categorías sembradas: ${CATEGORIAS.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Falló la semilla:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
