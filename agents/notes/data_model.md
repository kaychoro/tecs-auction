# Data Model (Personas)

## Summary
This document outlines the core data entities and relationships needed to meet the requirements, keeping the model simple and evolvable.

## Developer Persona Analysis (Implementation Readiness)
- The current entity list is sufficient to scaffold model classes, but several fields need concrete types and constraints (e.g., string length limits, required vs. nullable).
- Auction phase timing needs explicit representation (start/end timestamps per phase or a schedule object) to implement hard cutoffs cleanly.
- Bid ordering requires a stable tie-breaker; `placed_at` precision and server time source should be specified to avoid collisions.
- AuctionMembership role scoping is central; define whether role is per-user or per-auction, and how overrides interact with global roles.
- Totals/Invoice should specify whether they are derived on the fly or stored and updated, and how often recalculated.
- Image handling needs storage target and generated variant definitions (e.g., max width/height).
- AuditLog actions should be enumerated to ensure consistent logging in code and analytics.
- Notification records should clarify delivery status fields and retry behavior (or explicitly omit retries).
- LiveWinner should specify whether `bidder_id` can be null for manual entry and how that affects totals.
- Add indices and uniqueness constraints (e.g., unique bidder_number per auction, one image per item, one live winner per item).

## Implementation Decisions (Persona-Resolved)
This section locks down details so model classes can be implemented consistently.

### Types and Required Fields
- IDs: UUID strings.
- Timestamps: ISO-8601 strings in UTC stored; auction time zone used for display and phase enforcement.
- Bidder numbers: integer values for human-friendly identification.
- Required fields:
  - Auction: id, name, status, time_zone, auction_code, notification_settings, created_by, created_at.
  - User: id, role, email, phone, display_name, created_at.
  - Item: id, auction_id, name, type, starting_price, created_at.
  - Bid: id, auction_id, item_id, bidder_id, amount, placed_at.
  - AuditLog: id, auction_id, actor_user_id, action, target_type, target_id, created_at.
  - AuctionMembership: bidder_number required when role is Bidder.
- Nullable fields:
  - User.email_verified_at (null until verified)
  - Item.description, Item.image_id
  - LiveWinner.bidder_id (nullable for manual entry)

### Auction Phase Timing Model
- Auction has:
  - phase_schedule: map of {phase -> starts_at, ends_at} in auction time zone.
  - current_phase: derived from time or explicitly set by L1.
- Hard cutoffs: a bid is accepted only if placed_at is within Open window (inclusive of start, exclusive of end).
 - Phase evaluation uses auction time zone for schedule display and comparison; timestamps are stored in UTC.

### Roles and Membership
- User.role represents global role (Bidder, AdminL1, AdminL2, AdminL3).
- AuctionMembership is required for all non-L1 users to access an auction.
- AuctionMembership.role_override (nullable) can downscope privileges for a specific auction (e.g., AdminL2 -> AdminL3).
- Effective role = min(global role, role_override) by privilege level (role_override cannot up-scope).

### Bids and Ordering
- placed_at is server-generated to avoid client clock skew.
- placed_at precision is milliseconds (Firestore timestamp precision).
- Tie-breaking: (amount desc, placed_at asc, bid_id asc).
- Highest bid is derived; no separate mutable "current_high_bid" field.

### Derived Views (Read-Only)
- Item current high bid is exposed via derived fields in API responses:
  - current_high_bid
  - current_high_bidder_id
  - current_high_bid_placed_at
- These values are computed transactionally from bids and are not stored on Item records.

### Totals / Invoice Strategy
- Totals are stored in an Invoice table for fast reads and updated transactionally on bid changes and live winner assignments.
- Totals can be recomputed from bids for audit reconciliation.

### Images
- One image per item; stored as original plus scaled variants.
- Scaled variants (example sizes): 320px, 640px, 1024px width, keep aspect ratio.

### AuditLog Actions (Enumerated)
- bid_placed, bid_removed, bid_restored
- item_created, item_updated, item_deleted
- live_winner_assigned
- auction_phase_changed, auction_code_changed
- membership_role_changed
- membership_status_changed
- payment_status_changed, pickup_status_changed

### Notifications
- Notification.status: queued, sent, failed.
- Notification.delivery_channel: in_app, email.

### Indices / Uniqueness
- Auction: unique (auction_code) across the deployment; enforce with a dedicated uniqueness document or a Firestore rule-backed index pattern; index on status.
- AuctionMembership: unique (auction_id, user_id).
- Bidder numbers: unique per auction (enforced via membership or bidder mapping table).
- Item: unique (auction_id, name) optional; index on auction_id.
- Image: unique (item_id).
- Bid: index (item_id, amount desc, placed_at asc).
- LiveWinner: unique (item_id).
- Invoice: unique (auction_id, bidder_id).
## Core Entities
1) Auction
   - id
   - name
   - status (Setup, Ready, Open, Pending, Complete, Closed)
   - time_zone (IANA string; default for target: MST)
   - starts_at / ends_at (timestamps in auction time zone)
   - auction_code (current)
   - notification_settings (in_app_enabled)
   - payment_url
   - created_by (L1 admin)

