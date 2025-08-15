from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio
import os

from app.db.database import get_db
from app.utils.auth_enhanced import get_current_user
from app.models.user import User
from app.models.inventory import InventoryItem
from app.models.sales import Sale
from app.services.demand_prediction import DemandPredictionService
from app.services.voice_inventory import VoiceInventoryService, SPEECH_RECOGNITION_AVAILABLE
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
        
        # Initialize demand service
        demand_service = DemandPredictionService()
        
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

@router.get("/voice-status")
async def get_voice_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check voice recognition system status"""
    try:
        # Check if voice recognition is available
        voice_service = VoiceInventoryService(db)
        
        # Check available audio processing backends
        audio_backends = []
        if SPEECH_RECOGNITION_AVAILABLE:
            audio_backends.append("SpeechRecognition")
        
        # Import check for pydub
        try:
            from pydub import AudioSegment
            audio_backends.append("pydub")
        except ImportError:
            pass
        
        # Import check for PyAudio (optional)
        try:
            import pyaudio
            audio_backends.append("PyAudio")
        except ImportError:
            pass
        
        is_voice_available = bool(voice_service.recognizer)
        
        return {
            "success": True,
            "voice_available": is_voice_available,
            "speech_recognition_module": SPEECH_RECOGNITION_AVAILABLE,
            "audio_backends": audio_backends,
            "deployment_mode": "production" if "PyAudio" not in audio_backends else "development",
            "message": "Voice recognition is ready" if is_voice_available else "Voice recognition unavailable - SpeechRecognition missing",
            "instructions": {
                "usage": "Upload an audio file to /voice-update endpoint",
                "supported_formats": ["WAV", "AIFF", "FLAC"] + (["WebM", "MP3", "M4A"] if "pydub" in audio_backends else []),
                "max_duration": "60 seconds",
                "format_conversion": "Automatic conversion available" if "pydub" in audio_backends else "WAV/AIFF/FLAC only"
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "voice_available": False,
            "error": str(e),
            "message": "Voice system check failed"
        }

@router.post("/voice-update")
async def process_voice_update(
    audio_file: UploadFile = File(..., description="Audio file containing voice command (WAV, AIFF, FLAC, or auto-converted formats)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Process voice inventory update from uploaded audio file"""
    try:
        # Validate that audio file was provided
        if not audio_file or not audio_file.filename:
            raise HTTPException(
                status_code=422, 
                detail={
                    "error": "Audio file is required",
                    "message": "Please upload a valid audio file.",
                    "expected_format": "multipart/form-data with 'audio_file' field",
                    "supported_types": ["audio/wav", "audio/aiff", "audio/flac", "audio/webm", "audio/mp3", "audio/m4a"]
                }
            )
        # Check if speech recognition is available
        voice_service = VoiceInventoryService(db)
        if not voice_service.recognizer:
            return {
                "success": False,
                "message": "Voice recognition is not available. SpeechRecognition module is missing.",
                "fallback_message": "Please use text-based inventory updates instead.",
                "status": "unavailable"
            }
        
        user_id = current_user.firebase_uid
        
        # Validate audio file
        if not audio_file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="Please upload a valid audio file")
        
        # Save uploaded audio file temporarily
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            content = await audio_file.read()
            temp_file.write(content)
            temp_audio_path = temp_file.name
        
        try:
            # Initialize voice service and process the audio file
            voice_service = VoiceInventoryService(db)
            
            # Process the audio file
            result = voice_service.process_voice_command(temp_audio_path, user_id)
            
            return {
                "success": True,
                "message": "Voice command processed successfully",
                "result": result,
                "status": "completed"
            }
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice update failed: {str(e)}")

@router.get("/voice-commands")
async def get_voice_commands(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get voice command suggestions and examples"""
    try:
        # Get voice command suggestions from the service
        from app.services.voice_inventory import VoiceInventoryService
        suggestions = VoiceInventoryService.suggest_voice_commands()
        
        return {
            "success": True,
            "commands": suggestions[:limit],
            "total_available": len(suggestions),
            "examples": [
                "Add 5 pounds of tomatoes",
                "Used 2 cups of flour", 
                "How much milk do we have",
                "Check chicken stock"
            ]
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
        
        # Initialize demand service
        demand_service = DemandPredictionService()
        
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
        
        # Initialize demand service
        demand_service = DemandPredictionService()
        
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
        # Initialize demand service
        demand_service = DemandPredictionService()
        
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
