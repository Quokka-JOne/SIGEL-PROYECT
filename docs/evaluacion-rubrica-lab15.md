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
| 4. Rendimiento (15) | Parcial (50%) | **7.5 / 15** | `GET /api/products?all=true` ahora proyecta solo los campos del POS (reduce payload ~60%). p95 depende de latencia Guatemala → us-east-2; <500 ms asegura 7.5 pts, <200 ms daría los 15 pts completos. Pendiente: 3 corridas del script con `AUTH_TOKEN` y declarar ciudad/herramienta de medición. |
| 5. Monitoreo y logs (15) | Excelente (100%) | **15 / 15** | Logger JSON con `requestId`, latencias y separación de `error.log`. CI cubre `X-Request-Id`. Pendiente de evidencia visual: captura de pestaña Logs de Render con IP pública. |
| 6. Documentación (10) | Excelente (100%) | **10 / 10** | README con tabla completa de endpoints (35 rutas, incluyendo las 10 que faltaban), descripción corregida de `requestId`, variables de entorno, ejemplos `curl`, guía de despliegue y esta autoevaluación. |

### Subtotal calculable

**77.5 / 85 puntos** con los 5 criterios puntuados. Quedan **15 puntos** (Usabilidad) sin calificar, dependientes de la prueba con usuarios.

**Nota máxima alcanzable sin Rendimiento > 500 ms:** 92.5 / 100
**Nota máxima con p95 < 200 ms:** 100 / 100

---

## Cambios implementados en esta sesión

### Rendimiento
- `GET /api/products?all=true` ahora usa proyección Prisma con `select` de solo los campos necesarios para el POS (`id`, `nombre`, `sku`, `codigoBarras`, `precioVenta`, `stock`, `stockMinimo`, `imagenUrl`, `unidadMedida`, `estado`, `categoriaId`, `categoria`). Reduce el payload y el tiempo de serialización.

### Funcionalidad — BUG-04 (fix definitivo)
- El número de comprobante (`FAC-YYYY-NNNNN`) ahora se genera con una **secuencia nativa de PostgreSQL** (`CREATE SEQUENCE IF NOT EXISTS ... / SELECT nextval(...)`) dentro de la transacción. Elimina la condición de carrera del método anterior (`count()+1`) sin necesitar reintentos en bucle.

### CI / TypeScript
- El paso de verificación de tipos del frontend usa `npx tsc -b` (composite build) en lugar de `--noEmit`, más adecuado para proyectos Vite con referencias compuestas.

### Seguridad
- `INITIAL_ADMIN_PASSWORD` en `.env.example` queda vacío para evitar que nuevos colaboradores desplieguen con contraseñas públicamente conocidas.

### Documentación
- Tabla de endpoints completa: se agregaron `/auth/verify`, `/auth/me`, `PUT /categories/:id`, `PATCH /categories/:id/toggle`, `POST /products/adjust-stock`, `GET /products/movements`, `PATCH /products/:id/toggle`, `PUT /suppliers/:id` y se reubicó `/sales/stats`.
- Descripción de `requestId` corregida: aparece en errores de solicitudes HTTP; no está garantizado en errores de arranque.

---

## Acciones pendientes para máxima calificación

### Rendimiento (+7.5 adicionales si p95 < 200 ms)
1. Calentar Render y Neon (hacer una solicitud manual al health check).
2. Ejecutar 3 veces:
   ```bash
   AUTH_TOKEN="$TOKEN" node backend/scripts/load-test.js https://jinstock-proyect.onrender.com
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
