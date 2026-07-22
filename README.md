# TasmaFive Admin

This repository is one single-root full-stack Node application. Next.js uses
root `src/`, `public/` and configuration files. The Express admin API is an
internal module under `src/server-api/`. `unified-server.mjs` serves both on one
process, port, and origin; browser requests use same-origin `/api/admin/*`.

The public repository remains the sole owner of `/api/auth`, `/api/content`,
`/api/contact`, `/api/quote`, `/api/audit`, `/api/instagram` and `/api/payments`.
The shared Mongo database stores public business data; the separate private
database stores administrators, sessions and audit logs.

## Local setup

Use Node.js `20.19+` or `22.13+`. Copy `.env.example` to `.env`, place optional
browser-only overrides in `.env.local`, then run:

```bash
npm ci
npm run dev
```

Open `http://localhost:3001`. Useful root commands are `npm run lint`,
`npm test`, `npm run build`, and `npm run start`. The public application can
run alongside this one on port `3000`.

## Hostinger deployment

Create one Hostinger Node.js application with repository root (`admin`) as the
application root:

- Node.js: `20.19+` or `22.13+`
- Install: `npm ci`
- Build: `npm run build`
- Start: `npm run start`
- Domain: the admin HTTPS origin

Configure root `.env.example` variables in Hostinger. Do not set a fixed
`PORT`; Hostinger injects it. `ADMIN_ORIGINS` must contain exact HTTPS origins,
`PUBLIC_SITE_URL` must identify the public site, and `NEXT_PUBLIC_USER_SITE_URL`
must be available at build time. Wildcards and a second browser API domain are
not supported.

`MONGODB_SHARED_URI` must identify the same database as the public app's
`MONGODB_URI`; `MONGODB_ADMIN_URI` must identify a different private database.
The complete root installation is required at runtime because the custom
server cannot use Next standalone output. Never run development mode in
production or commit real `.env` files.

## Operational caveats

- Changing `ADMIN_PASSWORD` rotates the configured admin account password.
- Changing `ADMIN_SESSION_SECRET` invalidates existing admin sessions.
- Provision production Mongo unique/TTL indexes in a controlled deployment.
- Admin-wide payment access belongs to the admin ledger API.
