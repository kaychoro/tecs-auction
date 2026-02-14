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
- List endpoints use `page` and `pageSize` query params and optional `sort` (e.g., `sort=createdAt:desc`).
- HTTP status conventions:
  - 200 success
  - 400 validation errors (e.g., `bid_too_low`)
  - 401 unauthenticated (missing/invalid token)
  - 403 unauthorized/role issues
  - 404 not found
  - 409 conflict (e.g., `outbid`, `phase_closed`)
  - 429 rate limiting (if enabled)
- Server-side role and auction membership checks are mandatory for all endpoints.

## Role Resolution
- Effective role is derived from the user's global role and the AuctionMembership.roleOverride.
- roleOverride can only down-scope privileges (e.g., AdminL2 -> AdminL3 for a specific auction).
- L1 is global and does not require auction membership for access.

## Role Matrix (Endpoint Groups)
- Auth:
  - GET `/api/users/me`: any authenticated user
- Auctions:
  - POST `/api/auctions`: AdminL1
  - GET `/api/auctions`: AdminL1 (all), AdminL2/AdminL3 (assigned)
  - GET `/api/auctions/joined`: Bidder/AdminL2/AdminL3 (joined only)
  - GET `/api/auctions/{auctionId}`: any auction member
  - PATCH `/api/auctions/{auctionId}`: AdminL1/AdminL2
  - POST `/api/auctions/{auctionId}/join`: Bidder/AdminL2/AdminL3
  - PATCH `/api/auctions/{auctionId}/code`: AdminL1
  - PATCH `/api/auctions/{auctionId}/phase`: AdminL1
  - PATCH `/api/auctions/{auctionId}/notifications`: AdminL1
  - PATCH `/api/auctions/{auctionId}/membership`: AdminL1
- Items:
  - POST `/api/auctions/{auctionId}/items`: AdminL2/AdminL1
  - GET `/api/auctions/{auctionId}/items`: any auction member (phase-dependent for bidders)
  - GET `/api/items/{itemId}`: any auction member
  - PATCH `/api/items/{itemId}`: AdminL2/AdminL1
  - DELETE `/api/items/{itemId}`: AdminL2/AdminL1
  - POST `/api/items/{itemId}/image`: AdminL2/AdminL1
- Bidding:
  - POST `/api/items/{itemId}/bids`: Bidder (Open phase only)
  - DELETE `/api/bids/{bidId}`: AdminL2/AdminL1
  - GET `/api/items/{itemId}/bids`: AdminL2/AdminL1
- Live Auction:
  - POST `/api/items/{itemId}/winner`: AdminL2/AdminL1 (Pending+)
- Totals & Status:
  - GET `/api/auctions/{auctionId}/totals/me`: Bidder (self)
  - GET `/api/auctions/{auctionId}/totals`: AdminL3/AdminL2/AdminL1
  - PATCH `/api/auctions/{auctionId}/payments/{bidderId}`: AdminL3/AdminL2/AdminL1
  - PATCH `/api/auctions/{auctionId}/pickup/{itemId}`: AdminL3/AdminL2/AdminL1
- Notifications:
  - GET `/api/notifications`: any authenticated user
  - PATCH `/api/notifications/{notificationId}`: notification owner
  - PATCH `/api/notifications/mark-all-read`: authenticated user
- Reports & Exports:
  - GET `/api/auctions/{auctionId}/reports`: AdminL2/AdminL1
  - GET `/api/auctions/{auctionId}/reports/export?format=csv`: AdminL2/AdminL1
- QR & PDF:
  - GET `/api/items/{itemId}/qr`: any auction member
  - GET `/api/auctions/{auctionId}/items/qr-pdf`: AdminL2/AdminL1

## Schemas (Draft)
Field requirements: unless noted, fields are required in responses; optional fields are marked `optional` in the lists below. Request payloads only accept the fields listed.

