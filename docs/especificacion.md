# JINStock

Sistema Web PWA **Offline-First** para la gestión de ventas e inventario de una librería y papelería en Nicaragua.

> **JINStock** busca centralizar productos, inventario, compras, proveedores y ventas en una aplicación web moderna, responsive y preparada para funcionar incluso cuando no existe conexión a Internet.

---

## 1. Objetivo del proyecto

Construir una aplicación web PWA para una librería/papelería que permita administrar las operaciones principales del negocio desde PC, tablet y teléfono, utilizando una única interfaz responsive.

El sistema debe priorizar:

- Simplicidad de uso.
- Buena experiencia de usuario (UX).
- Interfaz moderna y futurista, pero apropiada para una librería/papelería.
- Arquitectura modular y mantenible.
- Seguridad.
- Funcionamiento Offline-First para operaciones esenciales.
- Sincronización automática cuando vuelva la conexión.
- Asistencia inteligente mediante Gemini cuando exista conexión.
- Posibilidad futura de ejecutar un modelo Gemma localmente para funciones de IA offline.

---

# 2. Stack tecnológico oficial

## Frontend

- React
- Vite
- JavaScript o TypeScript (preferiblemente TypeScript)
- React Router
- Tailwind CSS
- PWA
- Service Worker
- IndexedDB

## Backend

- Node.js
- Express.js
- API REST
- JWT para autenticación
- bcrypt para contraseñas
- Validación de datos mediante Zod u otra librería equivalente

## ORM / Base de datos

- Prisma ORM
- PostgreSQL
- Neon PostgreSQL para producción

## Inteligencia Artificial

### Online

- Gemini API
- La API Key debe permanecer exclusivamente en el backend.
- El frontend nunca debe comunicarse directamente con Gemini.

### Offline — etapa posterior

- Modelo Gemma ejecutado localmente.
- La implementación concreta debe evaluarse según el tamaño del modelo, capacidades de los dispositivos y soporte del navegador.
- Gemma offline NO debe ser requisito para que el MVP principal funcione.

## Deploy

- Frontend: Vercel
- Backend: Vercel
- PostgreSQL: Neon

GitHub Pages NO será el destino principal del frontend.

---

# 3. Arquitectura general

```text
                         JINSTOCK
                            │
             ┌──────────────┴──────────────┐
             │                             │
        FRONTEND                         BACKEND
      React + Vite                  Node.js + Express
             │                             │
          PWA/API                         │
             │                             │
             └────────── HTTPS ────────────┘
                                           │
                                         Prisma
                                           │
                                           ▼
                                   PostgreSQL / Neon
                                           │
                                           │
                              ┌────────────┴────────────┐
                              │                         │
                         Gemini API                 Datos BD
                           ONLINE
```

Arquitectura Offline-First:

```text
                  INTERNET DISPONIBLE
                         │
                         ▼
React/PWA ───────► Express API ───────► Prisma ───────► PostgreSQL
   │
   │
   │ SIN INTERNET
   ▼
IndexedDB
   │
   ├── Productos sincronizados
   ├── Precios
   ├── Stock local
   └── Ventas pendientes
            │
            │ vuelve Internet
            ▼
      Cola de sincronización
            │
            ▼
       Express API
            │
            ▼
        PostgreSQL
```

---

# 4. Roles del sistema

JINStock tendrá solamente **dos roles**.

## 4.1 Administrador

Permisos:

- Iniciar sesión.
- Gestionar productos.
- Gestionar categorías.
- Gestionar proveedores.
- Registrar y consultar compras.
- Consultar y gestionar inventario.
- Consultar ventas.
- Consultar dashboard.
- Consultar estadísticas básicas.
- Utilizar el módulo de inteligencia artificial.

## 4.2 Cajero

Permisos:

- Iniciar sesión.
- Consultar productos.
- Consultar precios.
- Registrar ventas.
- Registrar ventas sin conexión.
- Consultar sus propias ventas.
- Consultar información necesaria para realizar una venta.

El cajero NO debe tener permisos para:

- Crear/eliminar productos.
- Gestionar proveedores.
- Registrar compras.
- Modificar configuraciones administrativas.
- Utilizar funciones administrativas de IA.

