# AVL Capital consultation API

Requires Node.js 20.19 or newer and MongoDB. Copy `.env.example` to `.env`, adjust the values, then run `npm install` and `npm run dev`.

`GET /api/health` reports service health. `POST /api/consultations` accepts consultation enquiries; there is deliberately no public read endpoint. In production set `MONGODB_URI`, `MONGODB_DB_NAME`, and `CORS_ORIGIN`, then use `npm start`. The service stores only submitted enquiry fields plus consent and creation timestamps and the MongoDB document ID.

Run `npm test` and `npm run lint` before deployment.
