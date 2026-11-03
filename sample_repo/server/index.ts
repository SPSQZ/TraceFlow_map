// server/index.ts - Main API Server Entrypoint
import express from "express";
import { authRouter } from "./routes/authRoutes";
import { orderRouter } from "./routes/orderRoutes";

const app = express();
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/orders", orderRouter);

export function startServer() {
  app.listen(4000, () => {
    console.log("Server listening on port 4000");
  });
}

