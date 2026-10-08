import { describe, expect, it } from "vitest";
import { isValidTransition, validateTransition } from "./transition";

describe("Workflow Status Transitions", () => {
  describe("Request Status Transitions", () => {
    it("allows valid forward transitions for requests", () => {
      expect(isValidTransition("REQUEST", "SUBMITTED", "PENDING_APPROVAL")).toBe(true);
      expect(isValidTransition("REQUEST", "SUBMITTED", "APPROVED")).toBe(true);
      expect(isValidTransition("REQUEST", "PENDING_APPROVAL", "APPROVED")).toBe(true);
      expect(isValidTransition("REQUEST", "APPROVED", "CREATION_IN_PROGRESS")).toBe(true);
      expect(isValidTransition("REQUEST", "CREATION_IN_PROGRESS", "COMPLETED")).toBe(true);
    });

    it("allows cancellation and rejection paths", () => {
      expect(isValidTransition("REQUEST", "SUBMITTED", "CANCELLED")).toBe(true);
      expect(isValidTransition("REQUEST", "PENDING_APPROVAL", "CANCELLED")).toBe(true);
      expect(isValidTransition("REQUEST", "PENDING_APPROVAL", "REJECTED")).toBe(true);
      expect(isValidTransition("REQUEST", "PENDING_APPROVAL", "RETURNED")).toBe(true);
      expect(isValidTransition("REQUEST", "RETURNED", "SUBMITTED")).toBe(true);
      expect(isValidTransition("REQUEST", "APPROVED", "REJECTED")).toBe(true);
      expect(isValidTransition("REQUEST", "CREATION_IN_PROGRESS", "REJECTED")).toBe(true);
    });

    it("blocks invalid transitions for requests", () => {
      // Cannot jump from SUBMITTED directly to COMPLETED
      expect(isValidTransition("REQUEST", "SUBMITTED", "COMPLETED")).toBe(false);
      // Cannot transition out of COMPLETED
      expect(isValidTransition("REQUEST", "COMPLETED", "APPROVED")).toBe(false);
      // Cannot transition out of CANCELLED
      expect(isValidTransition("REQUEST", "CANCELLED", "SUBMITTED")).toBe(false);

      const invalid = validateTransition("REQUEST", "COMPLETED", "APPROVED");
      expect(invalid.ok).toBe(false);
      if (!invalid.ok) {
        expect(invalid.error.code).toBe("INVALID_TRANSITION");
      }
    });
  });

  describe("VM Status Transitions", () => {
    it("allows valid VM lifecycle transitions", () => {
      expect(isValidTransition("VM", "ACTIVE", "EXPIRED")).toBe(true);
      expect(isValidTransition("VM", "ACTIVE", "EXTENSION_PENDING")).toBe(true);
      expect(isValidTransition("VM", "EXPIRED", "EXTENSION_PENDING")).toBe(true);
      expect(isValidTransition("VM", "EXTENSION_PENDING", "ACTIVE")).toBe(true);
      expect(isValidTransition("VM", "EXTENSION_PENDING", "EXPIRED")).toBe(true);
      expect(isValidTransition("VM", "ACTIVE", "PENDING_DELETION")).toBe(true);
      expect(isValidTransition("VM", "EXPIRED", "PENDING_DELETION")).toBe(true);
      expect(isValidTransition("VM", "PENDING_DELETION", "DELETED")).toBe(true);
    });

    it("blocks invalid VM transitions", () => {
      // Cannot jump from ACTIVE to DELETED directly (must go through PENDING_DELETION)
      expect(isValidTransition("VM", "ACTIVE", "DELETED")).toBe(false);
      // Cannot revive from DELETED
      expect(isValidTransition("VM", "DELETED", "ACTIVE")).toBe(false);
    });
  });

  describe("Ticket Status Transitions", () => {
    it("allows valid ticket transitions", () => {
      expect(isValidTransition("TICKET", "OPEN", "IN_PROGRESS")).toBe(true);
      expect(isValidTransition("TICKET", "IN_PROGRESS", "RESOLVED")).toBe(true);
      expect(isValidTransition("TICKET", "OPEN", "CANCELLED")).toBe(true);
      expect(isValidTransition("TICKET", "OPEN", "REJECTED")).toBe(true);
      expect(isValidTransition("TICKET", "IN_PROGRESS", "REJECTED")).toBe(true);
    });

    it("blocks invalid ticket transitions", () => {
      expect(isValidTransition("TICKET", "RESOLVED", "OPEN")).toBe(false);
      expect(isValidTransition("TICKET", "CANCELLED", "RESOLVED")).toBe(false);
    });
  });
});
