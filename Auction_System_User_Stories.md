# Auction System – User Stories

## 1. Bidder User Stories

### Access & Entry
- As a bidder, I want to join an auction using an auction code so that only authorized participants can access it.
- As a bidder, I want to create an account using my email and phone number so that my bids are tracked.
- As a bidder, I want to verify my email before bidding so that my account is confirmed.
- As a bidder, I want to receive a bidder number when I join an auction so that I can be uniquely identified within that auction.
- As a bidder, I want to resend my verification email if I did not receive it so that I can complete verification.
- As a bidder, I want to choose a public username so that others can see who the current high bidder is.

### Browsing & Navigation
- As a bidder, I want to browse all auction items when the auction is in the ready or later phases so that I can plan my bidding.
- As a bidder, I want to scan a QR code posted near an item and be taken directly to that item’s bidding page so that bidding is fast and convenient.
- As a bidder, I want to see item details including an image, description, starting price, and current high bid so that I can make informed decisions.
- As a bidder, I want QR codes to open in the device camera app and deep-link to the item page so that I can access items quickly.

### Bidding
- As a bidder, I want to place bids on silent auction items only when the auction is in the open phase.
- As a bidder, I want bids to increase in minimum $1 increments while allowing higher manual bids.
- As a bidder, I want to immediately see whether my bid is the current high bid.
- As a bidder, I want bidding to automatically stop when the silent auction closes.
- As a bidder, I want my bid to win if it is first at a given amount so that equal bids are resolved fairly.
- As a bidder, I want to confirm my bid before it is submitted so that I can avoid mistakes.
- As a bidder, I want the item page to refresh after I place a bid so that I can see the latest status.

### Status & Totals
- As a bidder, I want to see a list of items I am currently winning and a running subtotal during the auction.
- As a bidder, I want to see the items I won and the final total after the auction ends.
- As a bidder, I want to see my payment and pickup status after the auction is complete.

### Notifications
- As a bidder, I want to receive an in-app outbid notification so that I can respond quickly.
- As a bidder, I want outbid notifications to take me directly to the item page so that I can bid again quickly.

---

## 2. Admin Level 3 (Auction Support) User Stories

- As an admin (Level 3), I want to view winning bidders and totals so that I can assist with checkout.
- As an admin (Level 3), I want to view real-time totals owed per bidder so that I can monitor running balances.
- As an admin (Level 3), I want to mark a bidder as fully paid so that payment can be handled efficiently.
- As an admin (Level 3), I want to mark items as picked up so that items are not released multiple times.
- As an admin (Level 3), I want to generate a printable PDF with one page per item containing the item name and a QR code linking to the item page.
- As an admin (Level 3), I want to view auction summary reports during and after the auction.
- As an admin (Level 3), I want access only to the auctions that a Level 1 admin assigns to me.

---

## 3. Admin Level 2 (Auction Manager) User Stories
*(Includes all Level 3 capabilities)*

### Auction Content
- As an admin (Level 2), I want to create, edit, and remove auction items.
- As an admin (Level 2), I want to upload and update a single item photo and description.
- As an admin (Level 2), I want to set starting prices for items.

### Auction Control
- As an admin (Level 2), I want to remove erroneous or invalid bids during allowed auction phases.
- As an admin (Level 2), I want to assign winners and prices for live auction items.
- As an admin (Level 2), I want to configure the external payment URL.
- As an admin (Level 2), I want to export reports as CSV so that I can share them externally.
- As an admin (Level 2), I want access only to the auctions that a Level 1 admin assigns to me.

---

## 4. Admin Level 1 (Super Admin) User Stories

- As a super admin (Level 1), I want to create new auctions.
- As a super admin (Level 1), I want to set the auction time zone at creation so that phase timing is correct.
- As a super admin (Level 1), I want to manage multiple auctions in the same deployment so that I can run a demo auction before the live one.
- As a super admin (Level 1), I want to define and modify auction phases and start/end times.
- As a super admin (Level 1), I want to override restrictions in later phases if necessary.
- As a super admin (Level 1), I want full administrative access at all times.
- As a super admin (Level 1), I want to assign Level 2 and Level 3 admins to specific auctions.
- As a super admin (Level 1), I want to change the auction code at any time.
- As a super admin (Level 1), I want auction codes to be unique across the deployment so that bidders join the correct auction.
- As a super admin (Level 1), I want to enable or disable in-app outbid notifications for an auction.
- As a super admin (Level 1), I want to export reports as CSV so that I can share them externally.

---

## 5. System-Level User Stories

### Auction Phases
- As the system, I must enforce auction phases and restrict actions based on the current phase.
- As the system, I must enforce phase timing using the auction’s configured time zone with hard cutoffs.

The supported phases are:
- Setup: Admins configure the auction; bidders may join but cannot see items.
- Ready: Items are visible; bidding is disabled.
- Open: Silent auction bidding is enabled.
- Pending: Silent auction closed; admins finalize data; bidders see results.
- Complete: Checkout and pickup processing occurs.
- Closed: Auction is archived; bidders receive receipts; only reports remain visible.

### System Constraints
- As the system, I must support at least 100 concurrent users.
- As the system, I must ensure bid consistency and prevent late bids.
- As the system, I must accept bids using an atomic server-side compare-and-swap to prevent race conditions.
- As the system, I must keep an immutable audit trail for bids and admin bid removals/overrides.
- As the system, I must allow reports to be exported as CSV.
