# System Gap Register

## Purpose
This document records all currently identified gaps between implemented software and the design/requirements documents. It is an analysis artifact only; no remediation is proposed or applied here.

Decision dependencies for conflicting requirements are tracked in:
- `agents/notes/design_decision_register.md`

## Sources Reviewed
- `Auction_System_Requirements.md`
- `Auction_System_User_Stories.md`
- `agents/notes/design.md`
- `agents/notes/sequence_flows.md`
- `agents/notes/data_model.md`
- `agents/notes/api_spec.md`
- `agents/notes/implementation_task_list.md`
- `api/src/api.ts`
- `api/src/repositories/*.ts`
- `api/test/*.test.js`
- `lib/main.dart`
- `test/widget_test.dart`

## Severity Legend
- `Critical`: Core behavior contradicts required product behavior.
- `High`: Major capability is missing or materially incomplete.
- `Medium`: Contract/model inconsistency likely to cause integration or maintenance failures.
- `Low`: Non-blocking but documented requirement/design drift.

## Resolved Design Decisions Applied
1. Reports and QR/PDF access: `AdminL1/AdminL2`.
2. Canonical API request/response field naming: camelCase.
3. Firestore layout: flat top-level collections with `auctionId` scoping.
4. Backend source of truth: `api/` only; `functions/` legacy removal tracked.
5. Legacy policy: no in-repo runtime archive; rely on git history.

## Gap Inventory

### Critical Gaps
1. `GAP-C01` Bidder and admin end-to-end UI journeys are not implemented as functional app flows.
   - Evidence: `lib/main.dart` only drives a hard-coded bidder stage machine with canned data; most admin screens exist as isolated widgets with no navigation shell or route map.
2. `GAP-C02` Frontend is not integrated with Firebase Auth, Firestore, or backend API.
   - Evidence: `pubspec.yaml` has no `firebase_*`, `cloud_firestore`, or HTTP client dependencies; `lib/main.dart` contains no API/Firebase usage.
3. `GAP-C03` Data displayed in the UI is static and non-persistent.
   - Evidence: hard-coded auctions/items/notifications in `lib/main.dart`; no repository/service layer.
4. `GAP-C04` Bid write path is not truly atomic compare-and-swap and can persist losing bids.
   - Evidence: `handlePostItemBids` validates before write, writes via `createBid`, then checks high bid after write; losing bid can remain stored and still return `outbid`.
5. `GAP-C05` Bid totals logic does not match auction semantics.
   - Evidence: `handlePostItemBids` increments totals by each accepted bid amount, which over-counts bidder liability for iterative bidding on the same item.
6. `GAP-C06` Required endpoint is missing: `PATCH /api/auctions/{auctionId}/membership`.
   - Evidence: specified in `agents/notes/api_spec.md`, not routed/implemented in `api/src/api.ts`.
7. `GAP-C07` Firebase persistence is not verified for endpoint behavior.
   - Evidence: `agents/notes/firebase_endpoint_test_scenarios.md` marks persistence `P=GAP` for all canonical scenarios.
8. `GAP-C08` Effective role resolution (global role + role override down-scope) is not enforced in API authorization.
   - Evidence: `api/src/roles.ts` defines `resolveEffectiveRole`, but `api/src/api.ts` role checks use `actor.role` only and do not apply membership `roleOverride`.

### High Gaps
1. `GAP-H01` No real navigation architecture for bidder/admin flows defined in sequence flows.
2. `GAP-H02` No session restoration behavior in frontend despite backend `sessionReturn` capability.
3. `GAP-H03` No UI implementation for phase-aware feature gating (Setup/Ready/Open/Pending/Complete/Closed matrix).
4. `GAP-H04` Bidder browsing rules by phase are not enforced end-to-end.
5. `GAP-H05` Checkout/pickup flow restrictions by phase are not enforced in API (`Complete` phase requirement not checked in payment/pickup handlers).
7. `GAP-H07` Auction listing for non-L1 admins is effectively unimplemented in default dependencies.
   - Evidence: `listAuctionsForActor` returns `[]` for non-`AdminL1`.
8. `GAP-H08` Auction code uniqueness is not enforced on auction creation.
   - Evidence: uniqueness guard exists in code-change path, not in create path.
