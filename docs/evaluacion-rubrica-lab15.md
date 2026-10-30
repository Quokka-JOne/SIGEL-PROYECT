# Autoevaluación provisional — Matriz del Laboratorio 15

**Proyecto:** JINStock / SIGEL-PROYECT
**Repositorio:** [Quokka-JOne/SIGEL-PROYECT](https://github.com/Quokka-JOne/SIGEL-PROYECT)
**Base evaluada:** `main`, commit `bae4c6f`
**Corte de evidencia:** 30 de octubre de 2026.
**Alcance:** evaluación técnica del repositorio y comprobaciones públicas disponibles. No equivale a una calificación oficial del docente ni a una prueba funcional autenticada de producción.

## Resultado por criterio

| Criterio | Nivel provisional | Puntos | Evidencia y limitación |
|---|---|---:|---|
| 1. Funcionalidad (25) | Bueno (75%) | **18.75 / 25** | CI ejecuta pruebas de API, reglas de venta/stock, idempotencia, roles y una prueba de concurrencia con PostgreSQL. Los endpoints públicos de producción respondieron. No se validaron los flujos principales contra datos reales de producción ni el catálogo protegido con una cuenta QA; por eso no se certifica Excelente. |
| 2. Usabilidad (15) | Pendiente de evaluación humana | **No asignado / 15** | No se hizo una prueba guiada con usuarios que mida claridad, navegación y comprensión de mensajes en los flujos completos. Una inspección de código no reemplaza esa prueba. |
| 3. Manejo de errores (20) | Bueno (75%) | **15 / 20** | El backend devuelve códigos/mensajes JSON para validación, autenticación, rutas inexistentes, conflictos y fallos de salud; las pruebas comprueban varios casos y el middleware no entrega trazas del servidor. En `main`, la pantalla `ErrorBoundary` mostraba el mensaje técnico de una excepción JavaScript al usuario; se corrige en la rama de mejoras, pendiente de CI/revisión. |
| 4. Rendimiento (15) | No clasificable literalmente con la matriz | **No asignado / 15** | La última carga pública sin autenticación midió p95 de **779.85 ms** para `/api` y **2,513.73 ms** para `/api/health`, con 50/50 HTTP 200 por endpoint y 0 errores 5xx. La tabla no define el tramo de 2–5 s sin errores y `GET /api` no es un flujo de negocio. El endpoint protegido `/api/products` no se probó porque no había un token QA disponible. |
| 5. Monitoreo y logs (15) | Excelente (100%), pendiente de demostración en consola del proveedor | **15 / 15** | El logger produce JSON con timestamp y severidad; `WARN`/`ERROR` usan stderr, los errores se separan en `error.log`, y se registran `requestId`, estado y duración. CI cubre `X-Request-Id` y redacción de secretos. Falta adjuntar evidencia visual de logs reales de Render a la coevaluación. |
| 6. Documentación (10) | Excelente (100%) | **10 / 10** | README contiene despliegue, variables, endpoints, ejemplos `curl`, validación segura, carga y guía de logs. La rama propuesta corrige información técnica desactualizada y agrega esta autoevaluación. |

### Subtotal que sí puede calcularse

Con los cuatro criterios puntuados arriba, el subtotal es **58.75 / 70 puntos evaluables**. Quedan **30 puntos sin calificar** (Usabilidad y Rendimiento), por lo que este subtotal **no debe presentarse como nota final sobre 100**.

El script de carga del repositorio usa una regla interna que etiqueta como “Regular” cualquier p95 ≥ 500 ms cuando no hay respuestas no-2xx. Si el docente acepta esa regla para Rendimiento, su equivalente sería **7.5 / 15**, y el subtotal pasaría a **66.25 / 85 puntos evaluables**; no lo incorporamos como nota oficial porque la matriz adjunta describe Regular como p95 < 2 s *con errores bajo carga* y no especifica este resultado sin errores.

## Acciones recomendadas para aspirar a Excelente

1. **Funcionalidad:** ejecutar una lista de aceptación de los flujos principales (login, consulta/búsqueda de catálogo, registro de venta, descuento de stock, sincronización offline y reportes) con cuenta QA y ambiente controlado. Guardar respuestas y resultados; no usar credenciales administrativas ni datos de clientes reales.
2. **Usabilidad:** realizar una prueba breve con al menos tres personas usuarias de caja/administración. Pedirles completar tareas sin ayuda, registrar errores, tiempo y puntos de confusión, y corregir los hallazgos. Verificar teclado, etiquetas, foco y anuncios accesibles.
3. **Manejo de errores:** conservar mensajes claros y seguros para fallos de red, validación y errores inesperados; no exponer mensajes internos. La rama `rubric-excellence` elimina el mensaje crudo de `ErrorBoundary` y valida los filtros del catálogo antes de consultar la base.
4. **Rendimiento:** medir con token QA, de forma temporal y de solo lectura, `GET /api/products?all=true` (y, si procede, filtros/paginación representativos), manteniendo 50 solicitudes y concurrencia 10. Repetir desde una región cercana a las personas usuarias y en una segunda ventana; no reutilizar el token en capturas ni subirlo al repositorio. Investigar primero la latencia de TLS/origen y comparar por separado p50/p95. La meta excelente de la tabla es p95 < 200 ms, más exigente que el umbral de 500 ms del script.
5. **Monitoreo:** usar un `X-Request-Id` de prueba y conservar una captura de Render que muestre JSON, severidad, duración y registro de error separado; verificar qué retención ofrece el plan de despliegue.
6. **Documentación:** mantener sincronizados la versión de React, el contrato de query params y los resultados de CI/carga con el código real.

## Cambios propuestos en la rama

- Validación Zod del query de productos (paginación positiva/segura, booleanos admitidos y búsqueda de hasta 100 caracteres), con pruebas negativas que comprueban que la consulta no llega a Prisma.
- Login más accesible: campos de email/password etiquetados y validados; mensajes anunciados mediante regiones accesibles.
- La opción “Recordarme” ahora distingue `localStorage` de `sessionStorage`, también en el acceso offline.
- El enlace de recuperación ya no afirma que envió un correo: aclara que la función todavía no está disponible.
- `ErrorBoundary` muestra instrucciones útiles y no enseña el mensaje técnico de la excepción.
- Correcciones de metadatos del README, typecheck explícito del frontend en CI y esta matriz de autoevaluación.

**Estado de estas mejoras al redactar:** rama de trabajo; los puntos solo se consideran entregados si CI pasa y el PR se revisa. No se modifica ni se despliega a producción desde esta autoevaluación.
