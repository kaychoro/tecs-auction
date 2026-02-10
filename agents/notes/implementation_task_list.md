# Implementation Task List (Ordered)

This list is ordered by dependency and execution sequence. Each task includes required unit tests.

1) Project scaffolding: config + constants
   - Add shared config for Firebase project, collections, and environment constants.
   - Unit tests:
     - config loads expected defaults for local/dev.

2) Shared error helper
   - Implement error builder for standard payloads.
   - Unit tests:
     - error helper formats (code/message/details).

3) Auth guard (Firebase ID token)
   - Implement auth middleware to validate Firebase ID token.
   - Unit tests:
     - valid token passes, missing token returns 401.

4) Role resolution logic
   - Implement effective role (global role + role_override down-scope).
   - Unit tests:
     - role resolution (global role vs override).

5) Membership guard
   - Implement membership guard for auction-scoped endpoints.
   - Unit tests:
     - guard denies users without membership.

6) HTTP error mapping utility
   - Add HTTP error mapping utility for common failure cases.
   - Unit tests:
     - error mapping returns correct status and code.

7) Firestore repo: auctions
   - Implement repositories for auctions.
   - Add consistent timestamps (server time) and ID generation.
   - Unit tests:
     - create/update/get behaviors (happy path + not found).

8) Firestore repo: memberships
   - Implement repositories for auction memberships.
   - Unit tests:
     - create/update/get behaviors (happy path + not found).

9) Firestore repo: items
   - Implement repositories for items.
   - Unit tests:
     - create/update/get behaviors (happy path + not found).

10) Firestore repo: images
   - Implement repositories for images.
   - Unit tests:
     - create/update/get behaviors (happy path + not found).

11) Firestore repo: bids
   - Implement bid write transactions.
   - Unit tests:
     - bid write creates bid record.

12) Firestore repo: derived bid views
   - Implement read-model queries for current high bid.
   - Unit tests:
     - derived view returns expected current high bid.

13) Firestore repo: notifications
   - Implement repositories for notifications.
   - Unit tests:
     - notification write and read.

14) Firestore repo: totals
   - Implement repositories for totals.
   - Unit tests:
     - totals write and read.

15) Firestore repo: audit logs
   - Implement repositories for audit logs.
   - Unit tests:
     - audit log write and read.

16) Audit logging helper
   - Implement shared audit log helper.
   - Unit tests:
     - audit log entry created with correct action/metadata.

17) Auctions API: create + update
   - POST /api/auctions (create).
   - PATCH /api/auctions/{auctionId} (update fields).
   - Unit tests:
     - create/update validations.

18) Auctions API: code change + uniqueness
   - PATCH /api/auctions/{auctionId}/code (code change).
   - Enforce auction_code uniqueness document/guard.
   - Unit tests:
     - auction_code uniqueness guard and conflict response.

19) Auctions API: phase override
   - PATCH /api/auctions/{auctionId}/phase (manual override).
   - Unit tests:
     - phase override permissions.

20) Auctions: phase auto-advance job
   - Scheduled function for phase auto-advance with DB guard.
   - Unit tests:
     - auto-advance idempotency guard.

21) Auction join API
   - POST /api/auctions/{auctionId}/join (auction code validation).
   - Unit tests:
     - join success.
     - invalid code (404).
     - membership_exists conflict.

22) Bidder number allocation
   - Implement per-auction bidder_number counter transaction.
   - Unit tests:
     - bidder_number uniqueness under concurrent requests.

23) last_auction_id updates
   - Update user.last_auction_id on join and switch.
   - Unit tests:
     - last_auction_id update on join/switch.

24) Items API: create + update
   - POST /api/auctions/{auctionId}/items.
   - PATCH /api/items/{itemId}.
   - Unit tests:
     - create/update validation and role checks.

25) Items API: list + detail + delete
   - GET /api/auctions/{auctionId}/items.
   - GET /api/items/{itemId}.
   - DELETE /api/items/{itemId}.
   - Unit tests:
     - list/detail access rules.
     - delete permission checks.

26) Image upload: storage
   - Image upload endpoint with storage and metadata write.
   - Unit tests:
     - image upload rejects invalid size/type.

27) Image upload: variant generation
   - Generate scaled variants (320/640/1024) and store variant metadata.
   - Unit tests:
     - image variant metadata stored correctly.

28) Bidding API: transaction ordering
   - POST /api/items/{itemId}/bids with transaction ordering.
   - Unit tests:
     - bid accepted (first bid, higher bid).
     - tie-breaker ordering correctness.

29) Bidding API: validation and errors
   - Validate Open phase, membership, and amount rules.
   - Unit tests:
     - bid_too_low and outbid cases.
     - phase_closed rejection.

30) Bidding side effects: derived view + audit
   - Update derived high bid view + audit log.
   - Unit tests:
     - audit log entry created for bid.

31) Bidding side effects: totals + race tests
   - Update totals on bid placement.
   - Unit tests:
     - totals updated on bid placement.
     - concurrent bid race ordering (transaction conflict simulation).

32) Notifications: create outbid
   - Create outbid notification on successful higher bid.
   - Unit tests:
     - notification created for displaced bidder only.

