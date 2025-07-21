from fastapi import FastAPI
import uvicorn
from app.routes import user, menu, inventory, sales, dish, csv_help, csv_validation
from app.db.database import Base, engine
from app.core.config import setup_cors
import os
import logging


app = FastAPI()

setup_cors(app)

# Include routers
app.include_router(menu.router)
app.include_router(inventory.router)
app.include_router(sales.router)
app.include_router(dish.router)
app.include_router(user.router)
app.include_router(csv_help.router, prefix="/csv", tags=["CSV Help"])
app.include_router(csv_validation.router, prefix="/csv", tags=["CSV Validation"])

logging.basicConfig(level=logging.INFO)

Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)