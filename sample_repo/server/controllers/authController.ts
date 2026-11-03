// server/controllers/authController.ts
import { authenticateCredentials, registerNewAccount } from "../services/authService";

export async function loginUser(req: any, res: any) {
  const { email, pass } = req.body;
  const token = await authenticateCredentials(email, pass);
  return res.json({ success: true, token });
}

export async function registerUser(req: any, res: any) {
  const { email, pass } = req.body;
  const user = await registerNewAccount(email, pass);
  return res.json({ success: true, user });
}

