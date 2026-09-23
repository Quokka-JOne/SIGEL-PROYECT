# Arquitectura — JINStock

**Versión:** 0.1 (FASE 1)
**Fecha:** 2026-09-18
**Documento base:** [especificacion.md](especificacion.md) §3, §17, §19, §29

---

## 1. Vista general

JINStock es una aplicación de dos piezas desplegadas por separado en Vercel,
con una única base de datos PostgreSQL gestionada en Neon.

```text
┌────────────────────────────────────────────────────────────────┐
│  NAVEGADOR (PC · tablet · smartphone)                          │
│                                                                │
│   React + Vite  ──► Service Worker ──► Cache de recursos       │
│        │                   │                                   │
│        │                   └────────► IndexedDB                │
│        │                              (catálogo + cola)        │
│        └── fetch (JWT en Authorization) ─┐                     │
└──────────────────────────────────────────┼─────────────────────┘
                                           │ HTTPS
                                           ▼
┌────────────────────────────────────────────────────────────────┐
│  BACKEND — Express sobre funciones serverless de Vercel        │
│                                                                │
│   routes ──► middlewares ──► validators ──► controllers        │
│   (URL)     (auth, rol,      (Zod)          (HTTP)             │
│              CORS, errores)                     │              │
│                                                 ▼              │
│                                             services           │
│                                        (reglas de negocio,     │
│                                          transacciones)        │
│                                                 │              │
│                                    ┌────────────┴───────┐      │
│                                    ▼                    ▼      │
│                              Prisma Client        Gemini API   │
└────────────────────────────────────┼───────────────────────────┘
                                     ▼
                            Neon PostgreSQL
```

El frontend **nunca** habla con Gemini ni con PostgreSQL. Ambos accesos pasan
por el backend, que es el único que conoce las credenciales (especificación §17).

---

## 2. Capas del backend

El flujo de una petición es siempre el mismo y cada capa tiene una sola
responsabilidad. Esto es lo que permite probar las reglas de negocio sin
levantar un servidor HTTP.

| Capa | Carpeta | Responsabilidad | No hace |
|---|---|---|---|
| Rutas | `src/routes/` | Mapear URL + método a un controlador y declarar los roles autorizados. | Lógica. |
| Middlewares | `src/middlewares/` | Verificar el JWT, autorizar por rol, CORS, y traducir errores a respuestas HTTP. | Consultas a la base. |
| Validadores | `src/validators/` | Esquemas Zod de cada payload. Es la frontera de confianza. | Reglas de negocio. |
| Controladores | `src/controllers/` | Leer la petición validada, invocar un servicio, dar forma a la respuesta. | Acceder a Prisma. |
| Servicios | `src/services/` | Reglas de negocio y transacciones. Única capa que usa Prisma. | Saber que existe HTTP. |
| Utilidades | `src/utils/` | Dinero, fechas, errores de dominio, cliente Prisma compartido. | — |

**Regla dura:** un controlador no importa `PrismaClient` y un servicio no
recibe `req`/`res`. Si un servicio necesita saber quién ejecuta la acción,
recibe el `usuarioId` como parámetro.

### 2.1 Errores

Los servicios lanzan errores de dominio tipados (`StockInsuficienteError`,
`RecursoNoEncontradoError`, `ConflictoDeVersionError`). Un único middleware de
error los traduce a códigos HTTP. Ningún `catch` devuelve el mensaje crudo de
PostgreSQL o de Prisma al cliente (especificación §17, RNF-05).

### 2.2 Transacciones

Toda operación que mueva stock se ejecuta dentro de `prisma.$transaction`, e
incluye en el mismo bloque atómico:

1. La cabecera del documento (`Compra` o `Venta`).
2. Sus detalles.
3. El `UPDATE` de `Producto.stockActual`.
4. El registro en `MovimientoInventario`.

Si cualquiera de los cuatro falla, no queda nada a medias. Esta es la
prioridad 1 de la especificación §30 y el requisito RNF-01.

---

## 3. Capas del frontend

```text
pages/        Una pantalla por ruta. Compone, no calcula.
layouts/      Armazón con sidebar (escritorio) o navegación compacta (móvil).
routes/       Definición de rutas y guardas por rol.
components/   Piezas reutilizables sin conocimiento del dominio.
hooks/        Estado y efectos reutilizables (useAuth, useConexion, useCarrito).
services/     Cliente HTTP. Único lugar que sabe la forma de la API.
offline/      IndexedDB, cola de sincronización, registro del service worker.
store/        Estado global mínimo: sesión y estado de conexión.
utils/        Formato de moneda y fechas, helpers puros.
```

La carpeta `offline/` es la frontera importante: **el resto de la aplicación no
sabe si hay red**. Los componentes del POS llaman a un repositorio que decide
si va contra la API o contra IndexedDB, y devuelve la misma forma de datos en
ambos casos. Sin esa frontera, la condición "¿hay internet?" se filtraría a
cada pantalla y el modo offline se volvería imposible de mantener.

---

## 4. Decisiones arquitectónicas

Formato: decisión, alternativas consideradas, consecuencia.

### AD-01 — Monorepo con dos paquetes independientes

`frontend/` y `backend/` tienen su propio `package.json` y se despliegan como
dos proyectos de Vercel.

*Alternativa:* un solo paquete con workspaces compartiendo tipos.
*Por qué no:* la especificación §31 exige separación estricta y la ventaja real de los
workspaces (tipos compartidos) es modesta frente al costo de configurar el
build en Vercel para dos targets distintos.
*Consecuencia:* los tipos de la API se duplican. Se mitiga manteniendo los
contratos documentados en [api.md](api.md) como fuente única.

