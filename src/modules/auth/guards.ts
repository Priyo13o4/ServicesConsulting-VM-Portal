import { err, ok, type Result } from "@/lib/result";
import { type SecurityUser, type UserRole } from "@/lib/security";

/**
 * Server authorization guards
 * Mandated by AGENTS.md Rule 3:
 * "Authorize on the server, every time. Every action and query starts with requireUser()
 * or requireRole() from src/modules/auth/guards.ts."
 */

export function assertActiveUser(user: SecurityUser | null | undefined): Result<SecurityUser> {
  if (!user) {
    return err("UNAUTHENTICATED", "Authentication required");
  }
  if (user.status !== "ACTIVE") {
    return err("FORBIDDEN", `Account is ${user.status.toLowerCase().replace("_", " ")}`);
  }
  return ok(user);
}

export function assertRole(
  user: SecurityUser | null | undefined,
  allowedRoles: readonly UserRole[]
): Result<SecurityUser> {
  const activeCheck = assertActiveUser(user);
  if (!activeCheck.ok) {
    return activeCheck;
  }
  if (!allowedRoles.includes(user!.role)) {
    return err("FORBIDDEN", "Insufficient permissions for this operation");
  }
  return ok(user!);
}
