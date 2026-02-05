# Prioritized Backlog (Unified)

This backlog combines `implementation_checklist.md` and `prioritized_backlog.md`. Items were only merged when the personas described the same work.

## P0 — Blockers (must resolve before build)
1) **Bid concurrency + ordering model (resolved direction, still needs updates in specs)**  
   - Enforce ordering via transactional bid writes and derived views (no mutable `current_high_bid`).  
   - Update API spec + data model + sequence flow to match. (Decision locked; verify consistency.)

2) **Lock bid ordering & server time source**  
   - Confirm `placed_at` precision, server time source, and tie-breakers (amount desc, placed_at asc, bid_id asc).  
   - Ensure consistent enforcement in bidding engine.

3) **Define auction phase timing enforcement contract**  
   - Confirm phase schedule schema, inclusive start/exclusive end, time zone handling.  
   - Finalize auto-advance + L1 override interaction.

4) **Confirm HTTP status conventions and error codes**  
   - Especially for bidding failures (phase_closed, bid_too_low, outbid).  
   - Ensure consistent UI handling.

5) **Define request/response schemas for key endpoints**  
   - Auctions, items, bids, notifications.

6) **Enforce auction code uniqueness at DB level**  
   - Unique across deployment; required for join flow.

7) **Define “most recent auction” storage**  
   - Ensure user.last_auction_id is authoritative and used for return flow.

## P1 — Core Build Tasks (first implementation slice)
8) **Role & membership enforcement rules**  
   - AuctionMembership role override behavior and endpoint checks.  
   - Ensure role table is reflected in API spec and flows.

9) **Auth + Auction join flow end-to-end**  
   - Firebase Auth with email verification + resend limit.  
   - Auction code join and bidder number assignment (auto-increment, unique, non-reused).

10) **Auction lifecycle & admin controls**  
   - Create/edit auctions, phase schedule updates, auction code changes.  
   - Scheduled phase auto-advance with DB guard + audit logging.

11) **Items & media pipeline**  
   - Item CRUD with single-image upload; scaled variants (320/640/1024).  
   - Enforce size limits and storage paths.

12) **Bidding engine (silent items)**  
   - Validate phase open + amount rules; transactional bid write; audit log.  
   - Update derived views and totals.

13) **Notifications (in-app)**  
   - Outbid notification creation, list, mark-read, deep-link logic.

14) **Totals & statuses (admin + bidder)**  
   - Totals per bidder (invoice strategy), payment status, pickup status.  
   - Admin-only controls for marking paid/picked up.

15) **AuditLog coverage checklist**  
   - Confirm all state-changing actions are logged consistently.

16) **CSV export permission check and scope**  
   - L1/L2 only; ensure access control is enforced.

## P2 — Quality + Reporting
17) **Reports & CSV export implementation**  
   - Generate summary report and CSV export.

18) **QR & PDF generation**  
   - Item QR endpoint and PDF with one item per page.

19) **QA test plan for high-risk paths**  
   - Bid race conditions, phase auto-advance, session expiry, QR/PDF validation.

20) **Email verification resend limits**  
   - Enforce 5 per hour per email (client or backend guard).

21) **UX confirmation & notification behaviors**  
   - Confirmation prompt details; mobile notification deep-link behavior.

## P3 — Security, Compliance, and UX Follow-ups
22) **Security & compliance details**  
   - PII retention, encryption at rest, admin audit logs, least-privilege rules.

23) **Accessibility & device support matrix**  
   - Target WCAG level and supported device classes.

24) **Live auction winner assignment**  
   - Admin flow for assigning live winner and final price; update totals.

25) **Session return behavior**  
   - Ensure bidders return to last auction on re-login.
