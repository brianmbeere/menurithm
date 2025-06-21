from sqlalchemy.orm import Session
from app.models.dish import Dish
from app.models.inventory import InventoryItem
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_menu(db: Session):
    menu = []
    inventory = {i.ingredient_name.lower(): i for i in db.query(InventoryItem).all()}
    dishes = db.query(Dish).all()

    logger.info("Starting menu generation...")
    logger.info(f"Loaded {len(dishes)} dishes and {len(inventory)} inventory items")

    for dish in dishes:
        can_make = True
        logger.info(f"\nEvaluating dish: {dish.name}")

        for ing in dish.ingredients:
            ing_name = ing.ingredient_name.lower()
            stock = inventory.get(ing_name)

            if not stock:
                logger.warning(f"❌ Missing ingredient: {ing.ingredient_name}")
                can_make = False
                break

            try:
                available = float(stock.quantity)
                required = ing.quantity
            except Exception as e:
                logger.error(f"⚠️ Error parsing quantities for {ing.ingredient_name}: {e}")
                can_make = False
                break

            if available < required:
                logger.warning(f"❌ Not enough {ing.ingredient_name}: need {required}, have {available}")
                can_make = False
                break
            else:
                logger.info(f"✅ {ing.ingredient_name}: need {required}, have {available}")

        if can_make:
            logger.info(f"✅ Added to menu: {dish.name}")
            menu.append(dish.name)

            # Auto-decrement inventory
            for ing in dish.ingredients:
                inv = inventory[ing.ingredient_name.lower()]
                inv.quantity = str(float(inv.quantity) - ing.quantity)

    db.commit()
    logger.info(f"\n✅ Menu generated with {len(menu)} dishes")
    return menu
