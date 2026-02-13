# Implementation Task List (Ordered)

This list is ordered by dependency and execution sequence. Each task includes required unit tests.

1) ✓ Project scaffolding: config + constants
   - Add shared config for Firebase project, collections, and environment constants.
   - Unit tests:
     - config loads expected defaults for local/dev.

2) ✓ Shared error helper
   - Implement error builder for standard payloads.
   - Unit tests:
     - error helper formats (code/message/details).

3) ✓ Auth guard (Firebase ID token)
   - Implement auth middleware to validate Firebase ID token.
   - Unit tests:
     - valid token passes, missing token returns 401.

4) ✓ Role resolution logic
   - Implement effective role (global role + role_override down-scope).
   - Unit tests:
     - role resolution (global role vs override).

5) ✓ Membership guard
   - Implement membership guard for auction-scoped endpoints.
   - Unit tests:
     - guard denies users without membership.

6) ✓ HTTP error mapping utility
   - Add HTTP error mapping utility for common failure cases.
   - Unit tests:
     - error mapping returns correct status and code.

7) ✓ Firestore repo: auctions
   - Implement repositories for auctions.
   - Add consistent timestamps (server time) and ID generation.
   - Unit tests:
     - create/update/get behaviors (happy path + not found).

8) ✓ Firestore repo: memberships
   - Implement repositories for auction memberships.
   - Unit tests:
     - create/update/get behaviors (happy path + not found).

9) ✓ Firestore repo: users
   - Implement repositories for users.
   - Unit tests:
     - get/update behaviors (happy path + not found).

10) ✓ Firestore repo: items
   - Implement repositories for items.
   - Unit tests:
     - create/update/get behaviors (happy path + not found).

11) ✓ Firestore repo: images
   - Implement repositories for images.
   - Unit tests:
     - create/update/get behaviors (happy path + not found).

12) ✓ Firestore repo: bids
   - Implement bid write transactions.
   - Unit tests:
     - bid write creates bid record.

13) ✓ Firestore repo: derived bid views
   - Implement read-model queries for current high bid.
   - Unit tests:
     - derived view returns expected current high bid.

14) ✓ Firestore repo: notifications
   - Implement repositories for notifications.
   - Unit tests:
     - notification write and read.

15) ✓ Firestore repo: totals
   - Implement repositories for totals.
   - Unit tests:
     - totals write and read.

16) ✓ Firestore repo: audit logs
   - Implement repositories for audit logs.
   - Unit tests:
     - audit log write and read.

17) ✓ Audit logging helper
   - Implement shared audit log helper.
   - Unit tests:
     - audit log entry created with correct action/metadata.

18) ✓ Users API: profile
   - GET /api/users/me.
   - Unit tests:
     - returns current user profile.

19) ✓ Auctions API: create + update
   - POST /api/auctions (create).
   - PATCH /api/auctions/{auctionId} (update fields).
   - Unit tests:
     - create/update validations.

20) ✓ Auctions API: list + detail
   - GET /api/auctions.
   - GET /api/auctions/{auctionId}.
   - Unit tests:
     - list scope by role.
     - detail access rules.

21) ✓ Auctions API: joined list
   - GET /api/auctions/joined.
   - Unit tests:
     - returns only joined auctions.

22) ✓ Auctions API: code change + uniqueness
   - PATCH /api/auctions/{auctionId}/code (code change).
   - Enforce auction_code uniqueness document/guard.
   - Unit tests:
     - auction_code uniqueness guard and conflict response.

23) ✓ Auctions API: phase override
   - PATCH /api/auctions/{auctionId}/phase (manual override).
   - Unit tests:
     - phase override permissions.

24) ✓ Auctions API: notification settings
   - PATCH /api/auctions/{auctionId}/notifications.
   - Unit tests:
     - update notification settings with role checks.

25) ✓ Auctions: phase auto-advance job
   - Scheduled function for phase auto-advance with DB guard.
   - Unit tests:
     - auto-advance idempotency guard.

26) ✓ Auction join API
   - POST /api/auctions/{auctionId}/join (auction code validation).
   - Unit tests:
     - join success.
     - invalid code (404).
     - membership_exists conflict.

