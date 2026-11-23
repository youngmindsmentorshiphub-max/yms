# Young Minds Mentorship Hub: website & admin

Zero-dependency stack: Node.js ≥ 22.13, `node:http`, `node:sqlite`, `node:crypto`.

## Quick start
```
cp .env.example .env
npm start          # http://localhost:3000  ·  admin: /admin/
npm test
```
Put `logo.jpg`, `favicon.png`, `founder.jpg`, `founder-speaking.jpg` and `team.jpg` in `public/assets/`.

## Included
Public pages (Home, About, What we do, Team, Gallery placeholder, Get involved, Book, Contact), API (positions, site, applications, bookings, messages, subscribe), JWT/scrypt admin auth, admin dashboard (overview, applications with CSV export, bookings, messages, positions, settings), rate limiting, honeypots, CSP and security headers.

## Not yet built (spec §4.8–4.9, §8A)
Photo & media management: uploads, photo slots, media library and gallery admin. The public pages already carry `data-slot` attributes and call `/api/media/slots`, so this module can be added without touching page code.

## Go-live checklist
`NODE_ENV=production`, strong `ADMIN_PASSWORD`, long `TOKEN_SECRET`, HTTPS (Nginx + Certbot, forwarding `X-Forwarded-For`). Back up `data/` (database). Docker: `docker build -t ym . && docker run -p 3000:3000 -v ym-data:/app/data --env-file .env ym`.
