# API contract

Every operation the portal exposes. In Phase 1 each one is a server action in `modules/<feature>/actions.ts` calling `service.ts`; any of them can later be exposed as a REST route (`/api/v1/...`) without changing the service.

Conventions:
- Input is validated with the Zod schema in `modules/<feature>/schema.ts`.
- Result: `{ ok: true, data } | { ok: false, error: { code, message } }`. Codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_INPUT`, `INVALID_TRANSITION`, `CONFLICT`.
- Every operation requires an `ACTIVE` caller unless marked public. Permissions follow the matrix in `docs/domain.md`.
- Every status change goes through `transition()` and writes `audit_log`.
- JSON fields are camelCase. Passwords are never returned except by `revealVmCredentials`.

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
| `importUsersCsv` | VCLOUD_ADMIN | CSV file | Creates `INVITED` users; per-row errors; imports nothing if any row fails |
| `setRole` | VCLOUD_ADMIN | userId, role | `CONFLICT` if it would remove the last admin |
| `changeManagerOrBu` | VCLOUD_ADMIN | userId, buId, managerId | Re-routes the user's pending approvals to the new approver |
| `deactivateUser` | VCLOUD_ADMIN | userId, vmTransfers[{vmId, newOwnerId}], reason | `CONFLICT` until every owned VM and vApp has a new owner. Cancels open requests and tickets, re-routes approvals they hold, revokes sessions |
| `reactivateUser` | VCLOUD_ADMIN | userId, buId, managerId | `DEACTIVATED` → `ACTIVE` |
| `listUsers` (query) | VCLOUD_ADMIN all; managers own reports | filters: status, buId, role, search (name, employee ID, email) | Paged list |
| `listActivationQueue` (query) | VCLOUD_ADMIN | — | Pending users: not-my-report, manager not listed, no action in 3 business days |

## businessUnits / settings

| Operation | Who | Input | Result |
|---|---|---|---|
| `createBusinessUnit` / `updateBusinessUnit` | VCLOUD_ADMIN | name, isOwnerBu, leadUserId | Only one owner BU |
| `updateSetting` | VCLOUD_ADMIN | key, value | Validated per key; `default_vm_password` stored encrypted; audited |

## requests

| Operation | Who | Input | Result / transition |
|---|---|---|---|
| `createVmRequest` | Active user; `onBehalfOfId` only for the target's manager | request form (`docs/domain.md`), incl. vmCount, vappId?, customUsername?, customPassword? | CREATE request `SUBMITTED`, then routed: `PENDING_APPROVAL` or auto `APPROVED` |
| `updateRequest` | Requester | request form | Only when `RETURNED` → `SUBMITTED` → routed again |
| `cancelRequest` | Requester | requestId, reason | `SUBMITTED` \| `PENDING_APPROVAL` → `CANCELLED` |
| `sendUrgentFollowUp` | Requester (or the manager who requested on behalf) | requestId, priority (`HIGH` \| `URGENT`), comment | Only on `PENDING_APPROVAL`. Sets the escalation flag; item appears in the admin queue as "Escalated"; current approver notified |
| `addRequestComment` | Requester, current approver, VCLOUD_ADMIN | requestId, text | Timeline entry; notifies the other side |
| `getRequest` (query) | Requester, its approvers, OWNER_BU_MANAGER, VCLOUD_ADMIN | requestId | Request + approvals + timeline (custom password only for admins) |
| `listMyRequests` (query) | Active user | filters | Own requests and ones made on their behalf |

## approvals

| Operation | Who | Input | Result / transition |
|---|---|---|---|
| `decideApproval` | The step's current approver (direct, delegate or fallback) | requestId, decision (`APPROVE` \| `APPROVE_WITH_EXISTING_VM` \| `REJECT` \| `RETURN`), comment, confirmations {businessNeed, sizeJustified} (both required for either approve), offeredVmId (`APPROVE_WITH_EXISTING_VM`; vmCount must be 1), category (required for REJECT and RETURN), fieldsToUpdate + resubmitBy? (RETURN) | Approve → next step or `APPROVED` (fulfilment `NEW_VM` or `EXISTING_VM`); optional approvedDurationDays ≤ requested; REJECT → `REJECTED` + rejection email; RETURN → `RETURNED` ("Needs correction") |
| `listReuseCandidates` (query) | The request's current approver | requestId | Similar VMs: marked available for reuse in the approver's scope, plus the approver's own (rule in `docs/domain.md`) |
| `reassignApproval` | VCLOUD_ADMIN | approvalId, approverId, reason | Approval re-routed (`routed_via = REASSIGNED`) |
| `listMyApprovals` (query) | MANAGER, OWNER_BU_MANAGER, VCLOUD_ADMIN | — | Pending approvals assigned to the caller |

## queue (vCloud admins)

All VM work is done by hand in the vCloud dashboard; these operations record it. Queue items are requests (CREATE, EXTEND, DELETE), power-off tasks (Phase 2), urgent follow-ups and support tickets.

| Operation | Who | Input | Result / transition |
|---|---|---|---|
| `listQueue` (query) | VCLOUD_ADMIN | filters: kind, assignee (me / unassigned / anyone), priority | Items with kind (Create, Handover, Extend, Power off, Delete, Escalated, Ticket), priority, assignee |
| `assignToMe` | VCLOUD_ADMIN | itemType, itemId | Sets assignee to caller; `CONFLICT` if someone else holds it |
| `takeOver` | VCLOUD_ADMIN | itemType, itemId, reason | Reassigns to caller; previous assignee notified; audited |
| `approveOnBehalf` | VCLOUD_ADMIN | requestId, reason | Escalated request: `PENDING_APPROVAL` → `APPROVED` (`routed_via = VCLOUD_OVERRIDE`); manager and requester notified |
| `declineFollowUp` | VCLOUD_ADMIN | requestId, comment | Clears the escalation flag; requester notified; stays with the manager |
| `startWork` | VCLOUD_ADMIN | requestId | `APPROVED` → `CREATION_IN_PROGRESS` ("In progress") |
| `rejectRequest` | VCLOUD_ADMIN | requestId, comment | `APPROVED` \| `CREATION_IN_PROGRESS` → `REJECTED` (cannot be done) |
| `completeCreation` | VCLOUD_ADMIN | requestId, vms[{vappId \| newVapp{name, vcloudRef?}, ip, osVersion, vcpu, ramGb, storageGb, createdOn, username, password, vcloudRef?, hostname?}], completionComment (required if fewer VMs than requested) | `COMPLETED`; creates VMs `ACTIVE`, expiresOn = createdOn + approvedDurationDays; "VM ready" email with IP + username |
| `completeHandover` | VCLOUD_ADMIN | requestId, username, password, handedOverOn | Fulfilment `EXISTING_VM`: owner → requester, expiresOn = handedOverOn + approvedDurationDays; `COMPLETED`; previous owner notified |
| `completeExtension` (Phase 2) | VCLOUD_ADMIN | requestId, poweredOn? (if the VM was expired) | EXTEND `COMPLETED`; new expiresOn = old expiresOn + extensionDays, cycle + 1; VM `ACTIVE` |
| `completePowerOff` (Phase 2) | VCLOUD_ADMIN | vmId, poweredOffOn | Power-off task closed; records powered_off_at |
| `completeDeletion` (Phase 2) | VCLOUD_ADMIN | requestId, deletedOn | DELETE `COMPLETED`; VM `DELETED`; owner, backup owner and manager notified |

## vms and vApps

| Operation | Who | Input | Result |
|---|---|---|---|
| `listVms` (query) | Scoped per permission matrix | search (IP, owner name, employee ID, email), filters: vappId, status, buId, environment, availableForReuse, expiring within N days | Paged list |
| `getVm` (query) | Owner, backup owner, owner's manager (read-only), OWNER_BU_MANAGER, VCLOUD_ADMIN | vmId | VM + vApp + history (no password) |
| `revealVmCredentials` | Owner, backup owner, VCLOUD_ADMIN | vmId | Username + password; audited |
| `listVapps` (query) | Scoped like `listVms` | search, buId | vApps with VM counts |
| `updateVmDetails` | VCLOUD_ADMIN | vmId, details, reason (required if dates change) | Audited |
| `transferVmOwner` | VCLOUD_ADMIN | vmId, newOwnerId, reason | Audited; notifies both owners |
| `setAvailableForReuse` | Owner, VCLOUD_ADMIN | vmId, available | Flags the VM for reuse candidates |
| `importVmsCsv` | VCLOUD_ADMIN | CSV file (vApp, IP, owner email, OS, specs, creation date, expiry date) | Creates vApps and `ACTIVE` VMs; unknown owners become `INVITED` users; all-or-nothing with per-row errors |
| `requestExtension` (Phase 2) | Owner, backup owner | vmId, extensionDays (≤ extension_max_days), reason | EXTEND request, routed like a new request; VM `EXTENSION_PENDING`, notices paused |
| `releaseVm` (Phase 2) | Owner | vmId, confirmIp | DELETE request `APPROVED` with ETA; VM `PENDING_DELETION` |

## tickets (support)

| Operation | Who | Input | Result |
|---|---|---|---|
| `createTicket` | Owner, backup owner | type (`REVERT_SNAPSHOT`), vmId, snapshotRef, priority, comment, confirmDataLoss | `OPEN`; appears in the admin queue |
| `cancelTicket` | Requester | ticketId | `OPEN` → `CANCELLED` |
| `startTicket` | VCLOUD_ADMIN | ticketId | `OPEN` → `IN_PROGRESS` (assigns to caller if unassigned) |
| `resolveTicket` | VCLOUD_ADMIN | ticketId, resolutionComment | → `RESOLVED`; requester notified |
| `rejectTicket` | VCLOUD_ADMIN | ticketId, comment | → `REJECTED`; requester notified |
| `listMyTickets` (query) | Active user | filters | Own tickets |

## Route handlers (non-action HTTP)

| Route | Who | Returns |
|---|---|---|
| `GET /api/health` | Public | `{ status: "ok" }` or 503 `{ status: "db_unavailable" }` |
| `GET /api/auth/*`, `POST /api/auth/*` | Public | Better Auth handler |
| `GET /api/v1/exports/vms.csv` | Same scope as `listVms` | CSV of the caller's visible VMs (no credentials) |