---

# 5. Módulos principales

## 5.1 Autenticación

Debe incluir:

- Login.
- Logout.
- Protección de rutas.
- JWT.
- Control de acceso según rol.
- Contraseñas almacenadas de forma segura mediante hash.
- Manejo adecuado de sesiones/token.

---

## 5.2 Productos

CRUD de productos.

Cada producto puede contener como mínimo:

- ID.
- Código/barcode opcional.
- Nombre.
- Descripción opcional.
- Categoría.
- Precio de compra.
- Precio de venta.
- Stock actual.
- Stock mínimo.
- Estado.
- Fecha de creación.
- Fecha de actualización.

Debe permitir:

- Crear producto.
- Editar producto.
- Desactivar producto.
- Consultar producto.
- Buscar producto.
- Filtrar por categoría.
- Filtrar por stock.
- Consultar productos con stock bajo.
- Consultar productos agotados.

No eliminar físicamente productos que ya tengan movimientos históricos; preferir desactivación lógica.

---

# 6. Categorías

CRUD sencillo.

Ejemplos:

- Cuadernos.
- Lápices.
- Lapiceros.
- Mochilas.
- Arte.
- Manualidades.
- Papelería.
- Oficina.
- Escolar.

Las categorías deben poder relacionarse con múltiples productos.

---

# 7. Proveedores

Información mínima:

- ID.
- Nombre/empresa.
- Teléfono.
- Correo.
- Dirección opcional.
- Estado.

Operaciones:

- Crear.
- Editar.
- Consultar.
- Desactivar.
- Buscar.

---

# 8. Compras

El administrador podrá registrar compras.

Flujo:

```text
Seleccionar proveedor
        ↓
Agregar productos
        ↓
Definir cantidades
        ↓
Definir costo
        ↓
Calcular total
        ↓
Confirmar compra
        ↓
Aumentar inventario
```

Una compra debe tener:

- Proveedor.
- Fecha.
- Usuario que registró.
- Total.
- Estado.
- Detalles.

Cada detalle:

- Producto.
- Cantidad.
- Costo unitario.
- Subtotal.

Al confirmar una compra:

```text
stock actual + cantidad comprada = nuevo stock
```

La actualización debe realizarse dentro de una transacción.

---

# 9. Ventas / Punto de venta

El sistema debe contar con una interfaz rápida y clara para el cajero.

Flujo:

```text
Buscar producto
      ↓
Agregar al carrito
      ↓
Modificar cantidad
      ↓
Calcular subtotal
      ↓
Calcular total
      ↓
Seleccionar método de pago
      ↓
Confirmar venta
      ↓
Descontar inventario
      ↓
Generar comprobante simple
```

Métodos de pago:

- Efectivo.
- Tarjeta.
- Transferencia.

No se requiere integración con bancos, POS físicos ni pasarelas de pago.

Una venta debe registrar:

- Usuario/cajero.
- Fecha.
- Total.
- Método de pago.
- Estado.
- Detalles.

Cada detalle:

- Producto.
- Cantidad.
- Precio unitario.
- Subtotal.

Al confirmar:

```text
stock actual - cantidad vendida = nuevo stock
```

La operación debe realizarse dentro de una transacción.

---

# 10. Inventario

Debe mostrar:

- Stock actual.
- Stock mínimo.
- Productos con stock bajo.
- Productos agotados.
- Entradas.
- Salidas.
- Historial básico de movimientos.

Los movimientos pueden originarse principalmente por:

- Compra.
- Venta.

No construir un sistema de inventario excesivamente complejo en el MVP.

---

# 11. Dashboard

El administrador debe tener un dashboard sencillo y visual.

Indicadores sugeridos:

- Ventas del día.
- Ventas del mes.
- Total de productos.
- Productos con stock bajo.
- Productos agotados.
- Productos más vendidos.

Gráficos básicos:

- Ventas por período.
- Productos más vendidos.
- Estado del inventario.

No saturar el dashboard.

Debe priorizar información útil para tomar decisiones rápidas.

---

# 12. Offline-First

