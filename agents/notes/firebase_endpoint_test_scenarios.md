# Firebase Endpoint Test Scenarios and Coverage Audit

## Purpose
This document defines Firebase data-persistence verification scenarios for every implemented API endpoint, then validates whether current tests actually cover those scenarios.

## Scope
- Source of endpoint truth: `api/src/api.ts`
- Requirements source: `agents/notes/api_spec.md`
- Flow source: `agents/notes/sequence_flows.md`
- Existing tests source: `api/test/*.test.js`

## Coverage Legend
- `L` = Logic covered by existing unit/integration tests (mostly mocked dependencies)
- `P` = Firebase persistence covered (read/write verified against Firestore emulator state)
- `GAP` = Not covered

Current reality:
- Most endpoints: `L=yes`, `P=GAP`
- Missing spec endpoint implementation: `PATCH /api/auctions/{auctionId}/membership`

---

## Endpoint Scenarios and Coverage

| Endpoint | Required Firebase Scenarios | Existing Tests | L | P |
|---|---|---|---|---|
| `GET /api/users/me` | `USR-01` reads persisted user profile; `USR-02` includes session fallback based on persisted membership/auction state | `api.usersMe.test.js` | yes | GAP |
| `POST /api/admin/purge-pii` | `PII-01` redacts PII fields in users for target auction; `PII-02` leaves non-PII fields intact | `api.piiPurgeManual.test.js`, `piiPurge.test.js` | yes | GAP |
| `POST /api/auctions` | `AUC-01` creates persisted auction document with code/status/settings | `api.auctions.test.js` | yes | GAP |
| `GET /api/auctions` | `AUC-02` reads auctions from persisted store with role scope | `api.auctionsRead.test.js` | yes | GAP |
| `GET /api/auctions/joined` | `AUC-03` reads joined auctions from persisted memberships | `api.auctionsJoined.test.js` | yes | GAP |
| `GET /api/auctions/{auctionId}` | `AUC-04` reads single auction from persisted store | `api.auctionsRead.test.js` | yes | GAP |
| `PATCH /api/auctions/{auctionId}` | `AUC-05` persists auction field updates | `api.auctions.test.js` | yes | GAP |
| `POST /api/auctions/{auctionId}/join` | `AUC-06` persists membership; `AUC-07` allocates unique bidder number; `AUC-08` updates `user.last_auction_id` | `api.auctionJoin.test.js`, `integration.bidFlow.test.js` | yes | GAP |
| `PATCH /api/auctions/{auctionId}/code` | `AUC-09` persists new unique code and index behavior | `api.auctionCode.test.js` | yes | GAP |
| `PATCH /api/auctions/{auctionId}/phase` | `AUC-10` persists manual phase override and schedule writes | `api.auctionPhase.test.js`, `integration.phaseAutoAdvance.test.js` | yes | GAP |
| `PATCH /api/auctions/{auctionId}/notifications` | `AUC-11` persists in-app notification setting | `api.auctionNotifications.test.js` | yes | GAP |
| `PATCH /api/auctions/{auctionId}/membership` (spec) | `AUC-12` persists admin role override in membership | none (endpoint missing) | no | GAP |
| `POST /api/auctions/{auctionId}/switch` | `AUC-13` persists `user.last_auction_id` switch | `api.auctionSwitch.test.js` | yes | GAP |
| `GET /api/auctions/{auctionId}/totals/me` | `TOT-01` reads persisted totals row for current bidder | `api.totalsMe.test.js` | yes | GAP |
| `GET /api/auctions/{auctionId}/totals` | `TOT-02` reads persisted totals list for auction | `api.totalsAdmin.test.js` | yes | GAP |
| `PATCH /api/auctions/{auctionId}/payments/{bidderId}` | `TOT-03` persists payment status update on totals row | `api.paymentStatus.test.js`, `integration.totalsStatus.test.js` | yes | GAP |
| `PATCH /api/auctions/{auctionId}/pickup/{itemId}` | `ITEM-01` persists picked-up flag for item | `api.pickupStatus.test.js`, `integration.totalsStatus.test.js` | yes | GAP |
| `GET /api/auctions/{auctionId}/reports` | `RPT-01` reads persisted items/bids/winners/totals and computes summary | `api.reportsSummary.test.js` | yes | GAP |
| `GET /api/auctions/{auctionId}/reports/export?format=csv` | `RPT-02` reads persisted totals and exports CSV rows | `api.reportsExport.test.js` | yes | GAP |
| `GET /api/auctions/{auctionId}/items/qr-pdf` | `QR-01` reads persisted auction items and generates per-item PDF pages | `api.qrPdf.test.js` | yes | GAP |
| `POST /api/auctions/{auctionId}/items` | `ITEM-02` creates persisted item | `api.itemsWrite.test.js` | yes | GAP |
| `GET /api/auctions/{auctionId}/items` | `ITEM-03` reads persisted item list | `api.itemsRead.test.js` | yes | GAP |
| `GET /api/items/{itemId}` | `ITEM-04` reads persisted item detail | `api.itemsRead.test.js` | yes | GAP |
| `PATCH /api/items/{itemId}` | `ITEM-05` persists item edits | `api.itemsWrite.test.js` | yes | GAP |
| `DELETE /api/items/{itemId}` | `ITEM-06` persists item deletion | `api.itemsDelete.test.js` | yes | GAP |
| `POST /api/items/{itemId}/image` | `IMG-01` persists image metadata and item image reference; `IMG-02` persists variant metadata | `api.imageUploadStorage.test.js` | yes | GAP |
| `POST /api/items/{itemId}/bids` | `BID-01` persists bid record; `BID-02` transactional ordering; `BID-03` persists totals side effect; `BID-04` persists outbid notification side effect; `BID-05` persists audit side effect | `api.biddingOrdering.test.js`, `api.biddingValidation.test.js`, `api.biddingTotals.test.js`, `api.notificationsOutbid.test.js`, `api.biddingAudit.test.js`, `integration.bidFlow.test.js` | yes | GAP |
| `GET /api/items/{itemId}/bids` | `BID-06` reads persisted bid history with deterministic sort | `api.bidsAdminList.test.js` | yes | GAP |
| `DELETE /api/bids/{bidId}` | `BID-07` persists deletion and audit side effect | `api.bidsAdminDelete.test.js` | yes | GAP |
| `POST /api/items/{itemId}/winner` | `LIVE-01` persists live winner; `LIVE-02` persists totals adjustments; `LIVE-03` persists audit entry | `api.liveWinner.test.js` | yes | GAP |
| `GET /api/items/{itemId}/qr` | `QR-02` reads persisted item and emits item deep-link QR payload | `api.qr.test.js` | yes | GAP |
| `GET /api/notifications` | `NTF-01` reads persisted notifications sorted/paginated | `api.notificationsRead.test.js` | yes | GAP |
| `PATCH /api/notifications/{notificationId}` | `NTF-02` persists `readAt` for one notification | `api.notificationsRead.test.js` | yes | GAP |
| `PATCH /api/notifications/mark-all-read` | `NTF-03` persists `readAt` for all current user notifications | `api.notificationsRead.test.js` | yes | GAP |

