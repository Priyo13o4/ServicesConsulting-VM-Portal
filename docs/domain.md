# Domain rules

The business rules the code must follow. The plan behind them is `docs/locked-plan.md`. Unanswered questions and their defaults are in `docs/open-questions.md`. A rule based on a default is marked (default, Qn).

## How the vCloud team works (facts, not assumptions)

- All VM work is manual in the vCloud dashboard: creating, restarting, reverting snapshots, deleting. The portal never touches vCloud. It tracks requests, tells people what to do, and records what was done.
- VMs live inside **vApps**. A vApp is a container holding one or more VMs.
- The portal's lifecycle runs on the **lease**: expiry = actual creation date + approved duration ("Duration of VM" on the form). Every notice, extension and deletion is driven by this date.
- vCloud also restarts VMs on a 90-day cycle. That is internal to the vCloud team; the portal does not track it.
- After the grace period a VM is **hard deleted**: no archive, no backup. The owner is told beforehand and afterwards.
- Creation almost never fails. When it does (for example, storage is full), the admin rejects the request with a comment.
- VM names are chosen by the vCloud admins. The portal identifies VMs by IP address and owner (name, employee ID, email).

## Roles

| Role | Who |
|---|---|
| `END_USER` | Every employee. Everyone starts here. |
| `MANAGER` | Line managers. Approve their own reports' requests. |
| `OWNER_BU_MANAGER` | The group (2+ people) in the BU that owns the VMs. Handles external-BU requests (Q3); fallback approver for everything. |
| `VCLOUD_ADMIN` | vCloud team. Works the queue: creates, restarts, reverts and deletes VMs in the dashboard, then records it here. Manages users and settings. |

Only a `VCLOUD_ADMIN` changes roles. The last admin cannot be demoted.

## Permission matrix

| Action | END_USER | MANAGER | OWNER_BU_MANAGER | VCLOUD_ADMIN |
|---|---|---|---|---|
| Request VMs for self | Yes | Yes | Yes | Yes |
| Request VMs for a team member | No | Own reports | Own reports | No |
| See VMs | Own + where backup owner | Own + team | All | All |
| Approve / reject / return | No | Own reports | External-BU + fallback | Approve on the manager's behalf after an urgent follow-up, reason required |
| Urgent follow-up to vCloud admins | Own pending requests | Own pending requests | Own pending requests | — |
| Extend a VM | Owner, backup owner | Own VMs only | Own VMs only | Any, reason required |
| Release (delete) a VM | Owner only | Own VMs only | Own VMs only | Any, reason required |
| Raise a support ticket (snapshot revert) | Owner, backup owner | Own VMs only | Own VMs only | Any |
| Mark a VM available for reuse | Owner only | Own VMs only | Own VMs only | Any |
| Work the queue (assign, complete, reject) | No | No | No | Yes |
| See VM credentials | Owner, backup owner | Own VMs only | Own VMs only | All |
| Confirm new team members | No | Own reports | Own reports | Any |
| Manage users, roles, BUs, settings | No | No | No | Yes |

**A manager can never release, delete, extend or hand over a report's VM.** "Own reports" = users whose `manager_id` is the caller. "Team VMs" = VMs owned by own reports; managers can see them but not act on them.

## Account statuses

`INVITED` (admin-created, no password yet) → `ACTIVE`
`PENDING_ACTIVATION` (self-registered, email verified) → `ACTIVE` (manager confirms, or admin activates)
`ACTIVE` ↔ `DEACTIVATED` (admin only)

Only `ACTIVE` users can submit, approve or extend anything. Email verification is tracked by Better Auth's own `emailVerified` field. Unverified self-registrations are deleted after 7 days.

## Request form

Filled in automatically (read-only): requester name, employee ID, email, manager name, BU, BU lead (Q12), request date.

| Field | Input | Source |
|---|---|---|
| On behalf of | Employee picker, managers only | New |
| Reason (business justification) | Text, required | Current form |
| Project name | Text, required | Whiteboard |
| Purpose | Hosting, Testing, Training, Development, Other | Whiteboard |
| Customer or internal | Radio; customer name if customer | Current form |
| Product stack | Text (Q13) | Current form |
| Duration of VM | Dropdown of lease options (Q8); sets the expiry | Current form |
| Number of VMs | 1 to `max_vms_per_request` (Q9); all get the same config (Q14) | Current form |
| Add to an existing vApp | Optional; picker of the requester's vApps | New |
| OS and version | Dropdown (Q2) | Current form |
| CPU, RAM, storage | Numbers per VM, within limits (Q2) | Current form |
| Environment | Dev, Test, UAT, Prod | Whiteboard |
| Needed by | Date, optional | Whiteboard |
| Cost center | Text, optional (Q17) | Whiteboard correction list |
| Who needs access | Multi-select of portal users | Whiteboard |
| Backup owner | User picker, required | Whiteboard |
| Public IP, internet access | Yes/No each; a yes is flagged for vCloud review (Q10) | Whiteboard |
| Custom credentials | Optional: "I need a specific username and password" → username, password | New |