9. `GAP-H09` Auction join flow does not emit required audit event `membership_role_changed`.
10. `GAP-H10` Image upload contract mismatch: spec requires multipart file upload; implementation expects JSON metadata fields.
11. `GAP-H11` Requirement says image uploads of any size are accepted/scaled; implementation rejects large files (`>10MB`).
12. `GAP-H12` Email verification resend-throttle flow is not implemented in API or frontend.
13. `GAP-H13` Notification deep-link and item refresh behavior is not wired to real state transitions.
14. `GAP-H14` Payment URL UX requirement (open external, return by closing tab) is only local callback UI, not real integration.
15. `GAP-H15` Email verification is not enforced before bidding at API layer.
   - Evidence: no `emailVerifiedAt` guard in `handlePostItemBids` actor validation.
16. `GAP-H16` Notification ownership check is missing on `PATCH /api/notifications/{notificationId}`.
   - Evidence: handler authenticates actor but does not verify notification belongs to current user before marking read.
17. `GAP-H17` Audit logging coverage is incomplete for required mutable actions.
   - Missing logs include: auction create/update/code/phase/notifications, join membership changes, item create/update/delete, payment updates, pickup updates, report export.
18. `GAP-H18` Minimum bid increment of `$1` is not explicitly enforced at API contract level.
   - Current logic enforces `amount > currentHighBid`, but does not separately enforce increment relative to starting price/current price in all paths.

### Medium Gaps
1. `GAP-M03` Notification read-all response drift: spec `{updated}` vs implementation `{updatedCount}`.
2. `GAP-M04` Bid creation response drift: spec `Bid`; implementation `{bid, currentHighBid}`.
3. `GAP-M05` Notification type drift: spec `outbid_in_app`; implementation writes `"outbid"`.
4. `GAP-M06` Audit action naming drift: expected `bid_removed`; implementation logs `bid_deleted`.
5. `GAP-M08` Data model entities `PaymentStatus` and `PickupStatus` are not represented as first-class records; state is embedded instead.
6. `GAP-M09` Notification model fields `status` and `delivery_channel` are missing.
7. `GAP-M10` Accessibility requirements (WCAG 2.1 AA, keyboard/screen-reader support) are not validated by tests or documented checks.
8. `GAP-M11` Device/browser support matrix is not validated in test strategy.
9. `GAP-M12` UI currently includes dead-end screens and disconnected controls (actions with no side effects beyond local widget state).
10. `GAP-M13` Phase auto-advance logic uses UTC timestamps directly and does not demonstrate explicit auction-time-zone aware evaluation from requirement wording.
11. `GAP-M15` Admin capability drift due to dependency defaults:
   - several L2/L3 permission checks depend on auction visibility lookup that is unimplemented for non-L1 in default dependencies.

### Low Gaps
1. `GAP-L01` Coexistence of legacy `functions/` codebase and active `api/` codebase creates maintenance ambiguity.
2. `GAP-L02` Placeholder QR/PNG/PDF payload generation is deterministic but not production-grade asset generation.
3. `GAP-L03` README/runtime guidance does not yet include full end-to-end manual acceptance checklist across bidder and admin journeys.
4. `GAP-L04` Repository structure is not cleanly normalized for a single source of truth backend.
   - `api/` is the active Cloud Functions codebase, while `functions/` remains present as legacy code.
5. `GAP-L06` Repo hygiene tasks are not tracked as implementation requirements.
   - Cleanup tasks must be explicitly tracked and completed with validation.

## Repository Cleanup Tasks To Address
1. Remove legacy `functions/` directory after confirming no runtime/deploy dependency remains.
2. Ensure `firebase.json` and all operational docs reference only the active backend codebase (`api/`).
3. Add/update a short architecture note documenting single-backend source-of-truth (`api/`) and deprecation of `functions/`.
4. Verify CI/dev scripts do not invoke `functions/` paths.
5. Re-run backend lint/test and emulator smoke checks after cleanup.
6. Commit cleanup as a dedicated change with explicit rationale in commit message.

## Endpoint Persistence Scenario Coverage Status
- Canonical scenario definitions and endpoint mapping are documented in:
  - `agents/notes/firebase_endpoint_test_scenarios.md`
- Current coverage finding:
  - logic-level tests mostly exist
  - persistence-level verification against emulator remains missing across all scenarios

## Frontend Coverage Status
1. Existing widget tests (`test/widget_test.dart`) primarily verify isolated widget rendering and local validation.
2. No tests verify:
   - navigation across full bidder journey
   - navigation across admin journey
   - API integration behavior
   - Firestore persistence side effects from user actions
   - role/phase gated behavior driven by live backend state

## Summary
The implementation currently passes local unit/widget suites but does not satisfy the system requirements for end-to-end user workflows, data persistence confidence, and contract consistency. The critical gaps are concentrated in frontend integration, bid transaction correctness semantics, and missing persistence-backed validation coverage.
