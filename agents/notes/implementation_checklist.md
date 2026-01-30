# Pre-Implementation Checklist (Priority Order)

## P0 (Blockers)
1) Phase auto-advance job mechanism (cron vs. background worker) and durability across restarts. (Resolved: scheduled Cloud Function + DB guard)
2) Define HTTP status conventions and error codes (especially bidding failures). (Resolved)
3) Define request/response schemas for key endpoints (auctions, items, bids, notifications). (Resolved: draft schemas added)
4) Enforce auction code uniqueness at the DB level. (Resolved: required + modeled)
5) Define how "most recent auction" is stored and retrieved for session recovery. (Resolved: user.last_auction_id)

## P1 (Should-haves)
6) Confirm server-side role scoping on all endpoints (L1/L2/L3 and per-auction membership). (Resolved)
7) AuditLog coverage checklist for all state-changing actions. (Resolved: current list accepted)
8) CSV export permission check (L1/L2 only) and scope. (Resolved: endpoint note)

## P2 (Quality)
9) Test cases for bid CAS race conditions, phase auto-advance, and session expiry. (Deferred)
10) Email verification resend limits to prevent spam/abuse. (Resolved: 5 per hour per email)
11) UX confirmation prompt details and mobile notification deep-link behavior. (Deferred)
