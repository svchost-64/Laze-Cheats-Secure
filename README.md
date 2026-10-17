# Laze Cheats

Tienda web con catálogo público, tutoriales, panel administrativo y pasarela de pagos. El frontend estático se sirve desde Vercel y las operaciones sensibles se ejecutan en funciones de servidor (`api/`).

> **Estado:** la rama de seguridad se utiliza para pruebas en **Preview**. No debe publicarse para cobros reales hasta completar las integraciones, habilitar las verificaciones de GitHub y aprobar las pruebas de pagos. El código por sí solo no garantiza protección total.

## Arquitectura y seguridad

| Componente | Control | Archivo o servicio |
| --- | --- | --- |
| Frontend | Política CSP, HSTS, anti-iframe, `nosniff`, Referrer-Policy | `vercel.json` |
| Tráfico web | WAF de Vercel y reglas de limitación de solicitudes | Vercel → Firewall |
| Catálogo | Validación de tipos, identificadores, URLs e imágenes | `api/_security.js`, `api/_catalog.js` |
| Administrador | Scrypt, Turnstile, limitación de intentos, cookie firmada `HttpOnly`, `Secure`, `SameSite=Strict` | `api/admin.js` |
| API | Comprobación de origen, limitación por ruta, errores sin detalles privados | `api/_security.js` |
| Chat de soporte | Clave de proveedor únicamente en servidor, límite de consultas y Turnstile | `api/chat.js` |
| Pedidos | Cálculo de importes en servidor, validación de pagos y estado compartido | `api/payments.js` |
| Persistencia | Redis REST para catálogo editable, pedidos, bloqueos y rate limiting | Upstash Redis |
| Cambios inesperados | Integridad SHA-256, revisión de secretos, tests y control de rama | `security/manifest.sha256`, `.github/workflows/security.yml` |

**Limitaciones:** las cabeceras de seguridad y el WAF no sustituyen la revisión de dependencias, las claves de terceros, ni la protección de las cuentas de GitHub/Vercel. Los límites aplicados en el WAF y los realizados con Redis son complementarios.

## Requisitos

- Cuenta de Vercel con un plan apto para el uso previsto. **Hobby no está destinado a actividad comercial**.
- Node.js 22 y acceso de escritura al repositorio de GitHub.
- Upstash Redis con API REST, conectado a los entornos de Vercel correspondientes.
- Cloudflare Turnstile y una lista de dominios autorizados para cada entorno.
- Credenciales nuevas del proveedor de chat, la pasarela PayPal y, si se activa Yape, un backend externo de verificación de pagos revisado.
- Un dominio propio si se quiere utilizar el proxy DNS/WAF de Cloudflare; el subdominio `vercel.app` no pasa por Cloudflare administrado por el propietario.

## Variables de entorno

Copiar **solo los nombres** de `.env.example` al panel de Vercel: **Project → Settings → Environment Variables**. Los valores privados se introducen allí; no se incluyen en código, GitHub, screenshots ni logs.

| Nombre | Uso | ¿Se puede mostrar al navegador? |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | Endpoint REST del almacén compartido | No |
| `UPSTASH_REDIS_REST_TOKEN` | Autenticación de Redis | **No** |
| `ADMIN_PASSWORD_HASH` | Hash scrypt del administrador | **No** |
| `ADMIN_SESSION_SECRET` | Firma de cookies de sesión | **No** |
| `TURNSTILE_SITE_KEY` | Identificador público del widget | Sí |
| `TURNSTILE_SECRET_KEY` | Verificación de retos en servidor | **No** |
| `TURNSTILE_ALLOWED_HOSTNAMES` | Dominios exactos permitidos, separados por coma | Configuración de servidor |
| `GROQ_API_KEY` | Credencial privada del chat | **No** |
| `GROQ_MODEL` | Modelo utilizado por el servicio | Puede publicarse, no es secreto |
| `PAYPAL_CLIENT_ID` | ID público de PayPal | Sí, si la pasarela está habilitada |
| `PAYPAL_CLIENT_SECRET` | Credencial de acceso PayPal | **No** |
| `PAYPAL_MODE` | `sandbox` durante pruebas; `live` solo tras auditoría | Configuración de servidor |
| `PAYPAL_PEN_PER_USD` | Cambio de moneda, validado en backend | Sí |
| `PAYMENTS_SCRIPT_URL` | URL del Apps Script revisado | **No**, mantener solo en servidor |
| `APPS_SCRIPT_SHARED_SECRET` | Autenticación del backend Yape/entrega | **No** |
| `ENABLE_YAPE_PAYMENTS` | `false` hasta aprobar integración de Yape | No |
| `ENABLE_PAYPAL_PAYMENTS` | `false` hasta aprobar sandbox y entregas | No |
| `ENABLE_LIVE_PAYMENTS` | `false` por defecto; exige aprobación para pagos live | No |

**El checkout permanece cerrado de forma deliberada** cuando faltan flags, claves, Turnstile o el backend de verificación. No activar las opciones `ENABLE_*` por el simple hecho de haber creado Redis. Debe comprobarse el flujo completo de confirmación y entrega.

Para generar el hash del administrador:

```bash
npm install --ignore-scripts
npm run password:hash
```

Para generar el secreto de sesión (el resultado debe quedar solo en Vercel):

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Configurar `ADMIN_SESSION_SECRET` como una cadena aleatoria de **32 caracteres o más**, independiente de la contraseña. Rotar ambos valores ante sospechas de compromiso. Los secretos nunca se devuelven desde `/api/config`.