No VM name field: naming belongs to the vCloud admins.

## Approval routing (one function)

| Requester | Chain |
|---|---|
| Manager or owner-BU manager in the owner BU | Auto-approved, audited as "same-BU manager" (default, Q5) |
| Owner-BU end user | 1. line manager |
| External-BU manager | 1. owner-BU manager group |
| External-BU end user | 1. line manager → 2. owner-BU manager group (default, Q4) |

The owner-BU group step depends on `external_bu_mode` (Q3): `APPROVE` (default) makes it an approval step; `NOTIFY` skips the step and emails the group instead.

Resolving the approver for a step:
- Active out-of-office delegation (Phase 2) → the delegate; the original approver can still act.
- No manager on record, approver deactivated, or approver = requester → owner-BU manager group; if that group is empty → vCloud admin.

**Urgent follow-up (manager unavailable, VM needed now).** On a `PENDING_APPROVAL` request the requester can send an urgent follow-up straight to the vCloud admins: priority (`HIGH` or `URGENT`) and comment, both required. The status does not change; the request appears in the admin queue marked "Escalated". An admin verifies it (for example, by contacting the manager or BU lead), then either:
- **approves on the manager's behalf**: reason required; approval row with `routed_via = VCLOUD_OVERRIDE`; the manager is notified; the request goes on to creation, or
- **declines the follow-up**: comment required; the request stays with the manager.

No minimum waiting time (default, Q16). Every follow-up is audited.

SLA ladder (Phase 2; business days, from settings): reminder day 2 → escalate day 4 (line-manager step → owner-BU group; owner-BU step → vCloud admin) → time-out day 7. A timed-out CREATE closes; a timed-out EXTEND counts as rejected.

## Approval decisions

Decision options: `APPROVE` · `APPROVE_WITH_EXISTING_VM` (single-VM requests only; see Reusing a VM) · `REJECT` · `RETURN`.

On either approve, the approver may shorten the duration, never lengthen it (approved duration ≤ requested duration).

**Reject**: category and comment, both required. The request closes; the requester starts a new one.

| Rejection category |
|---|
| `BUSINESS_JUSTIFICATION_INSUFFICIENT` |
| `EXISTING_VM_AVAILABLE` (name the VM in the comment) |
| `RESOURCE_REQUEST_TOO_LARGE` |
| `BUDGET_CONSTRAINTS` |
| `SECURITY_COMPLIANCE_CONCERN` |
| `PROJECT_NOT_APPROVED` |
| `INCORRECT_INFORMATION` |
| `OTHER` |

**Return for correction**: category, comment and fields to update (multi-select of form fields) required; resubmit-by date optional. The requester sees "Needs correction" with those fields highlighted.

| Correction category |
|---|
| `BUSINESS_JUSTIFICATION_INCOMPLETE` |
| `PROJECT_DETAILS_MISSING` |
| `VM_CONFIGURATION_INCORRECT` |
| `SECURITY_INFORMATION_MISSING` |
| `COST_CENTER_MISSING` (Q17) |
| `ACCESS_REQUIREMENTS_UNCLEAR` |
| `RESOURCE_SIZE_NEEDS_REVISION` |
| `OTHER` |

Phase 2: a request left in `RETURNED` is cancelled on its resubmit-by date, or 14 days after the return if none was set (default, Q34).

Category lists are code constants (stable values for reports); the UI shows labels.

**Rejection email**: request ID, employee ID and email, project name, approver name and email, decision, category, comments, rejection date, next step ("start a new request"). All values come from existing records.

**Audit of a return**: request ID, approver, review date, status `RETURNED`, category, comment, fields to update, resubmit-by date. The resubmission date is the next `RETURNED → SUBMITTED` audit row.

## Admin queue: assign to myself

The admin queue holds approved requests to create, handovers, extensions, power-off tasks (Phase 2), deletions, urgent follow-ups and support tickets.

- Every item has an assignee. "Assign to me" claims it; every other admin then sees "Handled by <name>".
- Any action on an unassigned item assigns it to the admin who acts.
- To act on an item someone else holds, an admin uses "Take over". This asks for confirmation, is audited, and notifies the previous assignee.
- Completing or closing an item updates everything in one step: status, VM records, notifications, audit.

