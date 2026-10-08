import { err, ok, type Result } from "@/lib/result";

/**
 * Workflow State Transition Engine
 * Mandated by AGENTS.md Rule 2 and docs/domain.md.
 * Every status change goes through transition verification.
 * Direct modification of status columns is prohibited.
 */

export const REQUEST_STATUSES = [
  "SUBMITTED",
  "PENDING_APPROVAL",
  "APPROVED",
  "CREATION_IN_PROGRESS",
  "COMPLETED",
  "RETURNED",
  "REJECTED",
  "TIMED_OUT",
  "CANCELLED",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const VM_STATUSES = [
  "ACTIVE",
  "EXPIRED",
  "EXTENSION_PENDING",
  "PENDING_DELETION",
  "DELETED",
] as const;

export type VmStatus = (typeof VM_STATUSES)[number];

export const TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "REJECTED",
  "CANCELLED",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export type WorkflowEntityType = "REQUEST" | "VM" | "TICKET";

const ALLOWED_REQUEST_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  SUBMITTED: ["PENDING_APPROVAL", "APPROVED", "CANCELLED"],
  PENDING_APPROVAL: ["APPROVED", "RETURNED", "REJECTED", "TIMED_OUT", "CANCELLED"],
  RETURNED: ["SUBMITTED", "CANCELLED"],
  APPROVED: ["CREATION_IN_PROGRESS", "REJECTED"],
  CREATION_IN_PROGRESS: ["COMPLETED", "REJECTED"],
  COMPLETED: [],
  REJECTED: [],
  TIMED_OUT: [],
  CANCELLED: [],
};

const ALLOWED_VM_TRANSITIONS: Record<VmStatus, readonly VmStatus[]> = {
  ACTIVE: ["EXPIRED", "EXTENSION_PENDING", "PENDING_DELETION"],
  EXPIRED: ["EXTENSION_PENDING", "PENDING_DELETION"],
  EXTENSION_PENDING: ["ACTIVE", "EXPIRED"],
  PENDING_DELETION: ["DELETED"],
  DELETED: [],
};

const ALLOWED_TICKET_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "RESOLVED", "REJECTED", "CANCELLED"],
  IN_PROGRESS: ["RESOLVED", "REJECTED"],
  RESOLVED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function isValidTransition(
  entityType: WorkflowEntityType,
  fromStatus: string,
  toStatus: string
): boolean {
  if (fromStatus === toStatus) return true;

  switch (entityType) {
    case "REQUEST": {
      const allowed = ALLOWED_REQUEST_TRANSITIONS[fromStatus as RequestStatus];
      return Boolean(allowed?.includes(toStatus as RequestStatus));
    }
    case "VM": {
      const allowed = ALLOWED_VM_TRANSITIONS[fromStatus as VmStatus];
      return Boolean(allowed?.includes(toStatus as VmStatus));
    }
    case "TICKET": {
      const allowed = ALLOWED_TICKET_TRANSITIONS[fromStatus as TicketStatus];
      return Boolean(allowed?.includes(toStatus as TicketStatus));
    }
    default:
      return false;
  }
}

export function validateTransition(
  entityType: WorkflowEntityType,
  fromStatus: string,
  toStatus: string
): Result<void> {
  if (!isValidTransition(entityType, fromStatus, toStatus)) {
    return err(
      "INVALID_TRANSITION",
      `Invalid transition for ${entityType} from ${fromStatus} to ${toStatus}`
    );
  }
  return ok(undefined);
}
