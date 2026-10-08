# Screens

Every page, who sees it, and what it does. Every route below already has a placeholder `page.tsx` in `src/app/` (it only renders the title); replace it when you build the page. Pages live in `src/app/`; their UI comes from `modules/<feature>/components/`. Server data is loaded in the page (Server Component); client state, if any, uses the feature's Zustand store.

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
| `/dashboard` | All | Role-based cards: my VMs expiring soon, my open requests and tickets; managers: pending approvals + team confirmations; admins: queue counts (unassigned, mine, escalated) | Links into each list | 1 |
| `/requests/new` | All | Request form (`docs/domain.md`): profile fields read-only, number of VMs, optional existing vApp, optional custom credentials; "on behalf of" for managers | Submit | 1 |
| `/requests` | All | My requests with status | Open one | 1 |
| `/requests/[id]` | Requester, approvers, owner-BU, admin | Details, approval chain, timeline. When `RETURNED`: "Needs correction", the comment, resubmit-by date, fields to update highlighted. Escalation flag if sent | Edit (when `RETURNED`), cancel, comment, **urgent follow-up to vCloud** (when `PENDING_APPROVAL`: priority + comment); approver: decide; admin: queue actions | 1 |
| `/requests/[id]/edit` | Requester | The request form prefilled, fields to update highlighted | Resubmit (only when `RETURNED`) | 1 |
| `/vms` | All (scoped) | VMs with IP, vApp, owner, OS, specs, status, expiry date, reuse badge. Search by IP, owner name, employee ID, email; filter by vApp, status, BU, environment, expiring within N days, available for reuse. Managers toggle Mine / Team (team is read-only) | Open one, CSV export | 1 |
| `/vms/[id]` | Owner, backup owner, manager (read-only), owner-BU, admin | Details, vApp, creation and expiry dates, extension history; access details with "Reveal password" (owner, backup owner, admin) | Owner: mark available for reuse, raise snapshot-revert ticket. Phase 2: extend (owner, backup owner), release (owner only). Admin: update details, transfer owner | 1 |
| `/vapps` | All (scoped) | vApps with owner, BU and VM count; search by name or owner | Open one | 1 |
| `/vapps/[id]` | Same as its VMs | vApp details and its VMs | Open a VM | 1 |
| `/tickets` | All | My support tickets with status | Raise ticket (snapshot revert: VM, snapshot, priority, comment, data-loss confirmation), cancel while open | 1 |
| `/tickets/new` | Owner, backup owner | Ticket form (VM, snapshot, priority, comment, data-loss confirmation) | Submit | 1 |
| `/tickets/[id]` | Requester, admin | Ticket details and timeline | Cancel while open; admin: queue actions | 1 |
| `/approvals` | MANAGER, OWNER_BU_MANAGER, VCLOUD_ADMIN | Pending approvals assigned to me. Single-VM requests show a "Similar VMs available" panel (IP, owner, specs vs requested, environment, OS, expiry date) | Approve (optionally with a shorter duration), approve with an existing VM, reject (category + comment), return (category, comment, fields to update, resubmit-by) | 1 |
| `/approvals/[id]` | The current approver | The request read-only, the requester's current VMs, the similar-VMs panel (single-VM requests), the decision form | Decide | 1 |
| `/team` | MANAGER, OWNER_BU_MANAGER | My reports; pending "confirm team member" requests | Confirm, "not my report" | 1 |
| `/notifications` | All | In-app inbox: status changes, approvals waiting, expiry notices | Mark read, open the linked item | 1 |
| `/profile` | All | My details (read-only: email, employee ID, BU, manager) | Change password. Phase 2: out-of-office delegate | 1 |

## Admin pages — `src/app/(portal)/admin/` (VCLOUD_ADMIN only)

| Route | Shows | Actions | Phase |
|---|---|---|---|
| `/admin` | Admin overview: queue counts, activation queue size, expiring VMs | Links into each admin page | 1 |
| `/admin/queue` | One queue: Create, Handover, Extend, Power off, Delete, Escalated follow-ups, Tickets. Each row: kind, priority, requester, age, assignee ("Handled by …"). Tabs: Unassigned, Mine, All | Assign to me, take over, open item | 1 |
| `/admin/queue/[kind]/[id]` | The item in full; for creation: the per-VM completion form with username/password prefilled by OS (or the requester's custom values) | Create: start, reject (comment), complete (per-VM details, vApp pick/create). Handover: complete. Escalated: approve on behalf (reason) or decline. Ticket: start, resolve, reject. Phase 2: complete extension (power on if expired), complete power-off, complete deletion | 1 |
| `/admin/users` | Tabs: All users, Activation queue | Invite, import CSV, activate, change role, change manager/BU, deactivate (with VM transfer), reactivate, resend invite | 1 |
| `/admin/users/[id]` | One user: profile, role, status, VMs, requests, audit | Change role, change manager/BU, deactivate, reactivate, resend invite | 1 |
| `/admin/users/import` | CSV upload of users (managers, existing VM owners) with per-row results | Import | 1 |
| `/admin/approvals` | All pending approvals with age | Reassign (reason required) | 1 |
| `/admin/vms/import` | CSV upload (vApp, IP, owner, OS, specs, creation date, expiry date) with per-row results | Import | 1 |
| `/admin/business-units` | BUs, owner BU flag, BU lead | Create, edit | 1 |
| `/admin/settings` | All settings keys, incl. default usernames and default VM password (masked) | Edit | 1 |
| `/admin/audit` | Audit log, filterable by entity, actor, date | — | 1 |
| `/reports` | Metrics per role (owner-BU, admin, managers for team) | Export | 3 |
