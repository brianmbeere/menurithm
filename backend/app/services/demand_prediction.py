from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from openai import OpenAI
import os
import json
from app.db.database import get_db
from app.models.sales import Sale
from app.models.inventory import InventoryItem
from sqlalchemy.orm import Session

class DemandPredictionService:
    def __init__(self):
        # Initialize OpenAI client lazily to avoid import-time errors
        self._openai_client = None
        
    @property
    def openai_client(self):
        """Lazy initialization of OpenAI client"""
        if self._openai_client is None:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable is not set")
            self._openai_client = OpenAI(api_key=api_key)
        return self._openai_client
        
    async def analyze_sales_patterns(self, db: Session, user_id: str, days_back: int = 30) -> Dict[str, Any]:
        """Analyze sales patterns using AI"""
        # Get sales data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        sales_data = db.query(Sale).filter(
            Sale.user_id == user_id,
            Sale.sale_date >= start_date,
            Sale.sale_date <= end_date
        ).all()
        
        if not sales_data:
            return {"error": "No sales data found for analysis"}
        
        # Prepare data for AI analysis
        sales_summary = self._prepare_sales_data(sales_data)
        
        # Use OpenAI for pattern analysis
        analysis = await self._analyze_with_ai(sales_summary)
        
        # Store patterns in database
        await self._store_patterns(db, user_id, analysis)
        
        return analysis
    
    def _prepare_sales_data(self, sales_data: List[Sale]) -> str:
        """Convert sales data to format suitable for AI analysis"""
        df = pd.DataFrame([{
            'date': sale.sale_date.strftime('%Y-%m-%d'),
            'day_of_week': sale.sale_date.strftime('%A'),
            'dish_name': sale.dish_name,
            'quantity_sold': sale.quantity_sold,
            'total_revenue': sale.total_revenue,
            'hour': sale.sale_date.hour if hasattr(sale.sale_date, 'hour') else 12
        } for sale in sales_data])
        
        # Create summary statistics
        summary = {
            "total_sales": len(sales_data),
            "total_revenue": df['total_revenue'].sum(),
            "avg_daily_sales": df.groupby('date')['quantity_sold'].sum().mean(),
            "top_dishes": df.groupby('dish_name')['quantity_sold'].sum().head(10).to_dict(),
            "daily_patterns": df.groupby('day_of_week')['quantity_sold'].sum().to_dict(),
            "hourly_patterns": df.groupby('hour')['quantity_sold'].sum().to_dict() if 'hour' in df.columns else {},
            "weekly_trends": df.groupby(df['date'].apply(lambda x: datetime.strptime(x, '%Y-%m-%d').isocalendar()[1]))['quantity_sold'].sum().to_dict()
        }
        
        return json.dumps(summary, indent=2)
    
    async def _analyze_with_ai(self, sales_data: str) -> Dict[str, Any]:
        """Use OpenAI to analyze sales patterns"""
        prompt = f"""
        Analyze the following restaurant sales data and provide insights:
        
        {sales_data}
        
        Please provide a JSON response with the following analysis:
        1. identified_patterns: Key patterns in sales (seasonal, daily, hourly)
        2. demand_trends: Trending up/down dishes and overall trends
        3. peak_times: When sales are highest
        4. recommendations: Specific actionable recommendations for inventory management
        5. predicted_growth: Expected growth patterns for next 30 days
        6. risk_factors: Items with declining sales or volatility
        7. optimal_inventory_levels: Suggested stock levels for top items
        
        Format as valid JSON only.
        """
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert restaurant analytics AI that provides detailed sales pattern analysis and inventory recommendations."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            analysis_text = response.choices[0].message.content
            # Clean up response to ensure valid JSON
            if analysis_text.startswith("```json"):
                analysis_text = analysis_text.replace("```json", "").replace("```", "")
            
            return json.loads(analysis_text)
            
        except ValueError as e:
            # OpenAI API key not configured - provide enhanced fallback
            return {
                "identified_patterns": ["Unable to access AI analysis - API key not configured"],
                "demand_trends": ["Basic analytics available - configure OpenAI API for enhanced insights"],
                "peak_times": ["Standard restaurant hours analysis"],
                "recommendations": ["Configure OPENAI_API_KEY environment variable for AI-powered recommendations"],
                "predicted_growth": ["Manual analysis required"],
                "risk_factors": ["AI analysis unavailable"],
                "optimal_inventory_levels": ["Use basic inventory tracking"],
                "ai_available": False,
                "error": "OpenAI API key not configured"
            }
        except Exception as e:
            # Other errors - provide basic fallback analysis
            return {
                "identified_patterns": ["Basic daily sales cycle"],
                "demand_trends": ["Stable sales pattern"],
                "peak_times": ["Lunch and dinner hours"],
                "recommendations": ["Monitor inventory levels daily"],
                "predicted_growth": {"next_30_days": "stable"},
                "risk_factors": ["Seasonal variations"],
                "optimal_inventory_levels": {"general": "2-3 days supply"},
                "error": f"AI analysis failed: {str(e)}"
            }
    
    async def _store_patterns(self, db: Session, user_id: str, analysis: Dict[str, Any]):
        """Store identified patterns in database"""
        try:
            # TODO: Implement pattern storage with proper models
            # Store sales pattern
            # pattern = SalesPattern(
            #     user_id=user_id,
            #     pattern_type="ai_analysis",
            #     pattern_data=analysis,
            #     confidence_score=0.85,
            #     identified_at=datetime.now()
            # )
            # db.add(pattern)
            
            # Store demand forecast
            # forecast = DemandForecast(
            #     user_id=user_id,
            #     forecast_period="30_days",
            #     predicted_data=analysis.get("predicted_growth", {}),
            #     accuracy_score=0.80,
            #     created_at=datetime.now()
            # )
            # db.add(forecast)
            
            # db.commit()
            print(f"Analytics generated for user {user_id}")
        except Exception as e:
            db.rollback()
            print(f"Error storing patterns: {e}")
    
    async def predict_demand(self, db: Session, user_id: str, item_name: str, days_ahead: int = 7) -> Dict[str, Any]:
        """Predict demand for specific item using AI"""
        # Get historical data for the item
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)  # Last 30 days
        
        item_sales = db.query(Sale).filter(
            Sale.user_id == user_id,
            Sale.dish_name == item_name,
            Sale.sale_date >= start_date
        ).all()
        
        if not item_sales:
            return {"error": f"No sales data found for {item_name}"}
        
        # Prepare item-specific data
        item_data = pd.DataFrame([{
            'date': sale.sale_date.strftime('%Y-%m-%d'),
            'quantity_sold': sale.quantity_sold,
            'revenue': sale.total_revenue
        } for sale in item_sales])
        
        daily_sales = item_data.groupby('date')['quantity_sold'].sum()
        
        prompt = f"""
        Predict demand for restaurant item "{item_name}" for the next {days_ahead} days.
        
        Historical daily sales (last 30 days):
        {daily_sales.to_dict()}
        
        Current date: {datetime.now().strftime('%Y-%m-%d')}
        Day of week: {datetime.now().strftime('%A')}
        
        Provide JSON response with:
        1. daily_predictions: Array of predicted quantities for next {days_ahead} days
        2. total_predicted: Sum of all predictions
        3. confidence_level: Confidence percentage (0-100)
        4. factors_considered: Key factors influencing prediction
        5. recommended_stock: Suggested inventory level
        6. reorder_point: When to reorder (days ahead)
        
        Consider seasonal patterns, day-of-week effects, and trends.
        """
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert demand forecasting AI for restaurants. Provide accurate, actionable predictions."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=1000
            )
            
            prediction_text = response.choices[0].message.content
            if prediction_text.startswith("```json"):
                prediction_text = prediction_text.replace("```json", "").replace("```", "")
            
            prediction = json.loads(prediction_text)
            
            # Store prediction in database
            # forecast = DemandForecast(
            #     user_id=user_id,
            #     item_name=item_name,
            #     forecast_period=f"{days_ahead}_days",
            #     predicted_data=prediction,
            #     accuracy_score=prediction.get("confidence_level", 75) / 100,
            #     created_at=datetime.now()
            # )
            # db.add(forecast)
            # db.commit()
            
            print(f"Demand prediction generated for {item_name}")
            return prediction
            
        except Exception as e:
            return {
                "error": f"Prediction failed: {str(e)}",
                "daily_predictions": [int(daily_sales.mean())] * days_ahead,
                "total_predicted": int(daily_sales.mean() * days_ahead),
                "confidence_level": 50,
                "factors_considered": ["Historical average"],
                "recommended_stock": int(daily_sales.mean() * 3),
                "reorder_point": 2
            }
    
    async def get_inventory_recommendations(self, db: Session, user_id: str) -> Dict[str, Any]:
        """Get AI-powered inventory recommendations"""
        # Get current inventory
        inventory_items = db.query(InventoryItem).filter(InventoryItem.user_id == user_id).all()
        
        if not inventory_items:
            return {"error": "No inventory data found"}
        
        # Get recent sales data
        recent_sales = db.query(Sale).filter(
            Sale.user_id == user_id,
            Sale.sale_date >= datetime.now() - timedelta(days=14)
        ).all()
        
        # Prepare data for AI
        inventory_summary = {
            "current_inventory": [
                {
                    "name": item.ingredient_name,
                    "current_stock": item.current_stock,
                    "unit": item.unit,
                    "cost_per_unit": getattr(item, 'cost_per_unit', 0),
                    "supplier": getattr(item, 'supplier_info', 'Unknown')
                } for item in inventory_items
            ],
            "recent_sales_volume": len(recent_sales),
            "analysis_date": datetime.now().isoformat()
        }
        
        prompt = f"""
        Analyze this restaurant's inventory and provide optimization recommendations:
        
        {json.dumps(inventory_summary, indent=2)}
        
        Provide JSON response with:
        1. critical_items: Items needing immediate attention (low stock, high usage)
        2. overstock_items: Items with excess inventory
        3. reorder_recommendations: Specific reorder quantities and timing
        4. cost_optimization: Ways to reduce inventory costs
        5. supplier_recommendations: Supplier diversification suggestions
        6. seasonal_adjustments: Upcoming seasonal considerations
        7. waste_reduction: Strategies to minimize waste
        
        Be specific with quantities and timing.
        """
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert restaurant inventory optimization AI. Provide specific, actionable recommendations."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            recommendations_text = response.choices[0].message.content
            if recommendations_text.startswith("```json"):
                recommendations_text = recommendations_text.replace("```json", "").replace("```", "")
            
            return json.loads(recommendations_text)
            
        except ValueError as e:
            # OpenAI API key not configured - provide enhanced fallback
            return {
                "ai_available": False,
                "error": "OpenAI API key not configured - using basic recommendations",
                "critical_items": [],
                "overstock_items": [],
                "reorder_recommendations": [
                    {
                        "item": "Configure OpenAI API",
                        "reason": "Enable AI-powered inventory recommendations",
                        "action": "Set OPENAI_API_KEY environment variable"
                    }
                ],
                "cost_optimization": [
                    "Monitor usage patterns manually", 
                    "Track waste daily",
                    "Configure AI for automated insights"
                ],
                "supplier_recommendations": ["Diversify supplier base", "Negotiate better rates"],
                "seasonal_adjustments": ["Plan for seasonal changes manually"],
                "waste_reduction": ["Implement FIFO inventory system", "Track expiration dates"]
            }
        except Exception as e:
            return {
                "ai_available": False,
                "error": f"Analysis failed: {str(e)}",
                "critical_items": [],
                "overstock_items": [],
                "reorder_recommendations": [],
                "cost_optimization": ["Monitor usage patterns"],
                "supplier_recommendations": ["Diversify supplier base"],
                "seasonal_adjustments": ["Plan for seasonal changes"],
                "waste_reduction": ["Implement FIFO inventory system"]
            }
