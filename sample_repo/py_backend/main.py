# py_backend/main.py - Python FastAPI Microservice
from fastapi import FastAPI
from .routes import router

app = FastAPI(title="Inventory Microservice", version="1.0.0")
app.include_router(router, prefix="/inventory")

@app.get("/health")
def health():
    return {"status": "healthy"}

