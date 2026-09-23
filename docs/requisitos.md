# Requisitos — JINStock

**Versión:** 0.1 (FASE 1)
**Fecha:** 2026-09-18
**Documento base:** [especificacion.md](especificacion.md)

Este documento traduce la especificación a requisitos verificables. Cada requisito
lleva un identificador estable para poder referenciarlo desde el código, los
commits y las pruebas. La columna *Origen* apunta a la sección de la especificación que
lo respalda: si un requisito no tiene origen, está fuera de alcance.

---

## 1. Alcance

JINStock es un sistema web PWA offline-first para la gestión de ventas e
inventario de una librería y papelería en Nicaragua.

**Dentro del MVP:** productos, categorías, inventario, proveedores, compras,
ventas/POS, dashboard, funcionamiento offline con sincronización, e IA de
inventario en línea.

**Fuera del MVP** (especificación §28): tercer rol, apps nativas, integración bancaria,
POS físico, facturación electrónica, multiempresa, CRM, pagos en línea,
devoluciones complejas, auditoría avanzada, notificaciones push, IA que
modifique datos.

---

## 2. Actores

| Actor | Descripción |
|---|---|
| Administrador | Dueño o encargado. Administra catálogo, compras, proveedores, inventario, consulta ventas y dashboard, y usa la IA. |
| Cajero | Atiende el mostrador. Consulta productos y precios y registra ventas, con o sin conexión. |
| Sistema | Procesos automáticos: sincronización de la cola offline y registro de movimientos de inventario. |

No existe un tercer rol ni un actor "cliente final": JINStock no gestiona
clientes (especificación §28).

---

## 3. Requisitos funcionales

### 3.1 Autenticación y autorización

| ID | Requisito | Actor | Origen |
|---|---|---|---|
| RF-01 | El sistema autentica con nombre de usuario y contraseña, y emite un JWT. | Ambos | §5.1 |
| RF-02 | Las contraseñas se almacenan únicamente como hash bcrypt. | Sistema | §5.1, §17 |
| RF-03 | Las rutas del frontend y los endpoints del backend están protegidos según el rol del usuario. | Sistema | §5.1 |
| RF-04 | El usuario puede cerrar sesión, invalidando el token en el cliente. | Ambos | §5.1 |
| RF-05 | Un usuario desactivado no puede iniciar sesión. | Sistema | §7 (patrón de estado) |

### 3.2 Productos

| ID | Requisito | Actor | Origen |
|---|---|---|---|
| RF-06 | El administrador crea, edita y consulta productos. | Administrador | §5.2 |
| RF-07 | El administrador desactiva productos en lugar de borrarlos cuando tienen movimientos históricos. | Administrador | §5.2 |
| RF-08 | Ambos roles buscan productos por nombre y por código de barras. | Ambos | §5.2, §9 |
| RF-09 | El listado de productos se filtra por categoría y por estado de stock. | Ambos | §5.2 |
| RF-10 | El sistema lista productos con stock por debajo del mínimo y productos agotados. | Administrador | §5.2, §10 |
| RF-11 | El cajero consulta productos y precios, pero no puede crearlos, editarlos ni desactivarlos. | Cajero | §4.2 |

### 3.3 Categorías

| ID | Requisito | Actor | Origen |
|---|---|---|---|
| RF-12 | El administrador crea, edita, consulta y desactiva categorías. | Administrador | §6 |
| RF-13 | Una categoría agrupa múltiples productos; un producto pertenece a una categoría. | Sistema | §6, §20 |

### 3.4 Proveedores

| ID | Requisito | Actor | Origen |
|---|---|---|---|
| RF-14 | El administrador crea, edita, consulta, busca y desactiva proveedores. | Administrador | §7 |

### 3.5 Compras

| ID | Requisito | Actor | Origen |
|---|---|---|---|
| RF-15 | El administrador registra una compra seleccionando proveedor, productos, cantidades y costos unitarios. | Administrador | §8 |
| RF-16 | El sistema calcula el subtotal por línea y el total de la compra en el servidor. | Sistema | §8 |
| RF-17 | Al confirmar una compra, el stock de cada producto aumenta en la cantidad comprada. | Sistema | §8 |
| RF-18 | El aumento de stock, el registro de la compra y sus movimientos de inventario ocurren en una sola transacción. | Sistema | §8 |
| RF-19 | El administrador consulta el historial de compras y el detalle de cada una. | Administrador | §8 |
| RF-20 | El cajero no tiene acceso al módulo de compras. | Cajero | §4.2 |

### 3.6 Ventas y punto de venta

