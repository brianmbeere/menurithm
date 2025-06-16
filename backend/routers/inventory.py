from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import List
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from services.db import SessionLocal, InventoryItemDB, engine, Base
from sqlalchemy.future import select
import asyncio

class InventoryItem(BaseModel):
    name: str
    category: str
    quantity: int
    unit: str
    expiryDate: date
    storageLocation: str

router = APIRouter()

async def get_db():
    async with SessionLocal() as session:
        yield session

@router.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@router.post("/api/inventory")
async def receive_inventory(items: List[InventoryItem], db: AsyncSession = Depends(get_db)):
    db_items = [InventoryItemDB(**item.dict()) for item in items]
    db.add_all(db_items)
    await db.commit()
    expired = [item for item in items if item.expiryDate < date.today()]
    processed = {
        "total_items": len(items),
        "expired_items": len(expired),
        "expired_list": [item.name for item in expired],
    }
    return {"message": "Inventory received and stored", "result": processed}
