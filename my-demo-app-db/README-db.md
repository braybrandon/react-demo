Postgres Docker (local)

Quickstart

1. Copy .env.example to .env and customize credentials if needed:

   cp .env.example .env

2. Start the database:

   docker compose up -d

3. Verify it's running:

   docker compose ps

4. Connect from your app at:

   host: localhost
   port: 5432
   user: POSTGRES_USER from .env
   password: POSTGRES_PASSWORD from .env
   database: POSTGRES_DB from .env

Notes

- Data is persisted in a named Docker volume `postgres-data` inside this repo's Docker environment.
- To remove the database and data (be careful):

  docker compose down -v

- If you're running Docker Desktop on Windows, you may need to allow file sharing for volumes or change the volume mapping.
