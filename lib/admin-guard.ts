import { cookies } from "next/headers";
import { ADMIN_COOKIE, requireUser } from "@/lib/auth";

export function adminEmail(): string {
  return (process.env.ADMIN_EMAIL || "brokenman256@gmail.com")
    .toLowerCase()
    .trim();
}

export async function assertAdminAccess(): Promise<
  | { ok: true; email: string }
  | { ok: false }
> {
  const jar = await cookies();
  const hasCookie = jar.get(ADMIN_COOKIE)?.value === "1";
  if (!hasCookie) return { ok: false };

  const user = await requireUser();
  const allowed = adminEmail();

  if (user) {
    if (user.email.toLowerCase() === allowed && user.role === "admin") {
      return { ok: true, email: user.email };
    }
    if (user.email.toLowerCase() !== allowed) {
      return { ok: false };
    }
  }

  return { ok: true, email: allowed };
}
