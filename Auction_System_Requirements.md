# Auction Management System – Requirements Document

## 1. Introduction

### 1.1 Purpose
This document defines the functional and non-functional requirements for a web-based auction management system designed for an elementary school fundraiser. The system supports both silent and live auctions and replaces an outdated legacy solution.

### 1.2 Scope
The system will allow administrators to configure and manage auctions, and bidders to participate using mobile devices. It enforces auction phases, supports role-based permissions, and integrates with an external payment system. The deployment is for a single school, but supports multiple auctions within that deployment.

### 1.3 Definitions
- **Bidder**: A user participating in the auction.
- **Admin Level 1 (L1)**: Super administrator with full access.
- **Admin Level 2 (L2)**: Auction manager with full operational control.
- **Admin Level 3 (L3)**: Auction support staff handling checkout and pickup.
- **Silent Auction**: Items bid on electronically during a fixed time window.
- **Live Auction**: Items awarded manually by administrators.
- **Auction Phase**: A system-defined state controlling allowed actions.
- **Auction Time Zone**: The configured time zone for an auction, used for all phase timing and bid cutoff enforcement.

---

## 2. User Roles and Permissions

### 2.1 Bidder
- Register using email and phone number
- Join auction using auction code
- View items (phase-dependent)
- Place bids during silent auction
- View totals, payment, and pickup status

### 2.2 Admin Level 3 (Auction Support)
- View winning bidders and totals
- Mark bidders as paid
- Mark items as picked up
- Generate QR code PDFs per item
- View reports
 - Access limited to auctions explicitly authorized by Admin Level 1

### 2.3 Admin Level 2 (Auction Manager)
Includes all Admin Level 3 permissions, plus:
- Create, edit, and remove items
- Upload photos and descriptions
- Set starting prices
- Remove erroneous bids
- Assign winners for live auction items
- Configure payment URL
 - Access limited to auctions explicitly authorized by Admin Level 1

### 2.4 Admin Level 1 (Super Admin)
Includes all Admin Level 2 permissions, plus:
- Create auctions
- Modify auction phases and timing
- Override restrictions when necessary
 - View and manage all auctions in the deployment

---

## 3. Auction Phases

### 3.1 Setup
- Admins configure auction details and items
- Admins set the auction time zone at creation
- Bidders may register but cannot view items

### 3.2 Ready
- Items visible to bidders
- Bidding disabled

### 3.3 Open
- Silent auction bidding enabled
- Admins may not change start time

### 3.4 Pending
- Silent auction closed
- Admins finalize bids and live auction results
- Bidders may view results and subtotals

### 3.5 Complete
- Payment and pickup processing active
- Only L1 admins may adjust pricing or bids

### 3.6 Closed
- Auction archived
- Bidders see receipts only
- L1 and L2 admins may view reports

### 3.7 Permissions by Phase (Summary)
The system shall enforce the minimum phase-based permissions below. If a cell is marked "Yes", the action is allowed in that phase; "No" means the action is not allowed; "Any" means the action is not restricted by phase (still subject to role permissions).

| Action | Role(s) | Setup | Ready | Open | Pending | Complete | Closed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Register / join auction | Bidder | Yes | Yes | Yes | Yes | Yes | Yes |
| View items | Bidder | No | Yes | Yes | Yes | Yes | No |
| Place bid (silent items) | Bidder | No | No | Yes | No | No | No |
| View winning results / subtotals | Bidder | No | No | No | Yes | Yes | No |
| View payment & pickup status | Bidder | No | No | No | No | Yes | No |
| View receipts | Bidder | No | No | No | No | No | Yes |
| Mark bidders paid / items picked up | Admin L3+ | No | No | No | No | Yes | No |
| Assign winners for live auction items | Admin L2+ | No | No | No | Yes | Any | Any |
| Generate QR code PDFs | Admin L3+ | Any | Any | Any | Any | Any | Any |
| View reports | Admin L3+ | No | No | No | Yes | Yes | Yes |
| Configure auction items and content | Admin L2+ | Any | Any | Any | Any | Any | Any |
| Change auction start time | Admin L1+ | Yes | Yes | No | No | No | No |

---

## 4. Functional Requirements

### 4.1 Account Management
- The system shall allow bidders to register using email and phone.
- The system shall assign a unique bidder number upon joining an auction (unique per auction).
- The system shall require an auction code to join.
- The system shall require email verification before a bidder can place bids.
- The system shall support a simple, human-readable auction join code.
- The system shall allow Admin Level 1 to change the auction code at any time.
- The system shall require auction codes to be unique across the deployment.

### 4.2 Item Management
- The system shall allow admins to create, update, and delete items.
- The system shall support one image per item.
- The system shall accept uploads of any size and automatically scale images for efficient display.
- The system shall differentiate silent and live auction items.

### 4.3 Bidding
- The system shall enforce a minimum bid increment of $1.
- The system shall allow higher manual bids.
- The system shall prevent bids outside the open phase.
- The system shall maintain exactly one highest bid per item.
- The system shall enforce bid cutoffs using the configured auction time zone with hard phase transitions (no grace window).
- The system shall resolve equal bid amounts by accepting the earliest timestamped bid and rejecting later equal bids.
- The system shall accept bids using a server-side atomic compare-and-swap to prevent race conditions.

### 4.4 Notifications
- The system shall notify bidders in-app when they are outbid.
- The system shall allow admins to disable in-app outbid notifications (enabled by default).
- The system shall not send outbid email notifications in v1.

### 4.5 Totals and Checkout
- The system shall calculate running totals during the auction.
- The system shall calculate final totals after auction close.
- The system shall redirect bidders to an external payment URL.
- The system shall allow admins to view real-time totals owed per bidder.

### 4.6 QR Code Support
- The system shall generate QR codes linking to item pages.
- The system shall export printable PDFs with one item per page.

### 4.7 Reporting
- The system shall provide summary reports for admins.
- The system shall retain a full bid history.
- The system shall allow Admin Level 1 and Admin Level 2 to export reports in CSV format.
- The system shall maintain an immutable audit trail for bids and admin bid removals/overrides.

---

## 5. Non-Functional Requirements

### 5.1 Performance
- The system shall support at least 100 concurrent users.

### 5.2 Reliability
- The system shall enforce auction end times without exception.
- The system shall prevent late bids.

### 5.3 Usability & Accessibility
- The user interface shall be optimized for mobile bidders.
- The interface shall be simple and accessible.

### 5.4 Security
- Access shall be restricted using an auction code.
- Admin actions shall be role-restricted.

---

## 6. Constraints and Assumptions

- The system will be deployed per school.
- Payment processing is handled externally.
- Internet access is available at the auction site.

---

## 7. Traceability

These requirements are derived from the approved user stories documented in:
`Auction_System_User_Stories.md`
