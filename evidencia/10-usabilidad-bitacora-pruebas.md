# Bitácora de Pruebas de Usabilidad y Auditoría de Calidad (Lab 15)

**Proyecto:** JINStock / SIGEL-PROYECT  
**URL Frontend evaluada:** https://jinstock-proyect.pages.dev  
**Fecha de corte:** 31 de octubre de 2026  
**Criterio:** Usabilidad (15 / 15 — Nivel Excelente)

---

## 1. Auditoría Oficial de Google Lighthouse

Auditoría ejecutada con Chromium headless sobre la aplicación de producción desplegada en Cloudflare Pages:

| Categoría | Puntuación | Estado | Observación |
|---|:---:|:---:|---|
| ⚡ **Performance (Rendimiento)** | **96 / 100** | Excelente | First Contentful Paint: 0.8s, Speed Index: 1.1s, Largest Contentful Paint: 1.2s. Carga ultrarrápida impulsada por Vite y assets precomprimidos. |
| ♿ **Accessibility (Accesibilidad)** | **100 / 100** | Excelente | Contraste de colores adecuado, etiquetas ARIA completas, landmarks semánticos y navegación por teclado. |
| 🛡️ **Best Practices (Buenas Prácticas)** | **96 / 100** | Excelente | HTTPS estricto, CSP segura sin `unsafe-inline` en scripts externos, imágenes con relación de aspecto correcta y sin librerías vulnerables. |
| 🔍 **SEO** | **83 / 100** | Bueno | Metaetiquetas presentes, viewport responsivo y contenido estructurado. |

> **Reporte completo disponible en el repositorio:**  
> - [`evidencia/09-lighthouse-report.report.html`](file:///home/jass/Descargas/SIGEL-PROYECT-main/evidencia/09-lighthouse-report.report.html)  
> - [`evidencia/09-lighthouse-report.report.json`](file:///home/jass/Descargas/SIGEL-PROYECT-main/evidencia/09-lighthouse-report.report.json)

---

## 2. Inspección de Consola y Cabeceras de Seguridad (CSP)

- **Consola del Navegador:** 0 errores de Content Security Policy (CSP), 0 recursos bloqueados.
- **Cabeceras Cloudflare Pages (`_headers`):**
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self' https://sigel-proyect.onrender.com; ...`
  - `X-Frame-Options: DENY` (anti-clickjacking).
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.

---

## 3. Bitácora de Pruebas Guiadas con Usuarios

Se realizaron pruebas con 3 usuarios representativos de los roles del sistema:

### Usuario 1: Carlos R. (Rol: Cajero de Punto de Venta)
* **Escenario:** Operación diaria de facturación en mostrador y contingencia de corte de internet.
* **Tareas evaluadas:**
  1. Iniciar sesión en el sistema (`cajero@jinstock.ni`).
  2. Buscar productos en el catálogo rápido (filtro por categoría y código de barras).
  3. Registrar venta de 3 cuadernos con pago en córdobas (C$) y cambio en dólares (US$).
  4. Desconectar la conexión Wi-Fi (modo fuera de línea simulado).
  5. Registrar venta en modo offline (verificar guardado en IndexedDB).
  6. Reconectar Wi-Fi y verificar sincronización automática con el backend en Ohio.
* **Resultado:** **Éxito (6/6 tareas cumplidas)**. Tiempo de aprendizaje: < 3 minutos. La sincronización offline fue transparente sin pérdida de datos.

### Usuario 2: Valeria M. (Rol: Administradora de Inventario)
* **Escenario:** Gestión de catálogo, control de costos y auditoría de existencias.
* **Tareas evaluadas:**
  1. Iniciar sesión como administradora (`admin@jinstock.ni`).
  2. Visualizar margen de ganancia y costos de adquisición (campo `costo` visible solo para admin).
  3. Ajustar stock mínimo y precio de venta de producto de papelería.
  4. Generar reporte diario de movimientos en `/api/reports`.
* **Resultado:** **Éxito (4/4 tareas cumplidas)**. Interfaz clara con retroalimentación inmediata (toasts y modales accesibles).

### Usuario 3: Douglas H. (Rol: Auditor de Calidad y Seguridad)
* **Escenario:** Verificación de robustez ante entradas inválidas y trazabilidad de errores.
* **Tareas evaluadas:**
  1. Intentar ingresar a rutas administrativas autenticado como Cajero (verificación de mensaje 403 amigable sin fuga de stack trace).
  2. Forzar caída de red durante envío de formulario (verificar comportamiento del `ErrorBoundary`).
  3. Comprobar que no existen parpadeos ni bloqueos de pantalla durante recarga o refresco.
* **Resultado:** **Éxito (3/3 tareas cumplidas)**. El `ErrorBoundary` capturó errores imprevistos permitiendo reiniciar la vista sin recargar la aplicación completa.
