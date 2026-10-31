# Evaluación de Rúbrica — Laboratorio 15

**Proyecto:** JINStock / SIGEL-PROYECT  
**Repositorio:** [Quokka-JOne/SIGEL-PROYECT](https://github.com/Quokka-JOne/SIGEL-PROYECT)  
**Base evaluada:** `main`, commit comprobado con servicio `sigel-proyect` en Ohio (`us-east-2`)  
**Corte de evidencia:** 31 de octubre de 2026  
**Autoevaluación provisional:** **92.5 / 100** *(la calificación oficial la asigna el docente)*  

---

## Matriz de Evaluación por Criterios (Sobre 100 puntos)

| Criterio | Nivel comprobado | Puntos asignados | Evidencia comprobada y justificación técnica |
|---|---|---:|---|
| **1. Funcionalidad (25)** | Excelente (100%) | **25.00 / 25** | CI ejecuta pruebas unitarias, integración de API, reglas de negocio y prueba de concurrencia real con base de datos PostgreSQL. BUG-04 resuelto con secuencia nativa PostgreSQL atómica (`venta_comprobante_seq_YYYY`). Idempotencia de ventas offline verificada. |
| **2. Usabilidad (15)** | Bueno (75%) | **11.25 / 15** | PWA responsive con catálogo local en IndexedDB y sincronización bidireccional. Para alcanzar Excelente (15/15, +3.75): adjuntar reporte de Lighthouse, captura de consola limpia de CSP y bitácora de prueba guiada con al menos 3 usuarios. |
| **3. Manejo de errores (20)** | Excelente (100%) | **20.00 / 20** | Códigos y mensajes JSON consistentes para validación (CP05, CP06, CP07) y recurso inexistente (Err-4) probados contra producción con autenticación Bearer en `evidencia/03-errores-validacion.txt`. `ErrorBoundary` seguro en frontend sin fuga de stack traces. |
| **4. Rendimiento (15)** | Bueno (75%) | **11.25 / 15** | Despliegue en Render Ohio (`sigel-proyect.onrender.com`) co-ubicado con Neon (`us-east-2`). La rúbrica evalúa la latencia observada por el cliente: en 150 peticiones concurrentes a la ruta real de sincronización (`/api/products?includeInactive=false`), el p95 del cliente se ubica holgadamente en el rango **< 500 ms** (entre 236 y 409 ms; mediana 170–199 ms; min 98 ms) con **0 errores 5xx (100% de éxito)**. Se evidencia apertura inicial de pool de conexiones PostgreSQL y sockets Keep-Alive en `evidencia/02-carga-[1..3].txt`. |
| **5. Monitoreo y logs (15)** | Excelente (100%) | **15.00 / 15** | Logger estructurado JSON con `requestId`, latencias y separación de `error.log`. BUG-05 cerrado: extracción de IP pública real enmascarada consistente en todas las entradas de log y limitadores de tasa que cuentan por cliente individual (probado en `evidencia/05-logs-ip-publica-error.txt`). |
| **6. Documentación (10)** | Excelente (100%) | **10.00 / 10** | README completo con matriz de 35 endpoints, descripción corregida de `requestId`, guía de variables de entorno, comandos de verificación y manual de despliegue. |

---

### Autoevaluación provisional (la nota oficial la asigna el docente)

$$\mathbf{25.00 + 11.25 + 20.00 + 11.25 + 15.00 + 10.00 = 92.50 / 100}$$

> **Nota sobre Rendimiento (Cliente vs. Servidor):**  
> El tiempo interno del servidor Node.js + Neon registra un p95 interno de **89 a 165 ms** (con mediana interna de 6 a 64 ms). No obstante, de acuerdo con la rúbrica oficial, la calificación se rige por la **latencia observada por el cliente final** (que incluye el tránsito transfronterizo de red hacia Ohio), la cual se ubica de forma consistente entre 236 y 409 ms (Nivel Bueno, < 500 ms). (En versiones previas se citó erróneamente 72 ms, que correspondía a la mediana y no al percentil p95).

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
