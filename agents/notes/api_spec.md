# API Specification (Personas)

## Conventions
- REST-style endpoints under `/api`.
- All requests require authentication; bidder and admin access is scoped by role and auction membership.
- Responses are JSON unless noted.
- Authentication uses Firebase Auth (email verification required) and bearer tokens.
- Clients send `Authorization: Bearer <Firebase ID token>`.
- After re-login, bidders should be routed to their most recent auction.
- API endpoints are implemented as HTTP Cloud Functions and routed via Firebase Hosting under `/api/*`.
- Standard error format:
  - `{ "error": { "code": "<string>", "message": "<string>", "details": { ... } } }`
- List endpoints use `page` and `page_size` query params and optional `sort` (e.g., `sort=created_at:desc`).
- HTTP status conventions:
  - 200 success
  - 400 validation errors (e.g., `bid_too_low`)
  - 403 unauthorized/role issues
  - 404 not found
  - 409 conflict (e.g., `outbid`, `phase_closed`)
  - 429 rate limiting (if enabled)
- Server-side role and auction membership checks are mandatory for all endpoints.

## Schemas (Draft)
### Auction
```
{
  "id": "uuid",
  "name": "string",
  "status": "Setup|Ready|Open|Pending|Complete|Closed",
  "time_zone": "string",
  "phase_schedule": {
    "Setup": {"starts_at": "iso8601", "ends_at": "iso8601"},
    "Ready": {"starts_at": "iso8601", "ends_at": "iso8601"},
    "Open": {"starts_at": "iso8601", "ends_at": "iso8601"},
    "Pending": {"starts_at": "iso8601", "ends_at": "iso8601"},
    "Complete": {"starts_at": "iso8601", "ends_at": "iso8601"},
    "Closed": {"starts_at": "iso8601", "ends_at": "iso8601"}
  },
  "auction_code": "string",
  "notification_settings": {"in_app_enabled": true},
  "payment_url": "string|null",
  "created_by": "uuid",
  "created_at": "iso8601"
}
```

### Item
```
{
  "id": "uuid",
  "auction_id": "uuid",
  "name": "string",
  "description": "string|null",
  "type": "silent|live",
  "starting_price": 0,
  "current_high_bid": 0,
  "current_high_bidder_id": "uuid|null",
  "current_high_bid_placed_at": "iso8601|null",
  "image": {
    "id": "uuid",
    "url": "string",
    "variants": [{"width": 320, "url": "string"}]
  } | null,
  "created_at": "iso8601"
}
```

### Bid
```
{
  "id": "uuid",
  "auction_id": "uuid",
  "item_id": "uuid",
  "bidder_id": "uuid",
  "amount": 0,
  "placed_at": "iso8601"
}
```

### Notification
```
{
  "id": "uuid",
  "type": "outbid_in_app",
  "message": "string",
  "ref_type": "item",
  "ref_id": "uuid",
  "created_at": "iso8601",
  "read_at": "iso8601|null"
}
```

### Bidder Totals (admin view)
```
{
  "bidder_id": "uuid",
  "bidder_number": 0,
  "display_name": "string",
  "subtotal": 0,
  "total": 0,
  "paid": false
}
```

### User
```
{
  "id": "uuid",
  "role": "Bidder|AdminL1|AdminL2|AdminL3",
  "email": "string",
  "phone": "string",
  "email_verified_at": "iso8601|null",
  "display_name": "string",
  "last_auction_id": "uuid|null",
  "created_at": "iso8601"
}
```
## Developer Persona Analysis (Implementation Readiness)
- HTTP status conventions are not defined; required for consistent UI handling.
- Request/response schemas are not defined (field names, required vs. optional), especially for auctions and items.
- Concurrency and idempotency behavior for bids and admin updates are not defined (e.g., ETags, request IDs).

## Authentication & Users
- Firebase Auth handles registration, email verification, login, and session management.
- Resend verification emails are limited to 5 per hour per email (enforce in client or backend guard).
- GET `/api/users/me`
  - Current user profile.

