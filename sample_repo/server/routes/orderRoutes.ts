// server/routes/orderRoutes.ts
import { Router } from "express";
import { processCheckout, getOrderHistory } from "../controllers/orderController";

export const orderRouter = Router();

orderRouter.post("/checkout", processCheckout);
orderRouter.get("/history", getOrderHistory);

