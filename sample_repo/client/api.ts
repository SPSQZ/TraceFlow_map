// client/api.ts - HTTP Client Invocations
export async function submitLogin(email: string, pass: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, pass })
  });
  return res.json();
}

export async function checkoutCart(items: any[]) {
  const res = await fetch("/api/orders/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  });
  return res.json();
}

