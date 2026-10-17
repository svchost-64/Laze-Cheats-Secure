# Laze Cheats – Seguridad (Vercel)

Versión reconstruida del ZIP enviado. **No está publicada por defecto**. La aplicación usa Vercel Functions + Upstash Redis + Cloudflare Turnstile; las credenciales privadas no se publican en el navegador.

## Hallazgos originales

1. **CRÍTICO:** clave Groq incrustada en HTML público. **Revocar inmediatamente la clave original**, aunque ya no aparezca en este código.
2. **CRÍTICO:** contraseña del administrador en JavaScript y login gestionado en `localStorage`. Se reemplazó con verificación scrypt en API, validación Turnstile en login, sesión de 4 horas en cookie HttpOnly/Secure/SameSite y catálogo centralizado en Redis.
3. **ALTO:** total del pedido, producto y orden controlados por JavaScript. Nuevo backend deriva importes del catálogo almacenado en servidor y captura PayPal desde el servidor con verificación de importe, estado y referencia.
4. **ALTO NO RESUELTO SIN CÓDIGO EXTERNO:** el Google Apps Script de Yape/entrega de claves no fue entregado. Se elimina su URL del frontend y se añade un secreto de backend, pero **solo se protege si Apps Script verifica ese secreto** y valida la transacción de Yape y el stock sin confiar en el cliente. Desactivar el despliegue anterior y rotar la URL.
5. No hay base de datos independiente en el ZIP; se añadió Upstash Redis como almacén del catálogo, sesiones sin estado, límite de peticiones y estado de órdenes.
6. Bloquear F12/inspector no constituye seguridad y fue eliminado.

## Puesta en marcha

1. Conectar este repositorio público a Vercel y usar Node.js **22+** con framework «Other». Instalar dependencias con `npm install` y usar el directorio raíz como proyecto.
2. Crear instancia Redis en Upstash e instalar la integración o copiar las variables `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` a Vercel.
3. Configurar Cloudflare Turnstile y registrar el dominio propio y `*.vercel.app` que vaya a usarse, en el widget permitido. Configurar `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES` (hostnames exactos, separados por coma).
4. Regenerar la clave Groq ya expuesta y configurar `GROQ_API_KEY` solo como **variable privada de servidor en Vercel**, nunca `VITE_`, `NEXT_PUBLIC_` o en `.js`.
5. Generar contraseña del admin: `npm run password:hash`. Copiar resultado a `ADMIN_PASSWORD_HASH`. Generar `ADMIN_SESSION_SECRET` con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
6. Introducir `PAYPAL_CLIENT_ID` (este sí es público), `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE=live` (o `sandbox`) y `PAYPAL_PEN_PER_USD`. Verificar que ambos valores corresponden a la **misma cuenta de PayPal**.
7. Actualizar el **código fuente** de Apps Script para verificar, antes de cualquier acción: `const d=JSON.parse(e.postData.contents); if (d.authToken !== PropertiesService.getScriptProperties().getProperty('BACKEND_SECRET')) return ContentService.createTextOutput(JSON.stringify({ok:false})).setMimeType(ContentService.MimeType.JSON);` y establecer `BACKEND_SECRET` en Script Properties. Debe hacerse dentro de `doPost`, antes de todo acceso a claves/stock/pagos. Generar un secreto de 32+ caracteres para `APPS_SCRIPT_SHARED_SECRET`, actualizar el script y la URL `PAYMENTS_SCRIPT_URL` en Vercel. **Revocar el despliegue antiguo**. Verificar que Apps Script nunca retorne claves sin confirmar el pago real y marcar uso como atómico.
8. Configurar dominio y DNS en Cloudflare, proxy «Proxied» para el dominio, WAF administrado, bot protection y reglas por ruta para `/api/chat`, `/api/payments` y `/api/admin`; usar SSL/TLS Full (strict). El plan y las capacidades disponibles afectan las reglas. **El WAF no se activa mediante este repositorio.**
9. En Vercel habilitar Deployment Protection para previews cuando esté disponible; restringir el dominio `*.vercel.app` si deseas que todo tráfico productivo pase por Cloudflare. Habilitar 2FA en GitHub, branch protection, revisión obligatoria y bloquear pushes directos. Los despliegues de Vercel deben provenir solo de la rama protegida y la CI debe pasar.
10. Configurar alertas para cambios de dominio/DNS, builds inesperados, picos de tráfico, fallos de login, `429`, pagos inconclusos y discrepancias de stock; mantener un rollback verificado.

## Desarrollo y comprobaciones

```bash
npm install
npm run check
npx vercel dev
```

- Comprueba que `/api/config` **solo** devuelva site key pública de Turnstile y client ID público de PayPal, y no secretos.
- En `/api/admin` GET debe devolver `authenticated:false` sin cookie y `true` solo con cookie válida; el POST `save` debe devolver `401` sin sesión.
- La IA requiere token Turnstile de un solo uso, rate limiting y `GROQ_API_KEY` del servidor; no funciona hasta configurar todo.
- Prueba Yape y PayPal en **entorno de prueba** antes de permitir pagos reales; haz pruebas de importe alterado, petición repetida y transacción no capturada.
- **No se realizaron pruebas de penetración contra servicios reales**, ni se ha comprobado la implementación externa de Apps Script ni de PayPal.
- El primer catálogo se carga de `data.json`; las modificaciones posteriores del admin se guardan en Redis y no vuelven a escribirse en `data.json`. Asegúrate de tener backup de Redis.
- No subas `.env.local`, llaves, archivos de respaldo privados ni el ZIP original con secretos a GitHub.

## Anti-defacement

La CI compara SHA-256 de archivos estáticos con `security/manifest.sha256`, valida sintaxis, revisa cadenas con formato de claves y ejecuta auditoría de dependencias. Es **detección de cambios**, no garantía de bloqueo. Se completa con 2FA, reglas GitHub protegidas, controles de Vercel y Cloudflare, alertas y rollback.

## Pendiente para el propietario

Configuración real de Cloudflare, Vercel y proveedores; auditoría del código fuente Apps Script de Yape/stock/entrega, rotación de la clave Groq comprometida y despliegue de prueba. No dejar en producción el flujo de pagos hasta validar end-to-end.
