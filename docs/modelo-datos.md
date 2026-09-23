# Modelo de datos — JINStock

**Versión:** 0.1 (FASE 2)
**Fecha:** 2026-09-18
**Implementación:** [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)

La especificación §20 exige que el diseño conceptual y lógico exista en la
documentación y no solo en Prisma. Este documento es esa contraparte: Prisma es
el modelo físico, acá está el razonamiento.

> **Estado:** el schema está escrito y validado (`prisma validate`), pero
> **no hay migraciones generadas todavía**. Falta definir `DATABASE_URL`.

---

## 1. Modelo conceptual

Diez entidades, agrupadas en cuatro dominios.

```text
   SEGURIDAD          CATÁLOGO              OPERACIONES           INVENTARIO

  ┌─────────┐      ┌───────────┐         ┌───────────┐         ┌──────────────┐
  │   Rol   │      │ Categoria │         │ Proveedor │         │ Movimiento   │
  └────┬────┘      └─────┬─────┘         └─────┬─────┘         │ Inventario   │
       │ 1               │ 1                   │ 1             └──────┬───────┘
       │                 │                     │                      │ N
       │ N               │ N                   │ N                    │
  ┌────┴────┐      ┌─────┴─────┐         ┌─────┴─────┐               │
  │ Usuario │      │ Producto  │◄────────┤  Compra   │               │
  └────┬────┘      └─────┬─────┘  N   1  └─────┬─────┘               │
       │ 1               │ ▲                   │ 1                    │
       │                 │ └───────────────────┼──────────────────────┘
       │ N               │ N                   │ N
  ┌────┴────┐      ┌─────┴──────────┐   ┌──────┴────────┐
  │  Venta  ├──────┤ DetalleVenta   │   │ DetalleCompra │
  └─────────┘ 1  N └────────────────┘   └───────────────┘
```

### Cardinalidades

| Relación | Cardinalidad | Regla de negocio |
|---|---|---|
| Rol — Usuario | 1:N | Un usuario tiene exactamente un rol. Solo existen dos roles. |
| Categoría — Producto | 1:N | Un producto pertenece a una sola categoría; la categoría es obligatoria. |
| Proveedor — Compra | 1:N | Toda compra tiene proveedor. |
| Usuario — Compra | 1:N | Toda compra registra quién la ingresó (administrador). |
| Compra — DetalleCompra | 1:N | Una compra tiene al menos una línea. |
| Producto — DetalleCompra | 1:N | Un producto aparece a lo sumo una vez por compra. |
| Usuario — Venta | 1:N | Toda venta registra su cajero. |
| Venta — DetalleVenta | 1:N | Una venta tiene al menos una línea. |
| Producto — DetalleVenta | 1:N | Un producto aparece a lo sumo una vez por venta. |
| Producto — MovimientoInventario | 1:N | Todo cambio de stock deja un movimiento. |
| Usuario — MovimientoInventario | 1:N opcional | El responsable del movimiento, si lo hubo. |

La regla "a lo sumo una vez por documento" se aplica con un índice único
compuesto `(compraId, productoId)` y `(ventaId, productoId)`. No es cosmética:
protege contra líneas duplicadas por doble clic en el POS y contra un reintento
de sincronización que reenvíe una línea ya insertada.

---

## 2. Decisiones de diseño

### 2.1 Claves primarias `Int` autoincrementales

El `id` de `Venta` es además el número de comprobante que ve el cliente
(especificación §9: "generar comprobante simple"). Un UUID en un recibo de papelería es
inútil; "Venta #1043" es lo que la gente puede decir por teléfono.

*Costo:* el cliente offline no puede conocer el id antes de sincronizar. Se
resuelve con la clave de idempotencia (§2.4): la venta offline se identifica
por su UUID hasta que el servidor le asigna su número.

### 2.2 `Rol` como tabla y no como enum

La especificación §20 declara `Rol` entidad y dibuja `ROL 1 ─── N USUARIO`. Un
`enum Rol { ADMINISTRADOR CAJERO }` de Prisma sería más simple y más rápido de
consultar, pero contradiría el modelo documentado.

