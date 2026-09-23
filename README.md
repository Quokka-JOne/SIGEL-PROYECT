# JINStock

**Sistema de ventas e inventario para librerías y papelerías, que sigue funcionando cuando se cae el internet.**

JINStock es una aplicación web instalable (PWA) que centraliza productos,
inventario, compras, proveedores y ventas de una librería/papelería. Está
pensada para el contexto nicaragüense, donde la conexión no siempre es estable:
el cajero puede seguir vendiendo sin internet y las ventas se sincronizan solas
cuando la conexión vuelve.

Funciona en PC, laptop, tablet y celular con una sola interfaz.

---

## Funcionalidades

El sistema tiene dos tipos de usuario, cada uno con su propia vista.

### 👔 Administrador

Quien administra el negocio.

| Módulo | Qué puede hacer |
|---|---|
| **Productos** | Crear, editar y buscar productos con código de barras, precio de compra, precio de venta y stock mínimo. Los productos con historial se desactivan, no se borran. |
| **Categorías** | Organizar el catálogo: cuadernos, lápices, mochilas, arte, oficina, escolar… |
| **Proveedores** | Registrar a quién le compra, con teléfono, correo y dirección. |
| **Compras** | Registrar una compra a un proveedor. Al confirmarla, el stock sube automáticamente. |
| **Inventario** | Ver stock actual, productos por debajo del mínimo, productos agotados y el historial de entradas y salidas de cada producto. |
| **Ventas** | Consultar todas las ventas del negocio, con filtros por fecha, cajero y método de pago. |
| **Dashboard** | Ventas del día y del mes, productos más vendidos, alertas de stock bajo y gráficos de ventas por período. |
| **Asistente con IA** | Preguntarle al sistema qué reponer esta semana o qué productos están por agotarse, y recibir recomendaciones en lenguaje claro. |

### 🧾 Cajero

Quien atiende el mostrador.

| Módulo | Qué puede hacer |
|---|---|
| **Punto de venta** | Buscar un producto por nombre o código, agregarlo al carrito, ajustar cantidades y cobrar. |
| **Métodos de pago** | Efectivo, tarjeta o transferencia. |
| **Comprobante** | Generar un comprobante simple de cada venta. |
| **Venta sin internet** | Cobrar normalmente aunque no haya conexión. |
| **Mis ventas** | Consultar las ventas que registró. |

El cajero **no** puede crear productos, gestionar proveedores, registrar compras
ni ver el dashboard. Son dos roles y nada más: no hay un tercero.

### 🤖 El asistente de IA solo recomienda

La IA analiza el inventario y las ventas para sugerir, por ejemplo, qué reponer.
**Nunca modifica nada por su cuenta**: no cambia precios, no ajusta stock, no
registra compras. Recomienda, y la persona decide.

---

## Cómo funciona sin internet

Esta es la característica central del sistema.

```text
  1. Se cae el internet
         │
         ▼
  2. El cajero sigue vendiendo con normalidad.
     Cada venta se guarda en el navegador
     y queda en una cola de espera.
         │
         ▼
  3. Vuelve el internet
         │
         ▼
  4. Las ventas se envían al servidor solas,
     en orden, y el inventario se actualiza.
```

Qué ve el usuario:

- Un **indicador de conexión** siempre visible: en línea, sin conexión o
  sincronizando.
- Un **contador** de cuántas ventas están esperando ser enviadas.
- Si alguna venta no se pudo sincronizar (por ejemplo, porque ya no había stock),
  aparece marcada con el motivo y se puede **reintentar**.

Ninguna venta se pierde, y ninguna se cobra dos veces: cada venta lleva un
identificador único, así que reenviarla nunca la duplica.

Qué **no** funciona sin internet: el dashboard, la gestión de productos y
proveedores, el registro de compras y el asistente de IA. Todo eso necesita
conexión.

El detalle técnico completo está en [docs/offline-first.md](docs/offline-first.md).

---

## 🛠️ Tecnologías

