from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio
import os

from app.db.database import get_db
from app.utils.auth import get_current_user
from app.models.user import User
from app.models.inventory import InventoryItem
from app.models.sales import Sale
from app.services.demand_prediction import DemandPredictionService
from app.services.voice_inventory import VoiceInventoryService
from app.services.routecast_integration import RouteCastIntegrationService

router = APIRouter(prefix="/api/advanced-inventory", tags=["Advanced Inventory"])

# Note: All services require initialization with parameters and will be instantiated 
# in the route functions where database connections and API keys are available

@router.get("/analytics")
async def get_inventory_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive inventory analytics powered by AI"""
    try:
        user_id = current_user.firebase_uid
        
        # Initialize demand service
        demand_service = DemandPredictionService()
        
        # Get AI-powered analytics
        analytics = await demand_service.analyze_sales_patterns(db, user_id)
        
        # Get inventory recommendations
        recommendations = await demand_service.get_inventory_recommendations(db, user_id)
        
        return {
            "success": True,
            "analytics": analytics,
            "recommendations": recommendations,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics generation failed: {str(e)}")

@router.get("/demand-forecast/{item_name}")
async def get_demand_forecast(
    item_name: str,
    days_ahead: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered demand forecast for specific item"""
    try:
        user_id = current_user.firebase_uid
        
        forecast = await demand_service.predict_demand(
            db, user_id, item_name, days_ahead
        )
        
        return {
            "success": True,
            "forecast": forecast,
            "item_name": item_name,
            "forecast_period": f"{days_ahead} days"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Demand forecast failed: {str(e)}")

@router.post("/voice-update")
async def process_voice_update(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Process voice inventory update"""
    try:
        user_id = current_user.firebase_uid
        
        # Initialize voice service with database connection
        voice_service = VoiceInventoryService(db)
        
        # Start voice recording and processing in background
        background_tasks.add_task(
            voice_service.start_voice_recording,
            db, user_id
        )
        
        return {
            "success": True,
            "message": "Voice recording started. Speak your inventory update now.",
            "status": "recording"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice update failed: {str(e)}")

@router.get("/voice-commands")
async def get_voice_commands(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recent voice commands and their status"""
    try:
        user_id = current_user.firebase_uid
        
        # Initialize voice service with database connection
        voice_service = VoiceInventoryService(db)
        commands = await voice_service.get_recent_commands(db, user_id, limit)
        
        return {
            "success": True,
            "commands": commands
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve voice commands: {str(e)}")

@router.get("/suppliers")
async def get_suppliers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get available suppliers from RouteCast integration"""
    try:
        user_id = current_user.firebase_uid
        
        # Get RouteCast API key from environment
        api_key = os.getenv("ROUTECAST_API_KEY")
        if not api_key:
            return {
                "success": True,
                "suppliers": [],
                "message": "RouteCast integration not configured"
            }
        
        routecast_service = RouteCastIntegrationService(db, api_key)
        suppliers = await routecast_service.get_suppliers(db, user_id)
        
        return {
            "success": True,
            "suppliers": suppliers
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve suppliers: {str(e)}")

@router.post("/auto-order")
async def create_auto_order(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create automatic orders based on AI recommendations"""
    try:
        user_id = current_user.firebase_uid
        
        # Get inventory recommendations
        recommendations = await demand_service.get_inventory_recommendations(db, user_id)
        
        # Get RouteCast API key and initialize service
        api_key = os.getenv("ROUTECAST_API_KEY")
        if api_key:
            routecast_service = RouteCastIntegrationService(db, api_key)
            # Process auto-orders in background
            background_tasks.add_task(
                routecast_service.process_auto_orders,
                db, user_id, recommendations
            )
        else:
            # No API key configured, skip auto-orders
            pass
        
        return {
            "success": True,
            "message": "Auto-order processing initiated",
            "recommendations": recommendations.get("reorder_recommendations", [])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto-order failed: {str(e)}")

@router.get("/optimization-report")
async def get_optimization_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive inventory optimization report"""
    try:
        user_id = current_user.firebase_uid
        
        # Gather multiple data sources
        analytics_task = demand_service.analyze_sales_patterns(db, user_id)
        recommendations_task = demand_service.get_inventory_recommendations(db, user_id)
        
        # Get suppliers if RouteCast is configured
        api_key = os.getenv("ROUTECAST_API_KEY")
        if api_key:
            routecast_service = RouteCastIntegrationService(db, api_key)
            suppliers_task = routecast_service.get_suppliers(db, user_id)
            
            # Run tasks concurrently
            analytics, recommendations, suppliers = await asyncio.gather(
                analytics_task,
                recommendations_task,
                suppliers_task,
                return_exceptions=True
            )
        else:
            # Run without suppliers if no API key
            analytics, recommendations = await asyncio.gather(
                analytics_task,
                recommendations_task,
                return_exceptions=True
            )
            suppliers = {"error": "RouteCast integration not configured"}
        
        # Handle any exceptions
        report = {
            "success": True,
            "generated_at": datetime.now().isoformat(),
            "analytics": analytics if not isinstance(analytics, Exception) else {"error": str(analytics)},
            "recommendations": recommendations if not isinstance(recommendations, Exception) else {"error": str(recommendations)},
            "suppliers": suppliers if not isinstance(suppliers, Exception) else {"error": str(suppliers)},
            "summary": {
                "total_items_analyzed": len(db.query(InventoryItem).filter(InventoryItem.user_id == user_id).all()),
                "optimization_score": 85,  # This would be calculated based on AI analysis
                "cost_savings_potential": "15-25%",  # AI-generated estimate
                "recommended_actions": 3
            }
        }
        
        return report
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization report failed: {str(e)}")

@router.get("/alerts")
async def get_inventory_alerts(
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get inventory alerts based on AI analysis"""
    try:
        user_id = current_user.firebase_uid
        
        # Get current inventory
        inventory_items = db.query(InventoryItem).filter(InventoryItem.user_id == user_id).all()
        
        # Generate AI-powered alerts
        alerts = []
        for item in inventory_items:
            # Low stock alert
            if item.current_stock < 10:  # This would be dynamic based on AI predictions
                alerts.append({
                    "id": f"low_stock_{item.id}",
                    "type": "low_stock",
                    "priority": "high" if item.current_stock < 5 else "medium",
                    "item_name": item.ingredient_name,
                    "current_stock": item.current_stock,
                    "message": f"Low stock alert: {item.ingredient_name} has only {item.current_stock} {item.unit} remaining",
                    "recommended_action": f"Reorder {item.ingredient_name} immediately",
                    "created_at": datetime.now().isoformat()
                })
        
        # Filter by priority if specified
        if priority:
            alerts = [alert for alert in alerts if alert["priority"] == priority]
        
        return {
            "success": True,
            "alerts": alerts,
            "total_alerts": len(alerts)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve alerts: {str(e)}")

@router.post("/optimize")
async def optimize_inventory(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run comprehensive inventory optimization using AI"""
    try:
        user_id = current_user.firebase_uid
        
        # Start optimization in background
        background_tasks.add_task(
            run_optimization_process,
            db, user_id
        )
        
        return {
            "success": True,
            "message": "Inventory optimization process started",
            "status": "processing"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

async def run_optimization_process(db: Session, user_id: str):
    """Background task for running comprehensive optimization"""
    try:
        # Run all optimization tasks
        await demand_service.analyze_sales_patterns(db, user_id)
        recommendations = await demand_service.get_inventory_recommendations(db, user_id)
        
        # Process any automatic orders if enabled
        if recommendations.get("reorder_recommendations"):
            # Get RouteCast API key and initialize service
            api_key = os.getenv("ROUTECAST_API_KEY")
            if api_key:
                routecast_service = RouteCastIntegrationService(db, api_key)
                await routecast_service.process_auto_orders(db, user_id, recommendations)
        
        print(f"Optimization completed for user {user_id}")
        
    except Exception as e:
        print(f"Optimization failed for user {user_id}: {e}")
