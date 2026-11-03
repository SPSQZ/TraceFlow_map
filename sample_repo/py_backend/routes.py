# py_backend/routes.py
from fastapi import APIRouter
from .services import check_stock_level, reserve_item_quantity

router = APIRouter()

@router.get("/check/{item_id}")
def check_item(item_id: str):
    qty = check_stock_level(item_id)
    return {"item_id": item_id, "in_stock": qty > 0, "quantity": qty}

@router.post("/reserve")
def reserve_item(item_id: str, count: int = 1):
    success = reserve_item_quantity(item_id, count)
    return {"success": success}

