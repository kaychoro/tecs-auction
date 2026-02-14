# Data Model (Personas)

## Summary
This document outlines the core data entities and relationships needed to meet the requirements, keeping the model simple and evolvable.

## Developer Persona Analysis (Implementation Readiness)
- The current entity list is sufficient to scaffold model classes, but several fields need concrete types and constraints (e.g., string length limits, required vs. nullable).
- Auction phase timing needs explicit representation (start/end timestamps per phase or a schedule object) to implement hard cutoffs cleanly.
- Bid ordering requires a stable tie-breaker; `placedAt` precision and server time source should be specified to avoid collisions.
- AuctionMembership role scoping is central; define whether role is per-user or per-auction, and how overrides interact with global roles.
- Totals/Invoice should specify whether they are derived on the fly or stored and updated, and how often recalculated.
- Image handling needs storage target and generated variant definitions (e.g., max width/height).
- AuditLog actions should be enumerated to ensure consistent logging in code and analytics.
- Notification records should clarify delivery status fields and retry behavior (or explicitly omit retries).
- LiveWinner should specify whether `bidderId` can be null for manual entry and how that affects totals.
- Add indices and uniqueness constraints (e.g., unique bidderNumber per auction, one image per item, one live winner per item).

## Implementation Decisions (Persona-Resolved)
This section locks down details so model classes can be implemented consistently.

### Types and Required Fields
- IDs: UUID strings.
- Timestamps: ISO-8601 strings in UTC stored; auction time zone used for display and phase enforcement.
- Bidder numbers: integer values for human-friendly identification.
- Required fields:
  - Auction: id, name, status, timeZone, auctionCode, notificationSettings, createdBy, createdAt.
  - User: id, role, email, phone, displayName, createdAt.
  - Item: id, auctionId, name, type, startingPrice, createdAt.
  - Bid: id, auctionId, itemId, bidderId, amount, placedAt.
  - AuditLog: id, auctionId, actorUserId, action, targetType, targetId, createdAt.
  - AuctionMembership: bidderNumber required when role is Bidder.
- Nullable fields:
  - User.emailVerifiedAt (null until verified)
  - Item.description, Item.imageId
  - LiveWinner.bidderId (nullable for manual entry)

### Auction Phase Timing Model
- Auction has:
  - phaseSchedule: map of {phase -> startsAt, endsAt} in auction time zone.
  - currentPhase: derived from time or explicitly set by L1.
- Hard cutoffs: a bid is accepted only if placedAt is within Open window (inclusive of start, exclusive of end).
 - Phase evaluation uses auction time zone for schedule display and comparison; timestamps are stored in UTC.

### Roles and Membership
- User.role represents global role (Bidder, AdminL1, AdminL2, AdminL3).
- AuctionMembership is required for all non-L1 users to access an auction.
- AuctionMembership.roleOverride (nullable) can downscope privileges for a specific auction (e.g., AdminL2 -> AdminL3).
- Effective role = min(global role, roleOverride) by privilege level (roleOverride cannot up-scope).

### Bids and Ordering
- placedAt is server-generated to avoid client clock skew.
- placedAt precision is milliseconds (Firestore timestamp precision).
- Tie-breaking: (amount desc, placedAt asc, bidId asc).
- Highest bid is derived; no separate mutable "currentHighBid" field.
 - Bid transactions update totals and derived views atomically.

### Derived Views (Read-Only)
- Item current high bid is exposed via derived fields in API responses:
  - currentHighBid
  - currentHighBidderId
  - currentHighBidPlacedAt
- These values are computed transactionally from bids and are not stored on Item records.

### Totals / Invoice Strategy
- Totals are stored in an Invoice table for fast reads and updated transactionally on bid changes and live winner assignments.
- Totals can be recomputed from bids for audit reconciliation.
 - Payment status and pickup status updates are logged in AuditLog.

### Images
- One image per item; stored as original plus scaled variants.
- Scaled variants (example sizes): 320px, 640px, 1024px width, keep aspect ratio.
 - Validate image type (jpeg/png/webp) and enforce size limits at upload time.

### AuditLog Actions (Enumerated)
- bid_placed, bid_removed, bid_restored
- item_created, item_updated, item_deleted
- live_winner_assigned
- auction_phase_changed, auction_code_changed
- auction_updated
- auction_notifications_updated
- membership_role_changed
- membership_status_changed
- payment_status_changed, pickup_status_changed
- report_exported
 - pii_purged

### Notifications
- Notification.status: queued, sent, failed.
- Notification.delivery_channel: in_app, email.

### Indices / Uniqueness
- Auction: unique (auctionCode) across the deployment; enforce with a dedicated uniqueness document or a Firestore rule-backed index pattern; index on status.
- AuctionMembership: unique (auctionId, userId).
- Bidder numbers: unique per auction (enforced via membership or bidder mapping table).
- Item: unique (auctionId, name) optional; index on auctionId.
- Image: unique (itemId).
- Bid: index (itemId, amount desc, placedAt asc).
- LiveWinner: unique (itemId).
- Invoice: unique (auctionId, bidderId).
## Core Entities
1) Auction
   - id
   - name
   - status (Setup, Ready, Open, Pending, Complete, Closed)
   - timeZone (IANA string; default for target: MST)
   - startsAt / endsAt (timestamps in auction time zone)
   - auctionCode (current)
   - notificationSettings (inAppEnabled)
   - paymentUrl
   - createdBy (L1 admin)