### Auction
```
{
  "id": "uuid",
  "name": "string",
  "status": "Setup|Ready|Open|Pending|Complete|Closed",
  "timeZone": "string",
  "phaseSchedule": {
    "Setup": {"startsAt": "iso8601", "endsAt": "iso8601"},
    "Ready": {"startsAt": "iso8601", "endsAt": "iso8601"},
    "Open": {"startsAt": "iso8601", "endsAt": "iso8601"},
    "Pending": {"startsAt": "iso8601", "endsAt": "iso8601"},
    "Complete": {"startsAt": "iso8601", "endsAt": "iso8601"},
    "Closed": {"startsAt": "iso8601", "endsAt": "iso8601"}
  },
  "auctionCode": "string",
  "notificationSettings": {"inAppEnabled": true},
  "paymentUrl": "string|null",
  "createdBy": "uuid",
  "createdAt": "iso8601"
}
```
Notes:
- Phase windows are enforced with inclusive start and exclusive end.
- Phase schedule timestamps are stored in UTC and displayed in the auction time zone.
Required fields: id, name, status, timeZone, phaseSchedule, auctionCode, notificationSettings, createdBy, createdAt  
Optional fields: paymentUrl

### Item
```
{
  "id": "uuid",
  "auctionId": "uuid",
  "name": "string",
  "description": "string|null",
  "type": "silent|live",
  "startingPrice": 0,
  "currentHighBid": 0,
  "currentHighBidderId": "uuid|null",
  "currentHighBidPlacedAt": "iso8601|null",
  "image": {
    "id": "uuid",
    "url": "string",
    "variants": [{"width": 320, "url": "string"}]
  } | null,
  "createdAt": "iso8601"
}
```
Notes:
- `currentHighBid*` fields are read-only and derived from bids via transactional ordering (not stored as mutable fields on Item).
Required fields: id, auctionId, name, type, startingPrice, createdAt  
Optional fields: description, image, currentHighBid, currentHighBidderId, currentHighBidPlacedAt

### Bid
```
{
  "id": "uuid",
  "auctionId": "uuid",
  "itemId": "uuid",
  "bidderId": "uuid",
  "amount": 0,
  "placedAt": "iso8601"
}
```
Required fields: id, auctionId, itemId, bidderId, amount, placedAt
Notes:
- `placedAt` is server-generated using Firestore server timestamp and returned as ISO-8601 in UTC.
- Bid ordering is deterministic: amount desc, placedAt asc, bidId asc.

### Notification
```
{
  "id": "uuid",
  "type": "outbid_in_app",
  "message": "string",
  "refType": "item",
  "refId": "uuid",
  "createdAt": "iso8601",
  "readAt": "iso8601|null"
}
```
Required fields: id, type, message, refType, refId, createdAt  
Optional fields: readAt

### Bidder Totals (admin view)
```
{
  "bidderId": "uuid",
  "bidderNumber": 0,
  "displayName": "string",
  "subtotal": 0,
  "total": 0,
  "paid": false
}
```
Required fields: bidderId, bidderNumber, displayName, subtotal, total, paid

### User
```
{
  "id": "uuid",
  "role": "Bidder|AdminL1|AdminL2|AdminL3",
  "email": "string",
  "phone": "string",
  "emailVerifiedAt": "iso8601|null",
  "displayName": "string",
  "lastAuctionId": "uuid|null",
  "createdAt": "iso8601"
}
```
Required fields: id, role, email, phone, displayName, createdAt  
Optional fields: emailVerifiedAt, lastAuctionId
Notes:
- lastAuctionId is updated on join and on auction switch.

## List Response Envelope
All list endpoints return:
```
{
  "data": [ ... ],
  "page": 1,
  "pageSize": 25,
  "total": 0
}
```
Defaults: page=1, pageSize=25, max pageSize=100.
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

## Client Auth/Registration Flow (Reference)
- Create user via Firebase Auth (email + password) and collect phone/displayName in app profile.
- Require email verification before allowing bidding actions.
- Resend verification is throttled to 5 per hour per email.
 - On resend limit exceeded, return 429 `verification_throttled`.

## Auctions
- POST `/api/auctions`
  - Create auction (L1).
  - Request:
    ```
    {
      "name": "string",
      "timeZone": "string",
      "phaseSchedule": { ... },
      "auctionCode": "string",
      "notificationSettings": {"inAppEnabled": true},
      "paymentUrl": "string|null"
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
      "timeZone": "string",
      "paymentUrl": "string|null"
    }
    ```
  - Response: Auction
- AuditLog: auction_updated
- POST `/api/auctions/{auctionId}/join`
  - Join auction with auction code.
  - Request:
    ```
    {
      "auctionCode": "string"
    }
    ```
  - Response: AuctionMembership summary (auctionId, userId, bidderNumber, roleOverride|null)
  - Behavior:
    - Allocates bidderNumber using a per-auction counter (unique, non-reused).
    - Updates user.lastAuctionId to the joined auction.
  - Errors:
    - 404 `auction_not_found` when auctionCode is invalid.
    - 409 `auction_code_conflict` when auctionCode is duplicated.
    - 409 `membership_exists` when user already joined.
