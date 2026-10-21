# 📚 SIGEL / JINStock

> **Sistema Web Offline-First para la Gestión de Ventas e Inventario - JINStock (Nicaragua)**

[![Backend Tests](https://img.shields.io/badge/tests-vitest%20passing-brightgreen)](backend/tests/api.test.ts)
[![PWA Ready](https://img.shields.io/badge/PWA-offline--first-blue)](frontend/src/pwa/db.ts)
[![Architecture](https://img.shields.io/badge/stack-React%20%7C%20Express%20%7C%20Prisma%20%7C%20Dexie-purple)](README.md)

---

## 📌 1. Nomenclatura del Proyecto (M-10)
- **SIGEL** (*Sistema Integrado para la Gestión Escolar y Librerías*): Denominación oficial del proyecto académico de Ingeniería de Software.
- **JINStock**: Nombre comercial del producto de software y de la Progressive Web App (PWA) de cara a los usuarios finales y administradores de la librería.

---

## 🏪 2. Contexto del Negocio y Reglas Operativas (M-09)
El sistema está diseñado específicamente para una librería y papelería nicaragüense (comercialización de cuadernos, lápices, uniformes, mochilas, materiales de arte y papelería en general):
- **Moneda principal:** Córdobas (C$ NIO).
- **Soporte multimoneda:** Admite pagos en efectivo tanto en Córdobas como en Dólares estadounidenses (USD), calculando el vuelto en Córdobas según la tasa de cambio vigente configurada.
- **Impuesto:** IVA del 15% aplicado de forma configurable y desglosado en el comprobante de venta.
- **Continuidad de operaciones:** En caso de corte de energía o interrupción del enlace a Internet, el punto de venta (POS) continúa facturando de forma offline con catálogo local y sincroniza automáticamente las ventas al recuperar la conexión.

---

## 🏗️ 3. Arquitectura Técnica Implementada

### Frontend (PWA Offline-First)
- **Framework:** React 18 con TypeScript y Vite.
- **Base de Datos Local (IndexedDB):** [Dexie.js v2](frontend/src/pwa/db.ts) almacenando:
  - `products`: Catálogo sincronizado para búsqueda y validación fuera de línea.
  - `categories`: Categorías de inventario disponibles localmente.
  - `offlineSales`: Cola de ventas con control estricto de estados: `PENDIENTE`, `SINCRONIZANDO`, `SINCRONIZADO`, `REVISION` y `ERROR`.
- **Motor de Sincronización:** [syncService.ts](frontend/src/services/syncService.ts) que escucha el evento `online`, ejecuta reintentos periódicos y resuelve idempotencia en servidor.
- **Service Worker & Caché:** Gestión unificada con `vite-plugin-pwa` y Workbox. Precachea assets estáticos (HTML, JS, CSS, iconos) y excluye explícitamente `/api/*` (estrategia *NetworkOnly*) para delegar la persistencia de datos a Dexie.
- **Estilos:** Interfaz oscura consistente basada en tokens CSS modernos (`#100f14`, `#1c1b22`, `#A788F4`), accesible y responsiva.

### Backend (API REST)
- **Servidor:** Node.js, Express, TypeScript.
- **ORM & Base de Datos:** Prisma ORM conectado a PostgreSQL (Neon / Direct DB) con transacciones ACID.
- **Seguridad (C-05):**
  - **Autenticación:** JWT propio firmado con algoritmo HS256 (`jsonwebtoken`) y contraseñas cifradas mediante `bcryptjs` (cost factor 10).
  - **Firma segura obligatoria:** El servidor valida la presencia de `JWT_SECRET` al arrancar; se detiene inmediatamente si no está configurada o si es insegura.
  - **Protección HTTP:** Cabeceras de seguridad reforzadas con `helmet`, CORS configurable por origen (`CORS_ORIGIN`) y control de fuerza bruta mediante `express-rate-limit` en `/api/auth/login`.
  - **Cero puertas traseras:** Sin contraseñas demo hardcodeadas ni endpoints públicos de seed.
- **Concurrencia e Idempotencia (C-04):**
  - Búsqueda previa por `offlineId` en `prisma.venta.findUnique` para garantizar idempotencia estricta (RNF-07).
  - Descuentos de stock atómicos con condición WHERE (`stock: { gte: cantidad }`) evitando sobreventas o inventarios negativos.
  - Numeración secuencial de comprobantes en base de datos (`FAC-YYYY-XXXXX`).
  - Registro auditable de movimientos Kardex (`SALIDA`, `ENTRADA`, `AJUSTE`) con motivo, usuario y fecha.
- **Validación de Entradas (T-03):** Schemas con `zod` y middleware `validate(schema)` en todas las rutas operativas.

---

## 👥 4. Control de Acceso y Roles (M-02, M-03)

| Rol | Alcance y Vistas Permitidas |
| :--- | :--- |
| **CAJERO** | Acceso al Punto de Venta (`/pos`) y a sus propias ventas registradas (`/ventas`). No tiene acceso a compras, reportes de gerencia, ajustes de inventario ni administración de usuarios. |
| **ADMINISTRADOR** | Control total del sistema: Dashboard analítico (`/dashboard`), Punto de Venta (`/pos`), Inventario y Kardex (`/inventario`), Compras (`/compras`), Reportes y Cierre de Caja (`/reportes`), JIN Copilot (`/copilot`), y Usuarios (`/usuarios`). |

---

## 🚀 5. Puesta en Marcha y Configuración

### Prerrequisitos
- Node.js >= 18.x
- npm >= 9.x
- PostgreSQL >= 14 (o cuenta en Neon PostgreSQL)

### 1. Variables de Entorno

#### Backend (`backend/.env`):
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://usuario:password@host/neondb?sslmode=require"
DIRECT_URL="postgresql://usuario:password@host/neondb?sslmode=require"
JWT_SECRET="clave-super-secreta-produccion-minimo-32-caracteres"
CORS_ORIGIN="http://localhost:5173,http://localhost:4173"
ENABLE_KEEP_ALIVE="false"
KEEP_ALIVE_INTERVAL_MS="180000"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu-correo@gmail.com"
SMTP_PASS="tu-token-aplicacion"
```

#### Frontend (`frontend/.env`):
```env
VITE_API_URL="http://localhost:4000/api"
```

### 2. Instalación de Dependencias
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Base de Datos y Creación del Primer Administrador (C-05)
```bash
cd backend

# Generar cliente de Prisma
npx prisma generate

# Aplicar esquema
npx prisma db push

# Crear usuario Administrador inicial de forma segura desde terminal
npm run seed:admin

# Opcional: Cargar catálogo demo inicial de librería nicaragüense
npm run seed
```

### 4. Ejecución en Modo Desarrollo
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```
Acceder a: `http://localhost:5173`

---

## 🧪 6. Pruebas Automáticas del Backend (T-11 / Sección 6)
El proyecto cuenta con una suite de pruebas automatizadas con **Vitest** y **Supertest** cubriendo los 6 requisitos críticos de integridad y seguridad:
1. Descuento de inventario y movimiento `SALIDA` en venta exitosa.
2. Rechazo con código `STOCK_INSUFICIENTE` ante existencias faltantes.
3. Idempotencia: el reenvío del mismo `offlineId` devuelve la venta existente (200) sin duplicar.
4. Concurrencia atómica evitando stock negativo.
5. Protección 403 `FORBIDDEN` para cajeros en rutas administrativas.
6. Bloqueo de elevación de privilegios en el registro público.

Para ejecutar las pruebas:
```bash
cd backend
npm test
```

---

## 📦 7. Compilación y Validación PWA
Para validar el Service Worker unificado y la instalabilidad Lighthouse:
```bash
cd frontend
npm run build
npm run preview
```
Luego abrir las herramientas de desarrollo del navegador:
1. Pestaña **Application** -> **Service Workers** -> marcar casilla **Offline**.
2. Realizar búsquedas de productos y completar una venta: la venta quedará guardada como `PENDIENTE` en Dexie.
3. Desmarcar **Offline**: la venta se sincronizará automáticamente en menos de 20 segundos pasando a estado `SINCRONIZADO`.
