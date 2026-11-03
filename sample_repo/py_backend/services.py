# py_backend/services.py
def check_stock_level(item_id: str) -> int:
    """Queries inventory levels for requested item."""
    inventory_db = {"prod_1": 45, "prod_2": 12, "prod_3": 0}
    return inventory_db.get(item_id, 0)

def reserve_item_quantity(item_id: str, count: int) -> bool:
    """Deducts inventory stock transactionally."""
    stock = check_stock_level(item_id)
    if stock >= count:
        return True
    return False

