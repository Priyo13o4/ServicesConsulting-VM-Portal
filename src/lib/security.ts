/**
 * Central Security and Role Definitions
 * Implements docs/domain.md Permission Matrix and AGENTS.md rules.
 * Authoritative single source of truth for authorization checks.
 */

export const USER_ROLES = [
  "END_USER",
  "MANAGER",
  "OWNER_BU_MANAGER",
  "VCLOUD_ADMIN",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_STATUSES = [
  "INVITED",
  "PENDING_ACTIVATION",
  "ACTIVE",
  "DEACTIVATED",
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export interface SecurityUser {
  id: string;
  role: UserRole;
  status: AccountStatus;
  managerId?: string | null;
  buId?: string | null;
}

export interface VmContext {
  id: string;
  ownerId: string;
  backupOwnerId?: string | null;
  buId?: string | null;
}

export type VmAction = "EXTEND" | "RELEASE" | "TICKET" | "REUSE";

export function isActive(user: SecurityUser): boolean {
  return user.status === "ACTIVE";
}

export function canRequestForSelf(user: SecurityUser): boolean {
  return isActive(user);
}

export function canRequestForTeam(user: SecurityUser, isReport: boolean): boolean {
  if (!isActive(user)) return false;
  return (user.role === "MANAGER" || user.role === "OWNER_BU_MANAGER") && isReport;
}

export function canSeeVm(
  user: SecurityUser,
  vm: VmContext,
  isReportVm: boolean = false
): boolean {
  if (!isActive(user)) return false;
  if (user.role === "VCLOUD_ADMIN" || user.role === "OWNER_BU_MANAGER") {
    return true;
  }
  if (user.id === vm.ownerId || user.id === vm.backupOwnerId) {
    return true;
  }
  if (user.role === "MANAGER" && isReportVm) {
    return true;
  }
  return false;
}

/**
 * Hard Rule (AGENTS.md Rule 11 & docs/domain.md):
 * "A manager can never release, delete, extend or hand over a report's VM."
 * Managers only have read-only visibility over their reports' VMs.
 */
export function canActOnVm(
  user: SecurityUser,
  vm: VmContext,
  action: VmAction,
  isReportVm: boolean = false
): boolean {
  if (!isActive(user)) return false;

  // vCloud admins can perform any administrative action
  if (user.role === "VCLOUD_ADMIN") {
    return true;
  }

  // If caller is the manager of the owner (and not the owner themselves): FORBIDDEN
  if (isReportVm && user.id !== vm.ownerId && user.id !== vm.backupOwnerId) {
    return false;
  }

  const isOwner = user.id === vm.ownerId;
  const isBackupOwner = user.id === vm.backupOwnerId;

  switch (action) {
    case "RELEASE":
    case "REUSE":
      // Owner only
      return isOwner;
    case "EXTEND":
    case "TICKET":
      // Owner or backup owner
      return isOwner || isBackupOwner;
    default:
      return false;
  }
}

export function canRevealCredentials(user: SecurityUser, vm: VmContext): boolean {
  if (!isActive(user)) return false;
  if (user.role === "VCLOUD_ADMIN") return true;
  return user.id === vm.ownerId || user.id === vm.backupOwnerId;
}

export function canWorkQueue(user: SecurityUser): boolean {
  return isActive(user) && user.role === "VCLOUD_ADMIN";
}

export function canManageAdmin(user: SecurityUser): boolean {
  return isActive(user) && user.role === "VCLOUD_ADMIN";
}

export function canApproveRequest(
  user: SecurityUser,
  context: { isReport?: boolean; isExternalBu?: boolean; isEscalatedOverride?: boolean }
): boolean {
  if (!isActive(user)) return false;

  if (user.role === "VCLOUD_ADMIN") {
    // Admin can approve on manager's behalf after urgent follow-up
    return Boolean(context.isEscalatedOverride);
  }

  if (user.role === "OWNER_BU_MANAGER") {
    return Boolean(context.isReport || context.isExternalBu);
  }

  if (user.role === "MANAGER") {
    return Boolean(context.isReport);
  }

  return false;
}
