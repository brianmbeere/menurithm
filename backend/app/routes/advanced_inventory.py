from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.utils.auth import get_current_user
from app.models.user import User
from app.services.demand_prediction import DemandPredictionService
from app.services.voice_inventory import VoiceInventoryService, VoiceCommandProcessor
from app.services.routecast_integration import RouteCastIntegrationService
from app.models.inventory_enhanced import InventoryItemEnhanced, DishPrediction, StockMovement
from typing import List, Dict
from datetime import datetime
import tempfile
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Voice Inventory Management Routes
@router.post("/voice-commands/start-recording")
async def start_voice_recording(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start voice recording for inventory commands"""
    try:
        # Initialize voice service with database connection
        voice_service = VoiceInventoryService(db)
        
        # Start recording in a separate thread
        recording_id = voice_service.start_recording(current_user.id)
        
        return {
            "success": True,
            "recording_id": recording_id,
            "message": "Voice recording started. Say your inventory command now."
        }
    except Exception as e:
        logger.error(f"Voice recording error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start voice recording: {str(e)}")

@router.post("/voice-commands/process")
async def process_voice_command(
    command_text: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Process a voice command for inventory management"""
    try:
        # Initialize voice processor
        voice_processor = VoiceCommandProcessor()
        
        # Process the voice command
        result = voice_processor.process_voice_command(
            db, current_user.id, command_text
        )
        
        return {
            "success": True,
            "command": command_text,
            "result": result,
            "processed_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Voice command processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process voice command: {str(e)}")

# AI Prediction and Analytics Routes
@router.get("/optimization-recommendations")
async def get_optimization_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered inventory optimization recommendations"""
    try:
        # Initialize demand service
        demand_service = DemandPredictionService()
        
        # Use the demand prediction service to get inventory recommendations
        recommendations = await demand_service.get_inventory_recommendations(db, current_user.id)
        
        # Return the recommendations directly as they come structured from the AI
        return {
            "success": True,
            "recommendations": recommendations,
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "user_id": current_user.id
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")

@router.get("/demand-predictions/{ingredient_name}")
async def get_demand_predictions(
    ingredient_name: str,
    days_ahead: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered demand predictions for specific ingredient"""
    try:
        # Initialize demand service
        demand_service = DemandPredictionService()
        
        predictions = await demand_service.predict_demand(
            db, current_user.id, ingredient_name, days_ahead
        )
        
        return {
            "success": True,
            "ingredient": ingredient_name,
            "predictions": predictions,
            "forecast_period": f"{days_ahead} days"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate predictions: {str(e)}")

# Enhanced CSV Processing Routes
@router.post("/csv-upload-enhanced")
async def upload_enhanced_csv(
    file: UploadFile = File(...),
    data_type: str = "inventory",  # "inventory", "dishes", "sales"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enhanced CSV upload with AI validation and processing"""
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            # Process with AI enhancements
            if data_type == "inventory":
                # Initialize demand service
                demand_service = DemandPredictionService()
                
                result = await demand_service.process_inventory_csv(
                    db, current_user.id, temp_path
                )
            else:
                result = {"error": f"Data type '{data_type}' not yet supported for enhanced processing"}
            
            return {
                "success": True,
                "filename": file.filename,
                "data_type": data_type,
                "processing_result": result
            }
            
        finally:
            # Clean up temporary file
            os.unlink(temp_path)
            
    except Exception as e:
        logger.error(f"Enhanced CSV upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"CSV processing failed: {str(e)}")

# RouteCast Integration Endpoints

@router.post("/suppliers/sync-catalog")
async def sync_supplier_catalog(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Sync supplier catalog from RouteCast"""
    try:
        # Get RouteCast API key from user settings or environment
        api_key = os.getenv("ROUTECAST_API_KEY")  # In production, get from user settings
        
        if not api_key:
            raise HTTPException(status_code=400, detail="RouteCast API key not configured")
        
        routecast_service = RouteCastIntegrationService(db, api_key)
        result = routecast_service.sync_supplier_catalog(user.email)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supplier sync failed: {str(e)}")

@router.get("/suppliers/search/{ingredient_name}")
async def search_supplier_products(
    ingredient_name: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Search for ingredient availability from suppliers"""
    try:
        api_key = os.getenv("ROUTECAST_API_KEY")
        
        if not api_key:
            # Return empty results if no API key
            return {
                "success": True,
                "ingredient_name": ingredient_name,
                "suppliers": [],
                "message": "RouteCast integration not configured"
            }
        
        routecast_service = RouteCastIntegrationService(db, api_key)
        suppliers = routecast_service.check_ingredient_availability(user.email, ingredient_name)
        
        return {
            "success": True,
            "ingredient_name": ingredient_name,
            "suppliers": suppliers
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supplier search failed: {str(e)}")

@router.post("/orders/create")
async def create_purchase_order(
    order_data: Dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create purchase order with supplier"""
    try:
        api_key = os.getenv("ROUTECAST_API_KEY")
        
        if not api_key:
            raise HTTPException(status_code=400, detail="RouteCast integration not configured")
        
        routecast_service = RouteCastIntegrationService(db, api_key)
        result = routecast_service.create_purchase_order(user.email, order_data)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Order creation failed: {str(e)}")

@router.get("/orders")
async def get_purchase_orders(
    status: str = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get purchase orders with optional status filter"""
    try:
        # Query orders from database
        from app.models.inventory_enhanced import PurchaseOrder
        query = db.query(PurchaseOrder).filter(PurchaseOrder.user_id == user.id)
        
        if status:
            query = query.filter(PurchaseOrder.status == status)
        
        orders = query.all()
        
        return {
            "success": True,
            "orders": [
                {
                    "id": order.id,
                    "supplier_name": order.supplier_name,
                    "status": order.status,
                    "total_amount": order.total_amount,
                    "order_date": order.order_date.isoformat() if order.order_date else None,
                    "expected_delivery": order.expected_delivery_date.isoformat() if order.expected_delivery_date else None,
                    "routecast_order_id": order.routecast_order_id
                }
                for order in orders
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve orders: {str(e)}")

@router.post("/orders/{order_id}/confirm-delivery")
async def confirm_delivery(
    order_id: int,
    delivery_data: Dict,  # Should contain "received_quantity"
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Confirm delivery and update inventory"""
    try:
        api_key = os.getenv("ROUTECAST_API_KEY")
        
        if not api_key:
            raise HTTPException(status_code=400, detail="RouteCast integration not configured")
        
        routecast_service = RouteCastIntegrationService(db, api_key)
        result = routecast_service.process_delivery_confirmation(
            user.email, 
            order_id, 
            delivery_data.get("received_quantity", 0)
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delivery confirmation failed: {str(e)}")

# Enhanced Inventory Analytics
@router.get("/analytics/waste-prediction")
async def get_waste_predictions(
    days_ahead: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered waste predictions"""
    try:
        # Initialize demand service
        demand_service = DemandPredictionService()
        
        predictions = await demand_service.predict_waste(
            db, current_user.id, days_ahead
        )
        
        return {
            "success": True,
            "waste_predictions": predictions,
            "forecast_period": f"{days_ahead} days"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Waste prediction failed: {str(e)}")

@router.get("/analytics/cost-optimization")
async def get_cost_optimization(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered cost optimization suggestions"""
    try:
        # Initialize demand service
        demand_service = DemandPredictionService()
        
        optimization = await demand_service.analyze_cost_optimization(
            db, current_user.id
        )
        
        return {
            "success": True,
            "cost_optimization": optimization
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cost optimization analysis failed: {str(e)}")

@router.get("/enhanced-items")
async def get_enhanced_inventory_items(
    include_predictions: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get enhanced inventory items with AI insights"""
    try:
        items = db.query(InventoryItemEnhanced).filter(
            InventoryItemEnhanced.user_id == current_user.id
        ).all()
        
        result = []
        for item in items:
            item_data = {
                "id": item.id,
                "ingredient_name": item.ingredient_name,
                "current_stock": item.current_stock,
                "unit": item.unit,
                "cost_per_unit": item.cost_per_unit,
                "supplier_info": item.supplier_info,
                "expiry_date": item.expiry_date.isoformat() if item.expiry_date else None,
                "waste_rate": item.waste_rate,
                "reorder_point": item.reorder_point,
                "max_stock_level": item.max_stock_level
            }
            
            # Add predictions if requested
            if include_predictions:
                predictions = db.query(DishPrediction).filter(
                    DishPrediction.ingredient_name == item.ingredient_name,
                    DishPrediction.user_id == current_user.id
                ).first()
                
                if predictions:
                    item_data["predictions"] = {
                        "predicted_demand": predictions.predicted_demand,
                        "confidence_score": predictions.confidence_score,
                        "prediction_date": predictions.prediction_date.isoformat()
                    }
            
            result.append(item_data)
        
        return {
            "success": True,
            "items": result,
            "total_items": len(result)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve enhanced inventory: {str(e)}")
from typing import List, Dict
import tempfile
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# AI/ML Prediction Endpoints

@router.get("/predictions/demand")
async def get_demand_predictions(
    db: Session = Depends(get_db), 
    user: User = Depends(get_current_user)
):
    """Get AI-powered demand predictions for dishes"""
    try:
        prediction_service = DemandPredictionService(db)
        predictions = prediction_service.predict_weekly_demand(user.email)
        
        # Format response with dish details
        result = []
        for dish_id, predicted_demand in predictions.items():
            # Get dish details
            from app.models.dish import Dish
            dish = db.query(Dish).filter(Dish.id == dish_id).first()
            if dish:
                result.append({
                    "dish_id": dish_id,
                    "dish_name": dish.name,
                    "predicted_demand": predicted_demand,
                    "recommendation": "high" if predicted_demand > 10 else "medium" if predicted_demand > 5 else "low"
                })
        
        return {
            "success": True,
            "predictions": result,
            "generated_at": "2025-07-24T12:00:00Z"
        }
        
    except Exception as e:
        logger.error(f"Error generating demand predictions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate predictions: {str(e)}")

# Voice Inventory Endpoints

@router.post("/voice/inventory-command")
async def process_voice_inventory_command(
    audio_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Process voice command for inventory management"""
    try:
        # Save uploaded audio file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await audio_file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Process voice command
            voice_service = VoiceInventoryService(db)
            result = voice_service.process_voice_command(temp_file_path, user.email)
            
            return result
            
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
            
    except Exception as e:
        logger.error(f"Error processing voice command: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process voice command: {str(e)}")

@router.get("/voice/example-commands")
async def get_voice_command_examples():
    """Get examples of voice commands for user guidance"""
    commands = VoiceCommandProcessor.suggest_voice_commands()
    
    return {
        "success": True,
        "examples": commands,
        "tips": [
            "Speak clearly and at normal speed",
            "Include quantity, unit, and ingredient name",
            "Use simple, direct commands",
            "Background noise may affect recognition"
        ]
    }

# RouteCast Integration Endpoints

@router.post("/suppliers/sync-catalog")
async def sync_supplier_catalog(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Sync supplier catalog from RouteCast"""
    try:
        # Get RouteCast API key from user settings or environment
        api_key = os.getenv("ROUTECAST_API_KEY")  # In production, get from user settings
        
        if not api_key:
            raise HTTPException(status_code=400, detail="RouteCast API key not configured")
        
        routecast_service = RouteCastIntegrationService(db, api_key)
        result = routecast_service.sync_supplier_catalog(user.email)
        
        return result
        
    except Exception as e:
        logger.error(f"Error syncing supplier catalog: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to sync catalog: {str(e)}")

@router.get("/suppliers/search/{ingredient_name}")
async def search_supplier_products(
    ingredient_name: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Search for ingredient availability from suppliers"""
    try:
        api_key = os.getenv("ROUTECAST_API_KEY")
        
        if not api_key:
            # Return empty results if no API key
            return {
                "success": True,
                "ingredient_name": ingredient_name,
                "suppliers": [],
                "message": "RouteCast integration not configured"
            }
        
        routecast_service = RouteCastIntegrationService(db, api_key)
        suppliers = routecast_service.check_ingredient_availability(user.email, ingredient_name)
        
        return {
            "success": True,
            "ingredient_name": ingredient_name,
            "suppliers": suppliers,
            "found_count": len(suppliers)
        }
        
    except Exception as e:
        logger.error(f"Error searching suppliers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search suppliers: {str(e)}")

@router.post("/suppliers/create-order")
async def create_supplier_order(
    order_data: Dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create purchase order with supplier"""
    try:
        api_key = os.getenv("ROUTECAST_API_KEY")
        
        if not api_key:
            raise HTTPException(status_code=400, detail="RouteCast integration not configured")
        
        routecast_service = RouteCastIntegrationService(db, api_key)
        result = routecast_service.create_purchase_order(user.email, order_data)
        
        return result
        
    except Exception as e:
        logger.error(f"Error creating order: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")

@router.get("/suppliers/orders")
async def get_purchase_orders(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get all purchase orders for user"""
    try:
        from app.models.inventory_enhanced import PurchaseOrder
        
        orders = db.query(PurchaseOrder).filter(
            PurchaseOrder.user_id == user.email
        ).order_by(PurchaseOrder.order_date.desc()).all()
        
        result = []
        for order in orders:
            result.append({
                "id": order.id,
                "supplier_name": order.supplier_name,
                "ingredient_name": order.inventory_item.ingredient_name if order.inventory_item else "Unknown",
                "quantity_ordered": order.quantity_ordered,
                "quantity_received": order.quantity_received,
                "unit_price": order.unit_price,
                "total_cost": order.total_cost,
                "status": order.status,
                "order_date": order.order_date.isoformat(),
                "expected_delivery": order.expected_delivery_date.isoformat() if order.expected_delivery_date else None,
                "actual_delivery": order.actual_delivery_date.isoformat() if order.actual_delivery_date else None
            })
        
        return {
            "success": True,
            "orders": result,
            "total_orders": len(result)
        }
        
    except Exception as e:
        logger.error(f"Error getting orders: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get orders: {str(e)}")

@router.post("/suppliers/orders/{order_id}/confirm-delivery")
async def confirm_delivery(
    order_id: int,
    delivery_data: Dict,  # Should contain "received_quantity"
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Confirm delivery and update inventory"""
    try:
        api_key = os.getenv("ROUTECAST_API_KEY")
        
        if not api_key:
            raise HTTPException(status_code=400, detail="RouteCast integration not configured")
        
        routecast_service = RouteCastIntegrationService(db, api_key)
        result = routecast_service.process_delivery_confirmation(
            user.email, 
            order_id, 
            delivery_data.get("received_quantity", 0)
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error confirming delivery: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to confirm delivery: {str(e)}")

# Enhanced Inventory Analytics

@router.get("/inventory/expiry-alerts")
async def get_expiry_alerts(
    days_ahead: int = 7,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get inventory items expiring within specified days"""
    try:
        from datetime import date, timedelta
        
        cutoff_date = date.today() + timedelta(days=days_ahead)
        
        expiring_items = db.query(InventoryItemEnhanced).filter(
            InventoryItemEnhanced.user_id == user.email,
            InventoryItemEnhanced.expiry_date <= cutoff_date,
            InventoryItemEnhanced.expiry_date >= date.today()
        ).order_by(InventoryItemEnhanced.expiry_date).all()
        
        alerts = []
        for item in expiring_items:
            days_until_expiry = (item.expiry_date - date.today()).days
            alerts.append({
                "item_id": item.id,
                "ingredient_name": item.ingredient_name,
                "quantity": item.quantity,
                "unit": item.unit,
                "expiry_date": item.expiry_date.isoformat(),
                "days_until_expiry": days_until_expiry,
                "urgency": "critical" if days_until_expiry <= 1 else "high" if days_until_expiry <= 3 else "medium"
            })
        
        return {
            "success": True,
            "alerts": alerts,
            "total_items": len(alerts),
            "critical_items": sum(1 for a in alerts if a["urgency"] == "critical")
        }
        
    except Exception as e:
        logger.error(f"Error getting expiry alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get expiry alerts: {str(e)}")

@router.get("/inventory/stock-movements/{item_id}")
async def get_stock_movements(
    item_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get stock movement history for an inventory item"""
    try:
        movements = db.query(StockMovement).filter(
            StockMovement.inventory_item_id == item_id,
            StockMovement.user_id == user.email
        ).order_by(StockMovement.timestamp.desc()).limit(limit).all()
        
        result = []
        for movement in movements:
            result.append({
                "id": movement.id,
                "movement_type": movement.movement_type,
                "quantity_change": movement.quantity_change,
                "quantity_before": movement.quantity_before,
                "quantity_after": movement.quantity_after,
                "reason": movement.reason,
                "timestamp": movement.timestamp.isoformat(),
                "voice_input": movement.voice_input,
                "voice_confidence": movement.voice_confidence
            })
        
        return {
            "success": True,
            "movements": result,
            "item_id": item_id
        }
        
    except Exception as e:
        logger.error(f"Error getting stock movements: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stock movements: {str(e)}")
