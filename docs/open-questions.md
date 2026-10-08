# VM Portal — Open Questions

As of 2026-10-08 · Priyodip

There are 37 open questions, renumbered for v2. All but 8 have a default we build with, so the build is not blocked. Q20 to Q27 have no workable default and block go-live. When an answer comes in, it becomes a settings change or a small code change; record it here and in the Claude doc.

## Affects the Phase 1 build

| ID | Question | Default we build with | Ask | Status | Answer |
| --- | --- | --- | --- | --- | --- |
| Q1 | Do vCloud admins log into this portal and work the queue, or do we relay requests to them? | They log in and work the queue | vCloud team | Open | |
| Q2 | Allowed OS and version list, and CPU / RAM / storage limits per VM | Placeholder lists and limits in settings | vCloud team | Open | |
| Q3 | For external-BU requests, must our BU manager approve, or only be notified? | Approve (`external_bu_mode` = APPROVE); switching to notify is a setting | BU manager | Open | |
| Q4 | Can end users from external BUs request VMs? | Yes: their line manager, then the owner-BU step from Q3 | BU manager | Open | |
| Q5 | Are requests from same-BU managers approved automatically? | Yes | BU manager | Open | |
| Q6 | After manager approval, is there one more gate before the vCloud queue? | No; the vCloud team's own check is the gate | BU manager | Open | |
| Q7 | Can managers request VMs for their team members? | Yes | BU manager | Open | |
| Q8 | Lease options for "Duration of VM", and the maximum | 30, 60, 90, 180 days; maximum 180 | BU manager | Open | |
| Q9 | Maximum VMs per request, and any cap per user | 10 per request; no per-user cap | BU manager | Open | |
| Q10 | Who reviews requests that need a public IP or internet access? | The vCloud engineer working the request | vCloud team | Open | |
| Q11 | Issue 1, "manual follow-ups after assignment": what were those follow-ups about? | Covered by status emails and expiry notices | BU manager | Open | |
| Q12 | What is "BU Led" on the current request form? | The BU lead's name, filled in from the BU | BU manager | Open | |
| Q13 | Product stack: free text or a fixed list? | Free text | BU manager | Open | |
| Q14 | Multi-VM requests: same configuration for every VM? | Yes; different configurations go in separate requests | BU manager | Open | |
| Q15 | Should passwords be emailed, or shown only in the portal? | Portal only; the email has IP, username and a link | vCloud team | Open | |
| Q16 | Urgent follow-up: any limit, such as only after the request has waited a while? | No limit; every follow-up is audited and the manager is notified | vCloud team | Open | |
| Q17 | Should requests carry a cost center? | Yes: optional text field | BU manager | Open | |
| Q18 | What counts as a "similar" VM for reuse? | Same environment and OS; each spec 1x to 2x the request | BU manager | Open | |
| Q19 | Before handing over a reused VM, what must the vCloud team do? | Remove the previous owner's accounts and reset credentials; rebuild if the previous owner asks | vCloud team | Open | |

## Blocks Phase 1 go-live

None of these has a usable default. Development continues without them, but the portal can't launch until all 8 are answered.

| ID | Question | Needed for | Ask | Status | Answer |
| --- | --- | --- | --- | --- | --- |
| Q20 | Which company email domains may register? | Sign-up domain check | IT | Open | |
| Q21 | Who is in the owner-BU manager group? At least 2 named people | External-BU requests and every fallback | BU manager | Open | |
| Q22 | BU list, the owner BU, BU leads, and managers (name, email, employee ID, BU) | Seeding the org by CSV (UC-2) | BU manager | Open | |
| Q23 | Spreadsheet of existing VMs: vApp, IP, owner, OS, specs, creation date, expiry date | Importing current VMs so their leases start correctly | vCloud team | Open | |
| Q24 | Who are the first vCloud admin accounts? | The seed script (UC-1) | vCloud team | Open | |
| Q25 | SMTP relay: host, port, authentication, sender address | Every email the portal sends | IT | Open | |
| Q26 | Host VM: specs, network zone, internal DNS name, TLS certificate | Deploying the portal | IT | Open | |
| Q27 | Where do nightly database backups go? | Backup and tested restore | IT | Open | |

## Later phases

| ID | Question | Default we build with | Ask | Status | Answer |
| --- | --- | --- | --- | --- | --- |
| Q28 | Is a VM powered off at expiry, before the grace period ends? | Yes: a power-off task for the vCloud team | vCloud team | Open | |
| Q29 | Extension length, and the maximum number of extensions | Up to one original lease per extension; no cap on the number | BU manager | Open | |
| Q30 | Approval SLA: reminder, escalation, time-out | Business days 2, 4 and 7 | BU manager | Open | |
| Q31 | Do public holidays count as business days for the SLA? | Monday to Friday, no holiday calendar | BU manager | Open | |
| Q32 | Who receives expiry notices? | Owner and backup owner; manager copied from E+5 | BU manager | Open | |
| Q33 | Deletion ETA promised after release or grace | 3 business days | vCloud team | Open | |
| Q34 | Should a request left in "Needs correction" be cancelled automatically? | Yes: on its resubmit-by date, or 14 days after return | BU manager | Open | |
| Q35 | When an extension is approved, does the vCloud team change anything in vCloud, or is it only recorded in the portal? | They update the VM in the dashboard, then record it | vCloud team | Open | |
| Q36 | Phase 3: are Teams notifications needed? | Email only | BU manager | Open | |
| Q37 | Phase 4: which vCloud API, and when, for read-only status and usage data? | No date; Phase 4 waits on this | vCloud team | Open | |

## Closed by the 8 Oct updates

| Was | Question | Answer |
| --- | --- | --- |
| Q2 (v1) | Size templates | Not used: the form takes CPU, RAM and storage directly |
| Q26 (v1) | Data retention after deletion | None: hard delete, no archive |
| Q33 (v1) | Can a manager hand over a report's VM? | No: managers cannot release, delete or hand over a report's VM |
| — | What to record when creation fails | A rejection with a comment; failures are rare |
| — | VM naming | Handled by the vCloud admins; the portal uses IP and owner |
| — | vCloud's 90-day restart cycle | Internal to the vCloud team; the portal does not track it |
