# AVL Capital website

The project keeps its React frontend and Express API in separate folders. For local development:

1. Install dependencies with `npm install`, `npm --prefix frontend install`, and `npm --prefix backend install`.
2. Copy `backend/.env.example` to `backend/.env` and ensure the configured MongoDB instance is running.
3. Run both processes with `npm run dev`. The frontend runs on port 5173 and proxies relative `/api` requests to the backend on port 3001.

Use `npm test`, `npm run lint`, and `npm run build` for repository-wide verification. In production, serve the frontend and route `/api` through the same public origin so the browser continues to use relative API URLs. `CORS_ORIGIN` is the backend's explicit browser-origin allowlist; it does not change the frontend API URL.
