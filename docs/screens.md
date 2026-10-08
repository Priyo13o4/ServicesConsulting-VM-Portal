# Screens

Every page, who sees it, and what it does. Pages live in `src/app/`; their UI comes from `modules/<feature>/components/`. Server data is loaded in the page (Server Component); client state, if any, uses the feature's Zustand store.

## Routing after sign-in

| Account status | Goes to |
|---|---|
| `PENDING_ACTIVATION` | `/awaiting-activation` |
| `DEACTIVATED` | Signed out, "Access denied" on `/login` |
| `ACTIVE` | `/dashboard` |

Signed-out users hitting any portal page are redirected to `/login` (optimistic check in `proxy.ts`; real checks in every query and action).

## Auth pages — `src/app/(auth)/`

| Route | Shows | Actions |
|---|---|---|
| `/login` | Email + password | Sign in; links to register and forgot password |
| `/register` | Name, company email, employee ID, password, BU picker, manager picker (filtered by BU), "My manager isn't listed" | Sign up → "check your email" |
| `/verify-email` | Result of the verification link | Continue to login |
| `/forgot-password` | Email field | Send reset link |
| `/reset-password` | New password | Set password |
| `/set-password` | New password (invite link) | Set password → `ACTIVE` |
| `/awaiting-activation` | Who must confirm them, and since when | Sign out |

## Portal pages — `src/app/(portal)/`

| Route | Who | Shows | Actions | Phase |
|---|---|---|---|---|
| `/dashboard` | All | Role-based cards: my VMs expiring soon, my open requests; managers: pending approvals + team confirmations; admins: queue counts | Links into each list | 1 |
| `/requests/new` | All | Request form; profile fields read-only; "on behalf of" for managers | Submit | 1 |
| `/requests` | All | My requests with status | Open one | 1 |
| `/requests/[id]` | Requester, approvers, owner-BU, admin | Details, approval chain, timeline (status changes + comments) | Edit (when `RETURNED`), cancel, comment; approver: decide; admin: queue actions | 1 |
| `/vms` | All (scoped) | VMs with status, expiry, owner; managers toggle Mine / Team; owner-BU and admin see all with BU filter | Open one, CSV export | 1 |
| `/vms/[id]` | Owner, backup owner, manager, owner-BU, admin | Details, expiry, access note, history | Admin: update details, transfer owner. Phase 2: extend, release | 1 |
| `/approvals` | MANAGER, OWNER_BU_MANAGER, VCLOUD_ADMIN | Pending approvals assigned to me | Approve / reject / return (approval screen fields in `docs/domain.md`) | 1 |
| `/team` | MANAGER, OWNER_BU_MANAGER | My reports; pending "confirm team member" requests | Confirm, "not my report" | 1 |
| `/profile` | All | My details (read-only: email, employee ID, BU, manager) | Change password. Phase 2: out-of-office delegate | 1 |

## Admin pages — `src/app/(portal)/admin/` (VCLOUD_ADMIN only)

| Route | Shows | Actions | Phase |
|---|---|---|---|
| `/admin/queue` | Creation queue: `APPROVED`, `CREATION_IN_PROGRESS`, `PROVISIONING_FAILED` | Assign, start, request info, reject, mark failed, retry, complete with VM details | 1 |
| `/admin/users` | Tabs: All users, Activation queue | Invite, import CSV, activate, change role, change manager/BU, deactivate (with VM transfer), reactivate, resend invite | 1 |
| `/admin/approvals` | All pending approvals with age | Reassign (reason required) | 1 |
| `/admin/vms/import` | CSV upload with per-row validation results | Import | 1 |
| `/admin/business-units` | BUs, owner BU flag | Create, edit | 1 |
| `/admin/settings` | All settings keys with current values | Edit | 1 |
| `/admin/audit` | Audit log, filterable by entity, actor, date | — | 1 |
| `/admin/deletions` | Deletion requests with ETA; power-off tasks | Complete deletion, complete power-off | 2 |
| `/reports` | Metrics per role (owner-BU, admin, managers for team) | Export | 3 |
