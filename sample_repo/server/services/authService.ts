// server/services/authService.ts
import { generateAuthToken, verifySession } from "./tokenService";
import { findUserByEmail, saveUser } from "../models/userModel";

export async function authenticateCredentials(email: string, pass: string) {
  const user = await findUserByEmail(email);
  if (!user) throw new Error("User not found");
  const token = generateAuthToken(user.id);
  return token;
}

export async function registerNewAccount(email: string, pass: string) {
  return await saveUser({ email, pass });
}

export function getUserRole(userId: string) {
  return "standard_user";
}

