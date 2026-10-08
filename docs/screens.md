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
| `/dashboard` | All | Role-based cards: my VMs suspending soon, my open requests and tickets; managers: pending approvals + team confirmations; admins: queue counts (unassigned, mine, escalated) | Links into each list | 1 |
| `/requests/new` | All | Request form (`docs/domain.md`): profile fields read-only, number of VMs, optional existing vApp, optional custom credentials; "on behalf of" for managers | Submit | 1 |
| `/requests` | All | My requests with status | Open one | 1 |
| `/requests/[id]` | Requester, approvers, owner-BU, admin | Details, approval chain, timeline. When `RETURNED`: "Needs correction", the comment, resubmit-by date, fields to update highlighted. Escalation flag if sent | Edit (when `RETURNED`), cancel, comment, **urgent follow-up to vCloud** (when `PENDING_APPROVAL`: priority + comment); approver: decide; admin: queue actions | 1 |
| `/vms` | All (scoped) | VMs with IP, vApp, owner, OS, specs, status, suspension date, reuse badge. Search by IP, owner name, employee ID, email; filter by vApp, status, BU, environment, available for reuse. Managers toggle Mine / Team (team is read-only) | Open one, CSV export | 1 |
| `/vms/[id]` | Owner, backup owner, manager (read-only), owner-BU, admin | Details, vApp, cycle and suspension date, history; access details with "Reveal password" (owner, backup owner, admin) | Owner: mark available for reuse, raise snapshot-revert ticket. Phase 2: renew (owner, backup owner), release (owner only). Admin: update details, transfer owner | 1 |
| `/tickets` | All | My support tickets with status | Raise ticket (snapshot revert: VM, snapshot, priority, comment, data-loss confirmation), cancel while open | 1 |
| `/approvals` | MANAGER, OWNER_BU_MANAGER, VCLOUD_ADMIN | Pending approvals assigned to me. Single-VM requests show a "Similar VMs available" panel (IP, owner, specs vs requested, environment, OS, suspension date) | Approve, approve with an existing VM, reject (category + comment), return (category, comment, fields to update, resubmit-by) | 1 |
| `/team` | MANAGER, OWNER_BU_MANAGER | My reports; pending "confirm team member" requests | Confirm, "not my report" | 1 |
| `/profile` | All | My details (read-only: email, employee ID, BU, manager) | Change password. Phase 2: out-of-office delegate | 1 |

## Admin pages — `src/app/(portal)/admin/` (VCLOUD_ADMIN only)

| Route | Shows | Actions | Phase |
|---|---|---|---|
| `/admin/queue` | One queue: Create, Handover, Renew, Delete, Escalated follow-ups, Tickets. Each row: kind, priority, requester, age, assignee ("Handled by …"). Tabs: Unassigned, Mine, All | Assign to me, take over, open item | 1 |
| `/admin/queue/[kind]/[id]` | The item in full; for creation: the per-VM completion form with username/password prefilled by OS (or the requester's custom values) | Create: start, reject (comment), complete (per-VM details, vApp pick/create). Handover: complete. Escalated: approve on behalf (reason) or decline. Ticket: start, resolve, reject. Phase 2: complete renewal (restart date), complete deletion | 1 |
| `/admin/users` | Tabs: All users, Activation queue | Invite, import CSV, activate, change role, change manager/BU, deactivate (with VM transfer), reactivate, resend invite | 1 |
| `/admin/approvals` | All pending approvals with age | Reassign (reason required) | 1 |
| `/admin/vms/import` | CSV upload (vApp, IP, owner, OS, specs, creation or last restart date) with per-row results | Import | 1 |
| `/admin/business-units` | BUs, owner BU flag, BU lead | Create, edit | 1 |
| `/admin/settings` | All settings keys, incl. default usernames and default VM password (masked) | Edit | 1 |
| `/admin/audit` | Audit log, filterable by entity, actor, date | — | 1 |
| `/reports` | Metrics per role (owner-BU, admin, managers for team) | Export | 3 |
