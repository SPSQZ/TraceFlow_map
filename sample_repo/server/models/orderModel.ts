// server/models/orderModel.ts
export async function persistOrder(orderData: any) {
  return { id: "ord_9901", ...orderData, processedAt: new Date().toISOString() };
}

export async function queryOrders(userId: string) {
  return [
    { id: "ord_9901", total: 50, status: "PAID" },
    { id: "ord_9800", total: 120, status: "DELIVERED" }
  ];
}