2) User
   - id
   - role (Bidder, AdminL3, AdminL2, AdminL1)
   - email
   - phone
   - emailVerifiedAt
   - displayName
   - lastAuctionId (for returning bidders to most recent auction)
   - createdAt
   - lastAuctionId is updated on join and on auction switch.

3) AuctionMembership
   - id
   - auctionId
   - userId
   - roleOverride (optional; for per-auction admin scoping)
   - status (active, revoked)
   - bidderNumber (integer, for bidders; unique per auction)
   - bidderNumber is allocated from a per-auction counter document.

4) Item
   - id
   - auctionId
   - name
   - description
   - type (silent, live)
   - startingPrice
   - imageId (nullable)
   - createdAt

5) Image
   - id
   - auctionId
   - storagePath
   - originalDimensions
   - scaledVariants (list)

6) Bid
   - id
   - auctionId
   - itemId
   - bidderId
   - amount
   - placedAt (timestamp)
   - isHighest (derived or indexed)

7) LiveWinner
   - id
   - auctionId
   - itemId
   - bidderId (nullable if manual entry)
   - finalPrice
   - assignedAt

8) Invoice / Totals
   - id
   - auctionId
   - bidderId
   - subtotal
   - total
   - updatedAt

9) PaymentStatus
   - id
   - auctionId
   - bidderId
   - status (unpaid, paid)
   - updatedAt

10) PickupStatus
    - id
    - auctionId
    - itemId
    - status (notPickedUp, pickedUp)
    - updatedAt

11) Notification
    - id
    - auctionId
    - bidderId
    - type (outbid_in_app)
    - refType / refId (e.g., item / itemId)
    - readAt
    - sentAt
    - payload

12) AuditLog
    - id
    - auctionId
    - actorUserId
    - action (bid_placed, bid_removed, item_updated, phase_changed, etc.)
    - targetType / targetId
    - metadata
    - createdAt

## Key Relationships
- Auction 1..* Item
- Auction 1..* Bid
- Auction 1..* AuctionMembership
- Auction 1..* AuditLog
- User 1..* AuctionMembership
- User 1..* Bid (as bidder)
- Item 1..* Bid
- Item 0..1 Image
- Item 0..1 LiveWinner

## Integrity Notes
- Bids are append-only; removals are recorded in AuditLog.
- Highest bid is derived by (itemId, max amount, earliest placedAt).
- AuctionMembership determines L2/L3 access per auction.

## Firestore Collection Layout (Accepted)
The accepted v1 layout is flat top-level collections with `auctionId` on auction-scoped records.

- `auctions`
- `users`
- `auction_memberships`
- `items`
- `images`
- `bids`
- `live_winners`
- `audit_logs`
- `totals`
- `notifications`
- `auction_bidder_counters`
- `auction_code_index`

## Firestore Fields (Draft)
### `auctions/{auctionId}`
- id (string)
- name (string)
- status (string enum)
- timeZone (string)
- phaseSchedule (map)
- auctionCode (string, unique across deployment)
- notificationSettings (map: inAppEnabled)
- paymentUrl (string|null)
- createdBy (string)
- createdAt (timestamp)
- updatedAt (timestamp)

### `items/{itemId}`
- id (string)
- auctionId (string)
- name (string)
- description (string|null)
- type (silent|live)
- startingPrice (number)
- image (map|null)
- pickedUp (boolean)
- createdAt (timestamp)
- updatedAt (timestamp)
  - Note: current high bid values are derived from bids via transactional ordering; not stored on Item.

### `bids/{bidId}`
- id (string)
- auctionId (string)
- itemId (string)
- bidderId (string)
- amount (number)
- placedAt (timestamp)

### `live_winners/{itemId}`
- id (string, same as `itemId`)
- auctionId (string)
- itemId (string)
- bidderId (string|null)
- finalPrice (number)
- assignedAt (timestamp)

### `audit_logs/{auditId}`
- id (string)
- auctionId (string)
- actorUserId (string)
- action (string enum)
- targetType (string)
- targetId (string)
- metadata (map)
- createdAt (timestamp)

### `totals/{auctionId:bidderId}`
- auctionId (string)
- bidderId (string)
- bidderNumber (number)
- displayName (string)
- subtotal (number)
- total (number)
- paid (boolean)
- updatedAt (timestamp)

### `notifications/{notificationId}`
- id (string)
- auctionId (string)
- userId (string)
- type (outbid_in_app)
- message (string)
- refType (string)
- refId (string)
- createdAt (timestamp)
- readAt (timestamp|null)

### `auction_memberships/{auctionId:userId}`
- auctionId (string)
- userId (string)
- roleOverride (string|null)
- status (active|revoked)
- bidderNumber (number|null)
- createdAt (timestamp)
- updatedAt (timestamp)

### `users/{userId}`
- id (string)
- role (Bidder|AdminL1|AdminL2|AdminL3)
- email (string)
- phone (string)
- emailVerifiedAt (timestamp|null)
- displayName (string)
- lastAuctionId (string|null)
- createdAt (timestamp)
- updatedAt (timestamp)

### `auction_bidder_counters/{auctionId}`
- value (number)
- updatedAt (timestamp)

### `auction_code_index/{auctionCode}`
- auctionId (string)
- updatedAt (timestamp)

## Suggested Indexes (Firestore)
- `auctions`: index on `auctionCode`, `status`.
- `items`: composite index on `auctionId`, `type`, `createdAt`.
- `bids`: composite index on `itemId`, `amount` (desc), `placedAt` (asc).
- `audit_logs`: composite index on `auctionId`, `createdAt`.
- `totals`: composite index on `auctionId`, `bidderNumber`.
- `notifications`: composite index on `userId`, `createdAt` (desc).
