"""
Add enhanced user security fields

Revision ID: add_user_security_fields
Revises: 
Create Date: 2025-07-26
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers
revision = 'add_user_security_fields'
down_revision = None
depends_on = None

def upgrade():
    """Add enhanced security fields to users table"""
    
    # Add new columns to users table
    op.add_column('users', sa.Column('role', sa.String(), nullable=False, server_default='user'))
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=text('true')))
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=text('false')))
    op.add_column('users', sa.Column('last_login', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('login_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now()))
    
    # Create indexes for performance
    op.create_index('ix_users_role', 'users', ['role'])
    op.create_index('ix_users_is_active', 'users', ['is_active'])
    op.create_index('ix_users_last_login', 'users', ['last_login'])
    
    # Update existing users to have default role
    op.execute("UPDATE users SET role = 'user' WHERE role IS NULL")

def downgrade():
    """Remove enhanced security fields from users table"""
    
    # Drop indexes
    op.drop_index('ix_users_last_login', 'users')
    op.drop_index('ix_users_is_active', 'users')
    op.drop_index('ix_users_role', 'users')
    
    # Drop columns
    op.drop_column('users', 'updated_at')
    op.drop_column('users', 'login_count')
    op.drop_column('users', 'last_login')
    op.drop_column('users', 'is_verified')
    op.drop_column('users', 'is_active')
    op.drop_column('users', 'role')
