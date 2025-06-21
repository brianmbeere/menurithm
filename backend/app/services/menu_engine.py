from sqlalchemy.orm import Session
from app.models.dish import Dish
from app.models.inventory import InventoryItem

def generate_menu(db: Session):
    menu = []

    dishes = db.query(Dish).all()
    inventory = {i.ingredient_name: i for i in db.query(InventoryItem).all()}

    for dish in dishes:
        can_make = True
        for ing in dish.ingredients:
            stock = inventory.get(ing.ingredient_name)
            if not stock or float(stock.quantity) < ing.quantity:
                can_make = False
                break

        if can_make:
            menu.append(dish.name)

    return menu
