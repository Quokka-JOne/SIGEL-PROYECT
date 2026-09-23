# Estrategia Offline-First — JINStock

**Versión:** 0.1 (FASE 1 — diseño)
**Fecha:** 2026-09-18
**Documento base:** [especificacion.md](especificacion.md) §12, §13, §14

La especificación §13 pide explícitamente que la estrategia de sincronización quede
documentada. Este es ese documento. Se escribe **antes** de implementar
(FASE 9 y 10) porque el §31 exige considerar offline-first desde el diseño y no
como un parche posterior.

---

## 1. Principio

> El cajero escribe siempre en local. La sincronización es un proceso aparte.

No hay un camino "con internet" y otro "sin internet". Hay un único camino:
la venta se guarda en IndexedDB y se encola. Si hay conexión, la cola se vacía
en milisegundos y el cajero no nota diferencia.

Esto se decide así porque la alternativa —intentar la red y caer a local si
falla— produce dos rutas con semánticas distintas, y la ruta offline queda sin
probar justamente por ser la excepcional. El caso difícil real no es "sin
internet": es la red intermitente, donde una petición queda a medias sin que el
navegador reporte error.

Ver [arquitectura.md](arquitectura.md) AD-02.

---

## 2. Qué funciona sin conexión

| Operación | Offline | Fuente de datos |
|---|---|---|
| Iniciar sesión | ✔ si ya inició antes | JWT en almacenamiento local, mientras no expire |
| Buscar productos | ✔ | Catálogo replicado en IndexedDB |
| Consultar precios | ✔ | Catálogo replicado |
| Consultar stock | ✔ (valor de la última sincronización) | Catálogo replicado |
| Registrar venta | ✔ | Escritura en IndexedDB + cola |
| Ver comprobante | ✔ | Generado en el cliente |
| Consultar mis ventas | ✔ parcial | Ventas locales; las del servidor requieren red |
| Dashboard | ✘ | Requiere agregaciones del servidor |
| Compras, proveedores, productos (escritura) | ✘ | Solo administrador con conexión |
| IA | ✘ en el MVP | Gemini requiere red (Gemma local es FASE 13) |

El dashboard y los módulos administrativos quedan fuera a propósito: el §12
limita las operaciones offline a lo que necesita el cajero para vender.

---

## 3. Almacenes de IndexedDB

Base `jinstock`, versión 1.

### 3.1 `catalogo`

Réplica de solo lectura de los productos, para búsqueda y precios.

```text
clave primaria: id (id del producto en el servidor)
índices:        codigo, nombre, categoriaId

{ id, codigo, nombre, categoriaId, precioVenta,
  stockActual, stockMinimo, activo, actualizadoEn }
```

Nunca se escribe desde el POS: solo lo actualiza la sincronización descendente.

### 3.2 `colaOperaciones`

La cola de trabajo. Es el corazón del diseño.

```text
clave primaria: claveIdempotencia (UUID v4 generado en el cliente)
índices:        estado, creadoEn

{ claveIdempotencia,       // identidad estable de la operación
  tipo,                    // 'VENTA' en el MVP
  payload,                 // cuerpo exacto que se enviará a la API
  estado,                  // PENDIENTE | SINCRONIZANDO | SINCRONIZADO | ERROR
  intentos,                // contador de reintentos
  ultimoError,             // mensaje legible del último fallo
  creadoEn,                // reloj del cliente
  sincronizadoEn,          // cuándo el servidor la aceptó
  idServidor }             // id/número de comprobante asignado al sincronizar
```

Que la clave primaria sea el UUID —y no un autoincremental local— hace que
encolar la misma operación dos veces sea imposible por construcción: la segunda
escritura sobrescribe la primera en lugar de crear un duplicado.

### 3.3 `metadatos`

Pares clave-valor: instante de la última sincronización, versión del catálogo,
sesión activa.

---

## 4. Ciclo de vida de una operación

