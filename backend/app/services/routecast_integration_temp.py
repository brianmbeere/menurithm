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
            # Get supplier products from RouteCast API
            response = requests.get(
                f"{self.base_url}/catalog/products",
                headers=self.headers,
                params={"user_email": user_email}
            )
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "message": f"RouteCast API error: {response.status_code}"
                }
            
            products = response.json().get("products", [])
            synced_items = 0
            
            # Sync products to local database
            for product in products:
                existing = self.db.query(SupplierCatalog).filter(
                    SupplierCatalog.supplier_product_id == product.get("id")
                ).first()
                
                if not existing:
                    catalog_item = SupplierCatalog(
                        supplier_name=product.get("supplier_name"),
                        product_name=product.get("name"),
                        supplier_product_id=product.get("id"),
                        unit_price=product.get("price"),
                        unit_type=product.get("unit"),
                        availability=product.get("in_stock", True),
                        minimum_order=product.get("min_order", 1)
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
            
            for rec in reorder_recommendations:
                if rec.get("auto_order", False):
                    # Create automatic order
                    order_data = {
                        "user_id": user_id,
                        "supplier_name": rec.get("preferred_supplier", "Default Supplier"),
                        "items": [{
                            "product_name": rec.get("item_name"),
                            "quantity": rec.get("recommended_quantity", 1),
                            "unit_price": rec.get("estimated_price", 0),
                            "unit": rec.get("unit", "units")
                        }],
                        "delivery_address": "Restaurant Address",  # This should come from user settings
                        "notes": f"Auto-generated order based on AI recommendation: {rec.get('reason', '')}"
                    }
                    
                    result = await self.create_purchase_order("", order_data)
                    if result.get("success"):
                        created_orders.append(result)
            
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
            response = requests.get(f"{self.base_url}/suppliers", headers=self.headers)
            if response.status_code == 200:
                return response.json().get("suppliers", [])
            return []
        except Exception as e:
            logger.error(f"Error getting RouteCast suppliers: {str(e)}")
            return []
    
    def _get_supplier_products(self, supplier_id: str) -> List[Dict]:
        """Get products from specific supplier"""
        try:
            response = requests.get(
                f"{self.base_url}/suppliers/{supplier_id}/products",
                headers=self.headers
            )
            if response.status_code == 200:
                return response.json().get("products", [])
            return []
        except Exception as e:
            logger.error(f"Error getting supplier products: {str(e)}")
            return []
    
    def _search_routecast_products(self, ingredient_name: str) -> List[Dict]:
        """Search products directly in RouteCast API"""
        try:
            response = requests.get(
                f"{self.base_url}/products/search",
                headers=self.headers,
                params={"q": ingredient_name}
            )
            if response.status_code == 200:
                return response.json().get("products", [])
            return []
        except Exception as e:
            logger.error(f"Error searching RouteCast products: {str(e)}")
            return []
    
    def _create_routecast_order(self, order_data: Dict) -> Dict:
        """Create order in RouteCast system"""
        try:
            # Transform order data to RouteCast format
            routecast_order = {
                "supplier_name": order_data["supplier_name"],
                "items": order_data["items"],
                "delivery_address": order_data["delivery_address"],
                "notes": order_data.get("notes", ""),
                "requested_delivery_date": order_data.get("expected_delivery")
            }
            
            response = requests.post(
                f"{self.base_url}/orders",
                headers=self.headers,
                json=routecast_order
            )
            
            if response.status_code == 201:
                return {
                    "success": True,
                    "order_id": response.json().get("order_id"),
                    "status": "pending"
                }
            else:
                return {
                    "success": False,
                    "message": f"RouteCast order creation failed: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Error creating RouteCast order: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to create order in RouteCast: {str(e)}"
            }
    
    def _get_routecast_order_status(self, routecast_order_id: str) -> Dict:
        """Get order status from RouteCast"""
        try:
            response = requests.get(
                f"{self.base_url}/orders/{routecast_order_id}",
                headers=self.headers
            )
            if response.status_code == 200:
                return response.json()
            return {}
        except Exception as e:
            logger.error(f"Error getting RouteCast order status: {str(e)}")
            return {}
