"""Add enhanced inventory tracking tables

Revision ID: 001_enhanced_inventory
Revises: 
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '001_enhanced_inventory'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create enhanced inventory tracking table
    op.create_table('inventory_enhanced',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('ingredient_name', sa.String(), nullable=False),
        sa.Column('current_stock', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(), nullable=False),
        sa.Column('reorder_point', sa.Float(), nullable=True),
        sa.Column('max_stock_level', sa.Float(), nullable=True),
        sa.Column('cost_per_unit', sa.Float(), nullable=True),
        sa.Column('supplier_info', sa.JSON(), nullable=True),
        sa.Column('last_ordered_date', sa.DateTime(), nullable=True),
        sa.Column('last_updated', sa.DateTime(), nullable=False),
        sa.Column('expiry_date', sa.DateTime(), nullable=True),
        sa.Column('storage_location', sa.String(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('auto_reorder_enabled', sa.Boolean(), default=False),
        sa.Column('lead_time_days', sa.Integer(), default=7),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create sales analytics table
    op.create_table('sales_analytics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('analysis_date', sa.DateTime(), nullable=False),
        sa.Column('total_sales', sa.Float(), nullable=False),
        sa.Column('total_revenue', sa.Float(), nullable=False),
        sa.Column('top_selling_items', sa.JSON(), nullable=True),
        sa.Column('sales_by_hour', sa.JSON(), nullable=True),
        sa.Column('sales_by_day', sa.JSON(), nullable=True),
        sa.Column('weekly_trends', sa.JSON(), nullable=True),
        sa.Column('monthly_comparison', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create sales patterns table
    op.create_table('sales_patterns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('pattern_type', sa.String(), nullable=False),
        sa.Column('pattern_data', sa.JSON(), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('identified_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create demand forecasts table
    op.create_table('demand_forecasts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('item_name', sa.String(), nullable=True),
        sa.Column('forecast_period', sa.String(), nullable=False),
        sa.Column('predicted_data', sa.JSON(), nullable=False),
        sa.Column('accuracy_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create supplier management table
    op.create_table('suppliers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('supplier_name', sa.String(), nullable=False),
        sa.Column('contact_info', sa.JSON(), nullable=True),
        sa.Column('products', sa.JSON(), nullable=True),
        sa.Column('pricing', sa.JSON(), nullable=True),
        sa.Column('delivery_schedule', sa.JSON(), nullable=True),
        sa.Column('performance_metrics', sa.JSON(), nullable=True),
        sa.Column('routecast_id', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create inventory alerts table
    op.create_table('inventory_alerts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('ingredient_name', sa.String(), nullable=False),
        sa.Column('alert_type', sa.String(), nullable=False),  # 'low_stock', 'expiring', 'overstock'
        sa.Column('alert_message', sa.String(), nullable=False),
        sa.Column('priority', sa.String(), default='medium'),  # 'low', 'medium', 'high', 'critical'
        sa.Column('current_stock', sa.Float(), nullable=True),
        sa.Column('threshold_value', sa.Float(), nullable=True),
        sa.Column('recommended_action', sa.String(), nullable=True),
        sa.Column('is_acknowledged', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('acknowledged_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create voice commands table
    op.create_table('voice_commands',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('audio_file_path', sa.String(), nullable=True),
        sa.Column('transcribed_text', sa.String(), nullable=False),
        sa.Column('command_type', sa.String(), nullable=False),  # 'inventory_update', 'sales_entry', 'query'
        sa.Column('parsed_data', sa.JSON(), nullable=True),
        sa.Column('execution_status', sa.String(), default='pending'),  # 'pending', 'completed', 'failed'
        sa.Column('error_message', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add indexes for better performance
    op.create_index('idx_inventory_enhanced_user_id', 'inventory_enhanced', ['user_id'])
    op.create_index('idx_inventory_enhanced_ingredient', 'inventory_enhanced', ['ingredient_name'])
    op.create_index('idx_sales_analytics_user_date', 'sales_analytics', ['user_id', 'analysis_date'])
    op.create_index('idx_sales_patterns_user_type', 'sales_patterns', ['user_id', 'pattern_type'])
    op.create_index('idx_demand_forecasts_user_item', 'demand_forecasts', ['user_id', 'item_name'])
    op.create_index('idx_suppliers_user_id', 'suppliers', ['user_id'])
    op.create_index('idx_inventory_alerts_user_type', 'inventory_alerts', ['user_id', 'alert_type'])
    op.create_index('idx_voice_commands_user_status', 'voice_commands', ['user_id', 'execution_status'])

def downgrade():
    # Drop indexes
    op.drop_index('idx_voice_commands_user_status')
    op.drop_index('idx_inventory_alerts_user_type')
    op.drop_index('idx_suppliers_user_id')
    op.drop_index('idx_demand_forecasts_user_item')
    op.drop_index('idx_sales_patterns_user_type')
    op.drop_index('idx_sales_analytics_user_date')
    op.drop_index('idx_inventory_enhanced_ingredient')
    op.drop_index('idx_inventory_enhanced_user_id')
    
    # Drop tables
    op.drop_table('voice_commands')
    op.drop_table('inventory_alerts')
    op.drop_table('suppliers')
    op.drop_table('demand_forecasts')
    op.drop_table('sales_patterns')
    op.drop_table('sales_analytics')
    op.drop_table('inventory_enhanced')