### AD-02 — Offline-first desde el diseño, no como parche

IndexedDB no es un caché opcional: es el almacenamiento primario del POS. El
cajero siempre escribe primero en local y la sincronización es un proceso
aparte.

*Alternativa:* intentar la petición y caer a local solo si falla.
*Por qué no:* produce dos rutas de código con semánticas distintas y hace que
los bugs solo aparezcan con red intermitente — el caso más frecuente en la
práctica.
*Consecuencia:* incluso con internet, una venta pasa por la cola local. El
costo es una escritura extra en IndexedDB; la ganancia es un único camino de
código, probado todo el tiempo.

### AD-03 — Idempotencia por clave del cliente

Cada venta lleva un UUID generado en el navegador. `POST /api/sales` es
idempotente respecto a esa clave.

*Alternativa:* deduplicar por (usuario, fecha, total).
*Por qué no:* dos ventas idénticas legítimas seguidas serían descartadas.
*Consecuencia:* la tabla `ventas` tiene una restricción única extra. Resuelve
RF-39 sin ninguna tabla auxiliar de sincronización.

### AD-04 — Stock denormalizado más libro mayor

`Producto.stockActual` se mantiene actualizado y `MovimientoInventario`
registra cada cambio con stock anterior y posterior.

*Alternativa:* calcular el stock sumando movimientos en cada consulta.
*Por qué no:* el POS necesita el stock en milisegundos y en cada búsqueda.
*Consecuencia:* hay un dato que puede desincronizarse. Se acota escribiendo
ambos siempre en la misma transacción (§2.2), lo que permite reconstruir y
auditar el valor denormalizado cuando haga falta.

### AD-05 — El estado de sincronización vive en el cliente

Los estados `PENDIENTE`, `SINCRONIZANDO`, `SINCRONIZADO` y `ERROR` del
especificación §12 son columnas de IndexedDB, no de PostgreSQL.

*Alternativa:* una tabla `operacion_sincronizacion` en el servidor.
*Por qué no:* al servidor no le importa que una venta haya estado en cola; solo
necesita rechazar duplicados, y para eso basta AD-03.
*Consecuencia:* el historial de reintentos se pierde si el usuario limpia los
datos del navegador. Aceptable: no es auditoría, y el §28 excluye la auditoría
avanzada del MVP.

### AD-06 — Prisma como único acceso a datos

Sin SQL crudo salvo para agregaciones de dashboard que Prisma no exprese bien,
y en ese caso con `$queryRaw` parametrizado, nunca con interpolación de
cadenas.

*Consecuencia:* cumple RNF-12 y elimina de raíz la inyección SQL.

### AD-07 — Dinero en Decimal, jamás en Float

`Decimal(12,2)` en PostgreSQL, `Prisma.Decimal` en TypeScript. Los totales se
calculan **en el servidor** a partir de los precios de la base; el total que
manda el cliente se usa solo para verificar que coincida.

*Consecuencia:* hay que convertir a string al serializar en JSON. Barato al
lado de un céntimo perdido por redondeo binario.

### AD-08 — JWT sin refresh token en el MVP

Un único token de acceso con vencimiento de 8 horas, cubriendo una jornada
laboral.

*Alternativa:* access + refresh token con rotación.
*Por qué no:* la especificación §5.1 pide "manejo adecuado de sesiones/token", no
rotación; y un refresh token que expire durante un corte de red dejaría al
cajero sin poder vender.
*Consecuencia:* revocar un usuario no invalida su token hasta que expire. Se
mitiga verificando `usuario.activo` en cada petición autenticada.

---

## 5. Seguridad transversal

| Frontera | Control |
|---|---|
| Navegador → API | JWT en `Authorization: Bearer`, CORS restringido al origen del frontend, HTTPS obligatorio. |
| API → lógica | Validación Zod de todo payload antes de llegar al controlador. |
| Lógica → datos | Prisma con consultas parametrizadas. |
| API → Gemini | Clave solo en el entorno del backend. Se envían datos agregados de inventario, no la base completa. |
| Respuestas | Nunca incluyen `passwordHash` ni detalles internos de error. |

La autorización se implementa como un middleware que recibe la lista de roles
permitidos y se prueba contra la matriz rol × módulo de
[requisitos.md](requisitos.md#5-matriz-rol--módulo).

---

## 6. Despliegue

| Componente | Destino | Variables |
|---|---|---|
| Frontend | Proyecto Vercel (build de Vite) | `VITE_API_URL` |
| Backend | Proyecto Vercel (funciones serverless) | `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `CORS_ORIGIN` |
| Base de datos | Neon PostgreSQL | — |

Dos detalles propios de serverless que hay que respetar:

- **Cliente Prisma reutilizado.** Cada invocación en frío crea una conexión
  nueva; con suficientes invocaciones se agota el límite de Neon. El cliente se
  instancia una sola vez en un módulo de `utils/` y se reutiliza.
- **Pooler para runtime, conexión directa para migraciones.** `DATABASE_URL`
  apunta al pooler de Neon; `DIRECT_URL` a la conexión directa, porque el
  pooler no admite las sentencias DDL que ejecuta `prisma migrate`.

Las migraciones se aplican con `prisma migrate deploy` como paso previo al
despliegue, nunca automáticamente al arrancar una función.
