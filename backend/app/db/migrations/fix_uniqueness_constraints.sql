-- PostgreSQL Migration: Fix Global Uniqueness Constraints
-- This script removes global unique constraints and adds user-scoped constraints

BEGIN;

-- Step 1: Drop existing unique constraints and indexes
-- These might have different names depending on how they were created

-- Drop unique constraint on dishes.name (if it exists)
DO $$
BEGIN
    -- Try to drop the unique constraint on dishes.name
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'dishes_name_key' 
        AND table_name = 'dishes'
    ) THEN
        ALTER TABLE dishes DROP CONSTRAINT dishes_name_key;
        RAISE NOTICE 'Dropped dishes_name_key constraint';
    END IF;
    
    -- Also check for other possible constraint names
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uq_dishes_name' 
        AND table_name = 'dishes'
    ) THEN
        ALTER TABLE dishes DROP CONSTRAINT uq_dishes_name;
        RAISE NOTICE 'Dropped uq_dishes_name constraint';
    END IF;
END
$$;

-- Drop unique constraint on inventory.ingredient_name (if it exists)
DO $$
BEGIN
    -- Try to drop the unique constraint on inventory.ingredient_name
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inventory_ingredient_name_key' 
        AND table_name = 'inventory'
    ) THEN
        ALTER TABLE inventory DROP CONSTRAINT inventory_ingredient_name_key;
        RAISE NOTICE 'Dropped inventory_ingredient_name_key constraint';
    END IF;
    
    -- Also check for other possible constraint names
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uq_ingredient_name' 
        AND table_name = 'inventory'
    ) THEN
        ALTER TABLE inventory DROP CONSTRAINT uq_ingredient_name;
        RAISE NOTICE 'Dropped uq_ingredient_name constraint';
    END IF;
END
$$;

-- Step 2: Add user-scoped unique constraints
ALTER TABLE dishes ADD CONSTRAINT uq_user_dish_name UNIQUE (user_id, name);
ALTER TABLE inventory ADD CONSTRAINT uq_user_ingredient_name UNIQUE (user_id, ingredient_name);

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dishes_user_id ON dishes(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);

COMMIT;

-- Verification queries
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'New constraints added:';
    RAISE NOTICE '- uq_user_dish_name: UNIQUE (user_id, name) on dishes table';
    RAISE NOTICE '- uq_user_ingredient_name: UNIQUE (user_id, ingredient_name) on inventory table';
END
$$;
