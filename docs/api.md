# API REST — JINStock

**Versión:** 0.1 (contrato planificado)
**Fecha:** 2026-09-18
**Documento base:** [especificacion.md](especificacion.md) §21

> **Estado:** contrato de diseño. Ningún endpoint está implementado todavía
> (corresponde a las FASES 3 a 12). Cada endpoint se confirma o se ajusta al
> implementar su módulo, como indica el §21. Este documento se actualiza en el
> mismo commit que lo implementa.

Base: `VITE_API_URL` + `/api`.

---

## 1. Convenciones

**Vocabulario.** El modelo de datos está en español y las rutas en inglés,
ambos por indicación de la especificación (§20 y §21). La traducción vive en la capa de
controladores:

| Modelo | Recurso REST |
|---|---|
| `Producto` | `products` |
| `Categoria` | `categories` |
| `Proveedor` | `suppliers` |
| `Compra` | `purchases` |
| `Venta` | `sales` |
| `MovimientoInventario` | `inventory/movements` |
| `Usuario` | `users` |

Los **campos de los payloads van en español**, igual que el modelo. Solo la ruta
está en inglés.

**Autenticación.** Todos los endpoints salvo `POST /auth/login` requieren
`Authorization: Bearer <jwt>`.

**Dinero.** Se serializa como string decimal (`"125.50"`), no como number, para
no perder precisión en JSON. Ver [arquitectura.md](arquitectura.md) AD-07.

**Fechas.** ISO 8601 con zona (`2026-09-18T14:32:00.000Z`).

**Paginación.** `?pagina=1&porPagina=20`. Respuesta:

```json
{ "datos": [], "paginacion": { "pagina": 1, "porPagina": 20, "total": 0, "paginas": 0 } }
```

**Errores.** Forma única, sin detalles internos (RNF-05):

```json
{
  "error": {
    "codigo": "STOCK_INSUFICIENTE",
    "mensaje": "Stock insuficiente para «Cuaderno rayado 100 h»",
    "detalles": [{ "productoId": 12, "solicitado": 5, "disponible": 2 }]
  }
}
```

| HTTP | Cuándo |
|---|---|
| 400 | Payload mal formado |
| 401 | Token ausente, inválido o expirado |
| 403 | Rol sin permiso para el recurso |
| 404 | Recurso inexistente |
| 409 | Conflicto de negocio (stock insuficiente, nombre duplicado) |
| 422 | Payload válido en forma pero inválido en contenido |
| 500 | Error inesperado |

---

## 2. Autenticación

### `POST /api/auth/login` — público

```json
{ "nombreUsuario": "admin", "password": "..." }
```

→ `200`

```json
{
  "token": "eyJ...",
  "usuario": { "id": 1, "nombreUsuario": "admin", "nombreCompleto": "...", "rol": "ADMINISTRADOR" }
}
```

→ `401` credenciales inválidas o usuario inactivo. **El mensaje es el mismo en
ambos casos**: distinguirlos revelaría qué usuarios existen.

### `GET /api/auth/me` — ambos roles

Devuelve el usuario del token. El frontend lo usa al arrancar para restaurar la
sesión y verificar que el usuario siga activo.

### `POST /api/auth/logout` — ambos roles

Sin refresh tokens, el cierre de sesión es del lado del cliente (AD-08). El
endpoint existe para registrar el evento y mantener simétrica la API.

---

## 3. Productos

| Endpoint | Rol | Descripción |
|---|---|---|
| `GET /api/products` | Ambos | Listado con filtros |
| `GET /api/products/:id` | Ambos | Detalle |
| `POST /api/products` | Administrador | Crear |
| `PUT /api/products/:id` | Administrador | Actualizar |
| `PATCH /api/products/:id/status` | Administrador | Activar / desactivar |
| `GET /api/products/sync` | Ambos | Catálogo para IndexedDB |

