# Controles y alcance

La documentación operativa está en [`README.md`](../README.md). Estas notas detallan las decisiones de seguridad que deben mantenerse en revisiones.

- **Claves privadas:** nunca publicar claves, tokens, contraseñas, secretos de cookies o URLs privadas de integraciones dentro del frontend, de `data.json`, de `README.md` ni de los logs. Los identificadores públicos de Turnstile y PayPal son excepciones documentadas.
- **Pagos:** la activación exige flags de entorno explícitos, credenciales válidas y backend remoto verificado. El código fuente del Google Apps Script de Yape no fue suministrado; su seguridad **no** puede afirmarse ni inferirse.
- **Control de acceso:** la sesión administrativa se firma en el servidor y expira. La verificación de origen, Turnstile y las limitaciones de intentos son controles separados, no sustitutos entre sí.
- **Estado de órdenes:** Redis es necesario para la persistencia y los bloqueos de pagos. Un almacén en memoria por instancia no ofrece garantías en funciones sin estado.
- **Protección de WAF:** hay reglas específicas de Vercel para `/api/` y sondeos comunes. Cloudflare DNS/WAF solo puede configurarse con una cuenta y un dominio propio correctamente vinculados.
- **Integridad de frontend:** `security/manifest.sha256` registra archivos críticos y la CI verifica el manifiesto. Un atacante con permisos de escritura sobre la rama puede cambiar tanto archivos como hashes: mantener revisiones, 2FA y políticas de rama para reducir ese riesgo.
- **Proveedor externo:** no activar entregas automáticas ni prometer verificación de cobros hasta probar pagos confirmados, reintentos, atomicidad, duplicados y recuperación de errores.
- **Cabeceras:** el frontend todavía utiliza algunos estilos en línea, por lo que `style-src 'unsafe-inline'` permanece. Migrar esos estilos a archivos CSS antes de endurecer la CSP.
- **Asistente virtual:** el backend utiliza un proveedor externo para respuestas. No incluye sus credenciales en JavaScript público y requiere Turnstile antes de consultar al proveedor.