- PATCH `/api/auctions/{auctionId}/code`
  - Update auction code (L1). Applies to new joiners only; existing bidders remain unaffected.
  - Request:
    ```
    {
      "auctionCode": "string"
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
      "phaseSchedule": { ... }
    }
    ```
  - Response: Auction
- AuditLog: auction_phase_changed
- PATCH `/api/auctions/{auctionId}/notifications`
  - Update notification settings (L1; in-app only in v1).
  - Request:
    ```
    {
      "inAppEnabled": true
    }
    ```
  - Response: Auction
- AuditLog: auction_notifications_updated
- PATCH `/api/auctions/{auctionId}/membership`
  - Assign L2/L3 admins to auction (L1).
  - Request:
    ```
    {
      "userId": "uuid",
      "roleOverride": "AdminL2|AdminL3|null"
    }
    ```
  - Response: AuctionMembership summary
- AuditLog: membership_role_changed

## Items
- POST `/api/auctions/{auctionId}/items`
  - Create item (L2+).
  - Request:
    ```
    {
      "name": "string",
      "description": "string|null",
      "type": "silent|live",
      "startingPrice": 0
    }
    ```
  - Response: Item
- AuditLog: item_created
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
      "startingPrice": 0
    }
    ```
  - Response: Item
- AuditLog: item_updated
- DELETE `/api/items/{itemId}`
  - Remove item (L2+).
  - Response: `{ "deleted": true }`
- AuditLog: item_deleted
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
- AuditLog: bid_placed
- DELETE `/api/bids/{bidId}`
  - Remove bid (L2+; logged in audit trail).
  - Response: `{ "deleted": true }`
- AuditLog: bid_removed
- GET `/api/items/{itemId}/bids`
  - Bid history (admin).
  - Response: List<Bid>

## Live Auction
- POST `/api/items/{itemId}/winner`
  - Assign live winner and final price (L2+; Pending+).
  - Request:
    ```
    {
      "bidderId": "uuid|null",
      "finalPrice": 0
    }
    ```
  - Response: LiveWinner
  - AuditLog: live_winner_assigned

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
- AuditLog: payment_status_changed
- PATCH `/api/auctions/{auctionId}/pickup/{itemId}`
  - Mark item picked up (L3+).
  - Request:
    ```
    {
      "pickedUp": true
    }
    ```
  - Response: `{ "itemId": "uuid", "pickedUp": true }`
- AuditLog: pickup_status_changed
- External payment URL should open in a new tab; bidders return by closing the tab.

## Notifications
- GET `/api/notifications`
  - List in-app notifications for current user.
  - Response: List<Notification>
  - Behavior: default sort by createdAt desc.
- Each notification includes:
  - `id`, `type`, `message`, `createdAt`, `readAt`
  - `refType` and `refId` (e.g., `item` and `itemId`) to link the notification to the relevant entity
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
  - Response:
    ```
    {
      "auctionId": "uuid",
      "generatedAt": "iso8601",
      "totals": {
        "bidderCount": 0,
        "itemsCount": 0,
        "itemsSoldCount": 0,
        "grossTotal": 0
      }
    }
    ```
- GET `/api/auctions/{auctionId}/reports/export?format=csv`
  - CSV export (admin; L1/L2).
  - Response: CSV stream
  - AuditLog: report_exported
  - Errors:
    - 403 `role_forbidden` when requester is not L1/L2.

## QR & PDF
- GET `/api/items/{itemId}/qr`
  - QR code (image).
  - Response: image/png
- URL payload: item deep link URL (client route).
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
  - 409 `auction_code_conflict` when auctionCode is already in use.

## Error Examples
- `phase_closed`:
  ```
  { "error": { "code": "phase_closed", "message": "Bidding is closed for this auction.", "details": { "phase": "Pending" } } }
  ```
- `bid_too_low`:
  ```
  { "error": { "code": "bid_too_low", "message": "Bid must be higher than the current bid.", "details": { "currentHighBid": 42 } } }
  ```
- `outbid`:
  ```
  { "error": { "code": "outbid", "message": "Another bidder placed a higher bid.", "details": { "currentHighBid": 45 } } }
  ```
