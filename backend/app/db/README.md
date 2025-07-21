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
