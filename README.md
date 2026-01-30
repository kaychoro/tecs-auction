# tecs_auction

Auction management system for an elementary school fundraiser, built as a Flutter web app. The system supports both silent and live auctions, enforces auction phases, and provides role-based admin tools for setup, bidding, checkout, and reporting.

## What this project does
- Runs a mobile-friendly bidding experience for bidders using phones at the event
- Supports silent auction bidding with enforced time windows and minimum increments
- Supports live auction items awarded manually by admins
- Tracks bidder totals, payment status, and item pickup status
- Provides QR code links and printable item sheets for fast item lookup

## Roles
- Bidder: registers with email/phone, joins with an auction code, browses items, bids, and pays
- Admin Level 3 (Support): handles checkout, pickup, QR/PDF generation, and reports
- Admin Level 2 (Manager): manages items, bids, live winners, and payment URL
- Admin Level 1 (Super Admin): creates auctions and controls phases/timing

## Auction phases
Setup → Ready → Open → Pending → Complete → Closed

Each phase restricts actions (e.g., bidding only in Open; checkout in Complete; archive in Closed).

## Notes
- Payment is handled by an external URL configured by admins.
- Designed to support at least 100 concurrent users.

## Reference docs
- Requirements: `Auction_System_Requirements.md`
- User stories: `Auction_System_User_Stories.md`
