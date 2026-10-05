# 📚 JINStock

> **Sistema web de gestión para una librería/papelería de útiles escolares en Nicaragua.**

JINStock es una aplicación web moderna diseñada para facilitar la administración de una librería nicaragüense dedicada principalmente a la venta de **útiles escolares, papelería y productos relacionados**.

El sistema busca centralizar la gestión de productos, inventario, compras y ventas en una plataforma sencilla, rápida, segura y adaptable a diferentes dispositivos.

JINStock se desarrolla como proyecto académico de **Ingeniería de Software**, aplicando principios de arquitectura de software, diseño UX/UI, seguridad, persistencia de datos, desarrollo web moderno y buenas prácticas de ingeniería.

---

## 🎯 Objetivo del proyecto

El objetivo principal de JINStock es desarrollar un sistema que permita a una librería:

- Controlar sus productos.
- Administrar categorías.
- Gestionar proveedores.
- Registrar compras.
- Registrar ventas.
- Controlar existencias.
- Consultar movimientos de inventario.
- Mantener información centralizada.
- Continuar realizando operaciones básicas cuando exista una interrupción temporal de Internet.

El sistema debe priorizar:

**simplicidad + velocidad + seguridad + facilidad de uso + disponibilidad.**

---

## 🏪 Contexto del negocio

JINStock está pensado para una **librería/papelería nicaragüense**.

En este contexto, "librería" no se refiere exclusivamente a una tienda de libros. El negocio comercializa principalmente productos como:

- Cuadernos
- Lápices
- Lapiceros
- Borradores
- Sacapuntas
- Mochilas
- Papelería
- Materiales escolares
- Artículos de arte y manualidades
- Otros útiles escolares

El sistema debe reflejar este contexto comercial y evitar asumir que el negocio funciona como una biblioteca o una librería especializada únicamente en libros.

---

# 👥 Usuarios del sistema

JINStock tendrá inicialmente **dos roles principales**.

## 👑 Administrador

Tiene acceso a las funciones administrativas del sistema.

Puede:

- Gestionar productos.
- Gestionar categorías.
- Gestionar proveedores.
- Consultar y gestionar inventario.
- Registrar y consultar compras.
- Consultar ventas.
- Gestionar usuarios.
- Consultar información general del sistema.

## 🧾 Cajero

Está orientado principalmente a las operaciones de venta.

Puede:

- Consultar productos.
- Consultar disponibilidad.
- Registrar ventas.
- Consultar las operaciones necesarias para realizar su trabajo.

El cajero **no debe tener acceso a funciones administrativas sensibles**.

---

# 🧩 Alcance del MVP

El proyecto tiene un alcance aproximado de **10 semanas**, por lo que el desarrollo debe concentrarse en las funcionalidades esenciales.

## Módulos principales

```text
JINStock
│
├── Autenticación
├── Dashboard
├── Productos
├── Categorías
├── Proveedores
├── Compras
├── Ventas
├── Inventario
└── Usuarios
```

### 1. Autenticación

- Inicio de sesión.
- Cierre de sesión.
- Gestión de sesión.
- Recuperación de acceso mediante el sistema de autenticación.
- Control de acceso por rol.

### 2. Productos

- Crear producto.
- Editar producto.
- Consultar producto.
- Activar/desactivar producto.
- Asignar categoría.
- Definir precio.
- Definir existencia.
- Definir stock mínimo.

### 3. Categorías

- Crear categoría.
- Editar categoría.
- Consultar categorías.
- Activar/desactivar categoría.

### 4. Proveedores

- Registrar proveedor.
- Editar proveedor.
- Consultar proveedor.
- Asociar productos/procesos de compra.

### 5. Compras

Permite registrar el ingreso de mercancía al negocio.

```text
Proveedor
    ↓
Compra
    ↓
Detalle de compra
    ↓
Productos + cantidades + costos
    ↓
Actualización de inventario
```

### 6. Ventas

Permite registrar las ventas realizadas.

```text
Cajero
   ↓
Selecciona productos
   ↓
Carrito
   ↓
Calcula total
   ↓
Confirma venta
   ↓
Registra venta
   ↓
Actualiza inventario
```

### 7. Inventario

Debe permitir:

- Consultar existencias.
- Identificar productos con bajo stock.
- Registrar entradas.
- Registrar salidas.
- Consultar movimientos.
- Mantener consistencia entre compras, ventas y existencias.

---

# 📱 Diseño multiplataforma