33) Notifications: list + read
   - GET /api/notifications (paging, newest first).
   - PATCH /api/notifications/{notificationId} and mark-all-read.
   - Unit tests:
     - list returns sorted order and pagination.
     - mark-read updates read_at.

34) Totals computation
   - Totals store/recompute logic (invoice strategy).
   - Unit tests:
     - totals update on bid placement.

35) Totals endpoint: bidder view
   - GET /api/auctions/{auctionId}/totals/me.
   - Unit tests:
     - bidder totals shape and access rules.

36) Totals endpoint: admin view
   - GET /api/auctions/{auctionId}/totals.
   - Unit tests:
     - admin totals shape and role checks.

37) Payment status endpoint
   - PATCH /api/auctions/{auctionId}/payments/{bidderId}.
   - Unit tests:
     - payment status updates with role checks.

38) Pickup status endpoint
   - PATCH /api/auctions/{auctionId}/pickup/{itemId}.
   - Unit tests:
     - pickup status updates with role checks.

39) Live winner assignment
   - POST /api/items/{itemId}/winner (Pending+).
   - Update totals and audit log.
   - Unit tests:
     - winner assignment validation.
     - phase and role checks.

40) Reports summary endpoint
   - GET /api/auctions/{auctionId}/reports (summary).
   - Unit tests:
     - report summary content.

41) Reports CSV export endpoint
   - GET /api/auctions/{auctionId}/reports/export?format=csv.
   - Unit tests:
     - export permission (L1/L2 only).

42) QR endpoint
   - GET /api/items/{itemId}/qr (image/png).
   - Unit tests:
     - QR encodes correct item deep link.

43) QR PDF endpoint
   - GET /api/auctions/{auctionId}/items/qr-pdf (application/pdf).
   - Unit tests:
     - PDF contains one item per page.

44) Session return fallback
   - Implement fallback to join/switch if closed/revoked.
   - Unit tests:
     - fallback path when auction is closed.

45) Frontend bidder: registration screen
   - Implement registration screen (email, phone, display_name).
   - Unit tests:
     - widget tests for validation errors.

46) Frontend bidder: verification + join screens
   - Implement registration, verification, and auction join screens.
   - Unit tests:
     - widget tests for verification state and join flow validation.

47) Frontend bidder: item list
   - Implement auction item list.
   - Unit tests:
     - widget tests for list rendering and empty state.

48) Frontend bidder: item detail
   - Implement auction item list and item detail with bid controls.
   - Unit tests:
     - widget tests for bid controls rendering and current bid display.

49) Frontend bidder: bid confirmation/errors
   - Implement bid confirmation and error handling UI.
   - Unit tests:
     - widget tests for bid confirmation/error states.

50) Frontend bidder: notifications
   - Implement notifications list with deep-link and refresh behavior.
   - Unit tests:
     - widget tests for notification deep-link routing.

51) Frontend admin: auction list + create
   - Implement auction list and create screens.
   - Unit tests:
     - widget tests for list and create validation.

52) Frontend admin: auction edit
   - Implement auction edit screen (name, time zone, payment URL).
   - Unit tests:
     - widget tests for role-gated edit screen.

53) Frontend admin: phase override
   - Implement phase override UI.
   - Unit tests:
     - widget tests for role-gated override screen.

54) Frontend admin: item list + create/edit
   - Implement item management (CRUD + image upload).
   - Unit tests:
     - widget tests for item create/edit validations.

55) Frontend admin: item image upload
   - Implement image upload UI with preview and error states.
   - Unit tests:
     - widget tests for invalid image handling.

56) Frontend admin: totals view
   - Implement totals view for admin.
   - Unit tests:
     - widget tests for totals table rendering.

57) Frontend admin: payment/pickup updates
   - Implement totals, payment, and pickup status screens.
   - Unit tests:
     - widget tests for payment/pickup update flows.

58) Frontend admin: reports + CSV export
   - Implement report summary and CSV export UI actions.
   - Unit tests:
     - widget tests for export actions.

59) Frontend admin: QR/PDF actions
   - Implement report export and QR/PDF generation UI actions.
   - Unit tests:
     - widget tests for QR/PDF action triggers.

60) PII purge: scheduled job
   - Implement scheduled purge job for closed auctions + 180 days.
   - Unit tests:
     - purge selection logic based on age/phase.

61) PII purge: manual trigger
   - Implement L1-triggered immediate purge endpoint.
   - Unit tests:
     - role check and purge behavior.

62) PII purge: redaction logic
   - Redact PII fields while preserving audit log entries.
   - Unit tests:
     - redaction behavior leaves non-PII intact.

63) Integration tests: bid flow
   - End-to-end bid flow (join -> bid -> outbid -> notification).
   - Tests:
     - integration test for bid flow.

64) Integration tests: phase auto-advance
   - Phase auto-advance flow with manual override precedence.
   - Tests:
     - integration test for auto-advance precedence.

65) Integration tests: totals and status
   - Totals and payment/pickup updates.
   - Tests:
     - integration test for totals and status updates.
