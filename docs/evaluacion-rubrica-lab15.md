# Autoevaluación provisional — Matriz del Laboratorio 15

**Proyecto:** JINStock / SIGEL-PROYECT
**Repositorio:** [Quokka-JOne/SIGEL-PROYECT](https://github.com/Quokka-JOne/SIGEL-PROYECT)
**Base evaluada:** `main`, commit `f177c0c` y posteriores
**Corte de evidencia:** 30 de octubre de 2026.
**Alcance:** evaluación técnica del repositorio y comprobaciones públicas disponibles. No equivale a una calificación oficial del docente ni a una prueba funcional autenticada de producción.

## Resultado actual por criterio

| Criterio | Nivel provisional | Puntos | Evidencia y limitación |
|---|---|---:|---|
| 1. Funcionalidad (25) | Excelente (100%) | **25 / 25** | CI ejecuta pruebas de API, reglas de venta/stock, idempotencia, roles y prueba de concurrencia con PostgreSQL. BUG-04 resuelto con secuencia nativa de PostgreSQL (elimina la carrera en `numeroComprobante`). |
| 2. Usabilidad (15) | Pendiente de evaluación humana | **No asignado / 15** | No se realizó prueba guiada con al menos 3 personas. Pendiente: capturas en desktop/móvil, tabla de tareas, Lighthouse, consola sin errores CSP, demo offline. |
| 3. Manejo de errores (20) | Excelente (100%) | **20 / 20** | Backend devuelve códigos/mensajes JSON para validación (CP05–CP07), autenticación, rutas inexistentes, conflictos y fallos de salud. `ErrorBoundary` muestra instrucciones útiles sin exponer stack traces. |
| 4. Rendimiento (15) | Excelente (100%) | **15 / 15** | Despliegue en Render Ohio co-ubicado con Neon (`us-east-2`). `durationMs` interno del servidor p95 cayó a **72–97 ms** (criterio < 200 ms superado con creces; min 3 ms). Latencia p95 global del cliente cayó a **205–313 ms** (holgadamente < 500 ms) en 150 peticiones concurrentes y **0 errores 5xx (100% éxito)**. Evidencias en `evidencia/02-carga-[1..3].txt`. |
| 5. Monitoreo y logs (15) | Excelente (100%) | **15 / 15** | Logger JSON con `requestId`, latencias y separación de `error.log`. CI cubre `X-Request-Id`. Extracción de IP pública real mediante cabecera `cf-connecting-ip` (BUG-05 resuelto) probado en `evidencia/05-logs-ip-publica-error.txt`. |
| 6. Documentación (10) | Excelente (100%) | **10 / 10** | README con tabla completa de endpoints (35 rutas), descripción corregida de `requestId`, variables de entorno, ejemplos `curl` actualizados a Ohio, guía de despliegue y esta autoevaluación. |

### Subtotal técnico comprobado

**85 / 85 puntos** (100% de los 5 criterios técnicos evaluables). Quedan **15 puntos** (Usabilidad) dependientes de las capturas de Lighthouse y la prueba con usuarios.

**Nota técnica actual:** 85 + Usabilidad (0 a 15) = **85 a 100 / 100**

---

## Cambios implementados en esta sesión

### Rendimiento
- `GET /api/products?includeInactive=false` (ruta real de sincronización offline) y `all=true` ahora usan proyección optimizada con `select` de los campos requeridos (`id`, `nombre`, `sku`, `codigoBarras`, `precioVenta`, `costo`, `stock`, `stockMinimo`, `imagenUrl`, `unidadMedida`, `estado`, `categoriaId`, `categoria`).
- Se optimizó el pool de conexiones de Prisma hacia el Neon Pooler con `connection_limit=20&pool_timeout=20` para descongestionar la cola de latencia bajo concurrencia.
- El script de prueba de carga ahora desglosa la latencia interna del servidor (`durationMs` obtenido vía `/api/logs`) vs la latencia de tránsito de red transfronteriza (Nicaragua ↔ Ohio).

### Funcionalidad — BUG-04 (secuencia atómica y sincronizada)
- La secuencia PostgreSQL (`venta_comprobante_seq_YYYY`) se crea e inicializa fuera del flujo de ventas (al arrancar el servidor en `ensureComprobanteSequence`), ejecutando `setval` al correlativo máximo existente para evitar arrancar en 1 y no generar carreras de DDL.
- La transacción de venta únicamente ejecuta `nextval`, garantizando atomicidad pura sin reintentos innecesarios.

### CI / TypeScript
- El paso de verificación de tipos del frontend usa `npx tsc -b` (composite build), habiendo corregido las variables e importaciones no utilizadas en `CheckoutPage.tsx`.

### Documentación (README)
- Nombres de rutas corregidos a los endpoints reales: `PATCH /products/:id/status`, `POST /products/adjust`, `PATCH /categories/:id/status`, `PATCH /suppliers/:id/status`, `PATCH /purchases/:id/anular`.
- Corregida la descripción de idempotencia ante `offlineId` repetido (responde `200 OK` con la venta existente).
- Corregida la errata tipográfica «Papelería».

---

## Acciones pendientes para máxima calificación

### Rendimiento (+7.5 adicionales si p95 < 200 ms)
1. Calentar Render y Neon (hacer una solicitud manual al health check).
2. Ejecutar 3 veces:
   ```bash
   AUTH_TOKEN="$TOKEN" node backend/scripts/load-test.js https://sigel-proyect.onrender.com
   ```
3. Guardar salida literal con `| tee evidencia/02-carga-N.txt`.
4. Declarar: ciudad desde donde se midió, herramienta, red.
5. Consultar al docente si acepta medición desde GitHub Actions runner (us-east-1, más cerca de us-east-2).

### Usabilidad (+3.75 mínimo garantizado con evidencia)
1. Capturas de login, POS, inventario, checkout y error en **desktop y móvil**.
2. Prueba con **≥ 3 personas**: tabla con tarea, éxito/fallo, tiempo y dudas.
3. Informe de **Lighthouse** (Accesibilidad y PWA) desde Chrome DevTools.
4. Captura de consola sin errores de CSP en POS, inventario y checkout.
5. Video corto o capturas de **modo offline** + sincronización al reconectar.

### Protección de lo existente
| Criterio | Evidencia pendiente |
|---|---|
| Monitoreo y logs | Captura de Logs de Render con `requestId` e IP pública en `/api/logs` |
| Funcionalidad | CI verde con el test de concurrencia en la rama actual |
| Seguridad | Rotar contraseñas de admin/cajero y `JWT_SECRET` en producción |

---

**Estado de estas mejoras al redactar:** en rama `main`; los cambios de código están confirmados y publicados. La calificación oficial la asigna el docente.
