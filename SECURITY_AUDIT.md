# Laze Cheats — informe y estado de seguridad (16 oct 2026)

## Estado en GitHub

El código refactorizado de **43 archivos** ya se añadió a la rama `security/auditoria-laze-2026-10-16` de este repositorio **público**. Incluye frontend, APIs de Vercel, fuentes/estáticos, archivo `.env.example` sin valores privados, configuración de cabeceras, pruebas de sintaxis y workflow de seguridad. **Nunca se ha subido el ZIP original que expuso una clave.**

La rama se mantiene en pull request mientras se revisa CI y el comportamiento de pagos, no está validada para producción. Una rama de GitHub no activa Cloudflare ni despliega Vercel automáticamente.

## Hallazgos críticos del ZIP original

- Una API key de Groq estaba incrustada en `index.html`; **revocar esa credencial inmediatamente**, porque eliminarla de la web nueva no desactiva la anterior.
- Panel administrador autenticado solo en JavaScript, contraseña predefinida y datos en localStorage.
- Precio/ordenes calculadas en frontend sin verificación del proveedor en backend.
- Integración de Google Apps Script pública: código externo NO auditado.
- Sin defensa WAF/anti-DDoS, rate limiting server-side ni MFA/GitHub branch protection.

## Cambio de arquitectura

- Backend en `api/` y credenciales solo en variables privadas de Vercel.
- Contraseña de admin con scrypt y sesiones con cookie HttpOnly/Secure/SameSite.
- Catálogo y rate limiting compartidos con Upstash Redis.
- Turnstile verificado en servidor y validación de origen.
- PayPal create/capture en backend con importe generado de datos de servidor y validación de captura.
- Integración Yape con proxy de backend y `APPS_SCRIPT_SHARED_SECRET`; esto **no asegura el Apps Script remoto sin cambiarlo**.
- Cabeceras y CSP en `vercel.json`. Hashes en `security/manifest.sha256`, escáner estático y workflow CI de dependencias.

## Antes de fusionar y desplegar

1. Solucionar cualquier fallo de GitHub Actions CI, habilitar MFA, protección de main y revisiones.
2. Revocar key Groq original y otros valores anteriormente publicados.
3. Configurar Vercel, Upstash Redis, Groq, Turnstile y PayPal por Environment Variables.
4. Revisar, corregir y republicar Apps Script externo para validar secreto, pagos reales, stock, idempotencia y entregas únicas.
5. Configurar en Cloudflare DNS proxied, WAF, Bot Management/Turnstile y rate limit por ruta (dependen del plan) y controlar acceso por hostname de Vercel.
6. Ejecutar pruebas reales en entornos de prueba y ensayo de recuperación/rollback.

**No se ha realizado pentesting externo ni auditado el Apps Script. No aceptar pagos hasta completar estas pruebas.**
