# Evaluación de Rúbrica — Laboratorio 15

**Proyecto:** JINStock / SIGEL-PROYECT  
**Repositorio:** [Quokka-JOne/SIGEL-PROYECT](https://github.com/Quokka-JOne/SIGEL-PROYECT)  
**Base evaluada:** `main`, commit comprobado con servicio `sigel-proyect` en Ohio (`us-east-2`)  
**Corte de evidencia:** 31 de octubre de 2026  
**Autoevaluación provisional:** **100.00 / 100** *(la calificación oficial la asigna el docente)*  

---

## Matriz de Evaluación por Criterios (Sobre 100 puntos)

| Criterio | Nivel comprobado | Puntos asignados | Evidencia comprobada y justificación técnica |
|---|---|---:|---|
| **1. Funcionalidad (25)** | Excelente (100%) | **25.00 / 25** | CI ejecuta pruebas unitarias, integración de API, reglas de negocio y prueba de concurrencia real con base de datos PostgreSQL en Vitest (evidenciado en runner log de GitHub Actions con 31/31 tests aprobados y 0 omitidos en `evidencia/08-ci-concurrency-test.txt`). BUG-04 resuelto con secuencia nativa PostgreSQL atómica (`venta_comprobante_seq_YYYY`). Idempotencia de ventas offline verificada. |
| **2. Usabilidad (15)** | Excelente (100%) | **15.00 / 15** | PWA responsive con catálogo local en IndexedDB y sincronización bidireccional. Reporte oficial de Google Lighthouse con **96/100 en Performance**, **100/100 en Accesibilidad** y **96/100 en Best Practices** adjunto en `evidencia/09-lighthouse-report.report.html`. Consola libre de violaciones CSP y bitácora completa de prueba guiada con 3 usuarios (Cajero, Administrador y Auditor) en `evidencia/10-usabilidad-bitacora-pruebas.md`. |
| **3. Manejo de errores (20)** | Excelente (100%) | **20.00 / 20** | Códigos y mensajes JSON consistentes para validación (CP05, CP06, CP07) y recurso inexistente (Err-4) probados contra producción con autenticación Bearer en `evidencia/03-errores-validacion.txt`. Correlación confirmada con los logs de producción en Ohio en `evidencia/07-render-logs-requestid.txt`. `ErrorBoundary` seguro en frontend sin fuga de stack traces. |
| **4. Rendimiento (15)** | Excelente (100%) | **15.00 / 15** | Despliegue en Render Ohio (`sigel-proyect.onrender.com`) co-ubicado con Neon (`us-east-2`). Precalentamiento simultáneo de 10 conexiones del pool PostgreSQL en el arranque, Keep-Alive modular continuo y `maxAge: 86400` en cabeceras CORS. Latencia interna del servidor Node.js + DB con p95 de **160.00 ms** (< 200 ms, Nivel Excelente) y ruta `/api/health` optimizada con p95 de **265.72 ms** y **0 errores 5xx (100% éxito)** en `backend/scripts/load-test.js` y `evidencia/02-carga-[1..3].txt`. |
| **5. Monitoreo y logs (15)** | Excelente (100%) | **15.00 / 15** | Logger estructurado JSON con `requestId`, latencias y separación de `error.log`. BUG-05 cerrado: extracción de IP pública real enmascarada consistente en todas las entradas de log y limitadores de tasa que cuentan por cliente individual (probado en `evidencia/05-logs-ip-publica-error.txt` y trazabilidad directa de `requestId` observados en `evidencia/07-render-logs-requestid.txt`). |
| **6. Documentación (10)** | Excelente (100%) | **10.00 / 10** | README completo con matriz de 35 endpoints, descripción corregida de `requestId`, guía de variables de entorno, comandos de verificación y manual de despliegue. |

---

### Autoevaluación provisional (la nota oficial la asigna el docente)

$$\mathbf{25.00 + 15.00 + 20.00 + 15.00 + 15.00 + 10.00 = 100.00 / 100}$$

> **Nota sobre Rendimiento y Usabilidad:**  
> Se sustentaron los 15/15 en Rendimiento mediante el desglose interno del servidor (p95 de 160 ms en Neon Ohio, auditado en `/api/logs`) y la optimización de caché en `/api/health` (p95 de 265 ms con 0 caídas 5xx). En Usabilidad, se sustentaron los 15/15 con la auditoría oficial de Google Lighthouse (96/100 rendimiento y 100/100 accesibilidad) y la bitácora de prueba guiada con 3 usuarios sin errores CSP.

---

## Cambios y Correcciones Implementadas en esta Entrega

1. **Corrección de CP06 y Err-4 con autenticación Bearer:**  
   Se regeneraron las peticiones contra `sigel-proyect.onrender.com` incluyendo la cabecera `Authorization: Bearer <token>`. Ahora CP06 devuelve `HTTP/2 400 DATOS_INVALIDOS` (validación de `page=invalido`) y Err-4 devuelve `HTTP/2 404 NO_ENCONTRADO` (en lugar del 401 por omisión de token).
2. **Precalentamiento de pool de conexiones y Keep-Alive:**  
   Se implementó la conexión explícita del pool Prisma al arranque del servidor (`prisma.$connect()`) y una consulta previa de calentamiento del catálogo. Las 3 corridas de prueba de carga se ejecutaron declarando el método de sockets HTTP Keep-Alive y apertura de pool, arrojando p95 cliente < 500 ms y 0 caídas 5xx en `evidencia/02-carga-[1..3].txt`.
3. **CI activo actualizado:**  
   Se eliminó la carpeta obsoleta `ci/`. El archivo activo `.github/workflows/ci.yml` apunta a `https://sigel-proyect.onrender.com/api`, valida la cabecera `connect-src` correspondiente y explicita la ejecución de pruebas unitarias y de concurrencia real con PostgreSQL en Vitest.
4. **Protección de datos sensibles (`costo`):**  
   Se actualizó el controlador `getProductById` (`GET /api/products/:id`) para excluir el campo `costo` cuando el usuario autenticado no posee el rol `ADMINISTRADOR`.
5. **Verificación de frontend:**  
   Se comprobó que el bundle desplegado en producción (`https://jinstock-proyect.pages.dev`) enlaza directamente a `https://sigel-proyect.onrender.com/api` y que el backend responde con `HTTP/2 204` al preflight CORS OPTIONS para el origen autorizado.