```text
                  el cajero confirma la venta
                              │
                              ▼
              ┌───────────────────────────────┐
              │ se genera UUID v4 y se guarda │
              │ en colaOperaciones            │
              └───────────────┬───────────────┘
                              ▼
                        ┌───────────┐
                        │ PENDIENTE │◄─────────────┐
                        └─────┬─────┘              │
                              │ hay conexión       │ reintento
                              ▼                    │ (manual o
                     ┌──────────────┐              │  automático)
                     │ SINCRONIZANDO│              │
                     └───┬──────┬───┘              │
                  2xx    │      │  error           │
                         ▼      ▼                  │
              ┌──────────────┐ ┌───────┐            │
              │ SINCRONIZADO │ │ ERROR ├────────────┘
              └──────────────┘ └───────┘
                     │
                     ▼
        se actualiza el stock local y se
        guarda el número de comprobante
```

El comprobante se puede imprimir desde el estado `PENDIENTE`: muestra el UUID
abreviado como referencia provisional y lo reemplaza por el número definitivo
al sincronizar.

---

## 5. Clasificación de errores

De esto depende que la cola no se atasque ni pierda ventas. Los errores se
tratan distinto según si reintentar tiene sentido:

| Situación | Respuesta | Estado resultante | Por qué |
|---|---|---|---|
| Sin red, DNS falla, timeout | — | `PENDIENTE` | No llegó al servidor. Reintento automático. |
| 5xx del servidor | 500, 502, 503 | `PENDIENTE` | Fallo transitorio. Reintento con espera creciente. |
| 401 token expirado | 401 | `PENDIENTE` | Se pide reautenticar y se reintenta después. |
| Stock insuficiente | 409 | `ERROR` | Requiere decisión humana: reintentar solo daría 409 otra vez. |
| Payload inválido | 400, 422 | `ERROR` | Reintentar es inútil; es un bug o datos corruptos. |
| Producto inexistente o inactivo | 404, 409 | `ERROR` | Necesita intervención del administrador. |
| Clave ya registrada | 200 con la venta existente | `SINCRONIZADO` | **No es un error.** Es la idempotencia funcionando. |

La última fila es la más importante: si un reintento tras un timeout se tratara
como error, la venta quedaría marcada `ERROR` aunque el servidor la hubiese
registrado bien, y el cajero la volvería a cobrar.

**Regla:** los errores 4xx de negocio no bloquean la cola. Se marcan `ERROR` y
la sincronización sigue con la operación siguiente. Una venta problemática no
puede impedir que se sincronicen las diez que vinieron después.

---

## 6. Sincronización

### 6.1 Ascendente (cola → servidor)

Se dispara cuando:

- Vuelve la conexión (evento `online`).
- La aplicación se carga o recupera el foco.
- El usuario lo pide manualmente.
- Cada 60 segundos, si queda algo pendiente.

Procedimiento:

1. Leer las operaciones `PENDIENTE` en orden de `creadoEn`. **El orden importa**:
   dos ventas del mismo producto deben descontar stock en la secuencia real.
2. Marcar `SINCRONIZANDO` y enviar.
3. Aplicar la clasificación de errores de §5.
4. Continuar con la siguiente. No detenerse ante un `ERROR`.

Se envían de una en una, no en lote. Un lote obligaría a decidir qué hacer si
la tercera de cinco falla; de una en una, cada operación tiene un resultado
propio y la operación problemática queda aislada. Con los volúmenes de una
papelería, el costo de latencia es irrelevante.

Los reintentos automáticos usan espera creciente (1s, 2s, 4s… hasta 5 min) y se
detienen a los 10 intentos, dejando la operación en `PENDIENTE` para reintento
manual.

### 6.2 Descendente (servidor → catálogo)

Al iniciar sesión y periódicamente con conexión, se descarga el catálogo. La
petición lleva el instante de la última sincronización para traer solo lo
cambiado (`?desde=<ISO8601>`).

Importante: **la sincronización descendente se ejecuta después de vaciar la cola
ascendente**. Al revés, el catálogo traería un stock que todavía no refleja las
ventas locales pendientes y el cajero vería números que van a cambiar.

### 6.3 Stock local

Tras registrar una venta offline, el stock en `catalogo` se descuenta
localmente para que la siguiente venta del turno vea un número realista. Es una
estimación: se reemplaza por el valor autoritativo del servidor en la siguiente
sincronización descendente.

---

## 7. Idempotencia en el servidor

`POST /api/sales` recibe `claveIdempotencia` y aplica:

```text
¿existe una venta con esa clave?
        │
        ├── sí ──► devolver 200 con la venta existente
        │          (no crear nada, no tocar stock)
        │
        └── no ──► transacción:
                     validar stock y precios
                     crear venta y detalles
                     descontar stock
                     registrar movimientos
                   devolver 201
```