JINStock será una aplicación **responsive**.

Debe funcionar correctamente en:

- 🖥️ Computadoras
- 📱 Teléfonos
- 📲 Tablets

La interfaz debe adaptarse al tamaño de pantalla sin sacrificar las funcionalidades principales.

El diseño debe priorizar:

- UX clara.
- Navegación sencilla.
- Botones accesibles.
- Formularios comprensibles.
- Tablas adaptables.
- Estados visuales claros.
- Feedback inmediato.
- Diseño consistente.

---

# 🌐 PWA y arquitectura Offline-First

JINStock será desarrollado como una **Progressive Web App (PWA)** con enfoque **offline-first**.

La aplicación debe poder mantener determinadas operaciones básicas cuando exista una interrupción temporal de Internet.

Tecnologías previstas:

```text
Service Worker
       +
IndexedDB
       +
Sincronización
       +
API REST
```

## Funcionamiento esperado

### Con conexión

```text
JINStock
   ↓
API
   ↓
PostgreSQL / Neon
```

### Sin conexión

```text
JINStock
   ↓
IndexedDB
   ↓
Operaciones locales
```

### Cuando regresa Internet

```text
Internet recuperado
        ↓
Detectar conexión
        ↓
Sincronizar operaciones
        ↓
Servidor
        ↓
Base de datos
```

La sincronización debe diseñarse cuidadosamente para evitar:

- Duplicación de ventas.
- Pérdida de información.
- Conflictos de inventario.
- Registros duplicados.

---

# 🏗️ Arquitectura

La arquitectura principal seguirá una separación por capas:

```text
┌───────────────────────────────┐
│           React               │
│          Frontend             │
└───────────────┬───────────────┘
                │
                │ HTTP / REST
                ▼
┌───────────────────────────────┐
│       Node.js + Express       │
│           Backend             │
└───────────────┬───────────────┘
                │
                │ Prisma ORM
                ▼
┌───────────────────────────────┐
│       PostgreSQL / Neon       │
└───────────────────────────────┘
```

La autenticación se integra mediante:

```text
React
  ↓
Neon Auth
  ↓
Sesión / credenciales
  ↓
Express
  ↓
Autorización por rol
```

**No se debe implementar un sistema JWT casero si Neon Auth ya proporciona el mecanismo de autenticación necesario.**

---

# 🔐 Autenticación y autorización

## Autenticación

La autenticación será responsabilidad de:

**Neon Auth / Better Auth**

Esto evita implementar manualmente:

- Hash de contraseñas.
- Gestión de sesiones.
- Recuperación de contraseña.
- Verificación.
- Rotación de tokens.
- Infraestructura de autenticación.

## JWT

JINStock **no implementará JWT manualmente como sistema propio de autenticación**.

JWT puede existir como parte de la infraestructura utilizada por Neon Auth cuando sea necesario, pero el proyecto no debe crear su propio mecanismo de:

```text
login → generar JWT → guardar JWT → refresh JWT
```

## Autorización

La autenticación responde:

> "¿Quién es este usuario?"

La autorización responde:

> "¿Qué puede hacer?"

JINStock debe implementar autorización basada en roles:

```text
Administrador
      │
      ├── Gestión
      ├── Inventario
      ├── Compras
      ├── Ventas
      └── Usuarios

Cajero
      │
      └── Ventas
```

**Nunca se debe confiar únicamente en la interfaz de React para proteger permisos.**

Los permisos también deben validarse en el backend.

---

# 🗄️ Base de datos

La base de datos será:

**PostgreSQL sobre Neon**

El acceso desde el backend se realizará mediante:

**Prisma ORM**

## Entidades principales

El modelo debe contemplar como mínimo:

```text
Usuario / referencia al usuario autenticado
        │
        └── Rol

Categoría
    │
    └── Productos

Proveedor
    │
    └── Compras
          │
          └── DetalleCompra
                │
                └── Producto

Venta
   │
   └── DetalleVenta
          │
          └── Producto

Producto
   │
   └── MovimientosInventario
```

---

# 📦 Inventario

El inventario es uno de los componentes centrales de JINStock.

No se debe limitar a almacenar únicamente:

```text
producto.stock
```

Debe existir un concepto de **movimiento de inventario**.

Ejemplo:

```text
Compra
   ↓
ENTRADA +20

Venta
   ↓
SALIDA -3

Ajuste
   ↓
AJUSTE -2
```

