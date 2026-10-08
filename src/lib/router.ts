/**
 * Central Route Registry
 * Single source of truth for all URL paths across backend and frontend.
 * Prevents hardcoded paths, broken links, and makes refactoring seamless.
 */

export const routes = {
  auth: {
    login: "/login",
    register: "/register",
    verifyEmail: "/verify-email",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
    setPassword: "/set-password",
    awaitingActivation: "/awaiting-activation",
  },
  portal: {
    dashboard: "/dashboard",
    requests: "/requests",
    requestNew: "/requests/new",
    request: (id: string) => `/requests/${id}`,
    requestEdit: (id: string) => `/requests/${id}/edit`,
    vms: "/vms",
    vm: (id: string) => `/vms/${id}`,
    vapps: "/vapps",
    vapp: (id: string) => `/vapps/${id}`,
    tickets: "/tickets",
    ticketNew: "/tickets/new",
    ticket: (id: string) => `/tickets/${id}`,
    approvals: "/approvals",
    approval: (id: string) => `/approvals/${id}`,
    team: "/team",
    notifications: "/notifications",
    profile: "/profile",
    reports: "/reports",
  },
  admin: {
    overview: "/admin",
    queue: "/admin/queue",
    queueItem: (kind: string, id: string) => `/admin/queue/${kind}/${id}`,
    users: "/admin/users",
    user: (id: string) => `/admin/users/${id}`,
    usersImport: "/admin/users/import",
    approvals: "/admin/approvals",
    vmsImport: "/admin/vms/import",
    businessUnits: "/admin/business-units",
    settings: "/admin/settings",
    audit: "/admin/audit",
  },
  api: {
    health: "/api/health",
    auth: "/api/auth",
    exportVmsCsv: "/api/v1/exports/vms.csv",
  },
} as const;

export const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/set-password",
  "/api/health",
  "/api/auth",
] as const;

export function isPublicPath(path: string): boolean {
  if (path === "/" || path === "") return true;
  return PUBLIC_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function isAuthPath(path: string): boolean {
  return (
    path === routes.auth.login ||
    path === routes.auth.register ||
    path === routes.auth.verifyEmail ||
    path === routes.auth.forgotPassword ||
    path === routes.auth.resetPassword ||
    path === routes.auth.setPassword ||
    path === routes.auth.awaitingActivation
  );
}

export function isAdminPath(path: string): boolean {
  return path === routes.admin.overview || path.startsWith("/admin/");
}

export function isPortalPath(path: string): boolean {
  if (isAuthPath(path) || isPublicPath(path)) return false;
  return (
    path.startsWith("/dashboard") ||
    path.startsWith("/requests") ||
    path.startsWith("/vms") ||
    path.startsWith("/vapps") ||
    path.startsWith("/tickets") ||
    path.startsWith("/approvals") ||
    path.startsWith("/team") ||
    path.startsWith("/notifications") ||
    path.startsWith("/profile") ||
    path.startsWith("/reports") ||
    isAdminPath(path)
  );
}

/**
 * Route resolution based on account status and role
 * Implements docs/screens.md and docs/diagrams/3-user-setup-auth.mmd
 */
export function getPostAuthRedirect(user: { status: string; role: string }): string {
  switch (user.status) {
    case "PENDING_ACTIVATION":
      return routes.auth.awaitingActivation;
    case "DEACTIVATED":
      return `${routes.auth.login}?error=deactivated`;
    case "INVITED":
      return routes.auth.setPassword;
    case "ACTIVE":
      if (user.role === "VCLOUD_ADMIN") {
        return routes.admin.overview;
      }
      return routes.portal.dashboard;
    default:
      return routes.auth.login;
  }
}