El sistema debe poder continuar realizando operaciones esenciales aunque se pierda temporalmente Internet.

## Operaciones offline del MVP

El cajero debe poder:

- Consultar productos previamente sincronizados.
- Consultar precios previamente sincronizados.
- Consultar stock local.
- Registrar ventas.
- Guardar ventas pendientes de sincronización.

El sistema debe almacenar las operaciones pendientes en IndexedDB.

Estados sugeridos:

```text
PENDIENTE
   ↓
SINCRONIZANDO
   ↓
SINCRONIZADO
```

En caso de error:

```text
ERROR
   ↓
REINTENTAR
```

## Sincronización

Cuando vuelva Internet:

```text
IndexedDB
    ↓
Cola de operaciones
    ↓
API REST
    ↓
Validación
    ↓
Prisma
    ↓
PostgreSQL
```

La sincronización debe ser idempotente para evitar duplicar ventas.

Cada operación offline deberá contar con un identificador único generado en el cliente.

---

# 13. Manejo de conflictos

No implementar un sistema complejo de resolución de conflictos.

Para el MVP:

- Las ventas offline deben conservar su identificador único.
- El servidor debe validar la operación antes de persistirla.
- Si una operación no puede sincronizarse, debe quedar marcada como ERROR.
- El sistema debe permitir reintentar.
- Los errores deben quedar visibles para el usuario autorizado.

Debe documentarse claramente la estrategia de sincronización.

---

# 14. PWA

La aplicación debe ser instalable como PWA.

Debe incluir:

- Manifest.
- Service Worker.
- Cache de recursos necesarios.
- IndexedDB.
- Indicador visual de estado de conexión.
- Comportamiento responsive.

Debe funcionar correctamente en:

- PC.
- Laptop.
- Tablet.
- Smartphone.

No crear aplicaciones nativas independientes para Android, iOS o Windows.

---

# 15. Inteligencia Artificial

## Gemini Online

La IA será una funcionalidad complementaria para el administrador.

Su principal función será analizar información de inventario y ventas y generar recomendaciones.

Ejemplos:

> ¿Qué productos debería reponer esta semana?

> ¿Cuáles productos tienen mayor riesgo de agotarse?

> ¿Qué productos se están vendiendo más?

> Analiza las ventas del último mes.

La IA debe recibir datos relevantes del sistema y devolver recomendaciones comprensibles.

### Regla importante

La IA **NO debe modificar directamente** productos, inventario, compras o ventas.

La IA recomienda.

El usuario decide y ejecuta la acción.

---

# 16. IA offline con Gemma

La integración de Gemma queda como una segunda etapa.

Objetivo:

```text
Con Internet
     ↓
Gemini API

Sin Internet
     ↓
Gemma local
```

La funcionalidad offline de IA deberá implementarse solamente después de que:

1. El sistema principal funcione.
2. El modo Offline-First funcione.
3. La sincronización funcione.
4. Gemini online esté integrado.

No sacrificar funcionalidades principales para implementar Gemma.

---

# 17. Seguridad

Requisitos mínimos:

- Passwords con hash.
- JWT.
- Variables sensibles en `.env`.
- Nunca incluir `GEMINI_API_KEY` en React.
- Nunca incluir `DATABASE_URL` en React.
- Validar datos en backend.
- Autorización por roles.
- CORS configurado correctamente.
- No confiar en validaciones exclusivamente del frontend.
- Manejar errores sin exponer información sensible.
- Utilizar HTTPS en producción.

Arquitectura de IA:

```text
React
  │
  ▼
Express
  │
  ▼
Gemini API
```

Nunca:

```text
React
  │
  └────► Gemini API
```

---

# 18. Variables de entorno

## Frontend

```env
VITE_API_URL=https://jinstock-api.vercel.app
```

No colocar secretos aquí.

