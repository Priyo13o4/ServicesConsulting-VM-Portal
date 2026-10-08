import { describe, expect, it } from "vitest";
import {
  canActOnVm,
  canApproveRequest,
  canRequestForTeam,
  canRevealCredentials,
  canSeeVm,
  canWorkQueue,
  type SecurityUser,
  type VmContext,
} from "./security";

describe("Security & Permission Matrix", () => {
  const activeEndUser: SecurityUser = {
    id: "u-1",
    role: "END_USER",
    status: "ACTIVE",
    managerId: "mgr-1",
    buId: "bu-1",
  };

  const deactivatedUser: SecurityUser = {
    ...activeEndUser,
    status: "DEACTIVATED",
  };

  const activeManager: SecurityUser = {
    id: "mgr-1",
    role: "MANAGER",
    status: "ACTIVE",
    buId: "bu-1",
  };

  const activeOwnerBuManager: SecurityUser = {
    id: "obm-1",
    role: "OWNER_BU_MANAGER",
    status: "ACTIVE",
    buId: "bu-1",
  };

  const activeAdmin: SecurityUser = {
    id: "admin-1",
    role: "VCLOUD_ADMIN",
    status: "ACTIVE",
    buId: "bu-2",
  };

  const vmOwnedByUser: VmContext = {
    id: "vm-1",
    ownerId: "u-1",
    backupOwnerId: "u-2",
    buId: "bu-1",
  };

  it("checks request for team permissions", () => {
    expect(canRequestForTeam(activeEndUser, true)).toBe(false);
    expect(canRequestForTeam(activeManager, true)).toBe(true);
    expect(canRequestForTeam(activeManager, false)).toBe(false);
    expect(canRequestForTeam(activeAdmin, true)).toBe(false);
  });

  it("enforces VM visibility rules per role", () => {
    // End user can see own VM or where they are backup owner
    expect(canSeeVm(activeEndUser, vmOwnedByUser)).toBe(true);
    expect(canSeeVm({ ...activeEndUser, id: "u-2" }, vmOwnedByUser)).toBe(true);
    expect(canSeeVm({ ...activeEndUser, id: "u-99" }, vmOwnedByUser)).toBe(false);

    // Manager can see report's VM
    expect(canSeeVm(activeManager, vmOwnedByUser, true)).toBe(true);
    // Manager cannot see stranger's VM
    expect(canSeeVm(activeManager, vmOwnedByUser, false)).toBe(false);

    // Owner BU Manager and Admin can see all VMs
    expect(canSeeVm(activeOwnerBuManager, vmOwnedByUser, false)).toBe(true);
    expect(canSeeVm(activeAdmin, vmOwnedByUser, false)).toBe(true);
  });

  it("strictly prohibits managers from acting on a report's VM", () => {
    // Rule: "A manager can never release, delete, extend or hand over a report's VM."
    expect(canActOnVm(activeManager, vmOwnedByUser, "EXTEND", true)).toBe(false);
    expect(canActOnVm(activeManager, vmOwnedByUser, "RELEASE", true)).toBe(false);
    expect(canActOnVm(activeManager, vmOwnedByUser, "REUSE", true)).toBe(false);

    // Owner can extend, release, and mark for reuse
    expect(canActOnVm(activeEndUser, vmOwnedByUser, "EXTEND")).toBe(true);
    expect(canActOnVm(activeEndUser, vmOwnedByUser, "RELEASE")).toBe(true);
    expect(canActOnVm(activeEndUser, vmOwnedByUser, "REUSE")).toBe(true);

    // Backup owner can extend and raise ticket, but CANNOT release or mark for reuse
    const backupUser = { ...activeEndUser, id: "u-2" };
    expect(canActOnVm(backupUser, vmOwnedByUser, "EXTEND")).toBe(true);
    expect(canActOnVm(backupUser, vmOwnedByUser, "TICKET")).toBe(true);
    expect(canActOnVm(backupUser, vmOwnedByUser, "RELEASE")).toBe(false);
    expect(canActOnVm(backupUser, vmOwnedByUser, "REUSE")).toBe(false);

    // Admin can act on any VM
    expect(canActOnVm(activeAdmin, vmOwnedByUser, "EXTEND")).toBe(true);
    expect(canActOnVm(activeAdmin, vmOwnedByUser, "RELEASE")).toBe(true);
  });

  it("checks credential reveal permissions", () => {
    // Owner, backup owner, and admin can reveal
    expect(canRevealCredentials(activeEndUser, vmOwnedByUser)).toBe(true);
    expect(canRevealCredentials({ ...activeEndUser, id: "u-2" }, vmOwnedByUser)).toBe(true);
    expect(canRevealCredentials(activeAdmin, vmOwnedByUser)).toBe(true);

    // Manager cannot reveal report's VM credentials
    expect(canRevealCredentials(activeManager, vmOwnedByUser)).toBe(false);
    // Stranger cannot reveal
    expect(canRevealCredentials({ ...activeEndUser, id: "u-99" }, vmOwnedByUser)).toBe(false);
  });

  it("only allows VCLOUD_ADMIN to work the queue", () => {
    expect(canWorkQueue(activeAdmin)).toBe(true);
    expect(canWorkQueue(activeEndUser)).toBe(false);
    expect(canWorkQueue(activeManager)).toBe(false);
    expect(canWorkQueue(activeOwnerBuManager)).toBe(false);
  });

  it("denies all operations if user is deactivated", () => {
    expect(canSeeVm(deactivatedUser, vmOwnedByUser)).toBe(false);
    expect(canActOnVm(deactivatedUser, vmOwnedByUser, "EXTEND")).toBe(false);
    expect(canRevealCredentials(deactivatedUser, vmOwnedByUser)).toBe(false);
    expect(canApproveRequest(deactivatedUser, { isReport: true })).toBe(false);
  });
});
