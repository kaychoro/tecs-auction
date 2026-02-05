# Design Document (Personas)

## Summary
This document captures high-level design decisions and proposed module boundaries for the auction system, synthesized across the Architect, Developer, Reviewer, and QA personas.

## Design Decisions
1) Single-school, multi-auction deployment
   - One deployment supports multiple auctions (e.g., demo + live).
   - L1 can manage all auctions; L2/L3 are scoped per auction.

2) Platform stack
   - Firebase Auth for authentication and email verification.
   - Firestore for primary data storage.
   - Cloud Functions for transactional bid writes, phase auto-advance, and PDF/QR generation.

3) Auction time zone and phase enforcement
   - Auction time zone is configured at creation (target: MST).
   - Phase transitions are hard cutoffs; no grace window.

4) Auction access via code
   - Bidders join with a human-readable auction code.
   - L1 can change the auction code at any time.

5) Account verification
   - Email verification required before bidding.
   - SMS verification not required.

6) Bidding integrity and concurrency
   - Server-side transactional bid write with deterministic ordering for bid acceptance.
   - Earliest timestamp wins on equal bid amounts.
   - Immutable audit trail for bids and admin removals/overrides.

7) Notifications
   - In-app outbid notifications on by default; can be disabled by admin.
   - Outbid email notifications are deferred to a later version.

8) Images
   - One image per item.
   - Uploads of any size are accepted and scaled for efficient display.

9) Connectivity UX
   - Bid submission failures due to connectivity show an error and allow manual retry (no auto-retry).

10) Real-time Updates
   - Item views refresh on manual user action; relevant outbid notifications can trigger a refresh if the item is currently displayed.

11) Bid Interaction UX
   - Bid amount is selected via +/- $1 controls, with current high bid shown.
   - Bid action prompts a confirmation before submission.
   - After a bid attempt, the item view refreshes.
   - Item detail remains lightweight; recent bids are fetched from the bids collection when needed (admin view only).

12) Notification UX
   - Tapping an outbid notification deep-links to the relevant item detail page.
   - If the referenced item is currently displayed, the client refreshes the item view.

13) Account UX
   - Email verification can be resent from the entry/login UI.
   - Resend verification is limited to 5 per hour per email.

14) QR UX
   - QR codes are scanned with the device camera app; no in-app scanner is required.
   - QR codes deep-link to item detail pages.

15) Payment UX
   - External payment links open in a new tab; bidders return by closing the tab.

16) Reporting
   - Reports are exportable to CSV.
   - Admins can view real-time totals owed per bidder.

17) Empty States
   - "No items yet" and "no notifications yet" are implicit (no special messaging required).
   - "No bids yet" should show the starting price and allow bidding.

18) Phase Transitions
   - UI updates state silently on phase changes; no banner required.
   - Auto-advance is handled by a scheduled Cloud Function with a DB guard to prevent double-advances.

19) Auction Code Changes
   - Auction code changes affect new joiners only; existing bidders remain authenticated.

20) Auction Discovery UX
   - Bidders do not see a global auction list; they join using an auction code.
   - Bidders can switch between auctions they have joined (typically active ones).

21) Session UX
   - Firebase Auth manages sessions and re-authentication.
   - After re-login, bidders return to their most recent auction.

## Proposed Module Boundaries
1) Auction Core
   - Auction lifecycle, phases, and timing (time zone aware).
   - Auction creation, configuration, and phase transitions.

2) Auth & Access
   - Bidder registration, email verification, and auction code join.
   - Role-based access control (L1/L2/L3) and per-auction scoping.

3) Items & Media
   - Item CRUD, classification (silent vs. live), and single-image handling.
   - Image processing pipeline (upload, scaling, storage).

4) Bidding Engine
   - Bid placement rules, increments, phase enforcement.
   - Concurrency control (transactional bid write) and tie resolution.
   - Bid history and audit trail storage.

5) Live Auction Management
   - Admin assignment of winners and final prices for live items.
   - Adjustments allowed by phase.

6) Notifications
   - In-app outbid notifications.

7) Totals & Checkout
   - Running and final totals per bidder.
   - Payment status and pickup status tracking.
   - External payment URL redirect.

8) Reporting & Exports
   - Summary reports.
   - CSV export pipeline.

9) QR & Print
   - QR code generation per item.
   - PDF creation (one item per page).

10) Admin Console
   - L1/L2/L3 workflows.
   - Permissions-by-phase enforcement in the UI.

11) Bidder UI
   - Mobile-optimized browsing and bidding experience.
   - Receipt view in Closed phase.

## Open Questions / Risks (For Follow-Up)
- Data retention and privacy policy (PII handling) are intentionally minimal for now.
- Availability, backup, and recovery targets are not specified.
 
## Security & Compliance Notes
- PII retention: retain bidder/admin PII until auction is Closed + 180 days, then purge user PII fields (email, phone) while retaining bid history for audit.
- Deletion workflow: L1 can request immediate purge for a user; audit log is preserved with redacted PII.
- Encryption at rest: rely on Firebase/Google-managed encryption; no custom key management in v1.
- Least privilege: enforce role/membership checks per endpoint; L1 has global access, others are per-auction only.
