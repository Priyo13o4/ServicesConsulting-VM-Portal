import { describe, expect, it } from "vitest";
import { err, isErr, isOk, ok, unwrap } from "./result";

describe("Result", () => {
  it("creates a successful result with data", () => {
    const res = ok({ id: "123", name: "test-vm" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.id).toBe("123");
    }
    expect(isOk(res)).toBe(true);
    expect(isErr(res)).toBe(false);
  });

  it("creates an error result with code and message", () => {
    const res = err("INVALID_TRANSITION", "Cannot move from DRAFT to COMPLETED");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_TRANSITION");
      expect(res.error.message).toBe("Cannot move from DRAFT to COMPLETED");
    }
    expect(isOk(res)).toBe(false);
    expect(isErr(res)).toBe(true);
  });

  it("supports all 6 standard error codes from AGENTS.md", () => {
    const codes = [
      "UNAUTHENTICATED",
      "FORBIDDEN",
      "NOT_FOUND",
      "INVALID_INPUT",
      "INVALID_TRANSITION",
      "CONFLICT",
    ] as const;

    for (const code of codes) {
      const res = err(code, `Error for ${code}`);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe(code);
      }
    }
  });

  it("unwraps ok result and throws for err result", () => {
    const success = ok("payload");
    expect(unwrap(success)).toBe("payload");

    const failure = err("NOT_FOUND", "Resource missing");
    expect(() => unwrap(failure)).toThrow("Resource missing");
  });
});