## Creating the VMs

1. Admin assigns the request and marks it started → `CREATION_IN_PROGRESS`.
2. Admin creates the VMs by hand in the vCloud dashboard, inside a new or existing vApp.
3. Admin completes the request in the portal, entering per VM: vApp (pick or create), IP address, OS and version as built, vCPU / RAM / storage as built, creation date, username, password, vCloud reference (optional), hostname (optional; the admin's own naming).
   - Username is prefilled by OS: Windows → `Administrator`, Linux → `root` (settings), or the requester's custom username.
   - Password is prefilled with the default VM password (settings), or the requester's custom password.
4. The request becomes `COMPLETED`; each VM becomes `ACTIVE` with expiry = its creation date + the approved duration.
5. If fewer VMs than requested could be created, the admin enters the ones that exist and explains why in the completion comment.
6. If none can be created (for example, storage is full), the admin rejects with a comment. There are no failure categories.

**Credentials**: stored encrypted (AES-256-GCM, key `CREDENTIALS_KEY`). Shown on the VM page to the owner and backup owner behind a "Reveal" button (audited), and to admins. The "VM ready" email contains the IP address and username and links to the VM page; it does not contain the password (default, Q15).

## Request statuses

One `requests` table holds `CREATE`, `EXTEND` and `DELETE` requests.

```
SUBMITTED → PENDING_APPROVAL → APPROVED → CREATION_IN_PROGRESS → COMPLETED
SUBMITTED → APPROVED                        (auto-approval, and all DELETE requests)
SUBMITTED | PENDING_APPROVAL → CANCELLED    (requester)
PENDING_APPROVAL → RETURNED → SUBMITTED     (correction loop; UI label "Needs correction")
PENDING_APPROVAL → REJECTED | TIMED_OUT
APPROVED | CREATION_IN_PROGRESS → REJECTED  (admin: cannot be done, comment required)
```

For EXTEND and DELETE requests, the UI shows `CREATION_IN_PROGRESS` as "In progress". An urgent follow-up is a flag on the request, not a status. Any other move is `INVALID_TRANSITION`. Asking for more information is a comment in the request timeline (`audit_log` action `COMMENT`).

## VM statuses and the lease

E = `expires_on` = actual creation date + approved duration. An approved extension moves it: new E = old E + extension days (never today + extension, so extending late gains nothing).

```
ACTIVE → EXPIRED                          (on E; power-off task for the vCloud team, Q28)
ACTIVE | EXPIRED → EXTENSION_PENDING      (owner or backup owner asks to extend)
EXTENSION_PENDING → ACTIVE                (extension recorded: new E; powered back on if it was expired)
EXTENSION_PENDING → ACTIVE | EXPIRED      (extension rejected or timed out: back to where it was)
ACTIVE | EXPIRED → PENDING_DELETION       (owner releases, or E+15 is reached)
PENDING_DELETION → DELETED                (admin hard-deleted it in the dashboard)
```

Phase 2 schedule (daily job; days from settings):

| Day | What happens |
|---|---|
| E-10, E-3, E-1 | Notice to owner and backup owner: extend or release |
| E | Status `EXPIRED`; power-off task in the admin queue (Q28); notice |
| E+5, E+10 | Grace notices; manager copied (Q32) |
| E+15 | Final notice "will be permanently deleted, no archive"; DELETE request created automatically |
| Deletion recorded | Owner, backup owner and manager notified |

- **Extension** (`EXTEND` request): extension days (up to `extension_max_days`, Q29) and reason. It follows the same approval routing as a new request: same-BU managers' requests are auto-approved. After approval, the request goes to the admin queue. The admin checks capacity, updates the VM in the dashboard (Q35), and records the extension. If the VM was `EXPIRED`, the admin powers it back on. If the extension can't be granted, the admin rejects it with a comment.
- Notices pause while the VM is `EXTENSION_PENDING`.
- A rejected or timed-out extension resumes the schedule on the original E, but deletion is never earlier than rejection + 5 days.
- **Release**: the owner types the IP address to confirm "this VM and all its data will be permanently deleted, with no archive". A DELETE request is created with an ETA (default 3 business days, Q33). No approval.
- Notification idempotency: one row per (vm_id, cycle_no, stage) in `notifications`, unique. `cycle_no` goes up by one with every extension.

## Support tickets (snapshot revert)

Raised by the owner or backup owner on one of their VMs. Goes straight to the admin queue; no approval.

| Field | Input |
|---|---|
| Type | `REVERT_SNAPSHOT` (more types later) |
| VM | Picker of the user's VMs (shows IP and vApp) |
| Snapshot | Text: snapshot name or date, or "latest" |
| Priority | `NORMAL`, `HIGH`, `URGENT` |
| Comment | Text, required |
| Confirmation | Checkbox: "Changes made after this snapshot will be lost" |

Statuses: `OPEN → IN_PROGRESS → RESOLVED`; `OPEN | IN_PROGRESS → REJECTED` (admin, comment required); `OPEN → CANCELLED` (requester). The admin reverts the VM in the dashboard, then resolves the ticket with a comment. The requester is notified at each change.

## Reusing a VM

The portal can't see whether a VM is in use until Phase 4, so reuse relies on the owner's word.

- Only the **owner** can mark a VM "available for reuse". Managers cannot hand over a report's VM.
- **Candidates** for an approver: VMs marked available for reuse that the approver can see, plus the approver's own VMs. **Similar** = `ACTIVE`, same environment and OS, and vCPU / RAM / storage each 1x to 2x the request (default, Q18). Ranked by closest specs, then soonest expiry.
- Only for single-VM requests.
- **Handover**:
  1. The approver chooses `APPROVE_WITH_EXISTING_VM`, and the request goes to the queue as a handover.
  2. The admin resets access in the dashboard (Q19) and records the new credentials.
  3. The requester becomes owner, with the backup owner from the request, expiry = handover date + approved duration, and notices reset.
  4. The request becomes `COMPLETED`, and the previous owner is notified.

## Data model (Drizzle, `casing: "snake_case"`)

| Table | Key columns |
|---|---|
| `user` (Better Auth, extended) | emp_id (unique), bu_id, manager_id, role, status, activated_by, activated_at, last_login_at |
| `session`, `account`, `verification` | Better Auth internals |
| `business_units` | name, is_owner_bu, lead_user_id |
| `delegations` (Phase 2) | manager_id, delegate_id, starts_on, ends_on, created_by |
| `requests` | type (CREATE, EXTEND, DELETE), status, fulfilment (NEW_VM, EXISTING_VM), requester_id, on_behalf_of_id, vm_id (EXTEND/DELETE), vm_count, vapp_id (optional target), form fields as columns, requested_duration_days, approved_duration_days, extension_days, backup_owner_id, custom_username, custom_password_enc, assigned_to_id, escalation_priority, escalation_comment, escalated_at, eta, completion_comment |
| `approvals` | request_id, step_no, approver_id, routed_via (DIRECT, DELEGATE, FALLBACK, ESCALATION, REASSIGNED, VCLOUD_OVERRIDE), decision, approved_duration_days, category, comment, fields_to_update, resubmit_by, offered_vm_id, decided_at |
| `vapps` | name, vcloud_ref, owner_id, bu_id, created_on |
| `vms` | request_id, vapp_id, owner_id, backup_owner_id, bu_id, ip (unique), hostname, vcloud_ref, os, os_version, vcpu, ram_gb, storage_gb, environment, username, password_enc, created_on, expires_on, powered_off_at, status, cycle_no, notices_paused, available_for_reuse, reuse_marked_at |
| `tickets` | type, vm_id, requester_id, priority, snapshot_ref, comment, status, assigned_to_id, resolution_comment, resolved_at |
| `notifications` | vm_id, user_id, cycle_no, stage, sent_at — unique (vm_id, cycle_no, stage) |
| `audit_log` | actor_id, entity, entity_id, action, from_state, to_state, reason, at |
| `settings` | key, value |
| `daily_snapshots` (Phase 2) | day, bu_id, vm_count, vcpu, ram_gb, storage_gb, expired |

**VM lists**: search by IP address, owner name, employee ID and email; filter by vApp, status, BU, environment, "expiring within N days" and "available for reuse".

## Settings keys (defaults)

`owner_bu_id` · `external_bu_mode` = APPROVE (Q3) · `max_vms_per_request` = 10 (Q9) · `lease_options_days` = 30, 60, 90, 180 (Q8) · `extension_max_days` = one original lease (Q29) · `power_off_at_expiry` = true (Q28) · `os_options` and `spec_limits` (Q2) · `default_username_windows` = Administrator · `default_username_linux` = root · `default_vm_password` (stored encrypted) · `notice_days_before` = [10, 3, 1] · `grace_notice_days_after` = [5, 10] · `deletion_day_after` = 15 · `deletion_eta_business_days` = 3 (Q33) · `approval_reminder_days` = 2 · `approval_escalate_days` = 4 · `approval_timeout_days` = 7 · `activation_escalate_days` = 3 · `reuse_spec_max_ratio` = 2 (Q18) · `returned_auto_cancel_days` = 14 (Q34)
