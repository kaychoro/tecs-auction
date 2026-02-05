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
  - 401 unauthenticated (missing/invalid token)
  - 403 unauthorized/role issues
  - 404 not found
  - 409 conflict (e.g., `outbid`, `phase_closed`)
  - 429 rate limiting (if enabled)
- Server-side role and auction membership checks are mandatory for all endpoints.

## Schemas (Draft)
Field requirements: unless noted, fields are required in responses; optional fields are marked `optional` in the lists below. Request payloads only accept the fields listed.

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
Required fields: id, name, status, time_zone, phase_schedule, auction_code, notification_settings, created_by, created_at  
Optional fields: payment_url

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
Notes:
- `current_high_bid*` fields are read-only and derived from bids via transactional ordering (not stored as mutable fields on Item).
Required fields: id, auction_id, name, type, starting_price, created_at  
Optional fields: description, image, current_high_bid, current_high_bidder_id, current_high_bid_placed_at

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
Required fields: id, auction_id, item_id, bidder_id, amount, placed_at
Notes:
- `placed_at` is server-generated using Firestore server timestamp and returned as ISO-8601 in UTC.
- Bid ordering is deterministic: amount desc, placed_at asc, bid_id asc.

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
Required fields: id, type, message, ref_type, ref_id, created_at  
Optional fields: read_at

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
Required fields: bidder_id, bidder_number, display_name, subtotal, total, paid

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
Required fields: id, role, email, phone, display_name, created_at  
Optional fields: email_verified_at, last_auction_id

## List Response Envelope
All list endpoints return:
```
{
  "data": [ ... ],
  "page": 1,
  "page_size": 25,
  "total": 0
}
```
Defaults: page=1, page_size=25, max page_size=100.
## Developer Persona Analysis (Implementation Readiness)
- HTTP status conventions are not defined; required for consistent UI handling.
- Request/response schemas are not defined (field names, required vs. optional), especially for auctions and items.
- Concurrency and idempotency behavior for bids and admin updates are not defined (e.g., ETags, request IDs).

## Authentication & Users
- Firebase Auth handles registration, email verification, login, and session management.
- Resend verification emails are limited to 5 per hour per email (enforce in client or backend guard).
- GET `/api/users/me`
  - Current user profile.
  - Response: User

## Auctions
- POST `/api/auctions`
  - Create auction (L1).
  - Request:
    ```
    {
      "name": "string",
      "time_zone": "string",
      "phase_schedule": { ... },
      "auction_code": "string",
      "notification_settings": {"in_app_enabled": true},
      "payment_url": "string|null"
    }
    ```
  - Response: Auction
- GET `/api/auctions`
  - List auctions (L1 sees all; others see assigned).
  - Response: List<Auction>
- GET `/api/auctions/joined`
  - List auctions the current bidder has joined (used for switching; no global list).
  - Response: List<Auction>
- GET `/api/auctions/{auctionId}`
  - Auction details.
  - Response: Auction
- PATCH `/api/auctions/{auctionId}`
  - Update name, time zone, payment URL (L1/L2).
  - Request:
    ```
    {
      "name": "string",
      "time_zone": "string",
      "payment_url": "string|null"
    }
    ```
  - Response: Auction
- POST `/api/auctions/{auctionId}/join`
  - Join auction with auction code.
  - Request:
    ```
    {
      "auction_code": "string"
    }
    ```
  - Response: AuctionMembership summary (auction_id, user_id, bidder_number, role_override|null)
- PATCH `/api/auctions/{auctionId}/code`
  - Update auction code (L1). Applies to new joiners only; existing bidders remain unaffected.
  - Request:
    ```
    {
      "auction_code": "string"
    }
    ```
  - Response: Auction
- PATCH `/api/auctions/{auctionId}/phase`
  - Update auction phase/timing (L1 override only; auto-advance is internal and does not use an API endpoint).
  - Clients update UI state based on auction phase changes; no banner required.
  - Request:
    ```
    {
      "status": "Setup|Ready|Open|Pending|Complete|Closed",
      "phase_schedule": { ... }
    }
    ```
  - Response: Auction
- PATCH `/api/auctions/{auctionId}/notifications`
  - Update notification settings (L1; in-app only in v1).
  - Request:
    ```
    {
      "in_app_enabled": true
    }
    ```
  - Response: Auction
- PATCH `/api/auctions/{auctionId}/membership`
  - Assign L2/L3 admins to auction (L1).
  - Request:
    ```
    {
      "user_id": "uuid",
      "role_override": "AdminL2|AdminL3|null"
    }
    ```
  - Response: AuctionMembership summary

## Items
- POST `/api/auctions/{auctionId}/items`
  - Create item (L2+).
  - Request:
    ```
    {
      "name": "string",
      "description": "string|null",
      "type": "silent|live",
      "starting_price": 0
    }
    ```
  - Response: Item
- GET `/api/auctions/{auctionId}/items`
  - List items (phase-dependent for bidders).
  - Response: List<Item>
