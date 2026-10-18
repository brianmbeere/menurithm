# Database Module

This folder contains all database-related files for the menurithm backend application.

## File Structure

```
app/db/
├── __init__.py                    # Package initialization
├── database.py                   # Database configuration and connection
├── migrate_database.py           # PostgreSQL migration script
├── test_uniqueness.py            # Migration verification tests
├── POSTGRES_MIGRATION.md         # Detailed migration instructions
└── migrations/
    └── fix_uniqueness_constraints.sql  # SQL migration for fixing uniqueness constraints
```

## Quick Start

### Running Migrations

From the backend root directory:
```bash
# Run migration (recommended)
python run_migration.py

# Run tests to verify migration
python run_tests.py
```

### Direct Execution

From this directory (`app/db/`):
```bash
# Run migration
python migrate_database.py

# Run tests
python test_uniqueness.py
```

## Files Description

### Core Files

- **`database.py`**: Contains SQLAlchemy engine configuration and database session management
- **`migrate_database.py`**: Main migration script that fixes global uniqueness constraints to be user-scoped
- **`test_uniqueness.py`**: Comprehensive test suite to verify migration success

### Migration Files

- **`migrations/fix_uniqueness_constraints.sql`**: PostgreSQL-specific SQL script for constraint migration
- **`POSTGRES_MIGRATION.md`**: Detailed documentation with step-by-step migration instructions

## Migration Overview

The migration addresses a critical issue where uniqueness constraints were applied globally instead of per-user:

### Before Migration
- ❌ Only one user could have an ingredient named "tomato"
- ❌ CSV uploads would silently fail due to constraint violations
- ❌ Menu generation would fail because data wasn't actually saved

### After Migration
- ✅ Each user can have their own "tomato" ingredient
- ✅ CSV uploads work correctly with proper error handling
- ✅ Menu generation succeeds because data is properly saved

## Environment Requirements

- PostgreSQL database
- Python packages: `psycopg2-binary`, `sqlalchemy`, `python-dotenv`
- `DATABASE_URL` environment variable configured

## Sharing a Render Postgres Instance

The API uses synchronous SQLAlchemy 2.x with psycopg2, not Prisma or Mongoose.
Connection configuration is shared by `database.py` and `migrate_database.py`
through [`app/core/database_config.py`](../core/database_config.py).
Both the database configuration and `app/core/config.py` load `.env` with
python-dotenv; existing Render environment variables take precedence.
`app/main.py` calls `Base.metadata.create_all(bind=engine)` at import time.

### 1. Provision logical databases once

Render supports multiple logical databases on one Postgres instance. Put both APIs
and Postgres in the same region and use the **internal** connection URL at runtime.
Use the external URL with `sslmode=require` for administration from your laptop.

Connect using the dashboard's PSQL command, then run:

```sql
CREATE DATABASE menurithm_pilot;
CREATE DATABASE routecast_pilot;
```

Alternatively, from the backend directory, with `ADMIN_DATABASE_URL` set to the
instance's **direct** administration URL pointing at an existing database:

```bash
psql "$ADMIN_DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  -f scripts/create_pilot_databases.sql
```

The script skips existing databases without modifying them. Run it once as the
Render owner role (which needs CREATEDB), without `--single-transaction`, and not
concurrently. New databases belong to that role. Do not put database provisioning
in API startup: the target database must already exist before connecting.

### 2. Configure each service separately

**Simplest option (works without DB_NAME support in the other API):** give each
service its own complete `DATABASE_URL`. Keep the host, port and instance
credentials, but change the URL's database path:

```text
# Menurithm service
DATABASE_URL=postgresql://USER:PASSWORD@INTERNAL_HOST:5432/menurithm_pilot

# Routecast service
DATABASE_URL=postgresql://USER:PASSWORD@INTERNAL_HOST:5432/routecast_pilot
```

Percent-encode special characters in URL credentials. Preserve existing query
parameters such as `?sslmode=require`. Leave `DB_NAME` unset with this option.
Do not paste real credentials into source control or logs.

**Optional Menurithm override:** keep Render's instance URL as `DATABASE_URL`, and
set `DB_NAME=menurithm_pilot` on this service. Our shared configuration parses the
URL and replaces only the database, preserving credentials, host, port and query
parameters. `DB_NAME` takes precedence over the URL path. It accepts 1-63 lowercase
ASCII letters, digits or underscores, starting with a letter or underscore.
An empty/invalid name, a non-Postgres override, or a conflicting `dbname` query
parameter fails explicitly. Without `DB_NAME`, the URL's database is unchanged.
Legacy `postgres://` URLs are normalized to `postgresql://`.

Routecast's sibling repository has the same override and pool configuration:
set `DB_NAME=routecast_pilot` there, or use its unique full URL with DB_NAME unset.
Set service-specific names on each service, not in a shared environment group
that would accidentally give both services the same database.

### 3. Schema creation, migrations and existing data

Postgres connections select one database. Thus `public.users` in
`menurithm_pilot` is independent from `public.users` in `routecast_pilot`:
no table renaming or shared `search_path` is necessary.
This prevents table-name collisions, but shared owner credentials do **not**
provide access-control isolation. For that, provision separate login/owner roles,
restrict database CONNECT privileges (including PUBLIC), and use each role's own
credentials. Keep administration credentials out of API environments.

