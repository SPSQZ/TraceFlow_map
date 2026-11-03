// server/services/orderService.ts
import { persistOrder, queryOrders } from "../models/orderModel";

export async function createOrderRecord(items: any[]) {
  const total = items.reduce((acc, i) => acc + (i.qty * 25), 0);
  const newOrder = await persistOrder({ items, total, status: "PAID" });
  return newOrder;
}

export async function fetchUserOrders(userId: string) {
  return await queryOrders(userId);
}

