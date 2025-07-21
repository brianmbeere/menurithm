#!/usr/bin/env python3
"""
PostgreSQL Database migration script to fix global uniqueness constraints.
This script safely migrates existing data to the new user-scoped uniqueness model.
"""

import os
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import logging
import sys
import os

# Add the project root to the Python path so we can import from app
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def backup_database():
    """Create a logical backup of the database using pg_dump."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set in the environment")
    
    # Extract connection details from DATABASE_URL
    # Format: postgresql://username:password@localhost:5432/database_name
    import urllib.parse
    result = urllib.parse.urlparse(database_url)
    
    db_name = result.path[1:]  # Remove leading '/'
    username = result.username
    hostname = result.hostname
    port = result.port or 5432
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_filename = f"menurithm_backup_{timestamp}.sql"
    
    # Construct pg_dump command
    pg_dump_cmd = f"pg_dump -h {hostname} -p {port} -U {username} -d {db_name} -f {backup_filename}"
    
    logger.info(f"Creating database backup...")
    logger.info(f"Run this command to create backup: {pg_dump_cmd}")
    logger.info(f"Backup will be saved as: {backup_filename}")
    
    return backup_filename

def check_existing_constraints(engine):
    """Check what constraints currently exist on the tables."""
    logger.info("Checking existing constraints...")
    
    with engine.connect() as conn:
        # Check constraints on dishes table
        dishes_constraints = conn.execute(text("""
            SELECT constraint_name, constraint_type 
            FROM information_schema.table_constraints 
            WHERE table_name = 'dishes' 
            AND constraint_type = 'UNIQUE'
        """)).fetchall()
        
        logger.info(f"Dishes table unique constraints: {dishes_constraints}")
        
        # Check constraints on inventory table
        inventory_constraints = conn.execute(text("""
            SELECT constraint_name, constraint_type 
            FROM information_schema.table_constraints 
            WHERE table_name = 'inventory' 
            AND constraint_type = 'UNIQUE'
        """)).fetchall()
        
        logger.info(f"Inventory table unique constraints: {inventory_constraints}")
        
        return dishes_constraints, inventory_constraints

def migrate_database():
    """Perform the PostgreSQL database migration."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set in the environment")
    
    engine = create_engine(database_url)
    
    try:
        logger.info("Starting PostgreSQL database migration...")
        
        # Check existing constraints
        check_existing_constraints(engine)
        
        # Read and execute the migration SQL
        migration_sql_path = os.path.join(os.path.dirname(__file__), "migrations", "fix_uniqueness_constraints.sql")
        
        with open(migration_sql_path, 'r') as f:
            migration_sql = f.read()
        
        logger.info("Executing migration SQL...")
        with engine.connect() as conn:
            # Execute the migration in a transaction
            conn.execute(text(migration_sql))
            conn.commit()
        
        logger.info("Migration completed successfully!")
        
        # Verify the migration
        verify_migration(engine)
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise

def verify_migration(engine):
    """Verify that the migration was successful."""
    logger.info("Verifying migration...")
    
    with engine.connect() as conn:
        # Check that new constraints exist
        new_constraints = conn.execute(text("""
            SELECT constraint_name, table_name 
            FROM information_schema.table_constraints 
            WHERE constraint_name IN ('uq_user_dish_name', 'uq_user_ingredient_name')
            AND constraint_type = 'UNIQUE'
        """)).fetchall()
        
        logger.info(f"New user-scoped constraints: {new_constraints}")
        
        if len(new_constraints) == 2:
            logger.info("✅ Migration verification successful!")
        else:
            logger.warning("⚠️ Migration verification incomplete - some constraints may be missing")
        
        # Check data integrity
        dishes_count = conn.execute(text("SELECT COUNT(*) FROM dishes")).fetchone()[0]
        inventory_count = conn.execute(text("SELECT COUNT(*) FROM inventory")).fetchone()[0]
        
        logger.info(f"Data integrity check:")
        logger.info(f"  - Dishes: {dishes_count} records")
        logger.info(f"  - Inventory: {inventory_count} records")

def test_user_scoped_constraints(engine):
    """Test that the new user-scoped constraints work correctly."""
    logger.info("Testing user-scoped constraints...")
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Test that users can have the same ingredient/dish names
        result = session.execute(text("""
            SELECT 
                COUNT(*) as total_dishes,
                COUNT(DISTINCT (user_id, name)) as unique_user_dish_pairs
            FROM dishes
        """)).fetchone()
        
        logger.info(f"Dishes test - Total: {result[0]}, Unique user-dish pairs: {result[1]}")
        
        result = session.execute(text("""
            SELECT 
                COUNT(*) as total_ingredients,
                COUNT(DISTINCT (user_id, ingredient_name)) as unique_user_ingredient_pairs
            FROM inventory
        """)).fetchone()
        
        logger.info(f"Inventory test - Total: {result[0]}, Unique user-ingredient pairs: {result[1]}")
        
    finally:
        session.close()

if __name__ == "__main__":
    try:
        # Step 1: Recommend creating a backup
        backup_filename = backup_database()
        print(f"\n⚠️  IMPORTANT: Before proceeding, create a database backup!")
        print(f"   Recommended backup file: {backup_filename}")
        print(f"   You can create it by running pg_dump manually.")
        
        response = input("\nHave you created a backup? (y/N): ").lower().strip()
        if response != 'y':
            print("Please create a backup before running the migration.")
            exit(1)
        
        # Step 2: Perform migration
        migrate_database()
        
        # Step 3: Test the migration
        database_url = os.getenv("DATABASE_URL")
        engine = create_engine(database_url)
        test_user_scoped_constraints(engine)
        
        print(f"\n🎉 Migration completed successfully!")
        print(f"   - Global uniqueness constraints removed")
        print(f"   - User-scoped uniqueness constraints added")
        print(f"   - Database is now ready for multi-user ingredient/dish names")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print(f"   Please restore from your backup if needed")
        exit(1)