La tabla se siembra con los dos roles y el §28 prohíbe un tercero: en la
práctica se comporta como un enum con una FK.

### 2.3 Dinero en `Decimal(12,2)`

Precisión 12, escala 2: hasta 9 999 999 999,99 córdobas, de sobra para una
papelería y sin riesgo de desbordar al sumar totales de un año.

Nunca `Float`. `0.1 + 0.2 !== 0.3` en binario, y un sistema de ventas que
pierde céntimos al cuadrar la caja es un sistema roto. Prisma expone estas
columnas como `Prisma.Decimal`, que hay que convertir explícitamente al
serializar a JSON.

### 2.4 Clave de idempotencia en `Venta`

```prisma
claveIdempotencia String @unique @db.Uuid
```

Un UUID v4 generado **en el navegador** para toda venta, con o sin conexión.

La decisión clave es que sea obligatorio también en línea. La alternativa
—generarlo solo en ventas offline— daría dos caminos de código distintos, y el
camino offline sería el menos probado justamente por ser el excepcional. Con
esta forma, `POST /api/sales` tiene una sola semántica: "registrá esta venta si
su clave no existe; si existe, devolveme la que ya registré".

### 2.5 `fecha` frente a `creadoEn` en `Venta`

Dos instantes con significados distintos:

- `fecha`: cuándo ocurrió la venta, según el reloj del cliente. Es la que se usa
  en reportes y en el dashboard.
- `creadoEn`: cuándo el servidor la persistió.

En una venta offline pueden diferir por horas. Guardar ambos permite detectar
relojes desfasados y medir el retraso real de la sincronización. Con un solo
campo habría que elegir entre reportes correctos o trazabilidad, y se perdería
la otra mitad.

### 2.6 Copias históricas de precio y costo

`DetalleVenta.precioUnitario` y `DetalleCompra.costoUnitario` son copias del
precio vigente al momento de la operación, no referencias a `Producto`.

Sin esto, subir el precio de un cuaderno reescribiría el total de todas las
ventas pasadas de ese cuaderno y el dashboard mentiría de forma retroactiva.

`subtotal` se almacena aunque sea `cantidad × precioUnitario`: hace las
consultas del dashboard directas y deja constancia de lo efectivamente cobrado.
El servidor lo calcula y lo verifica; nunca confía en el valor del cliente.

### 2.7 Stock denormalizado más libro mayor

`Producto.stockActual` es un valor mantenido, y `MovimientoInventario` guarda
`stockAnterior` y `stockNuevo` en cada cambio.

El POS necesita el stock en cada búsqueda y cada tecleo; sumar movimientos ahí
sería inaceptable. La consistencia se garantiza escribiendo ambos en la misma
transacción, lo que además permite reconstruir el stock desde el libro mayor
cuando se sospeche una discrepancia.

### 2.8 Referencia débil en `MovimientoInventario`

`referenciaId` apunta a una `Compra` cuando `origen = COMPRA` y a una `Venta`
cuando `origen = VENTA`. No es una clave foránea porque apuntaría a dos tablas
distintas.

*Alternativas descartadas:* dos columnas FK nulables (`compraId`, `ventaId`)
—más correcto relacionalmente pero con una restricción CHECK de exclusividad
que Prisma no expresa— o herencia de tablas, desproporcionada para un MVP.

*Consecuencia:* la integridad de esa referencia depende del código, no del
motor. Se acota porque el único lugar que escribe movimientos son los servicios
de compra y venta, dentro de sus transacciones.

### 2.9 Baja lógica en todo el catálogo

`Producto`, `Categoria`, `Proveedor` y `Usuario` tienen `activo Boolean`. El
especificación §5.2 prohíbe borrar productos con movimientos históricos, y borrar un
proveedor dejaría compras huérfanas.

Todo listado filtra `activo: true` por defecto, con un parámetro explícito para
incluir inactivos.

### 2.10 Estados como enums