| Capa | Herramientas |
|---|---|
| Frontend | React · Vite · TypeScript · React Router · Tailwind CSS · PWA (Service Worker + IndexedDB) |
| Backend | Node.js · Express · TypeScript · JWT · bcrypt · Zod |
| Base de datos | PostgreSQL (Neon) con Prisma ORM |
| IA | Gemini API (en línea) · Gemma local (etapa posterior, opcional) |
| Despliegue | Vercel (frontend y backend) · Neon (base de datos) |

---

## 🚀 Puesta en marcha

### Requisitos previos

| Requisito | Versión | Cómo verificar |
|---|---|---|
| Node.js | 20 o superior | `node -v` |
| npm | 10 o superior | `npm -v` |
| Git | cualquiera reciente | `git --version` |
| Cuenta en [Neon](https://neon.tech) | gratuita | — |
| API Key de [Google AI Studio](https://aistudio.google.com/apikey) | opcional | Solo para la IA (fase 12) |

No necesitás instalar PostgreSQL en tu computadora: Neon lo aloja en la nube y
su plan gratuito alcanza de sobra para desarrollo.

### Paso 1 — Clonar el proyecto

```bash
git clone <url-del-repositorio>
cd JINStock
```

### Paso 2 — Crear la base de datos en Neon

1. Entrá a [neon.tech](https://neon.tech) y creá una cuenta.
2. Creá un proyecto nuevo llamado `jinstock`.
3. En el panel del proyecto, buscá **Connection string**. Vas a necesitar **dos**
   variantes de la misma cadena:
   - **Pooled connection** — el host incluye `-pooler`. Es la que usa la
     aplicación.
   - **Direct connection** — sin `-pooler`. Es la que usa Prisma para crear las
     tablas.
4. Copiá ambas; las vas a pegar en el paso siguiente.

> **¿Por qué dos?** Neon no permite crear ni modificar tablas a través del
> *pooler*. Si usás solo la cadena *pooled*, las migraciones fallan con un error
> confuso. Con las dos configuradas, todo funciona.

### Paso 3 — Configurar el backend

```bash
cd backend
npm install
cp .env.example .env
```

Abrí `backend/.env` y completá:

```env
DATABASE_URL="postgresql://usuario:clave@host-pooler.neon.tech/jinstock?sslmode=require"
DIRECT_URL="postgresql://usuario:clave@host.neon.tech/jinstock?sslmode=require"
JWT_SECRET="pegá-acá-el-secreto-generado-abajo"
GEMINI_API_KEY=""
CORS_ORIGIN="http://localhost:5173"
PORT=3000
NODE_ENV="development"
```

Para generar `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`GEMINI_API_KEY` podés dejarla vacía por ahora: solo hace falta en la fase 12.

### Paso 4 — Crear las tablas

```bash
npm run db:migrate -- --name modelo_inicial
npm run db:seed
```

El primer comando crea las 10 tablas del modelo. El segundo carga los datos
base: los dos roles y nueve categorías de ejemplo.

Para comprobar que quedó bien:

```bash
npm run db:studio
```

Abre Prisma Studio en el navegador, donde podés ver las tablas y sus datos.

### Paso 5 — Frontend

⬜ **Todavía no disponible.** El frontend se construye en la fase 8. La carpeta
`frontend/` tiene la estructura preparada pero aún no hay aplicación que
levantar.

---

## 🔑 Variables de entorno

### Backend (`backend/.env`)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | ✅ | Cadena *pooled* de Neon. La usa la aplicación en ejecución. |
| `DIRECT_URL` | ✅ | Cadena *directa* de Neon. La usa Prisma para migraciones. |
| `JWT_SECRET` | ✅ | Secreto para firmar los tokens de sesión. |
| `JWT_EXPIRES_IN` | ➖ | Duración del token. Por defecto `8h`, una jornada laboral. |
| `GEMINI_API_KEY` | ➖ | Clave de la API de Gemini. Sin ella, la IA se desactiva y el resto sigue funcionando. |
| `CORS_ORIGIN` | ✅ | URL del frontend autorizada a consumir la API. |
| `PORT` | ➖ | Puerto local. Por defecto `3000`. |
| `NODE_ENV` | ➖ | `development` o `production`. |

### Frontend (`frontend/.env.local`)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `VITE_API_URL` | ✅ | URL pública del backend. |

### 🔒 Regla de seguridad que no se negocia

**Ningún secreto va en el frontend.** Todo lo que lleve el prefijo `VITE_` queda
incrustado en el código que se descarga al navegador y **cualquiera puede
leerlo**. Por eso:

| | |
|---|---|
| ❌ Nunca en el frontend | `GEMINI_API_KEY`, `DATABASE_URL`, `JWT_SECRET` |
| ✅ Solo en el frontend | `VITE_API_URL` |

El navegador nunca habla directamente con Gemini ni con la base de datos: todo
pasa por el backend, que es el único que conoce las credenciales.

Los archivos `.env` están en `.gitignore` y **no deben subirse nunca** al
repositorio. Solo se versionan los `.env.example`, sin valores reales.

---

## 📜 Comandos disponibles

Desde la carpeta `backend/`:

| Comando | Qué hace |
|---|---|
| `npm run db:migrate` | Crea o actualiza las tablas según el schema (desarrollo). |
| `npm run db:deploy` | Aplica migraciones ya existentes (producción). |
| `npm run db:seed` | Carga los roles y categorías base. Se puede repetir sin duplicar. |
| `npm run db:studio` | Abre Prisma Studio para explorar la base de datos. |
| `npm run db:generate` | Regenera el cliente de Prisma tras cambiar el schema. |
| `npm run db:validate` | Verifica que el schema sea válido y esté bien formateado. |
| `npm run typecheck` | Revisa los tipos de TypeScript sin compilar. |

---

## 📁 Estructura del proyecto

```text
JINStock/
├── backend/                 API REST
│   ├── prisma/
│   │   ├── schema.prisma    Modelo de datos (10 entidades)
│   │   └── seed.ts          Datos base: roles y categorías
│   └── src/
│       ├── routes/          URLs y roles autorizados
│       ├── middlewares/     Autenticación, permisos, errores
│       ├── validators/      Validación de datos de entrada
│       ├── controllers/     Traducción HTTP ↔ negocio
│       ├── services/        Reglas de negocio y transacciones
│       └── utils/           Utilidades compartidas
│
├── frontend/                Aplicación web PWA
│   └── src/
│       ├── pages/           Pantallas
│       ├── layouts/         Armazón de la interfaz
│       ├── components/      Piezas reutilizables
│       ├── hooks/           Lógica de estado reutilizable
│       ├── services/        Cliente de la API
│       ├── offline/         IndexedDB y cola de sincronización
│       ├── store/           Sesión y estado de conexión
│       ├── routes/          Rutas y permisos
│       └── utils/           Formatos y ayudantes
│
└── docs/                    Documentación del proyecto
```

---

## 📚 Documentación

| Documento | Para qué sirve |
|---|---|
| [docs/especificacion.md](docs/especificacion.md) | **Especificación original del proyecto.** Es el documento base: define alcance, stack, roles, paleta e identidad visual. Cualquier cambio de arquitectura debe justificarse contra él. |
| [docs/requisitos.md](docs/requisitos.md) | Los 51 requisitos funcionales y 12 no funcionales, con criterios de aceptación. |
| [docs/arquitectura.md](docs/arquitectura.md) | Cómo está organizado el sistema y por qué se tomó cada decisión técnica. |
| [docs/modelo-datos.md](docs/modelo-datos.md) | Las 10 entidades, sus relaciones y el razonamiento detrás del diseño. |
| [docs/offline-first.md](docs/offline-first.md) | Cómo funciona la sincronización y cómo se evitan ventas duplicadas. |
| [docs/api.md](docs/api.md) | Contrato de todos los endpoints de la API. |

---

## 🎨 Identidad visual

La interfaz busca sentirse **moderna y profesional, sin caer en lo infantil ni en
lo estridente**: futurista por claridad, no por exceso de efectos.

| Color | HEX | Uso |
|---|---|---|
| Azul principal | `#1E3A8A` | Marca, navegación, acciones principales |
| Azul oscuro | `#172554` | Texto fuerte, barra lateral, fondos |
| Lavanda | `#A788F4` | Acentos y elementos creativos |
| Celeste | `#5F8FFF` | Acciones secundarias, información, gráficos |
| Coral | `#FF6B6B` | Alertas y estados que requieren atención |
| Amarillo | `#FDD835` | Destacados e indicadores positivos |

Los azules dominan; lavanda y celeste acentúan; coral y amarillo se usan con
moderación. La interfaz no debe volverse un arcoíris.

Más detalle en [docs/especificacion.md](docs/especificacion.md) §22–§25.

---

## ☁️ Despliegue

El proyecto se despliega como **dos proyectos separados de Vercel** más la base
de datos en Neon.

```text
        Vercel                 Vercel               Neon
   ┌──────────────┐      ┌──────────────┐      ┌────────────┐
   │  Frontend    │─────►│   Backend    │─────►│ PostgreSQL │
   │  React/PWA   │HTTPS │   Express    │      └────────────┘
   └──────────────┘      └──────┬───────┘
                                │
                                ▼
                          Gemini API
```

1. **Backend:** nuevo proyecto de Vercel con raíz `backend/`. Configurá
   `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `GEMINI_API_KEY` y `CORS_ORIGIN`
   en las variables de entorno del proyecto.
2. **Frontend:** nuevo proyecto de Vercel con raíz `frontend/`. Configurá
   `VITE_API_URL` con la URL pública del backend.
3. **Migraciones:** se aplican con `npm run db:deploy` antes de desplegar, nunca
   de forma automática al arrancar.

GitHub Pages no se usa: no sirve para el backend y complica la instalación de la
PWA.

---

## ❓ Problemas comunes

**`Environment variable not found: DIRECT_URL`**
Falta `DIRECT_URL` en `backend/.env`. Copiá la cadena *directa* de Neon (la que
**no** tiene `-pooler` en el host).

**Las migraciones fallan o se quedan colgadas**
Estás usando la cadena *pooled* en `DIRECT_URL`. Neon no permite crear tablas a
través del pooler. Revisá que `DIRECT_URL` apunte al host sin `-pooler`.

**`Can't reach database server`**
Verificá que la cadena termine en `?sslmode=require` y que el proyecto de Neon
no esté suspendido por inactividad; con la primera petición vuelve a despertar.

**La IA no responde**
Si `GEMINI_API_KEY` está vacía, el módulo de IA se desactiva a propósito. El
resto del sistema no se ve afectado.

**Cambié el schema y TypeScript se queja de tipos que no existen**
Corré `npm run db:generate` para regenerar el cliente de Prisma.

---

## 🤝 Cómo contribuir

El desarrollo avanza **por fases y por módulos**, nunca todo de golpe. Antes de
tocar código:

1. Leé la [especificación](docs/especificacion.md) y la documentación del módulo.
2. Revisá qué archivos se ven afectados y qué depende de ellos.
3. Implementá el cambio.
4. Corré las verificaciones (`npm run db:validate`, `npm run typecheck`).
5. Revisá que no se haya roto nada de lo anterior.

Reglas que no se cambian sin justificarlo por escrito:

- El stack tecnológico definido en la especificación.
- Los dos roles: no se agrega un tercero.
- Separación estricta entre frontend y backend.
- Los secretos viven solo en el backend.
- Todo acceso a PostgreSQL pasa por Prisma.
- Las operaciones que mueven stock son transaccionales.
- Sin dependencias innecesarias.

---

## 📄 Licencia y contexto

Proyecto académico desarrollado para la asignatura de Ingeniería de Software.