| ID | Requisito | Actor | Origen |
|---|---|---|---|
| RF-21 | El cajero busca productos, los agrega a un carrito y modifica cantidades. | Cajero | §9 |
| RF-22 | El sistema calcula subtotales y total de la venta en el servidor. | Sistema | §9 |
| RF-23 | El cajero selecciona método de pago: efectivo, tarjeta o transferencia. | Cajero | §9 |
| RF-24 | Al confirmar una venta, el stock de cada producto disminuye en la cantidad vendida. | Sistema | §9 |
| RF-25 | El descuento de stock, el registro de la venta y sus movimientos ocurren en una sola transacción. | Sistema | §9 |
| RF-26 | El sistema genera un comprobante simple de la venta. | Cajero | §9 |
| RF-27 | El cajero consulta únicamente sus propias ventas; el administrador consulta todas. | Ambos | §4.1, §4.2 |
| RF-28 | El sistema rechaza una venta cuyo stock disponible sea insuficiente. | Sistema | §13, §30 |

### 3.7 Inventario

| ID | Requisito | Actor | Origen |
|---|---|---|---|
| RF-29 | El administrador consulta stock actual y stock mínimo de cada producto. | Administrador | §10 |
| RF-30 | El sistema registra un movimiento de inventario por cada entrada (compra) y salida (venta). | Sistema | §10 |
| RF-31 | El administrador consulta el historial básico de movimientos de un producto. | Administrador | §10 |

### 3.8 Dashboard

| ID | Requisito | Actor | Origen |
|---|---|---|---|
| RF-32 | El dashboard muestra ventas del día, ventas del mes, total de productos, productos con stock bajo y productos agotados. | Administrador | §11 |
| RF-33 | El dashboard muestra los productos más vendidos. | Administrador | §11 |
| RF-34 | El dashboard incluye gráficos de ventas por período, productos más vendidos y estado del inventario. | Administrador | §11 |

### 3.9 Offline-first

| ID | Requisito | Actor | Origen |
|---|---|---|---|
| RF-35 | Sin conexión, el cajero consulta productos, precios y stock previamente sincronizados. | Cajero | §12 |
| RF-36 | Sin conexión, el cajero registra ventas completas, que quedan en cola local. | Cajero | §12 |
| RF-37 | Cada operación offline lleva un identificador único generado en el cliente. | Sistema | §12, §13 |
| RF-38 | Al recuperar la conexión, el sistema envía la cola al servidor automáticamente. | Sistema | §12 |
| RF-39 | La sincronización es idempotente: reenviar una operación no duplica la venta. | Sistema | §12 |
| RF-40 | Una operación que no puede sincronizarse queda marcada como ERROR y es reintentable. | Sistema | §13 |
| RF-41 | Los errores de sincronización son visibles para el usuario. | Ambos | §13 |
| RF-42 | La interfaz muestra un indicador del estado de la conexión. | Ambos | §14 |

### 3.10 PWA

| ID | Requisito | Actor | Origen |
|---|---|---|---|
| RF-43 | La aplicación es instalable como PWA (manifest + service worker). | Ambos | §14 |
| RF-44 | El service worker cachea los recursos necesarios para operar sin red. | Sistema | §14 |
| RF-45 | La interfaz funciona en PC, laptop, tablet y smartphone con un único diseño responsive. | Ambos | §14, §25 |

### 3.11 Inteligencia artificial

| ID | Requisito | Actor | Origen |
|---|---|---|---|
| RF-46 | El administrador consulta a la IA recomendaciones sobre reposición y riesgo de agotamiento. | Administrador | §15 |
| RF-47 | El backend es el único que se comunica con la API de Gemini; el frontend nunca lo hace directamente. | Sistema | §15, §17 |
| RF-48 | La IA solo recomienda: no modifica productos, inventario, compras ni ventas. | Sistema | §15 |
| RF-49 | El cajero no tiene acceso a las funciones de IA. | Cajero | §4.2 |
| RF-50 | Si la IA no está disponible, el resto del sistema sigue operando con normalidad. | Sistema | §16, §30 |

### 3.12 Etapa posterior

| ID | Requisito | Actor | Origen |
|---|---|---|---|
| RF-51 | *(Opcional)* Sin conexión, la IA se atiende con un modelo Gemma local. | Administrador | §16 |

RF-51 depende de que RF-01 a RF-50 estén terminados y **no condiciona la
aceptación del MVP** (especificación §16).

---

## 4. Requisitos no funcionales

