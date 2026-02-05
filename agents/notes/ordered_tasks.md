# Ordered Tasks (Developer Persona)

This is an execution order for the tasks in `agents/notes/task_list.md`. Items are ordered by dependency, not by original priority labels. For sub-task breakdowns, see the matching entries in `agents/notes/task_list.md`.

1) ✓ Define request/response schemas for key endpoints
2) ✓ Confirm HTTP status conventions and error codes
3) ✓ Lock bid ordering & server time source
4) ✓ Define auction phase timing enforcement contract
5) ✓ Enforce auction code uniqueness at DB level
6) ✓ Define "most recent auction" storage
7) ✓ Role & membership enforcement rules
8) ✓ Auth + Auction join flow end-to-end
9) ✓ Auction lifecycle & admin controls
10) ✓ Items & media pipeline
11) ✓ Bidding engine (silent items)
12) ✓ Totals & statuses (admin + bidder)
13) Notifications (in-app)
14) AuditLog coverage checklist
15) CSV export permission check and scope
16) Reports & CSV export implementation
17) QR & PDF generation
18) Email verification resend limits
19) UX confirmation & notification behaviors
20) QA test plan for high-risk paths
21) Security & compliance details
22) Accessibility & device support matrix
23) Live auction winner assignment
24) Session return behavior

Notes:
- "Bid concurrency + ordering model" is resolved by tasks 1–3 and should be verified while implementing the bidding engine.
- QA test plan tasks can be prepared in parallel, but are listed after core flows.