**Filtros de `GET /api/products`:** `buscar` (nombre o código), `categoriaId`,
`estadoStock` (`bajo` \| `agotado` \| `disponible`), `activo`, más paginación.

**`GET /api/products/sync?desde=<ISO8601>`** es el endpoint de sincronización
descendente: devuelve solo los productos modificados después de `desde`, con los
campos mínimos del almacén `catalogo` de IndexedDB. Sin `desde` devuelve el
catálogo completo.

`POST` / `PUT`:

```json
{
  "codigo": "7501234567890",
  "nombre": "Cuaderno rayado 100 hojas",
  "descripcion": null,
  "categoriaId": 1,
  "precioCompra": "18.00",
  "precioVenta": "25.00",
  "stockMinimo": 10
}
```

`stockActual` **no es escribible**: solo cambia por compras, ventas o ajustes de
inventario. Aceptarlo acá abriría una vía para descuadrar el stock sin dejar
movimiento.

---

## 4. Categorías

| Endpoint | Rol |
|---|---|
| `GET /api/categories` | Ambos |
| `POST /api/categories` | Administrador |
| `PUT /api/categories/:id` | Administrador |
| `PATCH /api/categories/:id/status` | Administrador |

Desactivar una categoría con productos activos responde `409`.

---

## 5. Proveedores

| Endpoint | Rol |
|---|---|
| `GET /api/suppliers` | Administrador |
| `GET /api/suppliers/:id` | Administrador |
| `POST /api/suppliers` | Administrador |
| `PUT /api/suppliers/:id` | Administrador |
| `PATCH /api/suppliers/:id/status` | Administrador |

---

## 6. Compras

| Endpoint | Rol |
|---|---|
| `GET /api/purchases` | Administrador |
| `GET /api/purchases/:id` | Administrador |
| `POST /api/purchases` | Administrador |

`POST /api/purchases`:

```json
{
  "proveedorId": 3,
  "fecha": "2026-09-18T10:00:00.000Z",
  "detalles": [
    { "productoId": 12, "cantidad": 50, "costoUnitario": "18.00" }
  ]
}
```

El cliente no envía `subtotal` ni `total`: los calcula el servidor a partir de
`cantidad × costoUnitario`. Aceptarlos permitiría registrar una compra cuyo
total no cuadre con sus líneas.

→ `201` con la compra creada, sus detalles y el stock resultante de cada
producto. Todo dentro de una transacción (RNF-01).

---

## 7. Ventas

| Endpoint | Rol |
|---|---|
| `GET /api/sales` | Administrador (todas) · Cajero (solo propias) |
| `GET /api/sales/:id` | Administrador · Cajero si es suya |
| `POST /api/sales` | Ambos |

**Filtros:** `desde`, `hasta`, `usuarioId` (ignorado para el cajero, que solo ve
las suyas), `metodoPago`, paginación.

### `POST /api/sales` — idempotente

```json
{
  "claveIdempotencia": "550e8400-e29b-41d4-a716-446655440000",
  "fecha": "2026-09-18T14:32:00.000Z",
  "metodoPago": "EFECTIVO",
  "detalles": [
    { "productoId": 12, "cantidad": 2, "precioUnitario": "25.00" }
  ]
}
```

- `claveIdempotencia`: UUID v4 generado en el cliente. **Obligatorio también en
  línea** (AD-03).
- `fecha`: reloj del cliente. En una venta offline puede ser anterior.
- `precioUnitario`: el precio efectivamente cobrado. El servidor lo revalida
  contra el vigente.

Respuestas:

| Código | Significado |
|---|---|
| `201` | Venta creada. Incluye `id` (número de comprobante) y stock resultante. |
| `200` | **Ya existía** una venta con esa clave. Devuelve la existente sin crear nada ni tocar el stock. |
| `409` | Stock insuficiente o producto inactivo. Con el detalle por producto. |
| `422` | El total no cuadra, o hay cantidades o precios inválidos. |