## Auctions
- POST `/api/auctions`
  - Create auction (L1).
- GET `/api/auctions`
  - List auctions (L1 sees all; others see assigned).
- GET `/api/auctions/joined`
  - List auctions the current bidder has joined (used for switching; no global list).
- GET `/api/auctions/{auctionId}`
  - Auction details.
- PATCH `/api/auctions/{auctionId}`
  - Update name, time zone, payment URL (L1/L2).
- POST `/api/auctions/{auctionId}/join`
  - Join auction with auction code.
- PATCH `/api/auctions/{auctionId}/code`
  - Update auction code (L1). Applies to new joiners only; existing bidders remain unaffected.
- PATCH `/api/auctions/{auctionId}/phase`
  - Update auction phase/timing (L1 override only; auto-advance is internal and does not use an API endpoint).
  - Clients update UI state based on auction phase changes; no banner required.
- PATCH `/api/auctions/{auctionId}/notifications`
  - Update notification settings (L1; in-app only in v1).
- PATCH `/api/auctions/{auctionId}/membership`
  - Assign L2/L3 admins to auction (L1).

## Items
- POST `/api/auctions/{auctionId}/items`
  - Create item (L2+).
- GET `/api/auctions/{auctionId}/items`
  - List items (phase-dependent for bidders).
- GET `/api/items/{itemId}`
  - Item detail (if no bids, starting price is the current displayed bid).
- PATCH `/api/items/{itemId}`
  - Update item (L2+).
- DELETE `/api/items/{itemId}`
  - Remove item (L2+).
- POST `/api/items/{itemId}/image`
  - Upload/replace item image (L2+; direct multipart upload).

## Bidding
- POST `/api/items/{itemId}/bids`
  - Place bid (bidder; Open phase only).
  - Failure responses include a reason code for UI display: `phase_closed`, `bid_too_low`, `outbid`.
  - Client should surface network errors and allow manual retry (no auto-retry).
  - Client presents a confirmation step before sending the request and refreshes item detail after submission.
- DELETE `/api/bids/{bidId}`
  - Remove bid (L2+; logged in audit trail).
- GET `/api/items/{itemId}/bids`
  - Bid history (admin).

## Live Auction
- POST `/api/items/{itemId}/winner`
  - Assign live winner and final price (L2+; Pending+).

## Totals & Status
- GET `/api/auctions/{auctionId}/totals/me`
  - Bidder running totals and won items.
- GET `/api/auctions/{auctionId}/totals`
  - Admin view of real-time totals per bidder (L3+).
- PATCH `/api/auctions/{auctionId}/payments/{bidderId}`
  - Mark paid/unpaid (L3+).
- PATCH `/api/auctions/{auctionId}/pickup/{itemId}`
  - Mark item picked up (L3+).
- External payment URL should open in a new tab; bidders return by closing the tab.

## Notifications
- GET `/api/notifications`
  - List in-app notifications for current user.
- Each notification includes:
  - `id`, `type`, `message`, `created_at`, `read_at`
  - `ref_type` and `ref_id` (e.g., `item` and `itemId`) to link the notification to the relevant entity
- Clients should deep-link to the referenced entity when a notification is tapped.
- Clients may refresh the referenced entity when a notification is received, especially if it matches the currently viewed item.
- PATCH `/api/notifications/{notificationId}`
  - Mark notification as read.
- PATCH `/api/notifications/mark-all-read`
  - Mark all notifications as read.

## Reports & Exports
- GET `/api/auctions/{auctionId}/reports`
  - Summary reports (admin).
- GET `/api/auctions/{auctionId}/reports/export?format=csv`
  - CSV export (admin; L1/L2).

## QR & PDF
- GET `/api/items/{itemId}/qr`
  - QR code (image).
- QR codes deep-link to item detail pages and are intended to be scanned with the device camera app (no in-app scanner).
- GET `/api/auctions/{auctionId}/items/qr-pdf`
  - PDF with one item per page (admin).