2) User
   - id
   - role (Bidder, AdminL3, AdminL2, AdminL1)
   - email
   - phone
   - email_verified_at
   - display_name
   - last_auction_id (for returning bidders to most recent auction)
   - created_at
   - last_auction_id is updated on join and on auction switch.

3) AuctionMembership
   - id
   - auction_id
   - user_id
   - role_override (optional; for per-auction admin scoping)
   - status (active, revoked)
   - bidder_number (integer, for bidders; unique per auction)

4) Item
   - id
   - auction_id
   - name
   - description
   - type (silent, live)
   - starting_price
   - image_id (nullable)
   - created_at

5) Image
   - id
   - auction_id
   - storage_path
   - original_dimensions
   - scaled_variants (list)

6) Bid
   - id
   - auction_id
   - item_id
   - bidder_id
   - amount
   - placed_at (timestamp)
   - is_highest (derived or indexed)

7) LiveWinner
   - id
   - auction_id
   - item_id
   - bidder_id (nullable if manual entry)
   - final_price
   - assigned_at

8) Invoice / Totals
   - id
   - auction_id
   - bidder_id
   - subtotal
   - total
   - updated_at

9) PaymentStatus
   - id
   - auction_id
   - bidder_id
   - status (unpaid, paid)
   - updated_at

10) PickupStatus
    - id
    - auction_id
    - item_id
    - status (not_picked_up, picked_up)
    - updated_at

11) Notification
    - id
    - auction_id
    - bidder_id
    - type (outbid_in_app)
    - ref_type / ref_id (e.g., item / item_id)
    - read_at
    - sent_at
    - payload

12) AuditLog
    - id
    - auction_id
    - actor_user_id
    - action (bid_placed, bid_removed, item_updated, phase_changed, etc.)
    - target_type / target_id
    - metadata
    - created_at

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
- Highest bid is derived by (item_id, max amount, earliest placed_at).
- AuctionMembership determines L2/L3 access per auction.

## Firestore Collection Layout (Recommended)
- `auctions/{auctionId}`
  - `items/{itemId}`
  - `bids/{bidId}`
  - `live_winners/{liveWinnerId}`
  - `audit_logs/{auditLogId}`
  - `totals/{bidderId}`
  - `notifications/{notificationId}`
- `users/{userId}`
  - `auction_memberships/{auctionId}`

## Firestore Fields (Draft)
### auctions/{auctionId}
- id (string)
- name (string)
- status (string enum)
- time_zone (string)
- phase_schedule (map)
- auction_code (string, unique across deployment)
- notification_settings (map: in_app_enabled)
- payment_url (string|null)
- created_by (string)
- created_at (timestamp)

### auctions/{auctionId}/items/{itemId}
- id (string)
- auction_id (string)
- name (string)
- description (string|null)
- type (silent|live)
- starting_price (number)
- image (map|null)
- created_at (timestamp)
  - Note: current high bid values are derived from bids via transactional ordering; not stored on Item.

### auctions/{auctionId}/bids/{bidId}
- id (string)
- auction_id (string)
- item_id (string)
- bidder_id (string)
- amount (number)
- placed_at (timestamp)

### auctions/{auctionId}/live_winners/{liveWinnerId}
- id (string)
- auction_id (string)
- item_id (string)
- bidder_id (string|null)
- final_price (number)
- assigned_at (timestamp)

### auctions/{auctionId}/audit_logs/{auditLogId}
- id (string)
- auction_id (string)
- actor_user_id (string)
- action (string enum)
- target_type (string)
- target_id (string)
- metadata (map)
- created_at (timestamp)

### auctions/{auctionId}/totals/{bidderId}
- bidder_id (string)
- bidder_number (number)
- display_name (string)
- subtotal (number)
- total (number)
- paid (boolean)
- updated_at (timestamp)

### auctions/{auctionId}/notifications/{notificationId}
- id (string)
- type (outbid_in_app)
- message (string)
- ref_type (string)
- ref_id (string)
- created_at (timestamp)
- read_at (timestamp|null)

### users/{userId}
- id (string)
- role (Bidder|AdminL1|AdminL2|AdminL3)
- email (string)
- phone (string)
- email_verified_at (timestamp|null)
- display_name (string)
- last_auction_id (string|null)
- created_at (timestamp)

### users/{userId}/auction_memberships/{auctionId}
- auction_id (string)
- user_id (string)
- role_override (string|null)
- status (active|revoked)
- bidder_number (number|null)

## Suggested Indexes (Firestore)
- auctions: index on `auction_code` (for join lookup).
- auctions/{auctionId}/items: index on `type`, `created_at`.
- auctions/{auctionId}/bids: index on `item_id`, `amount` (desc), `placed_at` (asc).
- auctions/{auctionId}/audit_logs: index on `created_at`.
- auctions/{auctionId}/totals: index on `bidder_number`.
