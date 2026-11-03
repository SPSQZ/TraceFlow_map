// client/App.tsx - Frontend Client Component
import React, { useState } from "react";
import { submitLogin, checkoutCart } from "./api";

export function App() {
  const [user, setUser] = useState(null);

  async function handleLogin() {
    const res = await submitLogin("alex@example.com", "secret123");
    setUser(res.user);
  }

  async function handleCheckout() {
    const order = await checkoutCart([{ itemId: "prod_1", qty: 2 }]);
    console.log("Order confirmed", order);
  }

  return (
    <div className="container">
      <h1>Cloud Storefront</h1>
      <button onClick={handleLogin}>Log In</button>
      <button onClick={handleCheckout}>Checkout Order</button>
    </div>
  );
}

