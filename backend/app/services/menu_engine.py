from sqlalchemy.orm import Session
from app.models.dish import Dish
from app.models.inventory import InventoryItem
from app.models.sales import Sale
from collections import defaultdict
from sqlalchemy import func
import logging
import math

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def calculate_popularity_scores(db: Session):
    score_map = defaultdict(float)
    
    # Fetch sales count per dish
    sales_counts = db.query(Sale.dish_id, func.count(Sale.id)).group_by(Sale.dish_id).all()
    
    if not sales_counts:
        return score_map

    # Find the maximum sales count for normalization
    max_sales = max(count for _, count in sales_counts)
    
    for dish_id, count in sales_counts:
        score_map[dish_id] = round((count / max_sales) * 10, 2)

    return score_map

def generate_menu_smart(db: Session, user_id: int):
    menu = []
    inventory = {i.ingredient_name.lower(): i for i in db.query(InventoryItem).filter(InventoryItem.user_id == user_id).all()}
    dishes = db.query(Dish).all()
    popularity = calculate_popularity_scores(db)

    logger.info("Starting smart menu generation...")
    for dish in dishes:
        can_make = True
        servings_possible = float('inf')

        for ing in dish.ingredients:
            stock = inventory.get(ing.ingredient.ingredient_name.lower(), ing.ingredient.user_id == user_id) if ing.ingredient else None
            if not stock:
                logger.warning(f"❌ Missing ingredient: {getattr(ing.ingredient, 'ingredient_name', 'Unknown')}")
                can_make = False
                break
            try:
                available = float(stock.quantity)
                required = ing.quantity
                servings = available / required
                servings_possible = min(servings_possible, servings)
            except Exception as e:
                logger.error(f"⚠️ Error parsing quantities for {getattr(ing.ingredient, 'ingredient_name', 'Unknown')}: {e}")
                can_make = False
                break
        if can_make and servings_possible >= 1 and math.isfinite(servings_possible):
            menu.append({
                "name": dish.name,
                "description": dish.description,
                "servings": int(servings_possible),
                "popularity_score": round(popularity.get(dish.id,0.0), 2)
            })
    menu.sort(key=lambda x: x["popularity_score"], reverse=True)
    logger.info(f"✅ Menu generated with {len(menu)} dishes")
    return menu