---

## Scheduled Function Scenarios

| Function | Required Firebase Scenarios | Existing Tests | L | P |
|---|---|---|---|---|
| `autoAdvanceAuctionPhases` | `SCH-01` reads persisted phase schedules; `SCH-02` persists status transitions idempotently | `phaseAutoAdvance.test.js`, `integration.phaseAutoAdvance.test.js` | yes | GAP |
| `purgeClosedAuctionPii` | `SCH-03` reads persisted auctions; `SCH-04` purges only closed+180d; `SCH-05` persists redaction results | `piiPurge.test.js` | yes | GAP |

---

## Detailed Scenario List (Canonical IDs)

### Users/Auth
- `USR-01` `GET /users/me` returns profile from persisted users collection.
- `USR-02` `GET /users/me` session fallback (`resume` vs `join_or_switch`) is derived from persisted `lastAuctionId`, membership state, and auction status.

### Auctions
- `AUC-01` create auction persists full auction record.
- `AUC-02` list auctions reads persisted role-scoped records.
- `AUC-03` joined list reads persisted memberships.
- `AUC-04` auction detail reads persisted auction document.
- `AUC-05` auction patch persists mutable fields.
- `AUC-06` join persists membership document.
- `AUC-07` join persists unique bidder number.
- `AUC-08` join persists `lastAuctionId`.
- `AUC-09` code patch persists unique code/index update.
- `AUC-10` phase patch persists phase/schedule update.
- `AUC-11` notification-setting patch persists `inAppEnabled`.
- `AUC-12` membership patch persists admin role override (spec-required, currently missing endpoint).
- `AUC-13` switch persists `lastAuctionId`.

