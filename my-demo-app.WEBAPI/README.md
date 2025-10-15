My Demo WebAPI

Quickstart

1. Copy `.env.example` to `.env` and edit `DATABASE_URL` to point to your local Postgres (see `my-demo-app-db/.env.example`).

2. Install dependencies:

   npm install

3. Generate Prisma client and push schema to DB (DB must be running):

   npx prisma generate
   npx prisma db push

4. Start dev server:

   npm run dev

API endpoints

- GET /health
- GET /users
- POST /users { name, email }