- GET `/api/items/{itemId}`
  - Item detail (if no bids, starting price is the current displayed bid).
  - Response: Item
- PATCH `/api/items/{itemId}`
  - Update item (L2+).
  - Request:
    ```
    {
      "name": "string",
      "description": "string|null",
      "type": "silent|live",
      "starting_price": 0
    }
    ```
  - Response: Item
- DELETE `/api/items/{itemId}`
  - Remove item (L2+).
  - Response: `{ "deleted": true }`
- POST `/api/items/{itemId}/image`
  - Upload/replace item image (L2+; direct multipart upload).
  - Request: multipart form-data with `file`
  - Response: Item (with image populated)

## Bidding
- POST `/api/items/{itemId}/bids`
  - Place bid (bidder; Open phase only).
  - Failure responses include a reason code for UI display: `phase_closed`, `bid_too_low`, `outbid`.
  - Client should surface network errors and allow manual retry (no auto-retry).
  - Client presents a confirmation step before sending the request and refreshes item detail after submission.
  - Request:
    ```
    {
      "amount": 0
    }
    ```
  - Response: Bid
- DELETE `/api/bids/{bidId}`
  - Remove bid (L2+; logged in audit trail).
  - Response: `{ "deleted": true }`
- GET `/api/items/{itemId}/bids`
  - Bid history (admin).
  - Response: List<Bid>

## Live Auction
- POST `/api/items/{itemId}/winner`
  - Assign live winner and final price (L2+; Pending+).
  - Request:
    ```
    {
      "bidder_id": "uuid|null",
      "final_price": 0
    }
    ```
  - Response: LiveWinner

## Totals & Status
- GET `/api/auctions/{auctionId}/totals/me`
  - Bidder running totals and won items.
  - Response: Bidder Totals (current user) + won items list
- GET `/api/auctions/{auctionId}/totals`
  - Admin view of real-time totals per bidder (L3+).
  - Response: List<Bidder Totals>
- PATCH `/api/auctions/{auctionId}/payments/{bidderId}`
  - Mark paid/unpaid (L3+).
  - Request:
    ```
    {
      "paid": true
    }
    ```
  - Response: Bidder Totals
- PATCH `/api/auctions/{auctionId}/pickup/{itemId}`
  - Mark item picked up (L3+).
  - Request:
    ```
    {
      "picked_up": true
    }
    ```
  - Response: `{ "item_id": "uuid", "picked_up": true }`
- External payment URL should open in a new tab; bidders return by closing the tab.

## Notifications
- GET `/api/notifications`
  - List in-app notifications for current user.
  - Response: List<Notification>
- Each notification includes:
  - `id`, `type`, `message`, `created_at`, `read_at`
  - `ref_type` and `ref_id` (e.g., `item` and `itemId`) to link the notification to the relevant entity
- Clients should deep-link to the referenced entity when a notification is tapped.
- Clients may refresh the referenced entity when a notification is received, especially if it matches the currently viewed item.
- PATCH `/api/notifications/{notificationId}`
  - Mark notification as read.
  - Response: Notification
- PATCH `/api/notifications/mark-all-read`
  - Mark all notifications as read.
  - Response: `{ "updated": 0 }`

## Reports & Exports
- GET `/api/auctions/{auctionId}/reports`
  - Summary reports (admin).
  - Response: report summary object (fields TBD)
- GET `/api/auctions/{auctionId}/reports/export?format=csv`
  - CSV export (admin; L1/L2).
  - Response: CSV stream

## QR & PDF
- GET `/api/items/{itemId}/qr`
  - QR code (image).
  - Response: image/png
- QR codes deep-link to item detail pages and are intended to be scanned with the device camera app (no in-app scanner).
- GET `/api/auctions/{auctionId}/items/qr-pdf`
  - PDF with one item per page (admin).
  - Response: application/pdf
## Error Status Matrix (Common Cases)
- Authentication:
  - 401 `auth_required` when `Authorization` token is missing or invalid.
  - 403 `role_forbidden` when role/membership is insufficient.
- Bidding:
  - 400 `bid_too_low` when amount <= current highest.
  - 409 `outbid` when another bid wins in the transaction window.
  - 409 `phase_closed` when auction phase is not Open.
- Auctions:
  - 404 `auction_not_found` when auctionId is invalid.
  - 409 `auction_code_conflict` when auction_code is already in use.

## Error Examples
- `phase_closed`:
  ```
  { "error": { "code": "phase_closed", "message": "Bidding is closed for this auction.", "details": { "phase": "Pending" } } }
  ```
- `bid_too_low`:
  ```
  { "error": { "code": "bid_too_low", "message": "Bid must be higher than the current bid.", "details": { "current_high_bid": 42 } } }
  ```
- `outbid`:
  ```
  { "error": { "code": "outbid", "message": "Another bidder placed a higher bid.", "details": { "current_high_bid": 45 } } }
  ```
