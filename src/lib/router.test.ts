import { describe, expect, it } from "vitest";
import {
  getPostAuthRedirect,
  isAdminPath,
  isAuthPath,
  isPortalPath,
  isPublicPath,
  routes,
} from "./router";

describe("Router Registry", () => {
  it("builds consistent route paths", () => {
    expect(routes.auth.login).toBe("/login");
    expect(routes.portal.dashboard).toBe("/dashboard");
    expect(routes.portal.request("req-123")).toBe("/requests/req-123");
    expect(routes.portal.requestEdit("req-123")).toBe("/requests/req-123/edit");
    expect(routes.portal.vm("vm-456")).toBe("/vms/vm-456");
    expect(routes.portal.ticket("tk-789")).toBe("/tickets/tk-789");
    expect(routes.admin.queueItem("create", "item-1")).toBe("/admin/queue/create/item-1");
  });

  it("correctly identifies path categories", () => {
    expect(isPublicPath("/api/health")).toBe(true);
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/register")).toBe(true);
    expect(isPublicPath("/requests")).toBe(false);

    expect(isAuthPath("/login")).toBe(true);
    expect(isAuthPath("/reset-password")).toBe(true);
    expect(isAuthPath("/dashboard")).toBe(false);

    expect(isPortalPath("/dashboard")).toBe(true);
    expect(isPortalPath("/requests/req-1")).toBe(true);
    expect(isPortalPath("/login")).toBe(false);

    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/queue")).toBe(true);
    expect(isAdminPath("/admin/users/123")).toBe(true);
    expect(isAdminPath("/dashboard")).toBe(false);
  });

  it("routes users correctly after authentication based on status and role", () => {
    // PENDING_ACTIVATION goes to /awaiting-activation
    expect(
      getPostAuthRedirect({ status: "PENDING_ACTIVATION", role: "END_USER" })
    ).toBe("/awaiting-activation");

    // DEACTIVATED is denied and sent to /login with error
    expect(
      getPostAuthRedirect({ status: "DEACTIVATED", role: "END_USER" })
    ).toBe("/login?error=deactivated");

    // INVITED goes to /set-password
    expect(
      getPostAuthRedirect({ status: "INVITED", role: "END_USER" })
    ).toBe("/set-password");

    // ACTIVE users go to /dashboard
    expect(
      getPostAuthRedirect({ status: "ACTIVE", role: "END_USER" })
    ).toBe("/dashboard");
    expect(
      getPostAuthRedirect({ status: "ACTIVE", role: "MANAGER" })
    ).toBe("/dashboard");
    expect(
      getPostAuthRedirect({ status: "ACTIVE", role: "OWNER_BU_MANAGER" })
    ).toBe("/dashboard");
    expect(
      getPostAuthRedirect({ status: "ACTIVE", role: "VCLOUD_ADMIN" })
    ).toBe("/admin");
  });
});
