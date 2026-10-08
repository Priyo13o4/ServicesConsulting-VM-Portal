# Domain rules

The business rules the code must follow. Source: "VM Portal — Locked Plan v1". Unanswered questions and their defaults are tracked in "VM Portal — Open Questions" (Q1–Q28); a default here is marked (default, Qn).

## Roles

| Role | Who |
|---|---|
| `END_USER` | Every employee. Everyone starts here. |
| `MANAGER` | Line managers. Approve their own reports' requests. |
| `OWNER_BU_MANAGER` | The group (2+ people) in the BU that owns the VMs. Approves external-BU requests; fallback approver for everything. |
| `VCLOUD_ADMIN` | vCloud team. Creates, powers off and deletes VMs by hand in the vCloud dashboard, then records it in the portal; manages users and settings. |

Only a `VCLOUD_ADMIN` changes roles. The last admin cannot be demoted.

## Permission matrix

| Action | END_USER | MANAGER | OWNER_BU_MANAGER | VCLOUD_ADMIN |
|---|---|---|---|---|
| Request a VM for self | Yes | Yes | Yes | Yes |
| Request a VM for a team member | No | Own reports | Own reports | No |
| See VMs | Own | Own + team | All | All |
| Approve / reject / return | No | Own reports | External-BU + fallback | Override after escalation, reason required |
| Extend / release a VM (Phase 2) | Own | Own + team | Own + team | Any, reason required |
| Record VM creation, details, power-off, deletion | No | No | No | Yes |
| Confirm new team members | No | Own reports | Own reports | Any |
| Manage users, roles, BUs, settings | No | No | No | Yes |

"Own reports" = users whose `manager_id` is the caller. "Team VMs" = VMs owned by own reports.

## Account statuses

`INVITED` (admin-created, no password yet) → `ACTIVE`
`PENDING_ACTIVATION` (self-registered, email verified) → `ACTIVE` (manager confirms, or admin activates)
`ACTIVE` ↔ `DEACTIVATED` (admin only)

Only `ACTIVE` users can submit, approve or extend anything. Email verification is tracked by Better Auth's own `emailVerified` field. Unverified self-registrations are deleted after 7 days.

## Approval routing (one function, 4 cases)

| Requester | Chain |
|---|---|
| Owner-BU manager or manager in the owner BU | Auto-approved, audited as "same-BU manager" (default, Q5) |
| Owner-BU end user | 1. line manager |
| External-BU manager | 1. owner-BU manager group |
| External-BU end user | 1. line manager → 2. owner-BU manager group (default, Q4) |

Resolving the approver for a step:
- Active out-of-office delegation (Phase 2) → the delegate; the original approver can still act.
- No manager on record, approver deactivated, or approver = requester → owner-BU manager group; if that group is empty → vCloud admin.

SLA (Phase 2; business days, from settings): reminder day 2 → escalate day 4 (line-manager step → owner-BU group; owner-BU step → vCloud admin) → time-out day 7. A timed-out CREATE closes; a timed-out EXTEND counts as rejected.

Phase 1 has no SLA timer: a vCloud admin can reassign a stuck approval manually (reason required).

## Request statuses (CREATE, EXTEND, DELETE share one table)

```
SUBMITTED → PENDING_APPROVAL → APPROVED → CREATION_IN_PROGRESS → COMPLETED ("VM assigned")
SUBMITTED → APPROVED                       (auto-approval)
SUBMITTED | PENDING_APPROVAL → CANCELLED   (requester)
PENDING_APPROVAL → RETURNED → SUBMITTED    (correction loop)
PENDING_APPROVAL → REJECTED | TIMED_OUT
APPROVED → REJECTED                        (technical rejection by vCloud admin)
CREATION_IN_PROGRESS → REJECTED           (could not be created; reason required)
```

There is no automated provisioning. `CREATION_IN_PROGRESS` means an engineer is creating the VM by hand in the vCloud dashboard; `COMPLETED` is set when they enter the VM details. If creation fails, the engineer retries in the dashboard; the portal does not track attempts.

