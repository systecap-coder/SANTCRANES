# SANT CRANES — Sitio Web Corporativo y Check List Digital FRC001

Proyecto web completo para **SANT CRANES** (Mantenimiento, Ingeniería, Fabricación y Venta de Repuestos Multimarca para Grúas Viajeras y Polipastos Industriales), listo para alojarse en **GitHub + Cloudflare Pages** y conectarse con **Google Apps Script**.

## Estructura de Archivos

* `index.html`: Página web corporativa principal (Hero, Nuestros Servicios, ¿Por qué elegirnos?, Cartera de Clientes, Formulario de Cotización conectado a Google Apps Script + WhatsApp).
* `checklist.html`: Aplicación web del **Check List de Mantenimiento Preventivo (Formato FRC001)** con los 6 movimientos y **221 puntos exactos** del Excel original, matriz mensual (`Ene`–`Dic`), tolerancias (`Original / Max / Min`), tabla dinámica de refacciones, firmas digitales en `<canvas>`, exportación CSV/JSON e impresión PDF.
* `Code.gs`: Backend en **Google Apps Script** que recibe cotizaciones y reportes FRC001, crea automáticamente las pestañas en Google Sheets (`Cotizaciones_Web`, `Checklists_FRC001`, `Detalle_Inspeccion`), guarda las firmas PNG en Google Drive y envía notificaciones por correo.

## Pasos Rápidos de Despliegue

### 1. Configurar Google Apps Script (Backend)
1. Crea una hoja nueva en Google Sheets (ej. `SANT CRANES - Sistema Web`).
2. Ve a **Extensiones → Apps Script**, borra el código inicial y pega todo el contenido de `Code.gs`.
3. Haz clic en **Implementar → Nueva implementación → Aplicación web**:
   * **Ejecutar como:** `Yo`
   * **Quién tiene acceso:** `Cualquier persona`
4. Autoriza los permisos y copia la URL generada (`https://script.google.com/macros/s/.../exec`).
5. Pega esa URL dentro de la constante `APPS_SCRIPT_URL` tanto en `index.html` como en `checklist.html`.

### 2. Subir a GitHub y Publicar con Cloudflare Pages
1. Sube `index.html` y `checklist.html` a la raíz de tu repositorio en GitHub.
2. En **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**, selecciona el repositorio de SANT CRANES (sin comando de compilación, directorio raíz `/`).
3. Asigna tu dominio personalizado en la pestaña **Custom domains** de Cloudflare Pages para obtener HTTPS automático y despliegue continuo con cada `git push`.
