# API contract

Every operation the portal exposes. In Phase 1 each one is a server action in `modules/<feature>/actions.ts` calling `service.ts`; any of them can later be exposed as a REST route (`/api/v1/...`) without changing the service.

Conventions:
- Input is validated with the Zod schema in `modules/<feature>/schema.ts`.
- Result: `{ ok: true, data } | { ok: false, error: { code, message } }`. Codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_INPUT`, `INVALID_TRANSITION`, `CONFLICT`.
- "Active" = caller's account status is `ACTIVE`. Every operation below requires an active caller unless marked public.
- Every status change goes through `transition()` and writes `audit_log`.
- JSON fields are camelCase.

## Auth (Better Auth endpoints at `/api/auth/*`, handled by the library)

| Operation | Who | Notes |
|---|---|---|
| Sign up (email + password) | Public | Hook rejects non-company domains (`ALLOWED_EMAIL_DOMAINS`), duplicate email or employee ID. Extra fields: empId, name, buId, managerId. Creates `PENDING_ACTIVATION`. |
| Verify email | Public | Link valid 24h. |
| Sign in / sign out | Public | Rate-limited. Status gate applied after sign-in (see `docs/screens.md`). |
| Request password reset / reset password | Public | Single-use link, 1h. Revokes other sessions. |
| Set password (invite) | Public | Reuses the reset flow; link valid 72h. Moves `INVITED` → `ACTIVE`. |

## users

| Operation | Who | Input | Result / effect |
|---|---|---|---|
| `confirmMember` | MANAGER, OWNER_BU_MANAGER (own reports), VCLOUD_ADMIN | userId, decision (`CONFIRM` \| `NOT_MY_REPORT`) | CONFIRM → `ACTIVE`; NOT_MY_REPORT → admin activation queue |
| `activateUser` | VCLOUD_ADMIN | userId, buId, managerId | `PENDING_ACTIVATION` → `ACTIVE` |
| `inviteUser` | VCLOUD_ADMIN | email, name, empId, buId, managerId, role | Creates `INVITED`, sends set-password email |
| `resendInvite` | VCLOUD_ADMIN | userId | New set-password email |
| `importUsersCsv` | VCLOUD_ADMIN | CSV file | Creates `INVITED` users; returns per-row errors, imports nothing if any row fails |
| `setRole` | VCLOUD_ADMIN | userId, role | `CONFLICT` if it would remove the last admin |
| `changeManagerOrBu` | VCLOUD_ADMIN | userId, buId, managerId | Re-routes the user's pending approvals to the new approver |
| `deactivateUser` | VCLOUD_ADMIN | userId, vmTransfers[{vmId, newOwnerId}], reason | Fails `CONFLICT` until every owned VM has a new owner. Cancels open requests, re-routes approvals they hold, revokes sessions |
| `reactivateUser` | VCLOUD_ADMIN | userId, buId, managerId | `DEACTIVATED` → `ACTIVE` |
| `listUsers` (query) | VCLOUD_ADMIN all; managers own reports | filters: status, buId, role | Paged list |
| `listActivationQueue` (query) | VCLOUD_ADMIN | — | Pending users: not-my-report, manager not listed, no action in 3 business days |

## businessUnits / settings

| Operation | Who | Input | Result |
|---|---|---|---|
| `createBusinessUnit` / `updateBusinessUnit` | VCLOUD_ADMIN | name, isOwnerBu | Only one owner BU |
| `updateSetting` | VCLOUD_ADMIN | key, value | Validated per key; audited |

## requests

| Operation | Who | Input | Result / transition |
|---|---|---|---|
| `createVmRequest` | Active user; `onBehalfOfId` only for the target's manager | request form (`docs/domain.md`) | `SUBMITTED`, then routed: `PENDING_APPROVAL` or auto `APPROVED` |
| `updateRequest` | Requester | request form | Only when `RETURNED` → `SUBMITTED` → routed again |
| `cancelRequest` | Requester | requestId, reason | `SUBMITTED` \| `PENDING_APPROVAL` → `CANCELLED` |
| `addRequestComment` | Requester, current approver, VCLOUD_ADMIN | requestId, text | Timeline entry; notifies the other side |
| `getRequest` (query) | Requester, its approvers, OWNER_BU_MANAGER, VCLOUD_ADMIN | requestId | Request + approvals + timeline |
| `listMyRequests` (query) | Active user | filters | Own requests (and ones made on their behalf) |

## approvals

| Operation | Who | Input | Result / transition |
|---|---|---|---|
| `decideApproval` | The step's current approver (direct, delegate or fallback) | requestId, decision (`APPROVE` \| `REJECT` \| `RETURN`), approvedDurationDays (≤ requested), comment (required for REJECT/RETURN), confirmations {businessNeed, sizeJustified} (both required for APPROVE) | APPROVE → next step or `APPROVED`; REJECT → `REJECTED`; RETURN → `RETURNED` |
| `reassignApproval` | VCLOUD_ADMIN | approvalId, approverId, reason | Approval re-routed (`routed_via = REASSIGNED`) |
| `listMyApprovals` (query) | MANAGER, OWNER_BU_MANAGER, VCLOUD_ADMIN | — | Pending approvals assigned to the caller |

## provisioning (vCloud admin queue)

| Operation | Who | Input | Result / transition |
|---|---|---|---|
| `assignRequest` | VCLOUD_ADMIN | requestId, engineerId | Assignee set |
| `startProvisioning` | VCLOUD_ADMIN | requestId | `APPROVED` → `CREATION_IN_PROGRESS` |
| `rejectTechnically` | VCLOUD_ADMIN | requestId, reason | `APPROVED` → `REJECTED` |
| `markProvisioningFailed` | VCLOUD_ADMIN | requestId, error | `CREATION_IN_PROGRESS` → `PROVISIONING_FAILED` |
| `retryProvisioning` | VCLOUD_ADMIN | requestId | `PROVISIONING_FAILED` → `CREATION_IN_PROGRESS` |
| `completeProvisioning` | VCLOUD_ADMIN | requestId, vmName, hostname, ip, environment, cloudPlatform, osVersion, vcpu, ramGb, storageGb, createdOn, vcloudRef?, accessNote | `COMPLETED`; creates VM `ACTIVE` with expiresOn = createdOn + approvedDurationDays |
| `listQueue` (query) | VCLOUD_ADMIN | filters | `APPROVED`, `CREATION_IN_PROGRESS`, `PROVISIONING_FAILED` requests |

## vms

| Operation | Who | Input | Result |
|---|---|---|---|
| `listVms` (query) | Scoped per permission matrix | filters: status, buId, owner, expiring within N days | Paged list |
| `getVm` (query) | Owner, backup owner, owner's manager, OWNER_BU_MANAGER, VCLOUD_ADMIN | vmId | VM + history |
| `updateVmDetails` | VCLOUD_ADMIN | vmId, details, reason (required if expiresOn changes) | Audited |
| `transferVmOwner` | VCLOUD_ADMIN | vmId, newOwnerId, reason | Audited; notifies both owners |
| `importVmsCsv` | VCLOUD_ADMIN | CSV file | Creates `ACTIVE` VMs; unknown owners become `INVITED` users; all-or-nothing with per-row errors |
| `requestExtension` (Phase 2) | Owner, owner's manager | vmId, extensionDays, reason | EXTEND request; VM `EXTENSION_PENDING`, notices paused |
| `releaseVm` (Phase 2) | Owner, owner's manager | vmId, confirmHostname | DELETE request with ETA; VM `PENDING_DELETION` |
| `completeDeletion` (Phase 2) | VCLOUD_ADMIN | vmId, deletedOn | VM `DELETED` |
| `completePowerOff` (Phase 2) | VCLOUD_ADMIN | vmId | Power-off task closed |

## Route handlers (non-action HTTP)

| Route | Who | Returns |
|---|---|---|
| `GET /api/health` | Public | `{ status: "ok" }` or 503 `{ status: "db_unavailable" }` |
| `GET /api/auth/*`, `POST /api/auth/*` | Public | Better Auth handler |
| `GET /api/v1/exports/vms.csv` | Same scope as `listVms` | CSV of the caller's visible VMs |