## Instalación y pruebas

```bash
npm install --ignore-scripts
npm run check
npm test
```

El proyecto usa estructura estática con funciones serverless bajo `api/` y raíz de proyecto como directorio de trabajo. No habilitar un build de frontend distinto sin validarlo previamente. El manifiesto `security/manifest.sha256` registra el contenido aprobado: si se modifican archivos protegidos, **revisar el diff y actualizar los hashes únicamente después de aprobar el cambio**.

### Comprobaciones que deben superar las versiones de prueba

1. `GET /` devuelve HTTP 200 y carga CSS, scripts e imágenes. El catálogo inicial aparece aunque Redis todavía no esté configurado, pero sus operaciones de escritura permanecen bloqueadas.
2. `GET /api/catalog` devuelve solo catálogo público validado. `GET /api/config` puede exponer site key de Turnstile y client ID de PayPal; **nunca** secretos privados.
3. `GET /api/admin` sin sesión devuelve `{"authenticated":false}`. Las modificaciones sin cookie válida devuelven 401; las peticiones de otro origen devuelven 403.
4. `POST /api/payments` rechaza toda acción de Yape y PayPal hasta configurar explícitamente sus flags y dependencias. Una petición POST sin origen legítimo devuelve 403.
5. Las rutas `/api/` están limitadas por WAF. Las rutas de sondeo `.env`, `.git`, `/wp-admin` y `/phpmyadmin` están denegadas en el WAF configurado.
6. El script de control de secretos y los tests terminan correctamente. GitHub Actions debe mostrar resultados **verdes**, no solo un deployment `READY`.

### PayPal y Yape: requisitos antes de aceptar dinero real

**PayPal:** utilizar `PAYPAL_MODE=sandbox` durante todas las pruebas; verificar el importe calculado por el servidor, moneda USD, ID de orden, referencia y captura `COMPLETED`. Simular peticiones repetidas, respuestas tardías y caídas del backend. Solo después de auditar stock y entregas habilitar `ENABLE_PAYPAL_PAYMENTS=true`. Para live también se exige `ENABLE_LIVE_PAYMENTS=true` y un plan Vercel compatible.

**Yape / Apps Script:** el Google Apps Script es un sistema **externo a este repositorio** y su código no está auditado. Antes de habilitarlo debe exigir el secreto compartido **antes de procesar cualquier acción**, consultar la transacción real por una fuente de pago fiable, comprobar importe, receptor, fecha, orden y stock; marcar cada pago y clave como usados de forma atómica, evitar entregas duplicadas, limitar intentos y registrar conciliación sin guardar secretos en logs. Revocar la publicación anterior del Apps Script y rotar sus credenciales. Un código de tres dígitos o una captura de pantalla **no son prueba suficiente de pago**.

## Configuración del firewall

En **Vercel → Project → Firewall**, mantener habilitadas las reglas activas:

- Rate limit de `/api/`: **100 solicitudes por IP cada 60 segundos** (válido para GET y POST). Ajustar basándose en tráfico real; un WAF no reemplaza la validación por usuario/orden en el servidor.
- Denegar rutas no utilizadas: `/.env`, `/.git`, `/wp-admin`, `/wp-login.php` y `/phpmyadmin`.

Antes de habilitar reglas administradas de bloqueo XSS/SQLi/Bot o desafíos masivos, revisarlas en modo log y verificar que no afecten a clientes legítimos. Los límites por IP pueden afectar redes compartidas. Los mecanismos DDoS básicos de Vercel no requieren desactivar la protección de despliegues.

## Protección frente a modificaciones no autorizadas

- Configurar **GitHub → Settings → Branches / Rulesets**: protección de `main`, revisión de PR, impedir force-push y requerir verificaciones CI. Habilitar 2FA o passkeys a los colaboradores.
- Vincular Vercel a la rama principal protegida; publicar primero en Preview, revisar los logs y promover únicamente versiones probadas.
- Habilitar alertas de builds/despliegues inesperados, cambios de variables/dominios, aumento de respuestas 401/403/429 y conciliación de pagos.
- Mantener copias de seguridad de Redis y del código. Ensayar un rollback desde Vercel.
- Verificar que `security/manifest.sha256` contiene todas las rutas críticas antes de aprobar cambios. No sustituir el manifiesto sin revisión.

## Incidentes y rotación de claves

1. Si una credencial se publicó en GitHub o en el navegador, **revocarla en el proveedor y crear una nueva**. Borrarla del código no invalida las copias públicas o los historiales.
2. Revocar sesiones administrativas rotando `ADMIN_SESSION_SECRET`; cambiar el hash de contraseña con `npm run password:hash`.
3. Deshabilitar temporalmente `ENABLE_YAPE_PAYMENTS`, `ENABLE_PAYPAL_PAYMENTS` y `ENABLE_LIVE_PAYMENTS` si hay discrepancias de cobro.
4. Revisar registros de Vercel, Redis, proveedor de pagos y GitHub. Conservar evidencias sin incluir tokens ni información financiera sensible.
5. Aplicar la corrección en una rama de revisión, pasar tests, desplegar a Preview y promover tras validarla.

### Limitaciones actuales

El backend externo de Yape, las credenciales de proveedores, la base Redis y las cuentas de administración externas requieren configuración o verificación fuera del repositorio. **No se certifica ausencia absoluta de vulnerabilidades**. El escaneo de secretos identifica patrones habituales, pero no sustituye la rotación de credenciales ni una auditoría independiente de los servicios de terceros.
