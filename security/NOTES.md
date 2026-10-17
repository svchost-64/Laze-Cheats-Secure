# Security notes
- Hash manifest is a change-detection baseline for CI. It cannot prevent an authorized administrator or compromised GitHub account from changing both files and manifest; enforce protected branches, approvals, 2FA, GitHub alerts and immutable deploy rollbacks.
- Cloudflare WAF / DNS / DDoS and Vercel Deployment Protection must be configured in their respective dashboards; vercel.json cannot activate those account-level settings.
- Vercel hostname may bypass Cloudflare proxy. Review production/preview domain access controls.
- Apps Script source was NOT available for audit. The backend requires APPS_SCRIPT_SHARED_SECRET and sends `authToken`, but the Apps Script handler MUST reject missing/incorrect tokens before handling any action. Revoke the old publicly known endpoint, and deploy an updated protected one.
- Server now validates PayPal capture status, amount, product ID and stored order. Google Apps Script must also enforce stock and single-use fulfillment atomically.
- Secure headers use `style-src 'unsafe-inline'` because the existing markup includes inline styles. For stronger CSP, migrate these to CSS classes and use nonces or hashes; consider Trusted Types after removing dynamic innerHTML.
