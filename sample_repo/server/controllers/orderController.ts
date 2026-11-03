// server/controllers/orderController.ts
import { createOrderRecord, fetchUserOrders } from "../services/orderService";

export async function processCheckout(req: any, res: any) {
  const { items } = req.body;
  const order = await createOrderRecord(items);
  return res.json({ success: true, order });
}

export async function getOrderHistory(req: any, res: any) {
  const orders = await fetchUserOrders("usr_123");
  return res.json({ orders });
}

