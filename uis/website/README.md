# Website (`uis/website`)

HealthCore's public site (landing + partner application form). The pages are the original static HTML files in `public/`, served by Next.js on port **3000**. Tailwind CSS is compiled to `public/assets/output.css` (generated, not versioned).

- Dev (in Docker): `docker compose up` from the repo root → http://localhost:3000
- Health check: http://localhost:3000/healthz