| ID | Categoría | Requisito | Origen |
|---|---|---|---|
| RNF-01 | Correctitud | Toda operación que altere stock ocurre dentro de una transacción de base de datos. Los importes se manejan con decimal de precisión fija, nunca punto flotante. | §8, §9, §30 |
| RNF-02 | Seguridad | Los secretos (`DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`) viven solo en variables de entorno del backend y no se versionan. | §17, §18 |
| RNF-03 | Seguridad | Toda entrada se valida en el backend con Zod; las validaciones del frontend son solo de experiencia de usuario. | §17 |
| RNF-04 | Seguridad | CORS restringido al origen del frontend. HTTPS obligatorio en producción. | §17 |
| RNF-05 | Seguridad | Los mensajes de error no exponen stack traces, SQL ni datos de otros usuarios. | §17 |
| RNF-06 | Usabilidad | El POS permite completar una venta con teclado en escritorio y con toques grandes en móvil. | §22, §25 |
| RNF-07 | Usabilidad | La interfaz respeta la paleta oficial (§23): azules dominantes, lavanda y celeste como acento, coral y amarillo controlados. | §23 |
| RNF-08 | Usabilidad | Se evita texto pequeño, tablas ilegibles, exceso de gradientes/sombras y animaciones innecesarias. | §22 |
| RNF-09 | Disponibilidad | Las operaciones esenciales del cajero funcionan sin Internet. | §12 |
| RNF-10 | Mantenibilidad | Separación estricta frontend/backend; código modular por dominio; sin dependencias innecesarias. | §26, §31 |
| RNF-11 | Portabilidad | Frontend y backend se despliegan en Vercel; la base de datos en Neon PostgreSQL. | §29 |
| RNF-12 | Trazabilidad | El acceso a PostgreSQL se hace exclusivamente vía Prisma. | §31 |

---

## 5. Matriz rol × módulo

| Módulo | Administrador | Cajero |
|---|---|---|
| Login / Logout | ✔ | ✔ |
| Productos — lectura | ✔ | ✔ |
| Productos — escritura | ✔ | ✘ |
| Categorías | ✔ | ✘ |
| Proveedores | ✔ | ✘ |
| Compras | ✔ | ✘ |
| Ventas — registrar | ✔ | ✔ |
| Ventas — consultar todas | ✔ | ✘ (solo las propias) |
| Inventario | ✔ | ✘ (solo stock del producto en el POS) |
| Dashboard | ✔ | ✘ |
| IA de inventario | ✔ | ✘ |
| Venta offline | ✔ | ✔ |

Esta matriz es la especificación del middleware de autorización: cada endpoint
declara los roles que lo pueden invocar y se prueba contra esta tabla.

---

## 6. Criterios de aceptación del MVP

El MVP se considera terminado cuando:

1. Un administrador puede registrar una compra y el stock aumenta exactamente
   en lo comprado, verificable en el historial de movimientos.
2. Un cajero puede completar una venta y el stock disminuye exactamente en lo
   vendido.
3. Con el servidor inalcanzable, un cajero registra tres ventas, recupera la
   conexión y las tres aparecen en PostgreSQL **una sola vez**.
4. Reenviar manualmente la misma venta sincronizada no crea un duplicado.
5. Un cajero autenticado recibe 403 al invocar cualquier endpoint de
   administración.
6. La aplicación se instala como PWA y arranca sin red.
7. El administrador obtiene una recomendación de reposición de la IA basada en
   datos reales del inventario.
8. No hay secretos en el bundle del frontend.

---

## 7. Supuestos y riesgos

**Supuestos**

- Un solo local y una sola caja concurrente. No hay reparto de stock entre
  sucursales.
- Moneda única: córdoba nicaragüense (NIO), sin conversión.
- Los precios no incluyen cálculo de impuestos desglosado: el MVP no hace
  facturación electrónica (§28).
- El reloj del dispositivo del cajero es razonablemente correcto; de él se toma
  la fecha de las ventas offline.

**Riesgos**

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Sobreventa: dos dispositivos venden offline la última unidad. | Stock negativo. | El servidor revalida stock al sincronizar y marca la operación como ERROR si no alcanza (RF-40). El MVP no implementa reserva distribuida (§13). |
| Reloj del cliente desfasado. | Fechas de venta incorrectas en reportes. | Se guardan ambos instantes: fecha del cliente y fecha de inserción del servidor. |
| Cuota o latencia de la API de Gemini. | Módulo de IA caído. | La IA es complementaria; su falla no bloquea nada (RF-50). |
| Cold start de Vercel + Neon. | Primera petición lenta. | Conexión con pooler de Neon y cliente Prisma reutilizado entre invocaciones. |
| Gemma local no viable en los equipos disponibles. | RF-51 no se entrega. | Está marcado como opcional desde el día uno (§16). |