27) ✓ Bidder number allocation
   - Implement per-auction bidder_number counter transaction.
   - Unit tests:
     - bidder_number uniqueness under concurrent requests.

28) ✓ last_auction_id updates
   - Update user.last_auction_id on join and switch.
   - Unit tests:
     - last_auction_id update on join/switch.

29) ✓ Items API: create + update
   - POST /api/auctions/{auctionId}/items.
   - PATCH /api/items/{itemId}.
   - Unit tests:
     - create/update validation and role checks.

30) ✓ Items API: list + detail
   - GET /api/auctions/{auctionId}/items.
   - GET /api/items/{itemId}.
   - Unit tests:
     - list/detail access rules.

31) ✓ Items API: delete
   - DELETE /api/items/{itemId}.
   - Unit tests:
     - delete permission checks.

32) ✓ Image upload: storage
   - Image upload endpoint with storage and metadata write.
   - Unit tests:
     - image upload rejects invalid size/type.

33) ✓ Image upload: variant generation
   - Generate scaled variants (320/640/1024) and store variant metadata.
   - Unit tests:
     - image variant metadata stored correctly.

34) ✓ Bidding API: transaction ordering
   - POST /api/items/{itemId}/bids with transaction ordering.
   - Unit tests:
     - bid accepted (first bid, higher bid).
     - tie-breaker ordering correctness.

35) ✓ Bidding API: validation and errors
   - Validate Open phase, membership, and amount rules.
   - Unit tests:
     - bid_too_low and outbid cases.
     - phase_closed rejection.

36) ✓ Bidding side effects: derived view + audit
   - Update derived high bid view + audit log.
   - Unit tests:
     - audit log entry created for bid.

37) ✓ Bidding side effects: totals + race tests
   - Update totals on bid placement.
   - Unit tests:
     - totals updated on bid placement.
     - concurrent bid race ordering (transaction conflict simulation).

38) ✓ Bids admin API: list item bids
   - GET /api/items/{itemId}/bids.
   - Unit tests:
     - admin-only access and sort order.

39) ✓ Bids admin API: delete bid
   - DELETE /api/bids/{bidId}.
   - Unit tests:
     - admin-only access and audit log entry.

40) ✓ Notifications: create outbid
   - Create outbid notification on successful higher bid.
   - Respect auction notification settings (disable when in_app_enabled is false).
   - Unit tests:
     - notification created for displaced bidder only.
     - notifications suppressed when disabled.

41) ✓ Notifications: list + read
   - GET /api/notifications (paging, newest first).
   - PATCH /api/notifications/{notificationId} and mark-all-read.
   - Unit tests:
     - list returns sorted order and pagination.
     - mark-read updates read_at.

42) ✓ Totals computation
   - Totals store/recompute logic (invoice strategy).
   - Unit tests:
     - totals update on bid placement.

43) ✓ Totals endpoint: bidder view
   - GET /api/auctions/{auctionId}/totals/me.
   - Unit tests:
     - bidder totals shape and access rules.

44) ✓ Totals endpoint: admin view
   - GET /api/auctions/{auctionId}/totals.
   - Unit tests:
     - admin totals shape and role checks.

45) ✓ Payment status endpoint
   - PATCH /api/auctions/{auctionId}/payments/{bidderId}.
   - Unit tests:
     - payment status updates with role checks.

46) ✓ Pickup status endpoint
   - PATCH /api/auctions/{auctionId}/pickup/{itemId}.
   - Unit tests:
     - pickup status updates with role checks.

47) ✓ Live winner assignment
   - POST /api/items/{itemId}/winner (Pending+).
   - Update totals and audit log.
   - Unit tests:
     - winner assignment validation.
     - phase and role checks.

48) ✓ Reports summary endpoint
   - GET /api/auctions/{auctionId}/reports (summary).
   - Unit tests:
     - report summary content.

49) ✓ Reports CSV export endpoint
   - GET /api/auctions/{auctionId}/reports/export?format=csv.
   - Unit tests:
     - export permission (L1/L2 only).

50) ✓ QR endpoint
   - GET /api/items/{itemId}/qr (image/png).
   - Unit tests:
     - QR encodes correct item deep link.

