// server/routes/authRoutes.ts
import { Router } from "express";
import { loginUser, registerUser } from "../controllers/authController";

export const authRouter = Router();

authRouter.post("/login", loginUser);
authRouter.post("/register", registerUser);