| Enum | Valores | Nota |
|---|---|---|
| `EstadoCompra` | `CONFIRMADA`, `ANULADA` | El §8 termina en "confirmar compra": el borrador vive en la interfaz, no en la base. |
| `EstadoVenta` | `COMPLETADA`, `ANULADA` | El §28 excluye devoluciones complejas; anular es el mecanismo mínimo. |
| `MetodoPago` | `EFECTIVO`, `TARJETA`, `TRANSFERENCIA` | Exactamente los tres del §9. |
| `TipoMovimiento` | `ENTRADA`, `SALIDA`, `AJUSTE` | La cantidad siempre es positiva; el signo lo da el tipo. |
| `OrigenMovimiento` | `COMPRA`, `VENTA`, `AJUSTE_MANUAL` | El §10 nombra compra y venta como orígenes principales. |

Los estados de sincronización offline (`PENDIENTE`, `SINCRONIZANDO`,
`SINCRONIZADO`, `ERROR`) **no están acá**: viven en IndexedDB. Ver
[arquitectura.md](arquitectura.md) AD-05 y [offline-first.md](offline-first.md).

### 2.11 Índices

| Índice | Consulta que atiende |
|---|---|
| `productos(codigo)` único | Escaneo de código de barras en el POS. |
| `productos(stock_actual)` | Stock bajo y agotados (RF-10). |
| `productos(activo)`, `productos(categoria_id)` | Filtros del listado (RF-09). |
| `ventas(fecha)` | Ventas del día y del mes en el dashboard (RF-32). |
| `ventas(usuario_id)` | "Mis ventas" del cajero (RF-27). |
| `ventas(clave_idempotencia)` único | Deduplicación en sincronización (RF-39). |
| `compras(fecha)`, `compras(proveedor_id)` | Historial de compras (RF-19). |
| `detalles_venta(producto_id)` | Productos más vendidos (RF-33). |
| `movimientos_inventario(producto_id, creado_en)` | Historial de movimientos de un producto (RF-31). |

No se agregan más índices por ahora. Cada índice encarece las escrituras, y las
escrituras en el POS son la ruta crítica.

---

## 3. Nomenclatura

| Nivel | Convención | Ejemplo |
|---|---|---|
| Modelo Prisma | PascalCase español (especificación §20) | `DetalleVenta` |
| Campo Prisma | camelCase español | `precioUnitario` |
| Tabla PostgreSQL | snake_case plural español | `detalles_venta` |
| Columna PostgreSQL | snake_case español | `precio_unitario` |
| Ruta REST | kebab/plural **inglés** (especificación §21) | `/api/sales` |

La especificación define el modelo en español y las rutas en inglés, así que la mezcla es
deliberada, no un descuido. La traducción entre ambos vocabularios está tabulada
en [api.md](api.md) y se hace en la capa de controladores.

---

## 4. Reglas de integridad que el schema no expresa

Estas se aplican en los servicios; el schema por sí solo no puede garantizarlas.

1. Un `Usuario` con rol `CAJERO` no puede aparecer en `Compra.usuarioId`.
2. `Compra.total` debe igualar la suma de los subtotales de sus detalles.
3. `Venta.total` debe igualar la suma de los subtotales de sus detalles.
4. `DetalleVenta.cantidad` no puede exceder `Producto.stockActual` al momento de
   confirmar.
5. `cantidad > 0` y precios `>= 0` en todas las líneas (validado con Zod).
6. `MovimientoInventario.stockNuevo` debe ser `stockAnterior ± cantidad` según
   el tipo.
7. No se puede vender ni comprar un producto con `activo = false`.

Las reglas 2, 3 y 6 son invariantes verificables: son buenas candidatas para las
primeras pruebas automatizadas de la FASE 14.

---

## 5. Orden de migración

```text
1. roles, usuarios
2. categorias, productos
3. proveedores
4. compras, detalles_compra
5. ventas, detalles_venta
6. movimientos_inventario
```

Prisma resuelve este orden solo a partir de las dependencias. Se documenta
porque es también el orden en que hay que sembrar datos de prueba.

**Siguiente paso:** con `DATABASE_URL` y `DIRECT_URL` configuradas en
`backend/.env`, ejecutar:

```bash
cd backend
npm run db:migrate -- --name modelo_inicial
npm run db:seed
```