Any other move is `INVALID_TRANSITION`. Asking the requester for more information does not change status; it is a comment in the request timeline (an `audit_log` row with action `COMMENT`).

## VM statuses

```
ACTIVE → EXTENSION_PENDING → ACTIVE (approved: new expiry, or rejected before expiry)
EXPIRED → EXTENSION_PENDING → EXPIRED (rejected after expiry)
ACTIVE → EXPIRED (expiry date; power-off task for the vCloud team)
ACTIVE | EXPIRED → PENDING_DELETION (user releases, or E+15)
PENDING_DELETION → DELETED (admin deletes it in the dashboard, then marks it deleted)
```

## Lease and lifecycle rules

- E (expiry) = actual creation date + approved duration. The creation date is entered by the admin when completing the request.
- Approver may shorten the requested duration, never lengthen it.
- Lease options: 30, 60, 90, 180 days (default, Q8).
- All VM operations (create, power off, power on, delete) are manual in the vCloud dashboard. The portal creates a task for the vCloud team and records when it is done.
- Phase 2: notices at E-10, E-3, E-1. At E: `EXPIRED`, power-off task for admins. Grace notices at E+5, E+10 (manager copied). E+15: final notice + automatic deletion request.
- Extension: new E = old E + extension length (never today + length). Notices pause while `EXTENSION_PENDING`; the VM is left as it is.
- Rejected or timed-out extension: notices resume on the original E; deletion never earlier than rejection + 5 days.
- Release: user types the hostname to confirm "VM and all data permanently deleted"; deletion request shows an ETA (default 3 business days, Q25).
- Notification idempotency: one row per (vm_id, cycle_no, stage) in `notifications`, unique.

## Data model (Drizzle, `casing: "snake_case"`)

| Table | Key columns |
|---|---|
| `user` (Better Auth, extended) | emp_id (unique), bu_id, manager_id, role, status, activated_by, activated_at, last_login_at |
| `session`, `account`, `verification` | Better Auth internals |
| `business_units` | name, is_owner_bu |
| `delegations` (Phase 2) | manager_id, delegate_id, starts_on, ends_on, created_by |
| `requests` | type, status, requester_id, on_behalf_of_id, vm_id, form fields as columns, requested_duration_days, approved_duration_days, backup_owner_id, eta |
| `approvals` | request_id, step_no, approver_id, routed_via (DIRECT, DELEGATE, FALLBACK, ESCALATION, REASSIGNED), decision, comment, decided_at |
| `vms` | owner_id, backup_owner_id, bu_id, hostname, ip, vcloud_ref, allocated vcpu/ram_gb/storage_gb, os, environment, created_on, expires_on, status, cycle_no, notices_paused |
| `notifications` | vm_id, user_id, cycle_no, stage, sent_at — unique (vm_id, cycle_no, stage) |
| `audit_log` | actor_id, entity, entity_id, action, from_state, to_state, reason, at |
| `settings` | key, value |
| `daily_snapshots` (Phase 2) | day, bu_id, vm_count, vcpu, ram_gb, storage_gb, in_grace |

## Request form fields

Requester fields are read-only from the profile. Form: on behalf of (managers only) · project name · purpose (Hosting, Testing, Training, Development, Other) · business justification · duration (lease options) · customer or internal (+ customer name) · needed by (optional) · size template (Small, Medium, Large, Custom; specs from settings, Q2) · CPU/RAM/storage (Custom only) · OS and version · environment (Dev, Test, UAT, Prod) · VM name suggestion · who needs access (portal users) · backup owner (required) · public IP (yes/no) · internet access (yes/no). A "yes" on public IP or internet is flagged for vCloud review (Q10).

## Settings keys (defaults)

`owner_bu_id` · `lease_options_days` = [30,60,90,180] · `extension_max_days` = one lease · `notice_days_before` = [10,3,1] · `grace_notice_days_after` = [5,10] · `deletion_day_after` = 15 · `deletion_eta_business_days` = 3 · `approval_reminder_days` = 2 · `approval_escalate_days` = 4 · `approval_timeout_days` = 7 · `activation_escalate_days` = 3 · `templates` = {Small, Medium, Large} specs (Q2)
