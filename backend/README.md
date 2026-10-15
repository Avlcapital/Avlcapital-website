# AVL Capital consultation API

Requires Node.js 20.19 or newer and MongoDB. Create an ignored `backend/.env` with the variables below, then run `npm install` and `npm run dev`. Never commit real credentials.

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=avlcapital
CORS_ORIGIN=http://127.0.0.1:5173
NODE_ENV=development
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-long-unique-password
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=smtp-user
SMTP_PASSWORD=smtp-password
SMTP_FROM=AVL Capital <admin@example.com>
```

The bootstrap credentials create the first administrator only when the admins collection is empty. Remove them from the environment after successful bootstrap. Further administrators are created from the protected admin interface.

`GET /api/health` reports service health. `POST /api/consultations` accepts consultation enquiries. Consultation reads and admin account operations require a secure HTTP-only session cookie. Password recovery codes are hashed, expire, and are delivered over configured SMTP.

Run `npm test` and `npm run lint` before deployment.
