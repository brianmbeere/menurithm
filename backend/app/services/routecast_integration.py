import requests
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, date
from sqlalchemy.orm import Session
import logging

from app.models.inventory_enhanced import SupplierCatalog, PurchaseOrder, InventoryItemEnhanced

logger = logging.getLogger(__name__)

class RouteCastIntegrationService:
    """Service for integrating with RouteCast supplier platform"""
    
    def __init__(self, db: Session, api_key: str, base_url: str = "https://api.routecast.com/v1"):
        self.db = db
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    async def sync_supplier_catalog(self, user_email: str) -> Dict[str, Any]:
        """Sync supplier catalog from RouteCast"""
        try:
            # Get available produce from RouteCast API
            response = requests.get(
                f"{self.base_url}/produce/available",
                headers=self.headers
            )
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "message": f"RouteCast API error: {response.status_code}"
                }
            
            # RouteCast returns array of produce directly
            products = response.json() if isinstance(response.json(), list) else response.json().get("products", [])
            synced_items = 0
            
            # Sync products to local database
            for product in products:
                existing = self.db.query(SupplierCatalog).filter(
                    SupplierCatalog.supplier_product_id == str(product.get("id"))
                ).first()
                
                if not existing:
                    catalog_item = SupplierCatalog(
                        supplier_name=f"Seller_{product.get('seller_id', 'Unknown')}",
                        product_name=f"{product.get('produce_type', '')} - {product.get('variety', 'Standard')}",
                        supplier_product_id=str(product.get("id")),
                        unit_price=product.get("price_per_unit"),
                        unit_type=product.get("unit"),
                        availability=product.get("is_available", True),
                        minimum_order=1
                    )
                    self.db.add(catalog_item)
                    synced_items += 1
            
            self.db.commit()
            return {
                "success": True,
                "message": f"Successfully synced {synced_items} products from RouteCast"
            }
            
        except Exception as e:
            logger.error(f"RouteCast sync error: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to sync with RouteCast: {str(e)}"
            }
    
    async def check_ingredient_availability(self, user_email: str, ingredient_name: str) -> List[Dict]:
        """Check ingredient availability across suppliers"""
        try:
            # First check local supplier catalog
            local_results = self.db.query(SupplierCatalog).filter(
                SupplierCatalog.product_name.ilike(f"%{ingredient_name}%")
            ).all()
            
            suppliers = []
            for item in local_results:
                suppliers.append({
                    "supplier_name": item.supplier_name,
                    "product_name": item.product_name,
                    "unit_price": item.unit_price,
                    "unit_type": item.unit_type,
                    "available": item.availability,
                    "minimum_order": item.minimum_order,
                    "supplier_product_id": item.supplier_product_id
                })
            
            # If no local results, query RouteCast API directly
            if not suppliers:
                api_results = self._search_routecast_products(ingredient_name)
                suppliers.extend(api_results)
            
            return suppliers
            
        except Exception as e:
            logger.error(f"Error checking ingredient availability: {str(e)}")
            return []
    
    async def create_purchase_order(self, user_email: str, order_data: Dict) -> Dict[str, Any]:
        """Create purchase order through RouteCast"""
        try:
            # Validate order data
            required_fields = ["supplier_name", "items", "delivery_address"]
            for field in required_fields:
                if field not in order_data:
                    return {
                        "success": False,
                        "message": f"Missing required field: {field}"
                    }
            
            # Create order in RouteCast
            routecast_order = self._create_routecast_order(order_data)
            
            if not routecast_order.get("success"):
                return routecast_order
            
            # Calculate total amount
            total_amount = sum(
                item.get("quantity", 0) * item.get("unit_price", 0) 
                for item in order_data.get("items", [])
            )
            
            # Create local order record
            order = PurchaseOrder(
                user_id=order_data.get("user_id"),
                supplier_name=order_data["supplier_name"],
                order_data=json.dumps(order_data),
                status="pending",
                total_amount=total_amount,
                order_date=datetime.now(),
                expected_delivery_date=order_data.get("expected_delivery"),
                delivery_address=order_data["delivery_address"],
                routecast_order_id=routecast_order.get("order_id"),
                notes=order_data.get("notes", "")
            )
            
            self.db.add(order)
            self.db.commit()
            self.db.refresh(order)
            
            return {
                "success": True,
                "order_id": order.id,
                "routecast_order_id": routecast_order.get("order_id"),
                "status": "pending",
                "total_amount": total_amount
            }
            
        except Exception as e:
            logger.error(f"Error creating purchase order: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to create order: {str(e)}"
            }
    
    async def process_delivery_confirmation(self, user_email: str, order_id: int, received_quantity: float) -> Dict[str, Any]:
        """Process delivery confirmation and update inventory"""
        try:
            # Get order
            order = self.db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
            if not order:
                return {
                    "success": False,
                    "message": "Order not found"
                }
            
            # Get updated status from RouteCast
            if order.routecast_order_id:
                routecast_status = self._get_routecast_order_status(order.routecast_order_id)
                
                # Update local order status
                if routecast_status.get("status") != order.status:
                    order.status = routecast_status.get("status", order.status)
                    if routecast_status.get("delivery_date"):
                        order.actual_delivery_date = datetime.strptime(
                            routecast_status["delivery_date"], "%Y-%m-%d"
                        ).date()
            
            # Update inventory if delivered
            if order.status == "delivered":
                order_data = json.loads(order.order_data)
                for item in order_data.get("items", []):
                    # Find or create inventory item
                    inventory_item = self.db.query(InventoryItemEnhanced).filter(
                        InventoryItemEnhanced.ingredient_name == item.get("product_name"),
                        InventoryItemEnhanced.user_id == order.user_id
                    ).first()
                    
                    if inventory_item:
                        inventory_item.current_stock += received_quantity
                        inventory_item.last_updated = datetime.now()
                    else:
                        # Create new inventory item
                        inventory_item = InventoryItemEnhanced(
                            user_id=order.user_id,
                            ingredient_name=item.get("product_name"),
                            current_stock=received_quantity,
                            unit=item.get("unit", "units"),
                            cost_per_unit=item.get("unit_price", 0),
                            supplier_info=order.supplier_name,
                            last_updated=datetime.now()
                        )
                        self.db.add(inventory_item)
            
            self.db.commit()
            
            return {
                "success": True,
                "order_id": order_id,
                "status": order.status,
                "received_quantity": received_quantity,
                "inventory_updated": order.status == "delivered"
            }
            
        except Exception as e:
            logger.error(f"Error processing delivery confirmation: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to process delivery: {str(e)}"
            }
    
    async def get_suppliers(self, db: Session, user_id: str) -> List[Dict]:
        """Get list of available suppliers"""
        try:
            # Get unique suppliers from catalog
            suppliers_query = self.db.query(SupplierCatalog.supplier_name).distinct()
            suppliers = [s[0] for s in suppliers_query.all()]
            
            # Also get suppliers from RouteCast API
            api_suppliers = self._get_routecast_suppliers()
            
            # Combine and deduplicate
            all_suppliers = list(set(suppliers + [s.get("name", "") for s in api_suppliers]))
            
            return [
                {
                    "name": supplier,
                    "available": True,
                    "product_count": self.db.query(SupplierCatalog).filter(
                        SupplierCatalog.supplier_name == supplier
                    ).count()
                }
                for supplier in all_suppliers if supplier
            ]
            
        except Exception as e:
            logger.error(f"Error getting suppliers: {str(e)}")
            return []
    
    async def process_auto_orders(self, db: Session, user_id: str, recommendations: Dict) -> Dict[str, Any]:
        """Process automatic orders based on AI recommendations"""
        try:
            reorder_recommendations = recommendations.get("reorder_recommendations", [])
            created_orders = []
            
            logger.info(f"Processing {len(reorder_recommendations)} reorder recommendations for user {user_id}")
            
            for rec in reorder_recommendations:
                # Process all recommendations, not just those with auto_order flag
                logger.info(f"Creating order for: {rec.get('item_name')}")
                
                # Create automatic order
                order_data = {
                    "user_id": user_id,
                    "supplier_name": rec.get("preferred_supplier", "RouteCast Supplier"),
                    "restaurant_name": "Menurithm Restaurant",
                    "items": [{
                        "product_name": rec.get("item_name"),
                        "quantity": rec.get("recommended_quantity", 10),
                        "unit_price": rec.get("estimated_price", 5.0),
                        "unit": rec.get("unit", "kg")
                    }],
                    "delivery_address": "Restaurant Address",
                    "delivery_window": "Next available",
                    "notes": f"Auto-generated order: {rec.get('reason', 'Low stock')}"
                }
                
                # Make the actual request to RouteCast
                routecast_result = self._create_routecast_order(order_data)
                logger.info(f"RouteCast order result: {routecast_result}")
                
                if routecast_result.get("success"):
                    created_orders.append(routecast_result)
            
            logger.info(f"Created {len(created_orders)} orders via RouteCast")
            
            return {
                "success": True,
                "orders_created": len(created_orders),
                "orders": created_orders
            }
            
        except Exception as e:
            logger.error(f"Error processing auto orders: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to process auto orders: {str(e)}"
            }
    
    # Private helper methods for RouteCast API integration
    
    def _get_routecast_suppliers(self) -> List[Dict]:
        """Get list of available suppliers from RouteCast"""
        try:
            # RouteCast uses /produce/available to get sellers
            response = requests.get(f"{self.base_url}/produce/available", headers=self.headers)
            if response.status_code == 200:
                products = response.json() if isinstance(response.json(), list) else []
                # Extract unique sellers
                sellers = {}
                for product in products:
                    seller_id = product.get("seller_id")
                    if seller_id and seller_id not in sellers:
                        sellers[seller_id] = {
                            "id": seller_id,
                            "name": f"Seller_{seller_id}",
                            "location": product.get("location", "Unknown")
                        }
                return list(sellers.values())
            return []
        except Exception as e:
            logger.error(f"Error getting RouteCast suppliers: {str(e)}")
            return []
    
    def _get_supplier_products(self, supplier_id: str) -> List[Dict]:
        """Get products from specific supplier"""
        try:
            response = requests.get(
                f"{self.base_url}/produce/seller/{supplier_id}",
                headers=self.headers
            )
            if response.status_code == 200:
                products = response.json() if isinstance(response.json(), list) else response.json().get("products", [])
                return products
            return []
        except Exception as e:
            logger.error(f"Error getting supplier products: {str(e)}")
            return []
    
    def _search_routecast_products(self, ingredient_name: str) -> List[Dict]:
        """Search products directly in RouteCast API"""
        try:
            response = requests.get(
                f"{self.base_url}/produce/search",
                headers=self.headers,
                params={"q": ingredient_name}
            )
            if response.status_code == 200:
                products = response.json() if isinstance(response.json(), list) else response.json().get("products", [])
                return products
            return []
        except Exception as e:
            logger.error(f"Error searching RouteCast products: {str(e)}")
            return []
    
    async def create_produce_request(self, user_id: str, order_data: Dict) -> Dict[str, Any]:
        """
        Create a produce request through RouteCast.
        This is the main public method for creating produce orders.
        
        Required fields in order_data:
        - restaurant_name: str
        - produce_type: str
        - quantity_needed: float
        - unit: str
        - delivery_address: str
        - delivery_window_start: str (ISO datetime)
        - delivery_window_end: str (ISO datetime)
        
        Optional fields:
        - max_price_per_unit: float
        - special_requirements: str
        - delivery_latitude: float
        - delivery_longitude: float
        """
        from datetime import timedelta
        import os
        
        try:
            # Set default delivery windows if not provided (next day, 8am-6pm)
            now = datetime.now()
            default_start = (now + timedelta(days=1)).replace(hour=8, minute=0, second=0, microsecond=0)
            default_end = (now + timedelta(days=1)).replace(hour=18, minute=0, second=0, microsecond=0)
            
            delivery_window_start = order_data.get("delivery_window_start") or default_start.isoformat()
            delivery_window_end = order_data.get("delivery_window_end") or default_end.isoformat()
            
            # Check if we're in demo mode
            if not self.api_key or self.api_key == "your-routecast-api-key-here":
                return {
                    "success": True,
                    "request_id": 999,
                    "status": "pending",
                    "message": "Demo order created (configure ROUTECAST_API_KEY for live orders)",
                    "demo_mode": True,
                    "order_details": {
                        "restaurant_name": order_data.get("restaurant_name"),
                        "produce_type": order_data.get("produce_type"),
                        "quantity_needed": order_data.get("quantity_needed"),
                        "unit": order_data.get("unit"),
                        "delivery_address": order_data.get("delivery_address"),
                        "delivery_window_start": delivery_window_start,
                        "delivery_window_end": delivery_window_end
                    }
                }
            
            # Build the RouteCast MenurithmWebhookRequest payload
            # Using the webhook endpoint which doesn't require JWT auth
            request_id = f"menurithm-{user_id}-{int(now.timestamp())}"
            quantity_str = f"{order_data.get('quantity_needed', 0)} {order_data.get('unit', 'kg')}"
            
            # Format delivery window as human-readable string
            try:
                start_dt = datetime.fromisoformat(delivery_window_start.replace('Z', '+00:00'))
                end_dt = datetime.fromisoformat(delivery_window_end.replace('Z', '+00:00'))
                delivery_window = f"{start_dt.strftime('%Y-%m-%d %H:%M')} - {end_dt.strftime('%H:%M')}"
            except:
                delivery_window = f"{delivery_window_start} - {delivery_window_end}"
            
            webhook_request = {
                "request_id": request_id,
                "restaurant_name": order_data.get("restaurant_name"),
                "produce_type": order_data.get("produce_type"),
                "quantity": quantity_str,
                "delivery_address": order_data.get("delivery_address"),
                "delivery_window": delivery_window,
                "special_requirements": order_data.get("special_requirements")
            }
            
            # Remove None values
            webhook_request = {k: v for k, v in webhook_request.items() if v is not None}
            
            logger.info(f"Creating produce request via RouteCast webhook: {webhook_request}")
            
            # Send request to RouteCast webhook endpoint (no auth required)
            response = requests.post(
                f"{self.base_url}/webhooks/menurithm/request",
                headers={"Content-Type": "application/json"},
                json=webhook_request
            )
            
            logger.info(f"RouteCast webhook response: {response.status_code} - {response.text[:500] if response.text else 'No content'}")
            
            if response.status_code in [200, 201]:
                result = response.json() if response.text else {}
                return {
                    "success": True,
                    "request_id": result.get("request_id") or request_id,
                    "status": result.get("status", "pending"),
                    "message": f"Produce request sent to RouteCast for {order_data.get('restaurant_name')}",
                    "demo_mode": False,
                    "routecast_response": result
                }
            else:
                return {
                    "success": False,
                    "message": f"RouteCast API error: {response.status_code} - {response.text}",
                    "status": "failed"
                }
                
        except Exception as e:
            logger.error(f"Error creating produce request: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to create produce order: {str(e)}",
                "status": "error"
            }
    
    async def get_available_produce(self) -> Dict[str, Any]:
        """Get available produce from RouteCast marketplace"""
        try:
            # Check if we're in demo mode
            if not self.api_key or self.api_key == "your-routecast-api-key-here":
                return {
                    "success": True,
                    "produce": [
                        {"id": 1, "produce_type": "Tomatoes", "variety": "Roma", "quantity_available": 100, "unit": "kg", "price_per_unit": 3.50, "location": "Demo Farm", "organic": True, "is_available": True},
                        {"id": 2, "produce_type": "Lettuce", "variety": "Iceberg", "quantity_available": 50, "unit": "kg", "price_per_unit": 2.00, "location": "Demo Farm", "organic": False, "is_available": True},
                        {"id": 3, "produce_type": "Chicken", "variety": "Breast", "quantity_available": 200, "unit": "kg", "price_per_unit": 8.00, "location": "Demo Supplier", "organic": False, "is_available": True},
                        {"id": 4, "produce_type": "Onions", "variety": "Yellow", "quantity_available": 150, "unit": "kg", "price_per_unit": 1.50, "location": "Demo Farm", "organic": True, "is_available": True},
                    ],
                    "demo_mode": True,
                    "message": "Demo produce data (configure ROUTECAST_API_KEY for live data)"
                }
            
            response = requests.get(
                f"{self.base_url}/produce/available",
                headers=self.headers
            )
            
            if response.status_code == 200:
                produce_list = response.json()
                return {
                    "success": True,
                    "produce": produce_list if isinstance(produce_list, list) else produce_list.get("produce", []),
                    "demo_mode": False
                }
            else:
                return {
                    "success": False,
                    "produce": [],
                    "message": f"RouteCast API error: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Error fetching available produce: {str(e)}")
            return {
                "success": False,
                "produce": [],
                "message": f"Failed to fetch produce: {str(e)}"
            }
    
    async def get_request_status(self, request_id: int) -> Dict[str, Any]:
        """Get status of a produce request from RouteCast"""
        try:
            if not self.api_key or self.api_key == "your-routecast-api-key-here":
                return {
                    "success": True,
                    "request_id": request_id,
                    "status": "pending",
                    "demo_mode": True
                }
            
            response = requests.get(
                f"{self.base_url}/requests/{request_id}",
                headers=self.headers
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "demo_mode": False,
                    **response.json()
                }
            else:
                return {
                    "success": False,
                    "message": f"RouteCast API error: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Error getting request status: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to get request status: {str(e)}"
            }
    
    def _create_routecast_order(self, order_data: Dict) -> Dict:
        """Create produce request in RouteCast system"""
        try:
            from datetime import timedelta
            
            # Transform order data to RouteCast ProduceRequestCreate format
            items = order_data.get("items", [])
            first_item = items[0] if items else {}
            
            # Set default delivery windows if not provided (next day, 8am-6pm)
            now = datetime.now()
            default_start = (now + timedelta(days=1)).replace(hour=8, minute=0, second=0, microsecond=0)
            default_end = (now + timedelta(days=1)).replace(hour=18, minute=0, second=0, microsecond=0)
            
            routecast_request = {
                "restaurant_name": order_data.get("restaurant_name", "Menurithm Restaurant"),
                "produce_type": first_item.get("product_name", "General Produce"),
                "quantity_needed": float(sum(item.get("quantity", 0) for item in items)),
                "unit": first_item.get("unit", "kg"),
                "delivery_address": order_data.get("delivery_address", "Restaurant Address"),
                "delivery_window_start": order_data.get("delivery_window_start", default_start.isoformat()),
                "delivery_window_end": order_data.get("delivery_window_end", default_end.isoformat()),
                "max_price_per_unit": first_item.get("unit_price"),
                "special_requirements": order_data.get("notes", ""),
                "menurithm_request_id": order_data.get("menurithm_request_id")
            }
            
            # Remove None values
            routecast_request = {k: v for k, v in routecast_request.items() if v is not None}
            
            logger.info(f"Sending request to RouteCast: {routecast_request}")
            
            # Use RouteCast's requests endpoint
            response = requests.post(
                f"{self.base_url}/requests/",
                headers=self.headers,
                json=routecast_request
            )
            
            logger.info(f"RouteCast response: {response.status_code} - {response.text[:200] if response.text else 'No content'}")
            
            if response.status_code in [200, 201]:
                result = response.json()
                return {
                    "success": True,
                    "order_id": result.get("id") or result.get("request_id"),
                    "status": result.get("status", "pending")
                }
            else:
                return {
                    "success": False,
                    "message": f"RouteCast request creation failed: {response.status_code} - {response.text}"
                }
                
        except Exception as e:
            logger.error(f"Error creating RouteCast request: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to create request in RouteCast: {str(e)}"
            }
    
    def _get_routecast_order_status(self, routecast_order_id: str) -> Dict:
        """Get order status from RouteCast"""
        try:
            response = requests.get(
                f"{self.base_url}/requests/{routecast_order_id}",
                headers=self.headers
            )
            if response.status_code == 200:
                return response.json()
            return {}
        except Exception as e:
            logger.error(f"Error getting RouteCast order status: {str(e)}")
            return {}
