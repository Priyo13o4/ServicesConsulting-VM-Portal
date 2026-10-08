# VM Portal

Internal portal for requesting and managing VMware VMs. Rules for contributors and AI agents are in `AGENTS.md`; business rules in `docs/domain.md`; file placement and architecture guide in `docs/codebase-structure.md`.

## Requirements

- Docker Desktop (or Docker Engine + Compose v2)
- Node 22.12+ on your machine, only for the `npm run …` shortcuts, typecheck and lint. The app itself runs in Docker.

## First run (local)

```sh
cp .env.example .env.local        # then set BETTER_AUTH_SECRET and NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
npm install                       # for editor types, typecheck and lint
npm run stack:local               # app on http://localhost:3000, Mailpit on http://localhost:8025
npm run local:migrate             # in a second terminal
```

Check http://localhost:3000/api/health returns `{"status":"ok"}`.

## Environments

| Environment | Where | Compose files | Env file | What runs |
|---|---|---|---|---|
| Local | Your machine | `compose.yml` + `compose.local.yml` | `.env.local` | `next dev` with hot reload (source mounted), Postgres on :5432, Mailpit |
| Smoke | Your machine | `compose.yml` + `compose.release.yml` + `compose.smoke.yml` | `.env.local` | The real production build with local settings, Mailpit |
| Dev | Shared dev server | `compose.yml` + `compose.release.yml` + `compose.deploy.yml` | `.env.deploy` (dev values) | Production build, nginx with TLS, real SMTP relay |
| Prod | Production server | same as Dev | `.env.deploy` (prod values) | Same as Dev |

Dev and prod run identical files; only `.env.deploy` differs. Server-only settings are read at runtime, so the same build behaves correctly in each environment. Don't use `NEXT_PUBLIC_*` variables for environment-specific values: those are baked in at build time.

Run the smoke stack before every deploy. It's the same image the servers will run.

```sh
npm run stack:down && npm run stack:smoke
```

## Deploy (dev or prod server)

One-time setup on the server: clone the repo to `/opt/vm-portal`, create `.env.deploy` from `.env.example`, put the TLS certificate in `certs/fullchain.pem` and `certs/privkey.pem`, and add the backup cron line from `scripts/backup.sh`.

Each release:

```sh
cd /opt/vm-portal
git fetch --tags && git checkout <release-tag>
docker compose --env-file .env.deploy -f compose.yml -f compose.release.yml -f compose.deploy.yml up -d --build
```

Migrations run automatically (the `migrate` service runs before the app starts). The app only starts when they succeed.

## Backups

`scripts/backup.sh` writes a compressed dump to `backups/` and keeps 14 days. To restore:

```sh
docker compose --env-file .env.deploy -f compose.yml -f compose.release.yml -f compose.deploy.yml exec -T db \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < backups/<file>.dump
```

Test a restore on the dev server before go-live.
