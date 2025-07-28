"""Enhanced inventory schema migration

Revision ID: add_enhanced_inventory
Revises: 
Create Date: 2025-07-25 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'add_enhanced_inventory'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create enhanced inventory table
    op.create_table('inventory_enhanced',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('ingredient_name', sa.String(), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),  # Changed from String to Float
        sa.Column('unit', sa.String(), nullable=False),
        sa.Column('category', sa.String()),
        sa.Column('expiry_date', sa.Date()),
        sa.Column('storage_location', sa.String()),
        
        # Enhanced inventory management fields
        sa.Column('cost_per_unit', sa.Float()),
        sa.Column('supplier_name', sa.String()),
        sa.Column('minimum_stock_level', sa.Float(), default=0),
        sa.Column('maximum_stock_level', sa.Float()),
        sa.Column('reorder_point', sa.Float()),
        sa.Column('reorder_quantity', sa.Float()),
        
        # Status and tracking
        sa.Column('status', sa.String(), default='active'),
        sa.Column('last_updated', sa.DateTime(), default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        
        # Purchase tracking
        sa.Column('last_purchase_date', sa.Date()),
        sa.Column('last_purchase_price', sa.Float()),
        sa.Column('average_weekly_usage', sa.Float()),
        
        # Voice features
        sa.Column('last_voice_update', sa.DateTime()),
        sa.Column('voice_notes', sa.Text()),
        
        # AI/ML predictions
        sa.Column('predicted_weekly_demand', sa.Float()),
        sa.Column('optimal_stock_level', sa.Float()),
        sa.Column('prediction_confidence', sa.Float()),
        
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_inventory_enhanced_user_id', 'user_id'),
        sa.Index('ix_inventory_enhanced_ingredient_name', 'ingredient_name'),
        sa.UniqueConstraint('user_id', 'ingredient_name', name='uq_user_ingredient_enhanced')
    )
    
    # Create stock movements table
    op.create_table('stock_movements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('inventory_item_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('movement_type', sa.String()),  # 'purchase', 'usage', 'waste', 'adjustment'
        sa.Column('quantity_change', sa.Float()),
        sa.Column('quantity_before', sa.Float()),
        sa.Column('quantity_after', sa.Float()),
        sa.Column('reason', sa.String()),
        sa.Column('timestamp', sa.DateTime(), default=sa.func.now()),
        sa.Column('reference_id', sa.String()),
        sa.Column('voice_input', sa.Boolean(), default=False),
        sa.Column('voice_confidence', sa.Float()),
        
        sa.ForeignKeyConstraint(['inventory_item_id'], ['inventory_enhanced.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_stock_movements_user_id', 'user_id'),
        sa.Index('ix_stock_movements_timestamp', 'timestamp')
    )
    
    # Create dish predictions table
    op.create_table('dish_predictions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('dish_id', sa.Integer(), nullable=True),
        sa.Column('prediction_date', sa.Date(), nullable=False),
        sa.Column('predicted_demand', sa.Float()),
        sa.Column('confidence_score', sa.Float()),
        sa.Column('seasonal_factor', sa.Float()),
        sa.Column('trend_factor', sa.Float()),
        sa.Column('inventory_availability', sa.Float()),
        sa.Column('profitability_score', sa.Float()),
        sa.Column('overall_recommendation_score', sa.Float()),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        
        sa.ForeignKeyConstraint(['dish_id'], ['dishes.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_dish_predictions_user_id', 'user_id'),
        sa.Index('ix_dish_predictions_date', 'prediction_date')
    )
    
    # Create sales analytics table
    op.create_table('sales_analytics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('sale_id', sa.Integer(), nullable=True),
        sa.Column('dish_id', sa.Integer(), nullable=True),
        sa.Column('hour_of_day', sa.Integer()),
        sa.Column('day_of_week', sa.Integer()),
        sa.Column('week_of_month', sa.Integer()),
        sa.Column('month', sa.Integer()),
        sa.Column('is_weekend', sa.Boolean()),
        sa.Column('order_size', sa.Integer()),
        sa.Column('ingredient_cost', sa.Float()),
        sa.Column('profit_margin', sa.Float()),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id']),
        sa.ForeignKeyConstraint(['dish_id'], ['dishes.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_sales_analytics_user_id', 'user_id')
    )

def downgrade():
    op.drop_table('sales_analytics')
    op.drop_table('dish_predictions')
    op.drop_table('stock_movements')
    op.drop_table('inventory_enhanced')
