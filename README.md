# AVL Capital website

The project keeps its React frontend and Express API in separate folders. For local development:

1. Install dependencies with `npm install`, `npm --prefix frontend install`, and `npm --prefix backend install`.
2. Configure `backend/.env` using the variable list in [`backend/README.md`](backend/README.md), and ensure the configured MongoDB instance is running.
3. Run both processes with `npm run dev`. Open the frontend at `http://127.0.0.1:5173`; it proxies relative `/api` requests to the backend on port 3001. If port 5173 is already occupied, press `Ctrl+C`, stop the process using that port, and run the command again. The combined command stops both services when either one fails.

Use `npm test`, `npm run lint`, and `npm run build` for repository-wide verification.

## Production deployment

The Vercel project must use `frontend` as its Root Directory. The checked-in `frontend/vercel.json` proxies `/api` requests to `https://avlcapital-website.onrender.com` and sends all other routes to the React entry point, so direct visits to routes such as `/admin` work.

The Render service must use `backend` as its Root Directory and `npm start` as its Start Command.

Set these values in the Render service environment:

```env
NODE_ENV=production
CORS_ORIGIN=https://avlcapital-website.vercel.app
```

Also configure `MONGODB_URI`, the SMTP variables, and the admin/bootstrap variables required by the backend. Remove `ADMIN_EMAIL` and `ADMIN_PASSWORD` from Render after the first administrator has been created successfully. Do not include a trailing slash in `CORS_ORIGIN`, and do not commit secrets to Git. The Render health endpoint is `https://avlcapital-website.onrender.com/api/health`.

The checked-in hostnames target the production Vercel and Render services above. If either service is renamed or moved to a custom domain, update the destination in `frontend/vercel.json` and set Render's `CORS_ORIGIN` to the exact public frontend origin. Preview deployments require their own allowed-origin strategy before authenticated features can be tested from a preview URL.
