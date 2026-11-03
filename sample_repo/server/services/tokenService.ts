// server/services/tokenService.ts
// Note: imports getUserRole from authService, creating an architectural circular dependency cycle
import { getUserRole } from "./authService";

export function generateAuthToken(userId: string) {
  const role = getUserRole(userId);
  return `jwt_token_for_${userId}_role_${role}`;
}

export function verifySession(token: string) {
  return { valid: true, userId: "usr_100" };
}