51) QR PDF endpoint
   - GET /api/auctions/{auctionId}/items/qr-pdf (application/pdf).
   - Unit tests:
     - PDF contains one item per page.

52) Session return fallback
   - Implement fallback to join/switch if closed/revoked.
   - Unit tests:
     - fallback path when auction is closed.

53) Frontend bidder: registration screen
   - Implement registration screen (email, phone, display_name).
   - Unit tests:
     - widget tests for validation errors.

54) Frontend bidder: verification + join screens
   - Implement registration, verification, and auction join screens.
   - Unit tests:
     - widget tests for verification state and join flow validation.

55) Frontend bidder: auction switcher
   - Implement joined auctions switcher UI.
   - Unit tests:
     - widget tests for switching and empty state.

56) Frontend bidder: item list
   - Implement auction item list.
   - Unit tests:
     - widget tests for list rendering and empty state.

57) Frontend bidder: item detail
   - Implement auction item list and item detail with bid controls.
   - Unit tests:
     - widget tests for bid controls rendering and current bid display.

58) Frontend bidder: bid confirmation/errors
   - Implement bid confirmation and error handling UI.
   - Unit tests:
     - widget tests for bid confirmation/error states.

59) Frontend bidder: receipt view
   - Implement receipt view in Closed phase.
   - Unit tests:
     - widget tests for receipt totals display.

60) Frontend bidder: notifications
   - Implement notifications list with deep-link and refresh behavior.
   - Unit tests:
     - widget tests for notification deep-link routing.

61) Frontend bidder: payment URL handling
   - Open payment URL in new tab/window and return by closing.
   - Unit tests:
     - widget tests for payment link behavior.

62) Frontend admin: auction list + create
   - Implement auction list and create screens.
   - Unit tests:
     - widget tests for list and create validation.

63) Frontend admin: auction edit
   - Implement auction edit screen (name, time zone, payment URL).
   - Unit tests:
     - widget tests for role-gated edit screen.

64) Frontend admin: phase override
   - Implement phase override UI.
   - Unit tests:
     - widget tests for role-gated override screen.

65) Frontend admin: notification settings
   - Implement in-app notification toggle per auction.
   - Unit tests:
     - widget tests for toggle behavior and save.

66) Frontend admin: membership assignment
   - Implement membership assignment for L2/L3 admins.
   - Unit tests:
     - widget tests for role assignment flow.

67) Frontend admin: item list + create/edit
   - Implement item management (CRUD + image upload).
   - Unit tests:
     - widget tests for item create/edit validations.

68) Frontend admin: item image upload
   - Implement image upload UI with preview and error states.
   - Unit tests:
     - widget tests for invalid image handling.

69) Frontend admin: totals view
   - Implement totals view for admin.
   - Unit tests:
     - widget tests for totals table rendering.

70) Frontend admin: payment/pickup updates
   - Implement totals, payment, and pickup status screens.
   - Unit tests:
     - widget tests for payment/pickup update flows.

71) Frontend admin: reports + CSV export
   - Implement report summary and CSV export UI actions.
   - Unit tests:
     - widget tests for export actions.

72) Frontend admin: QR/PDF actions
   - Implement report export and QR/PDF generation UI actions.
   - Unit tests:
     - widget tests for QR/PDF action triggers.

73) PII purge: scheduled job
   - Implement scheduled purge job for closed auctions + 180 days.
   - Unit tests:
     - purge selection logic based on age/phase.

74) PII purge: manual trigger
   - Implement L1-triggered immediate purge endpoint.
   - Unit tests:
     - role check and purge behavior.

75) PII purge: redaction logic
   - Redact PII fields while preserving audit log entries.
   - Unit tests:
     - redaction behavior leaves non-PII intact.

76) Integration tests: bid flow
   - End-to-end bid flow (join -> bid -> outbid -> notification).
   - Tests:
     - integration test for bid flow.

77) Integration tests: phase auto-advance
   - Phase auto-advance flow with manual override precedence.
   - Tests:
     - integration test for auto-advance precedence.

78) Integration tests: totals and status
   - Totals and payment/pickup updates.
   - Tests:
     - integration test for totals and status updates.
