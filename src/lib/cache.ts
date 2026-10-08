import { revalidatePath, revalidateTag } from "next/cache";
import { routes } from "./router";

/**
 * Central Caching and Revalidation Registry
 * Provides canonical cache keys and revalidation triggers
 * so that no action or service hardcodes paths or tags.
 */

export const CACHE_TAGS = {
  requests: "requests",
  request: (id: string) => `request:${id}`,
  vms: "vms",
  vm: (id: string) => `vm:${id}`,
  vapps: "vapps",
  vapp: (id: string) => `vapp:${id}`,
  tickets: "tickets",
  ticket: (id: string) => `ticket:${id}`,
  approvals: "approvals",
  queue: "queue",
  users: "users",
  user: (id: string) => `user:${id}`,
  settings: "settings",
  businessUnits: "business-units",
} as const;

export type EntityType =
  | "REQUEST"
  | "VM"
  | "VAPP"
  | "TICKET"
  | "APPROVAL"
  | "USER"
  | "QUEUE"
  | "SETTING";

export function getRevalidationPathsForEntity(
  entity: EntityType,
  entityId?: string
): string[] {
  switch (entity) {
    case "REQUEST":
      return [
        routes.portal.requests,
        routes.portal.dashboard,
        routes.portal.approvals,
        routes.admin.queue,
        ...(entityId ? [routes.portal.request(entityId)] : []),
      ];
    case "VM":
      return [
        routes.portal.vms,
        routes.portal.dashboard,
        routes.portal.vapps,
        ...(entityId ? [routes.portal.vm(entityId)] : []),
      ];
    case "VAPP":
      return [
        routes.portal.vapps,
        routes.portal.vms,
        ...(entityId ? [routes.portal.vapp(entityId)] : []),
      ];
    case "TICKET":
      return [
        routes.portal.tickets,
        routes.admin.queue,
        ...(entityId ? [routes.portal.ticket(entityId)] : []),
      ];
    case "APPROVAL":
      return [
        routes.portal.approvals,
        routes.portal.dashboard,
        routes.admin.approvals,
        routes.admin.queue,
      ];
    case "USER":
      return [
        routes.admin.users,
        routes.portal.team,
        ...(entityId ? [routes.admin.user(entityId)] : []),
      ];
    case "QUEUE":
      return [routes.admin.queue, routes.admin.overview, routes.portal.dashboard];
    case "SETTING":
      return [routes.admin.settings];
    default:
      return [routes.portal.dashboard];
  }
}

/**
 * Triggers revalidation across all relevant UI paths for a modified entity.
 * Safe to call from server actions or route handlers.
 */
export function revalidateEntity(entity: EntityType, entityId?: string) {
  try {
    const paths = getRevalidationPathsForEntity(entity, entityId);
    for (const path of paths) {
      revalidatePath(path);
    }
  } catch {
    // Graceful fallback if called outside Next.js request context (e.g. CLI scripts or tests)
  }
}

/**
 * Revalidates a cache tag if within a server context
 */
export function revalidateCacheTag(tag: string) {
  try {
    revalidateTag(tag, "default");
  } catch {
    // Graceful fallback if outside server context
  }
}
