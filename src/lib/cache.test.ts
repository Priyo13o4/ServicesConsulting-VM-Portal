import { describe, expect, it } from "vitest";
import { CACHE_TAGS, getRevalidationPathsForEntity } from "./cache";

describe("Cache & Revalidation Registry", () => {
  it("defines standard entity tags", () => {
    expect(CACHE_TAGS.requests).toBe("requests");
    expect(CACHE_TAGS.request("r-1")).toBe("request:r-1");
    expect(CACHE_TAGS.vms).toBe("vms");
    expect(CACHE_TAGS.vm("vm-1")).toBe("vm:vm-1");
    expect(CACHE_TAGS.queue).toBe("queue");
    expect(CACHE_TAGS.approvals).toBe("approvals");
    expect(CACHE_TAGS.tickets).toBe("tickets");
    expect(CACHE_TAGS.settings).toBe("settings");
  });

  it("returns correct paths to revalidate for each entity", () => {
    const requestPaths = getRevalidationPathsForEntity("REQUEST", "req-101");
    expect(requestPaths).toContain("/requests");
    expect(requestPaths).toContain("/requests/req-101");
    expect(requestPaths).toContain("/dashboard");
    expect(requestPaths).toContain("/approvals");
    expect(requestPaths).toContain("/admin/queue");

    const vmPaths = getRevalidationPathsForEntity("VM", "vm-202");
    expect(vmPaths).toContain("/vms");
    expect(vmPaths).toContain("/vms/vm-202");
    expect(vmPaths).toContain("/dashboard");

    const ticketPaths = getRevalidationPathsForEntity("TICKET", "tk-303");
    expect(ticketPaths).toContain("/tickets");
    expect(ticketPaths).toContain("/tickets/tk-303");
    expect(ticketPaths).toContain("/admin/queue");
  });
});