Esto permite conocer no solamente cuánto existe actualmente, sino **por qué cambió la existencia**.

---

# 🛒 Ventas

Una venta debe manejar:

```text
Venta
├── Fecha
├── Usuario/Cajero
├── Total
└── Detalles
     ├── Producto
     ├── Cantidad
     ├── Precio
     └── Subtotal
```

El sistema debe validar que exista suficiente inventario antes de confirmar una venta.

La actualización de venta + detalle + inventario debe manejarse de forma transaccional cuando corresponda.

---

# 📥 Compras

Una compra debe manejar:

```text
Compra
├── Proveedor
├── Fecha
├── Total
└── Detalles
     ├── Producto
     ├── Cantidad
     ├── Costo
     └── Subtotal
```

Una compra confirmada debe producir la entrada correspondiente al inventario.

---

# 🤖 Inteligencia Artificial

JINStock contempla dos escenarios:

### ☁️ Gemini API

Para funcionalidades de IA cuando exista conexión a Internet.

```text
JINStock
   ↓
Backend
   ↓
Gemini API
```

### 📴 Gemma

Se contempla la exploración de **Gemma** para determinadas funcionalidades que puedan ejecutarse localmente/offline.

La IA no debe convertirse en una dependencia crítica para:

- Registrar ventas.
- Actualizar inventario.
- Registrar compras.
- Autenticar usuarios.

Las operaciones principales del negocio deben funcionar independientemente de la disponibilidad de la IA.

---

# 🎨 Identidad visual

JINStock debe tener una identidad moderna, amigable y relacionada con:

- Educación.
- Papelería.
- Organización.
- Tecnología.
- Cercanía.
- Crecimiento.

## Concepto del isotipo

La **S de JINStock** será el elemento principal del isotipo.

Sin embargo, **no debe utilizarse una representación literal o genérica de una "S"**.

El concepto debe buscar una construcción visual relacionada con:

```text
S
│
├── páginas
├── conocimiento
├── organización
├── movimiento
└── stock
```

El isotipo debe ser:

- Simple.
- Memorable.
- Reproducible.
- Funcional a tamaños pequeños.
- Adecuado para favicon/app.
- Diferenciable del texto JINStock.

---

# 🎨 Paleta visual actual

La dirección visual actual abandona el amarillo y los tonos anaranjados.

### Azul principal

`#1E3A8A`

Representa:

- Confianza
- Estabilidad
- Tecnología

### Lavanda

`#A78BFA`

Representa:

- Creatividad
- Educación
- Cercanía

### Turquesa

`#14B8A6`

Representa:

- Frescura
- Innovación
- Equilibrio

### Lavanda claro

`#EDE9FE`

Para:

- Fondos secundarios
- Tarjetas
- Estados suaves

### Fondo claro

`#F5F8FF`

Para:

- Fondos generales
- Espacios amplios
- Interfaces limpias

**No utilizar amarillo ni naranja como colores principales de la identidad.**

---

# 🔤 Tipografía

La dirección tipográfica debe mantener una personalidad amigable y moderna.

## Principal

**Nunito Rounded**

Utilizar principalmente para:

- Marca.
- Títulos.
- Encabezados.
- Elementos destacados.

## Secundaria

**Poppins**

Utilizar para:

- Textos generales.
- Formularios.
- Navegación.
- Etiquetas.
- Información secundaria.

---

# 🧑‍💻 Stack tecnológico

| Área | Tecnología |
|---|---|
| Frontend | React |
| Build | Vite |
| Lenguaje | TypeScript |
| Backend | Node.js |
| API | Express |
| ORM | Prisma |
| Base de datos | PostgreSQL |
| Hosting BD | Neon |
| Auth | Neon Auth / Better Auth |
| PWA | Service Worker |
| Offline | IndexedDB |
| IA online | Gemini API |
| IA offline | Gemma |
| Deploy | Vercel |
| Control de versiones | Git + GitHub |

---

# 📁 Estructura propuesta

```text
JINStock/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── pwa/
│   │   └── main.tsx
│   │
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middlewares/
│   │   ├── validators/
│   │   ├── utils/
│   │   └── server.ts
│   │
│   ├── prisma/
│   │   └── schema.prisma
│   │
│   └── package.json
│
├── docs/
│
├── .env.example
├── README.md
└── package.json
```

---

# 🔌 API REST

La API debe seguir una estructura consistente.

```text
/api/auth
/api/products
/api/categories
/api/suppliers
/api/purchases
/api/sales
/api/inventory
/api/users
```

