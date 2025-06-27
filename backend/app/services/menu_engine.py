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
    score_map = defaultdict(int)
    total_sales = db.query(Sale).count()

    if total_sales == 0:
        return score_map
    
    sales_counts = sales_counts = db.query(Sale.dish_id, func.count(Sale.id)).group_by(Sale.dish_id).all()
    for dish_id, _ in sales_counts:
        score_map[dish_id] += 1

    for dish_id in score_map:
        score_map[dish_id] = (score_map[dish_id] / total_sales) * 100

    return score_map

def generate_menu_smart(db: Session):
    menu = []
    inventory = {i.ingredient_name.lower(): i for i in db.query(InventoryItem).all()}
    dishes = db.query(Dish).all()
    popularity = calculate_popularity_scores(db)

    logger.info("Starting smart menu generation...")
    for dish in dishes:
        can_make = True
        servings_possible = float('inf')

        for ing in dish.ingredients:
            stock = inventory.get(ing.ingredient.ingredient_name.lower()) if ing.ingredient else None
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
                "servings": int(servings_possible),
                "popularity_score": round(popularity.get(dish.id,0.0), 2)
            })
    menu.sort(key=lambda x: x["popularity_score"], reverse=True)
    logger.info(f"✅ Menu generated with {len(menu)} dishes")
    return menu