## Backend

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
GEMINI_API_KEY="..."
```

Los valores reales nunca deben subirse a GitHub.

---

# 19. Estructura sugerida del proyecto

```text
JINStock/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── offline/
│   │   ├── routes/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middlewares/
│   │   ├── validators/
│   │   ├── utils/
│   │   └── app.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── package.json
│
├── docs/
│   ├── requisitos.md
│   ├── arquitectura.md
│   ├── api.md
│   └── offline-first.md
│
├── .gitignore
└── README.md
```

La estructura puede adaptarse si existe una razón técnica clara.

---

# 20. Modelo inicial de datos

Entidades principales:

```text
Usuario
Rol
Categoria
Producto
Proveedor
Compra
DetalleCompra
Venta
DetalleVenta
MovimientoInventario
```

Relaciones conceptuales:

```text
ROL 1 ───────── N USUARIO

CATEGORIA 1 ─── N PRODUCTO

PROVEEDOR 1 ─── N COMPRA
COMPRA 1 ────── N DETALLE_COMPRA
PRODUCTO 1 ──── N DETALLE_COMPRA

USUARIO 1 ───── N VENTA
VENTA 1 ─────── N DETALLE_VENTA
PRODUCTO 1 ──── N DETALLE_VENTA

PRODUCTO 1 ──── N MOVIMIENTO_INVENTARIO
```

El esquema definitivo debe normalizarse y revisarse antes de crear migraciones.

Prisma será la fuente de implementación del modelo físico, pero el diseño conceptual y lógico debe existir también en la documentación del proyecto.

---

# 21. API REST

Ejemplos de endpoints:

```text
POST   /api/auth/login

GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
PATCH  /api/products/:id/status

GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id

GET    /api/suppliers
POST   /api/suppliers
PUT    /api/suppliers/:id

GET    /api/purchases
GET    /api/purchases/:id
POST   /api/purchases

GET    /api/sales
GET    /api/sales/:id
POST   /api/sales

GET    /api/inventory
GET    /api/inventory/movements

GET    /api/dashboard

POST   /api/ai/inventory-analysis

POST   /api/sync
```

Los endpoints definitivos deben definirse conforme se implementen los módulos.

---

# 22. UX/UI

La interfaz debe sentirse:

- Moderna.
- Limpia.
- Futurista.
- Amigable.
- Profesional.
- Juvenil sin parecer una aplicación infantil.
- Fácil de utilizar por un cajero.
- Clara para un administrador.

Evitar:

- Exceso de gradientes.
- Exceso de sombras.
- Neón exagerado.
- Interfaces visualmente saturadas.
- Demasiados colores simultáneamente.
- Texto pequeño.
- Tablas difíciles de leer.
- Animaciones innecesarias.

El diseño debe ser "futurista funcional", no futurista por exceso de efectos.

---

# 23. Paleta oficial

La paleta proporcionada para JINStock es:

| Color | HEX | Uso conceptual |
|---|---|---|
| Azul principal | `#1E3A8A` | Marca, navegación, acciones principales |
| Lavanda | `#A788F4` | Acentos, estados secundarios, elementos creativos |
| Celeste | `#5F8FFF` | Acciones secundarias, información, gráficos |
| Coral | `#FF6B6B` | Alertas, acciones de atención, estados importantes |
| Amarillo | `#FDD835` | Destacados, indicadores positivos, acentos |
| Azul oscuro | `#172554` | Texto fuerte, sidebar, fondos profundos |

### Regla visual

El azul principal y azul oscuro deben dominar la identidad.

Lavanda y celeste deben utilizarse como acentos.

Coral y amarillo deben utilizarse de manera controlada para llamar la atención.

No convertir toda la interfaz en un arcoíris.

---

# 24. Identidad visual

Concepto:

**Una librería/papelería moderna que conecta aprendizaje, organización y tecnología.**

La interfaz puede utilizar elementos visuales inspirados sutilmente en:

- Hojas de papel.
- Cuadernos.
- Escritura.
- Tarjetas.
- Organización.
- Material escolar.

Pero debe evitar parecer una plataforma educativa infantil.

JINStock es un sistema administrativo profesional.

---

# 25. Responsive design

La interfaz debe diseñarse pensando en tres contextos:

### Desktop

- Sidebar.
- Dashboard amplio.
- Tablas completas.
- POS optimizado para teclado/mouse.

### Tablet

- Sidebar adaptable.
- Tablas simplificadas.
- Controles táctiles.

### Mobile

