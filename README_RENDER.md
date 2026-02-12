# Deploy en Render (Web Service)

## Config recomendada
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment Variables (Render > Settings > Environment):**
  - `STORE=memory` (si querés correr sin base de datos)
  - `SESSION_SECRET=poné_algo_largo`
  - (Opcional DB)
    - `DATABASE_URL=...`
    - `DATABASE_SSL=true|false`

## Health check
Probá en el navegador:
- `/health` (si existe; si no, agregalo en app.js con `res.status(200).send("ok")`)
- `/login`

## Notas
- No subir `node_modules` ni `.env` al repo.
- Render asigna el puerto en `process.env.PORT`; este proyecto ya lo usa en `bin/www`.
