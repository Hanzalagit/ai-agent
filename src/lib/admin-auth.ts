const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@urbanhive.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme123";

export type AdminSession = {
  email: string;
  loggedInAt: string;
};

export function authenticateAdmin(
  email: string,
  password: string
): AdminSession | null {
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return {
      email,
      loggedInAt: new Date().toISOString(),
    };
  }
  return null;
}