La distinción entre `201` y `200` es la que permite al cliente reintentar sin
miedo a cobrar dos veces. Ver [offline-first.md](offline-first.md) §7.

`POST /api/sync` de la especificación §21 no se define como endpoint aparte: la
sincronización reenvía cada venta a `POST /api/sales`, que ya es idempotente. Un
endpoint de lote adicional obligaría a decidir qué hacer cuando la tercera de
cinco operaciones falla, sin aportar nada a cambio
([offline-first.md](offline-first.md) §6.1).

---

## 8. Inventario

| Endpoint | Rol | Descripción |
|---|---|---|
| `GET /api/inventory` | Administrador | Estado de stock por producto |
| `GET /api/inventory/movements` | Administrador | Historial de movimientos |
| `POST /api/inventory/adjustments` | Administrador | Ajuste manual |

`GET /api/inventory?estadoStock=bajo` atiende RF-10 y el dashboard.

`GET /api/inventory/movements?productoId=12&desde=...` atiende RF-31.

`POST /api/inventory/adjustments` cubre el caso real de la merma y el conteo
físico. Exige una nota obligatoria y genera un `MovimientoInventario` con
`tipo = AJUSTE`, `origen = AJUSTE_MANUAL`:

```json
{ "productoId": 12, "stockNuevo": 48, "nota": "Conteo físico del 18/09" }
```

---

## 9. Dashboard

### `GET /api/dashboard` — Administrador

Una sola petición para todos los indicadores del §11: varias peticiones
paralelas contra funciones serverless con arranque en frío harían la pantalla
notablemente más lenta.

```json
{
  "ventasDelDia": { "total": "3450.00", "cantidad": 24 },
  "ventasDelMes": { "total": "87200.00", "cantidad": 612 },
  "totalProductos": 340,
  "productosStockBajo": 12,
  "productosAgotados": 3,
  "masVendidos": [{ "productoId": 12, "nombre": "...", "unidades": 84 }],
  "ventasPorPeriodo": [{ "fecha": "2026-09-18", "total": "3450.00" }]
}
```

`GET /api/dashboard?periodo=7d|30d|mes` ajusta la serie temporal.

---

## 10. Inteligencia artificial

### `POST /api/ai/inventory-analysis` — Administrador

```json
{ "pregunta": "¿Qué productos debería reponer esta semana?" }
```

→ `200`

```json
{
  "respuesta": "Texto con recomendaciones...",
  "datosAnalizados": { "productos": 45, "periodoVentas": "30d" },
  "generadoEn": "2026-09-18T14:40:00.000Z"
}
```

Reglas que este endpoint debe cumplir:

- El backend arma el contexto desde la base; el cliente solo manda la pregunta.
- Se envían a Gemini **datos agregados**, no la base completa: menos tokens y
  menos exposición.
- La respuesta es **solo texto**. La IA no modifica nada (RF-48). Este endpoint
  no escribe en la base de datos.
- Si Gemini falla o no está configurado, responde `503` con un mensaje claro y
  **el resto del sistema sigue funcionando** (RF-50).

---

## 11. Usuarios

| Endpoint | Rol |
|---|---|
| `GET /api/users` | Administrador |
| `POST /api/users` | Administrador |
| `PUT /api/users/:id` | Administrador |
| `PATCH /api/users/:id/status` | Administrador |

No está en la lista del §21, pero el administrador necesita poder crear la
cuenta del cajero. `passwordHash` nunca aparece en una respuesta.

---

## 12. Utilidad

### `GET /api/health` — público

```json
{ "estado": "ok", "baseDatos": "ok", "version": "0.1.0" }
```

Sirve para verificar despliegues y para que el frontend distinga "sin internet"
de "backend caído" — dos situaciones que se ven igual desde el navegador pero
requieren mensajes distintos para el cajero.