La garantía real no la da este `if` —dos peticiones simultáneas podrían pasar
ambas la comprobación— sino la **restricción única** sobre
`ventas.clave_idempotencia`. Si dos llegan a la vez, PostgreSQL rechaza la
segunda con violación de unicidad, y el servidor traduce ese error a 200 con la
venta existente. El `if` es la ruta rápida; la restricción es la que no falla.

El servidor **revalida** todo lo que manda el cliente:

- Que los productos existan y estén activos.
- Que haya stock suficiente **ahora**, no cuando se hizo la venta.
- Que los precios coincidan con los vigentes (con tolerancia configurable, ya
  que una venta offline pudo registrarse antes de un cambio de precio).
- Que el total sea la suma de los subtotales.

Un cliente offline no es de confianza: es el mismo navegador del cajero, pero su
contenido pudo modificarse a mano (RNF-03).

---

## 8. Conflictos

La especificación §13 pide explícitamente **no** construir un sistema complejo de
resolución de conflictos. El MVP hace lo mínimo suficiente:

| Conflicto | Resolución en el MVP |
|---|---|
| Venta duplicada por reintento | La clave de idempotencia lo previene. |
| Stock insuficiente al sincronizar | La operación queda `ERROR` con el detalle y es visible al usuario. Decide una persona. |
| Precio cambiado entre venta y sincronización | Se acepta el precio de la venta (fue lo efectivamente cobrado) y se registra la diferencia. |
| Producto desactivado tras la venta offline | La operación queda `ERROR`; requiere que el administrador reactive el producto o anule. |
| Dos dispositivos venden la última unidad | El primero en sincronizar gana; el segundo queda `ERROR`. El MVP no implementa reserva distribuida. |

Lo que **no** se hace: fusión automática de operaciones, vectores de versión,
CRDTs, ni resolución automática de sobreventa. El §13 lo excluye y para un solo
local con una caja el costo no se justifica.

---

## 9. Visibilidad para el usuario

El §13 exige que los errores sean visibles (RF-41) y el §14 un indicador de
conexión (RF-42).

| Elemento | Dónde | Qué muestra |
|---|---|---|
| Indicador de conexión | Cabecera, siempre visible | En línea / Sin conexión / Sincronizando |
| Contador de pendientes | Junto al indicador | Cantidad de operaciones en cola |
| Panel de sincronización | Accesible desde el indicador | Lista de operaciones con estado, fecha y error |
| Acción de reintentar | En cada operación en `ERROR` | Vuelve la operación a `PENDIENTE` |
| Aviso de error | Notificación no intrusiva | Solo cuando algo pasa a `ERROR` |

El indicador no debe gritar. Una papelería con internet inestable tendría al
cajero rodeado de alarmas rojas; el estado se comunica con color y texto sobrios
según la paleta del §23, reservando el coral para lo que realmente requiere
atención.

---

## 10. Plan de pruebas

Casos que deben verificarse antes de considerar cerrada la FASE 10:

1. **Venta offline simple.** Modo offline en DevTools, registrar venta, volver
   en línea: aparece una vez en PostgreSQL.
2. **Varias ventas offline.** Tres ventas sin red: las tres se sincronizan, en
   orden, sin duplicados.
3. **Reintento tras timeout.** Cortar la red durante el envío; al reintentar, la
   venta no se duplica.
4. **Doble envío explícito.** Reenviar la misma clave a mano: 200 con la venta
   existente y el stock sin tocar.
5. **Sobreventa.** Dos navegadores venden la última unidad offline: uno
   sincroniza, el otro queda `ERROR` con mensaje claro.
6. **La cola no se atasca.** Una operación en `ERROR` entre cinco válidas: las
   otras cuatro se sincronizan.
7. **Arranque sin red.** Cerrar la app, activar modo avión, abrirla: el catálogo
   carga y se puede vender.
8. **Token expirado offline.** La sesión vence sin red: las ventas se encolan y
   se sincronizan tras reautenticar.
9. **Recarga con cola pendiente.** Recargar la página con operaciones
   pendientes: sobreviven y se sincronizan.

Los casos 4, 5 y 6 son los que suelen romperse en implementaciones ingenuas:
conviene escribirlos como pruebas automatizadas, no verificarlos a mano.