- Navegación compacta.
- Cards.
- Tablas convertidas a listas cuando sea necesario.
- Botones grandes.
- POS táctil.
- Acciones prioritarias visibles.

---

# 26. Reglas de desarrollo con IA

Claude Code será utilizado como asistente de programación.

No generar todo el sistema de una sola vez.

Trabajar por módulos.

Antes de modificar código:

1. Leer la estructura existente.
2. Leer documentación relacionada.
3. Identificar dependencias.
4. Explicar qué archivos se modificarán.
5. Implementar.
6. Ejecutar pruebas/lint/build cuando corresponda.
7. Revisar posibles regresiones.

No cambiar arquitectura o tecnologías sin justificarlo.

No introducir dependencias innecesarias.

No crear funcionalidades que no estén dentro del alcance.

---

# 27. Orden recomendado de implementación

```text
FASE 1
Requisitos + documentación

FASE 2
Modelo de datos + Prisma

FASE 3
Backend + autenticación

FASE 4
Productos + categorías

FASE 5
Proveedores + compras

FASE 6
Inventario

FASE 7
Ventas / POS

FASE 8
Frontend completo

FASE 9
PWA + IndexedDB

FASE 10
Sincronización Offline-First

FASE 11
Dashboard

FASE 12
Gemini Online

FASE 13
Gemma Offline (si el tiempo y la viabilidad técnica lo permiten)

FASE 14
Testing + seguridad + deploy
```

---

# 28. Qué NO construir en el MVP

Para evitar crecimiento innecesario del alcance:

- No crear un tercer rol.
- No crear aplicación móvil independiente.
- No crear aplicación de escritorio independiente.
- No integrar bancos.
- No integrar POS físicos.
- No implementar facturación electrónica.
- No implementar múltiples empresas.
- No crear un CRM completo.
- No crear un sistema avanzado de clientes.
- No implementar pagos online.
- No hacer un sistema complejo de devoluciones.
- No hacer auditoría avanzada.
- No hacer notificaciones push como requisito.
- No hacer IA que modifique automáticamente los datos.
- No hacer IA generativa para todas las áreas del sistema.

El MVP debe mantenerse enfocado en:

**productos + inventario + compras + proveedores + ventas + dashboard + Offline-First + IA de inventario.**

---

# 29. Deploy

Arquitectura de producción:

```text
                    INTERNET
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
 Vercel - React/PWA         Vercel - Express
          │                         │
          │ HTTPS                  │
          └───────────┬─────────────┘
                      │
                    Prisma
                      │
                      ▼
                Neon PostgreSQL
```

El frontend utiliza:

```env
VITE_API_URL
```

para conocer la URL pública del backend.

El backend utiliza:

```env
DATABASE_URL
GEMINI_API_KEY
JWT_SECRET
```

para conectarse a sus servicios.

---

# 30. Criterio principal del proyecto

JINStock debe ser una aplicación que realmente pueda utilizar una librería/papelería pequeña o mediana.

La tecnología debe estar al servicio del negocio.

Prioridades:

1. Correctitud de ventas e inventario.
2. Experiencia de usuario.
3. Funcionamiento offline.
4. Seguridad.
5. Mantenibilidad.
6. IA como valor agregado.

No sacrificar las operaciones principales por funcionalidades llamativas.

---

# 31. Prompt de contexto para Claude Code

Claude Code debe tratar este README como documento base del proyecto.

Antes de realizar cambios importantes:

- Revisar este README.
- Respetar el stack tecnológico.
- Respetar los dos roles.
- Respetar el alcance MVP.
- No inventar módulos.
- No modificar arquitectura sin justificarlo.
- Mantener separación frontend/backend.
- Mantener secretos únicamente en backend.
- Utilizar Prisma para acceso a PostgreSQL.
- Mantener las operaciones críticas transaccionales.
- Considerar Offline-First desde el diseño, no como un parche posterior.
- Escribir código claro, modular y mantenible.
- Priorizar seguridad y validación backend.
- No introducir dependencias innecesarias.

Cuando exista una decisión técnica que pueda afectar significativamente la arquitectura, explicar primero la decisión y sus consecuencias antes de implementarla.
