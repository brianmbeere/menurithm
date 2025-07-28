from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from openai import OpenAI
import os
import json
from app.core.config import settings
from app.db.database import get_db
from app.models.sales import Sales
from app.models.inventory import Inventory
from app.models.sales_analytics import SalesPattern, DemandForecast
from sqlalchemy.orm import Session

class DemandPredictionService:
    def __init__(self):
        # Initialize OpenAI client for third-party AI
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
    async def analyze_sales_patterns(self, db: Session, user_id: str, days_back: int = 30) -> Dict[str, Any]:
        """Analyze sales patterns using AI"""
        # Get sales data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        sales_data = db.query(Sales).filter(
            Sales.user_id == user_id,
            Sales.sale_date >= start_date,
            Sales.sale_date <= end_date
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
    
    def _prepare_sales_data(self, sales_data: List[Sales]) -> str:
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
            
        except Exception as e:
            # Fallback basic analysis
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
            # Store sales pattern
            pattern = SalesPattern(
                user_id=user_id,
                pattern_type="ai_analysis",
                pattern_data=analysis,
                confidence_score=0.85,  # Default confidence for AI analysis
                identified_at=datetime.now()
            )
            db.add(pattern)
            
            # Store demand forecast
            forecast = DemandForecast(
                user_id=user_id,
                forecast_period="30_days",
                predicted_data=analysis.get("predicted_growth", {}),
                accuracy_score=0.80,  # Default accuracy for AI predictions
                created_at=datetime.now()
            )
            db.add(forecast)
            
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Error storing patterns: {e}")
    
    async def predict_demand(self, db: Session, user_id: str, item_name: str, days_ahead: int = 7) -> Dict[str, Any]:
        """Predict demand for specific item using AI"""
        # Get historical data for the item
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)  # Last 30 days
        
        item_sales = db.query(Sales).filter(
            Sales.user_id == user_id,
            Sales.dish_name == item_name,
            Sales.sale_date >= start_date
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
            forecast = DemandForecast(
                user_id=user_id,
                item_name=item_name,
                forecast_period=f"{days_ahead}_days",
                predicted_data=prediction,
                accuracy_score=prediction.get("confidence_level", 75) / 100,
                created_at=datetime.now()
            )
            db.add(forecast)
            db.commit()
            
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
        inventory_items = db.query(Inventory).filter(Inventory.user_id == user_id).all()
        
        if not inventory_items:
            return {"error": "No inventory data found"}
        
        # Get recent sales data
        recent_sales = db.query(Sales).filter(
            Sales.user_id == user_id,
            Sales.sale_date >= datetime.now() - timedelta(days=14)
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
            
        except Exception as e:
            return {
                "error": f"Analysis failed: {str(e)}",
                "critical_items": [],
                "overstock_items": [],
                "reorder_recommendations": [],
                "cost_optimization": ["Monitor usage patterns"],
                "supplier_recommendations": ["Diversify supplier base"],
                "seasonal_adjustments": ["Plan for seasonal changes"],
                "waste_reduction": ["Implement FIFO inventory system"]
            }
                'trend_factor': trend_factor,
                'inventory_availability': inventory_factor
            })
            
        return predictions
    
    def _get_historical_sales(self, user_id: str, dish_id: int, days: int = 30) -> List[Dict]:
        """Get historical sales data for analysis"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        sales = self.db.query(Sale).filter(
            and_(
                Sale.user_id == user_id,
                Sale.dish_id == dish_id,
                Sale.timestamp >= cutoff_date
            )
        ).order_by(Sale.timestamp).all()
        
        # Group by day and sum quantities
        daily_sales = defaultdict(int)
        for sale in sales:
            day = sale.timestamp.date()
            daily_sales[day] += sale.quantity_sold
            
        return [{'date': day, 'quantity': qty} for day, qty in daily_sales.items()]
    
    def _calculate_base_demand(self, historical_sales: List[Dict]) -> float:
        """Calculate average daily demand"""
        if not historical_sales:
            return 0
        
        total_quantity = sum(sale['quantity'] for sale in historical_sales)
        return total_quantity / len(historical_sales)
    
    def _calculate_seasonal_factor(self, historical_sales: List[Dict]) -> float:
        """Calculate seasonal/day-of-week factor"""
        if len(historical_sales) < 14:  # Need at least 2 weeks
            return 1.0
            
        # Analyze day-of-week patterns
        day_sales = defaultdict(list)
        for sale in historical_sales:
            day_of_week = sale['date'].weekday()  # 0=Monday, 6=Sunday
            day_sales[day_of_week].append(sale['quantity'])
        
        # Calculate next week's expected pattern
        next_week_start = date.today() + timedelta(days=1)
        week_multiplier = 0
        
        for i in range(7):  # Next 7 days
            day_of_week = (next_week_start + timedelta(days=i)).weekday()
            if day_of_week in day_sales and day_sales[day_of_week]:
                avg_for_day = np.mean(day_sales[day_of_week])
                overall_avg = np.mean([qty for sales_list in day_sales.values() for qty in sales_list])
                day_factor = avg_for_day / overall_avg if overall_avg > 0 else 1
                week_multiplier += day_factor
        
        return week_multiplier / 7  # Average factor for the week
    
    def _calculate_trend_factor(self, historical_sales: List[Dict]) -> float:
        """Calculate trend factor (growing/declining popularity)"""
        if len(historical_sales) < 14:
            return 1.0
            
        # Split data into first and second half
        mid_point = len(historical_sales) // 2
        first_half = historical_sales[:mid_point]
        second_half = historical_sales[mid_point:]
        
        first_avg = np.mean([sale['quantity'] for sale in first_half])
        second_avg = np.mean([sale['quantity'] for sale in second_half])
        
        if first_avg == 0:
            return 1.0
            
        # Calculate growth rate and project forward
        growth_rate = (second_avg - first_avg) / first_avg
        trend_factor = 1 + (growth_rate * 0.5)  # Moderate the trend projection
        
        return max(0.5, min(2.0, trend_factor))  # Cap between 0.5x and 2x
    
    def _calculate_inventory_availability_factor(self, user_id: str, dish: Dish) -> float:
        """Factor in ingredient availability"""
        availability_scores = []
        
        for ingredient in dish.ingredients:
            inventory_item = self.db.query(InventoryItemEnhanced).filter(
                and_(
                    InventoryItemEnhanced.user_id == user_id,
                    InventoryItemEnhanced.id == ingredient.ingredient_id
                )
            ).first()
            
            if not inventory_item:
                availability_scores.append(0)  # No stock = can't make
                continue
                
            # Calculate how many servings possible with current stock
            required_qty = ingredient.quantity
            available_qty = inventory_item.quantity
            
            if required_qty <= 0:
                availability_scores.append(1)
                continue
                
            servings_possible = available_qty / required_qty
            
            # Convert to availability factor (0-1)
            if servings_possible >= 50:  # Abundant stock
                availability_scores.append(1.0)
            elif servings_possible >= 10:  # Good stock
                availability_scores.append(0.9)
            elif servings_possible >= 5:   # Moderate stock
                availability_scores.append(0.7)
            elif servings_possible >= 1:   # Low stock
                availability_scores.append(0.5)
            else:  # Out of stock
                availability_scores.append(0.1)
        
        # Return minimum availability (limited by scarcest ingredient)
        return min(availability_scores) if availability_scores else 0
    
    def _predict_new_dish_demand(self, dish: Dish) -> float:
        """Predict demand for new dishes with no historical data"""
        # Use category averages or similar dishes
        # This is a simplified version - in production, you'd use more sophisticated methods
        return 5.0  # Conservative estimate for new dishes
    
    def _save_prediction(self, user_id: str, dish_id: int, predicted_demand: float, factors: Dict):
        """Save prediction to database"""
        prediction = DishPrediction(
            user_id=user_id,
            dish_id=dish_id,
            prediction_date=date.today() + timedelta(days=7),  # Next week
            predicted_demand=predicted_demand,
            confidence_score=self._calculate_confidence_score(factors),
            seasonal_factor=factors.get('seasonal_factor', 1.0),
            trend_factor=factors.get('trend_factor', 1.0),
            inventory_availability=factors.get('inventory_availability', 1.0)
        )
        
        self.db.add(prediction)
        self.db.commit()
    
    def _calculate_confidence_score(self, factors: Dict) -> float:
        """Calculate confidence in prediction based on data quality"""
        # Simple confidence calculation - in production, this would be more sophisticated
        base_confidence = 0.7
        
        # Reduce confidence if inventory is low
        if factors.get('inventory_availability', 1.0) < 0.5:
            base_confidence *= 0.8
            
        return min(1.0, base_confidence)

class InventoryOptimizationService:
    """Service for optimizing inventory levels and suggesting purchases"""
    
    def __init__(self, db: Session):
        self.db = db
        
    def calculate_optimal_stock_levels(self, user_id: str) -> Dict[int, Dict]:
        """Calculate optimal stock levels for all ingredients"""
        inventory_items = self.db.query(InventoryItemEnhanced).filter(
            InventoryItemEnhanced.user_id == user_id
        ).all()
        
        recommendations = {}
        
        for item in inventory_items:
            # Calculate average weekly usage
            weekly_usage = self._calculate_weekly_usage(user_id, item.id)
            
            # Calculate optimal levels
            safety_stock = weekly_usage * 0.5  # 0.5 week buffer
            reorder_point = weekly_usage * 1.5  # Reorder when 1.5 weeks left
            optimal_max = weekly_usage * 3  # Keep max 3 weeks worth
            
            recommendations[item.id] = {
                'current_stock': item.quantity,
                'weekly_usage': weekly_usage,
                'optimal_min': safety_stock,
                'reorder_point': reorder_point,
                'optimal_max': optimal_max,
                'recommendation': self._generate_stock_recommendation(item, weekly_usage, safety_stock, reorder_point)
            }
            
        return recommendations
    
    def _calculate_weekly_usage(self, user_id: str, inventory_item_id: int) -> float:
        """Calculate average weekly usage for an ingredient"""
        # This would analyze dish preparation and sales data
        # Simplified for demo
        return 10.0  # Default weekly usage
    
    def _generate_stock_recommendation(self, item: InventoryItemEnhanced, weekly_usage: float, 
                                     safety_stock: float, reorder_point: float) -> str:
        """Generate human-readable recommendation"""
        current_stock = item.quantity
        
        if current_stock <= safety_stock:
            return f"CRITICAL: Order immediately! Only {current_stock:.1f} {item.unit} remaining."
        elif current_stock <= reorder_point:
            return f"LOW: Consider reordering soon. {current_stock:.1f} {item.unit} remaining."
        elif current_stock >= weekly_usage * 4:
            return f"HIGH: Consider using excess stock. {current_stock:.1f} {item.unit} available."
        else:
            return f"OPTIMAL: Stock level is good. {current_stock:.1f} {item.unit} available."
