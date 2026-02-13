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

## Prerequisites
- Node.js 22.x
- npm 10+
- Flutter SDK (stable channel)
- Firebase CLI (`firebase-tools`)

Recommended:
- Use the npm-based Firebase CLI (`npm i -g firebase-tools`) so the Functions emulator uses your local Node runtime.

## Quick Start
From repository root:

```bash
flutter pub get
npm --prefix api install
```

## Run Locally
Use two terminals from repository root.

Terminal 1 (API + Firebase services):
```bash
firebase emulators:start --project tecs-auction-v2 --only auth,firestore,functions,storage,hosting
```

Terminal 2 (Flutter web app):
```bash
flutter run -d chrome
```

Useful local endpoints:
- Emulator UI: `http://127.0.0.1:4000`
- Hosting emulator: `http://127.0.0.1:5002`
- Functions emulator base: `http://127.0.0.1:5001`

## Build & Test
Run these from repository root.

Backend (API):
```bash
npm --prefix api run lint
npm --prefix api run build
npm --prefix api test
```

Frontend (Flutter):
```bash
flutter analyze
flutter test
flutter build web
```

All-in-one emulator smoke check:
```bash
firebase emulators:exec --project tecs-auction-v2 --only auth,firestore,functions,storage,hosting "true"
```

## Suggested Verification Flow
1. Run backend checks (`lint`, `build`, `test`).
2. Run frontend checks (`analyze`, `test`).
3. Start emulators.
4. Launch Flutter web app.
5. Manually verify core flows:
   - Bidder registration and auction join
   - Silent bidding and outbid behavior
   - Live winner assignment
   - Payment and pickup status updates
   - Reports, CSV export, QR and QR-PDF actions
   - PII purge endpoints/jobs (admin only)

## Reference docs
- Requirements: `Auction_System_Requirements.md`
- User stories: `Auction_System_User_Stories.md`
