# Sequence Flows (Personas)

## Summary
Key end-to-end flows with timing, permissions, and audit points.

## Implementation Readiness Review

### Developer Persona Notes
- Flow steps are sufficient for skeleton implementation, but inputs/outputs per step are not defined (needed for API payloads).
- Bid placement needs explicit failure responses (outbid, phase closed, invalid amount) to guide UI behavior.
- Phase transition flow should specify whether phase changes are manual-only or can be scheduled and auto-advance.
- Auction join flow needs to define bidder number allocation rules and uniqueness scope.

### Reviewer Persona Notes
- Security/authorization checks should be explicit at each step (e.g., membership and role checks for admin actions).
- AuditLog coverage should be confirmed for all state-changing actions, including notification settings and auction code changes.
- Report export flow should confirm access scope (L1/L2/L3) and logging for compliance.
## 1) Bidder Registration + Auction Join
1. Bidder submits email + phone.
2. Firebase Auth creates User (role=Bidder) and sends email verification.
3. Bidder verifies email.
4. Bidder enters auction code.
5. System validates auction code uniqueness mapping and creates AuctionMembership.
6. System assigns bidder number.
7. System logs membership_role_changed (Bidder) in AuditLog.
8. System updates user.last_auction_id to the joined auction.

## 18) Verification Resend Throttle
1. User taps "Resend verification".
2. System checks resend count in the last hour.
3. If over limit, return error `verification_throttled` and show message.
4. If allowed, send verification email and increment count.
7. If verification is not received, bidder can request a resend from the entry/login UI.

## 10) Join Additional Auction / Switch Auctions
1. Verified bidder selects "Join auction" and enters an auction code.
2. System validates code and creates AuctionMembership.
3. System updates user.last_auction_id on join and on auction switch.
4. Bidder can switch between active auctions they have joined (no global auction list).

## 11) Session Timeout & Return
1. If a session expires, bidder logs in again.
2. System returns bidder to the most recent auction they joined.
3. Firebase Auth manages session refresh under the hood.

## 7) QR Code Usage (Out of App)
1. Admin generates QR codes for items.
2. Bidder scans QR using the device camera app (not inside this app).
3. QR deep-links to the item detail page in the auction app/web view.

## 17) QR PDF Generation
1. Admin requests QR PDF for an auction.
2. System generates a PDF with one item per page and embedded QR codes.
3. System returns the PDF for download/print.

## 2) Silent Bid Placement (Open Phase)
1. Bidder selects a bid amount using +/- controls ($1 increments).
2. Bidder taps "Bid"; UI shows a confirmation prompt.
3. On confirm, bidder submits bid for item.
4. System validates phase=Open and bidder membership.
5. Server runs a transaction:
   - Reads current highest bid for the item (by amount desc, placed_at asc, bid_id asc).
   - Validates bid amount > current highest (or >= starting price when no bids).
   - Writes new Bid with server-generated placed_at and bid_id.
   - Updates derived view for current high bid (read-only fields exposed via API).
   - Writes AuditLog entry and updates totals.
6. On success, system sends outbid notification(s) to displaced bidder if enabled.
7. UI refreshes the item page after bid submission.
8. On failure, system returns a reason (phase closed, bid too low, outbid) for UI display.
9. On network error/timeout, UI shows an error and allows manual retry (no automatic retry).

## 15) Notification Read Flow
1. User opens notifications list (sorted by newest first).
2. User taps a notification.
3. Client marks notification as read and deep-links to the referenced item.
4. If the referenced item is currently visible, client refreshes item detail.

## 19) Bid Confirmation & Error UX
1. User taps "Bid"; client shows a confirmation dialog with bid amount.
2. On confirm, client submits bid.
3. On error, client shows reason-specific messaging (phase_closed, bid_too_low, outbid).
4. Client offers manual retry; no automatic retry.

## 8) Item Detail (No Bids Yet)
1. Item detail shows starting price as the current bid.
2. Bidder can place a bid using the standard bid controls.

## 14) Item Create/Update with Image
1. Admin creates or updates an item (name, type, starting_price, description).
2. System validates role and writes item changes.
3. Admin uploads image (multipart form upload).
4. System stores original image, generates scaled variants, and updates item image metadata.
5. System logs item_created/item_updated in AuditLog.

## 3) Live Auction Winner Assignment (Pending or later)
1. L2 admin selects live item and assigns winner + final price.
2. System validates phase and permissions.
3. System records LiveWinner and AuditLog entry.
4. System updates totals for the winning bidder.
5. Admin confirms assignment in UI before save.

## 4) Phase Transition (L1)
1. System auto-advances phase based on scheduled times.
2. L1 can override phase or timing manually.
3. System validates role and phase rules.
4. If a manual override occurs, it takes precedence and writes the updated phase_schedule/status.
5. System persists phase change and records AuditLog entry.
6. UI updates for bidders/admins based on new phase.

## 13) Auction Configuration Updates
1. L1/L2 updates auction name, time zone, or payment URL.
2. System validates role and writes the updates.
3. System logs auction_updated in AuditLog.

## 9) Auction Code Change
1. L1 updates the auction code.
2. System applies the new code for future joins only.
3. Existing bidders remain authenticated and unaffected.

## 12) Admin Membership Assignment
1. L1 assigns L2/L3 admin to an auction.
2. System validates role and membership rules.
3. System updates AuctionMembership.role_override.
4. System logs membership_role_changed in AuditLog.

## 5) Checkout & Pickup (Complete Phase)
1. L3 admin marks bidder as paid.
2. System updates PaymentStatus and AuditLog entry.
3. L3 admin marks items picked up.
4. System updates PickupStatus and AuditLog entry.
5. Bidders open the external payment URL in a new tab and return by closing the tab.

## 6) Report Export (Admin)
1. Admin requests report.
2. System generates report data.
3. System returns CSV download.

## 16) Reports Summary (Admin)
1. Admin requests summary report.
2. System aggregates totals and counts for the auction.
3. System returns report summary payload.

## Implementation Decisions (Persona-Resolved)
- Bid placement failures return a reason that the UI displays on the item page (toast or message box).
- Phases auto-advance on schedule; L1 can override at any time.
- Bidder numbers auto-increment per auction starting at 1; not reused within an auction.
- Report export is allowed for L1 and L2; audit logging for export is not required.
- Bid submissions that fail due to connectivity show an error and allow manual retry.
- Item pages refresh on manual user action; if an outbid notification references the currently viewed item, the UI should refresh that item view.
- Bid submission includes a user confirmation step; bid amount is selected with +/- $1 controls and each bid triggers a refresh of the item page.
- Outbid notifications deep-link to the referenced item detail page.
- Email verification can be resent from the entry/login UI.
- No in-app QR scanner is required; QR codes should deep-link to item pages via the device camera app.
- External payment links open in a new tab; bidders return by closing the tab.
- "No bids yet" uses starting price as the displayed current bid and allows bidding.
- Phase changes update UI state without requiring a banner or message.
- Auction code changes affect new joiners only; existing bidders remain unaffected.
- Auction codes are unique across the deployment; bidders join auctions by code and can switch between auctions they have joined.
- After session expiry, bidders return to their most recent auction via Firebase Auth.