The existing `create_all` creates missing tables only in the selected database;
it does not create databases, migrate existing columns, or copy data. Keep each
API's migration history and migration commands scoped to its own database.
Menurithm's uniqueness migration and its backup instructions now resolve DB_NAME
too. Run that script from the backend directory only when that particular
migration is needed:

```bash
python app/db/migrate_database.py
```

Routecast's `backend/migrate_db.py` imports its central engine and therefore
inherits the same DB_NAME and pool settings. Run `python migrate_db.py` from
Routecast's backend directory to create its missing tables before serving traffic.
Unlike Menurithm, Routecast's main module does not create tables at startup.
Neither `create_all` call updates existing table columns.

The repository contains Alembic revision files but no complete Alembic environment;
do not assume `alembic upgrade head` is configured. For multiple production
workers, prefer a single pre-deploy schema/migration step rather than racing DDL
from multiple workers; the existing startup behavior is unchanged here.

If either API already has data, back it up, restore each source database into its
own empty target (without restoring the source database name), and validate row
counts and application behavior before switching traffic. Merely changing the URL
does not transfer data. Retain the old instances until cutover is verified.

Verify each deployment against its effective configuration, from the backend
directory:

```bash
python - <<'PY'
from sqlalchemy import text
from app.core.database_config import create_database_engine

engine = create_database_engine()
try:
    with engine.connect() as connection:
        print(connection.execute(text(
            "SELECT current_database(), current_user"
        )).one())
finally:
    engine.dispose()
PY
```

Expect `menurithm_pilot` on this API and `routecast_pilot` on Routecast.
The existing HTTP `/health` endpoint does not check the database.

### 4. Pooling on a small instance

Render's **$7/month Starter Postgres is a legacy plan**, unavailable for new
instances. Its documented specs are 256 MB RAM, 0.1 CPU, 1 GB storage and **97
connections total**, shared across all logical databases. Confirm your actual
plan in the dashboard and run `SHOW max_connections;` rather than assuming that
a $7 web-service plan describes the database.

Previously, `create_engine(DATABASE_URL)` used SQLAlchemy's PostgreSQL defaults:
5 pooled connections plus 10 overflow connections **per process**. PostgreSQL
engines now use these configurable pilot defaults:

| Variable | Default | Meaning |
| --- | --- | --- |
| `DB_POOL_SIZE` | `2` | Retained connections per process (opened lazily) |
| `DB_MAX_OVERFLOW` | `1` | Additional connections during bursts |
| `DB_POOL_TIMEOUT` | `30` | Seconds to wait for an available connection |
| `DB_POOL_RECYCLE` | `1800` | Connection age in seconds before replacement on checkout |

`pool_pre_ping=True` checks connections on checkout, replacing stale connections.
It does not retry transactions interrupted by an outage. Invalid pool settings
fail at startup; unlimited pools/overflow are deliberately disallowed.
Non-Postgres engine options are unchanged. Request sessions must still close;
the existing `get_db()` dependency closes its session in `finally`.

Budget connections as:

```text
sum across services (replicas * worker_processes * (pool_size + max_overflow))
+ background jobs + migration/admin connections + deployment overlap
```

Two single-worker, single-replica APIs with the above settings use at most **6**
application connections with the equivalent pool limits now configured in both.
Start with one worker per service and monitor pool waits, transaction duration,
CPU, RAM and storage before increasing concurrency. Logical databases share
resources and failures; consolidation saves instance costs, not workload costs.

Render now documents integrated PgBouncer for paid databases at no additional
cost. It is optional for this small pilot; start with bounded application pools.
If enabled, use the dashboard's pool URL (port 6432), confirm both manually created
databases are reachable through it, and verify both `current_database()` results
before cutover. Activation restarts the database. Transaction pooling is not
compatible with session-dependent features such as LISTEN/NOTIFY, session advisory
locks or temporary tables. Use direct port-5432 connections for provisioning,
backups and migration tooling, and keep those jobs within the connection budget.

Sources:
- [Render: multiple databases](https://render.com/docs/postgresql-creating-connecting#multiple-databases)
- [Render: legacy instance specs](https://render.com/docs/postgresql-legacy-instance-types)
- [Render: integrated connection pooling](https://render.com/docs/postgresql-connection-pooling)

## Safety Features

- ✅ **Backup Verification**: Script prompts for backup confirmation before proceeding
- ✅ **Transaction Safety**: All migrations run within database transactions
- ✅ **Constraint Detection**: Automatically detects and handles existing constraint names
- ✅ **Verification**: Post-migration checks ensure constraints were applied correctly
- ✅ **Test Suite**: Comprehensive tests verify user-scoped uniqueness works

## Troubleshooting

See `POSTGRES_MIGRATION.md` for detailed troubleshooting information, including:
- Common constraint naming issues
- Data conflict resolution
- Permission problems
- Rollback procedures

## Development

When adding new migrations:
1. Create SQL file in `migrations/` directory
2. Update `migrate_database.py` to include new migration
3. Add corresponding tests to `test_uniqueness.py`
4. Update documentation