### Items/Images
- `ITEM-01` pickup patch persists `pickedUp`.
- `ITEM-02` item create persists document.
- `ITEM-03` item list reads persisted documents.
- `ITEM-04` item detail reads persisted document.
- `ITEM-05` item patch persists edits.
- `ITEM-06` item delete removes persisted document.
- `IMG-01` image upload persists image metadata and item image reference.
- `IMG-02` image variants are persisted.

### Bidding/Live/Totals
- `BID-01` bid post persists bid document.
- `BID-02` bid ordering is transactionally enforced.
- `BID-03` bid side effect persists totals update.
- `BID-04` bid side effect persists outbid notification.
- `BID-05` bid side effect persists audit log entry.
- `BID-06` bid list reads persisted bids in deterministic order.
- `BID-07` bid delete removes persisted bid and audit logs action.
- `LIVE-01` live winner assignment persists live winner document.
- `LIVE-02` live winner assignment persists totals adjustments.
- `LIVE-03` live winner assignment persists audit log entry.
- `TOT-01` totals/me reads persisted row for actor.
- `TOT-02` totals list reads persisted rows.
- `TOT-03` payment patch persists `paid`.

### Notifications
- `NTF-01` notifications list reads persisted records sorted/paged.
- `NTF-02` mark-one persists `readAt`.
- `NTF-03` mark-all persists `readAt` across user records.

### Reports/QR/PDF
- `RPT-01` report summary reads persisted domain state and computes metrics.
- `RPT-02` report export reads persisted totals and emits CSV.
- `QR-01` qr-pdf reads persisted items and emits one page per item.
- `QR-02` item-qr reads persisted item and emits deep-link payload.

### Scheduled + PII Purge
- `SCH-01` auto-advance reads persisted phase data.
- `SCH-02` auto-advance persists transitions idempotently.
- `SCH-03` purge job reads persisted auction records.
- `SCH-04` purge job only targets closed+retention-eligible auctions.
- `SCH-05` purge job/manual trigger persist redacted user fields.

---

## Coverage Validation Summary

1. Scenario count: 42 canonical Firebase scenarios.
2. Logic-level automated coverage: present for most implemented endpoints.
3. Firebase persistence coverage: currently missing (`P=GAP`) for all 42 scenarios.
4. Spec/implementation mismatch:
   - `PATCH /api/auctions/{auctionId}/membership` is in spec but not implemented in `api/src/api.ts`.
5. Additional logic-level behavior gaps discovered outside persistence coverage:
   - `PATCH /api/notifications/{notificationId}` owner authorization is not enforced.
   - `POST /api/items/{itemId}/bids` does not enforce email verification before bidding.
   - effective role down-scope via `AuctionMembership.role_override` is not applied in endpoint authorization checks.
   - audit logging is incomplete for multiple state-changing endpoints.

## Required Next Step (Confidence Recovery)
Create emulator-backed persistence integration tests that execute HTTP handlers/functions against Firestore emulator state for every scenario ID above, then require `P=yes` before endpoint is considered done.