Ejemplo:

```http
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
PATCH  /api/products/:id/status
DELETE /api/products/:id
```

Las respuestas deben mantener una estructura coherente.

Ejemplo:

```json
{
  "success": true,
  "data": {},
  "message": "Producto obtenido correctamente"
}
```

Los errores deben manejarse mediante códigos HTTP apropiados y mensajes comprensibles.

---

# 🛡️ Seguridad

La aplicación debe seguir buenas prácticas desde el inicio.

### Backend

- Validar todas las entradas.
- Validar permisos.
- No confiar en datos enviados desde React.
- Manejar errores sin revelar información sensible.
- Utilizar variables de entorno.
- No subir secretos al repositorio.
- Validar relaciones entre entidades.
- Utilizar consultas parametrizadas mediante Prisma.

### Frontend

Nunca almacenar información sensible innecesariamente.

No colocar:

```text
DATABASE_URL
API keys privadas
Secret keys
Credenciales
```

en el código del frontend.

---

# 🔑 Variables de entorno

Debe existir un:

```text
.env.example
```

pero nunca:

```text
.env
```

dentro del repositorio.

Ejemplo conceptual:

```env
DATABASE_URL=

NEON_AUTH_URL=

GEMINI_API_KEY=
```

Las claves reales deben configurarse únicamente en el entorno correspondiente.

---

# 🧪 Calidad y pruebas

El proyecto debe incluir pruebas progresivamente.

## Unitarias

Para:

- Cálculos.
- Validaciones.
- Reglas de negocio.
- Utilidades.

## Integración

Para:

- API.
- Base de datos.
- Compras.
- Ventas.
- Inventario.
- Autorización.

## E2E

Para flujos críticos:

```text
Login
 ↓
Seleccionar producto
 ↓
Realizar venta
 ↓
Actualizar inventario
 ↓
Consultar existencia
```

Y:

```text
Login
 ↓
Registrar compra
 ↓
Confirmar compra
 ↓
Actualizar inventario
```

---

# 📊 Reglas importantes del negocio

Estas reglas deben respetarse independientemente de la interfaz.

### Regla 1
No se puede vender una cantidad superior al inventario disponible.

### Regla 2
Una venta confirmada debe generar una salida de inventario.

### Regla 3
Una compra confirmada debe generar una entrada de inventario.

### Regla 4
Un cajero no puede ejecutar operaciones administrativas.

### Regla 5
Los productos inactivos no deben aparecer como disponibles para nuevas ventas.

### Regla 6
Las operaciones críticas deben evitar estados parcialmente guardados.

### Regla 7
Las operaciones offline deben sincronizarse sin generar duplicados.

---

# 🚫 Fuera del alcance inicial

Para mantener el proyecto dentro del tiempo establecido, **no agregar funcionalidades únicamente porque técnicamente sean posibles**.

No forman parte del MVP inicial:

- Marketplace público.
- Aplicación móvil nativa.
- Sistema contable completo.
- Nómina.
- Recursos humanos.
- Facturación fiscal electrónica completa.
- Programa de puntos.
- Ecommerce completo.
- Sistema avanzado de CRM.
- IA tomando decisiones automáticamente sobre inventario.
- Múltiples sucursales.
- Arquitectura de microservicios.

Estas funcionalidades podrían considerarse posteriormente, pero **no deben incorporarse automáticamente al MVP**.

---

# 📈 Evolución futura

JINStock debe construirse de forma que pueda crecer posteriormente hacia:

```text
JINStock MVP
      ↓
JINStock 1.0
      ↓
Multi-sucursal
      ↓
E-commerce
      ↓
Analítica avanzada
      ↓
IA empresarial
```

La arquitectura inicial debe evitar bloquear estas posibilidades, pero sin sobreingeniería.

---

# 🤖 INSTRUCCIONES PARA IA DE DESARROLLO

> **Esta sección está dirigida a Claude Code, Gemini, Cursor u otra IA que trabaje directamente sobre el código.**

## Regla principal

**No modificar el alcance funcional de JINStock sin una razón justificada.**

La IA debe actuar como un **ingeniero de software senior**, no simplemente como un generador de código.

Antes de implementar una funcionalidad debe considerar:

```text
Requisito
   ↓
Arquitectura
   ↓
Modelo de datos
   ↓
Reglas de negocio
   ↓
API
   ↓
Frontend
   ↓
Pruebas
```

