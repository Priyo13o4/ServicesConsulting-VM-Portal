/**
 * Standard Action and Service Result types as mandated by AGENTS.md Rule 6:
 * { ok: true, data } | { ok: false, error: { code, message } }
 * Codes: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, INVALID_INPUT, INVALID_TRANSITION, CONFLICT
 */

export const ACTION_ERROR_CODES = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_INPUT",
  "INVALID_TRANSITION",
  "CONFLICT",
] as const;

export type ActionErrorCode = (typeof ACTION_ERROR_CODES)[number];

export interface ActionError {
  code: ActionErrorCode;
  message: string;
  details?: unknown;
}

export type Result<T, E extends ActionError = ActionError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E extends ActionError = ActionError>(
  code: ActionErrorCode,
  message: string,
  details?: unknown
): Result<never, E> {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    } as E,
  };
}

export function isOk<T, E extends ActionError>(
  result: Result<T, E>
): result is { ok: true; data: T } {
  return result.ok;
}

export function isErr<T, E extends ActionError>(
  result: Result<T, E>
): result is { ok: false; error: E } {
  return !result.ok;
}

export class ActionException extends Error {
  readonly code: ActionErrorCode;
  readonly details?: unknown;

  constructor(error: ActionError) {
    super(error.message);
    this.name = "ActionException";
    this.code = error.code;
    this.details = error.details;
  }
}

export function unwrap<T, E extends ActionError>(result: Result<T, E>): T {
  if (result.ok) {
    return result.data;
  }
  throw new ActionException(result.error);
}
