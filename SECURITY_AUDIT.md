# Auditoría de seguridad - Laze Cheats (16 oct 2026)

**Origen:** ZIP privado entregado por el propietario. No subir el ZIP original porque contiene credenciales comprometidas.

## Hallazgos
- CRÍTICO: clave secreta Groq publicada directamente en `index.html`. Debe REVOCARSE antes del despliegue nuevo.
- CRÍTICO: contraseña predeterminada del admin incrustada en JS; sesión y cambios guardados en localStorage. Deben implementarse login/sesión HTTP-only y catálogo compartido desde servidor.
- ALTO: precio de compra y orden construidos por el navegador; PayPal debe crear/capturar pagos en backend y validar monto, referencia, estado y entrega única.
- ALTO: endpoint Google Apps Script público en `yape-pago.js`. El código de Apps Script no fue entregado; requiere rotar despliegue, secreto compartido y verificar pagos, stock e idempotencia en servidor.
- ALTO: sin rate-limiting distribuido ni verificación Turnstile de lado servidor.
- MEDIO: sin CSP, HSTS, detección de cambios ni rama protegida. Bloquear F12 no sirve como protección.

## Solución preparada por separado
Existe un ZIP de proyecto refactorizado de Vercel preparado en el chat con este usuario (NO se subió aquí el ZIP ni los secretos). Incluye Vercel Functions, Redis Upstash, login scrypt, cookies seguras, Turnstile con siteverify, rate limiting, catálogo centralizado, pagos PayPal servidor, proxy protegido para Apps Script, cabeceras, CI e inventario SHA-256.

**IMPORTANTE**: Esta rama contiene únicamente este informe. No combinar ni desplegar como si el proyecto reforzado estuviera instalado. Primero importar el ZIP de proyecto seguro y configurar las variables privadas de Vercel. Luego revisar y probar el código Apps Script (pendiente) y Cloudflare (configuración externa).

## Antes de producción
1. Revocar la key Groq original y cualquier credencial comprometida.
2. Importar **solo** los archivos del ZIP seguro, nunca el ZIP original.
3. Configurar variables de entorno, Upstash Redis, Turnstile, PayPal y Apps Script validado.
4. Habilitar WAF, protección antirrobots, rate limiting perimetral y Cloudflare proxy, verificar que dominio vercel.app no eluda el WAF.
5. Habilitar 2FA, protección de rama, revisión de PR y alertas de cambios.
6. Probar autenticación, CORS/origen, CAPTCHA, 429, pago repetido, pagos falsos, entrega única y rollback.

**Estado:** auditoría estática + paquete de código, no pentest de producción ni despliegue verificado.