## La IA debe:

- Mantener TypeScript.
- Mantener separación frontend/backend.
- Utilizar Prisma para acceso a datos.
- Mantener PostgreSQL como BD.
- Mantener Neon como plataforma de BD.
- Utilizar Neon Auth para autenticación.
- Mantener autorización en backend.
- Mantener arquitectura modular.
- Validar datos.
- Manejar errores.
- Crear código mantenible.
- Evitar duplicación.
- Escribir componentes reutilizables.
- Mantener responsive design.
- Considerar el funcionamiento offline.
- Crear pruebas para funcionalidades críticas.
- Documentar decisiones importantes.

## La IA NO debe:

- Crear un sistema JWT paralelo a Neon Auth.
- Crear otro proveedor de autenticación sin autorización.
- Modificar directamente el esquema `neon_auth`.
- Guardar contraseñas manualmente.
- Colocar secretos en el frontend.
- Eliminar datos existentes sin confirmación.
- Cambiar Prisma por otro ORM.
- Cambiar PostgreSQL por otra BD.
- Introducir Supabase como sustituto de Neon.
- Crear microservicios innecesarios.
- Agregar funcionalidades fuera del MVP por iniciativa propia.
- Romper la compatibilidad responsive.
- Ignorar el modo offline.
- Hacer que la IA sea necesaria para las operaciones críticas.

---

# 🧠 Principio de desarrollo

JINStock debe seguir el principio:

> **"Simple primero, correcto siempre y escalable cuando sea necesario."**

No se busca construir el sistema más grande posible.

Se busca construir un sistema:

**funcional → seguro → mantenible → usable → escalable.**

---

# 🚀 Flujo recomendado de desarrollo

```text
1. Configuración del proyecto
        ↓
2. Base de datos
        ↓
3. Prisma + migraciones
        ↓
4. Neon Auth
        ↓
5. Backend + API
        ↓
6. Autorización
        ↓
7. Productos
        ↓
8. Categorías
        ↓
9. Proveedores
        ↓
10. Compras
        ↓
11. Inventario
        ↓
12. Ventas
        ↓
13. PWA / Offline
        ↓
14. IA
        ↓
15. Testing
        ↓
16. Seguridad
        ↓
17. Deploy
```

---

# 👤 JINStock para el usuario común

## ¿Qué es JINStock?

JINStock es una herramienta creada para ayudar a una librería a organizar su negocio desde un solo lugar.

En lugar de llevar el control de productos, compras, ventas e inventario de forma dispersa, JINStock centraliza la información en una plataforma sencilla.

### ¿Qué puede hacer?

📦 **Controlar productos**

Saber qué productos existen y cuánto cuestan.

📊 **Controlar inventario**

Conocer qué productos están disponibles y cuáles necesitan reposición.

🛒 **Registrar ventas**

Realizar ventas de manera rápida.

📥 **Registrar compras**

Registrar la mercancía adquirida a proveedores.

👥 **Gestionar usuarios**

Controlar quién puede utilizar determinadas funciones.

📱 **Utilizar el sistema desde diferentes dispositivos**

Computadora, tablet o teléfono.

🌐 **Continuar trabajando ante interrupciones temporales de Internet**

Las funciones compatibles con el modo offline pueden continuar funcionando y sincronizarse cuando vuelva la conexión.

---

# 💡 Filosofía de JINStock

JINStock no pretende complicar el trabajo de una librería.

Pretende hacer que el trabajo sea:

> **Más organizado. Más rápido. Más claro.**

La tecnología debe adaptarse al negocio, no obligar al usuario a adaptarse a un sistema complicado.

---

# 📌 Estado del proyecto

| Campo | Información |
|---|---|
| **Proyecto** | JINStock |
| **Tipo** | Sistema web de gestión empresarial |
| **Sector** | Librería / papelería / útiles escolares |
| **País objetivo** | Nicaragua |
| **Proyecto académico** | Ingeniería de Software |
| **Alcance** | MVP académico con posibilidades de evolución |
| **Arquitectura** | React + Node.js/Express + Prisma + PostgreSQL/Neon |
| **Autenticación** | Neon Auth / Better Auth |
| **PWA** | Sí |
| **Offline-first** | Sí |
| **IA** | Gemini + exploración de Gemma |
| **Roles** | Administrador + Cajero |

---

# 📜 Licencia

Proyecto académico desarrollado con fines educativos y de demostración de conocimientos de Ingeniería de Software.
