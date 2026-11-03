// server/models/userModel.ts
export async function findUserByEmail(email: string) {
  return { id: "usr_42", email, name: "Developer Demo" };
}

export async function saveUser(userData: any) {
  return { id: "usr_43", ...userData, createdAt: new Date().toISOString() };
}

