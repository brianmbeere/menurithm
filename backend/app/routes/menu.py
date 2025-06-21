from fastapi import APIRouter

router = APIRouter()

@router.get("/generate-menu")
def generate_menu():
    return {"dishes": ["Spaghetti", "Taco Salad", "Grilled Chicken"]}
