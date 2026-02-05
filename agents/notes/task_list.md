# Task List

## P0 Items
- ✓ Bid concurrency + ordering model (resolved direction, still needs updates in specs)
  - Verify `agents/notes/api_spec.md` exposes derived `current_high_bid*` fields as read-only.
    - Add a short read-only note under Item schema.
    - Ensure no write endpoints accept `current_high_bid*`.
  - Verify `agents/notes/data_model.md` omits mutable `current_high_bid*` and documents derived views.
    - Remove any stored field references in Firestore field lists.
    - Add derived view section with ordering rule.
  - Verify `agents/notes/sequence_flows.md` uses transactional bid write steps and ordering rules.
    - Update bid placement flow step list to include transaction steps.
    - Reference tie-breaker ordering in the flow.
  - Update any remaining references to CAS or mutable high-bid fields in specs/design docs.
    - Search notes for "CAS" and "current_high_bid".
    - Replace with transactional ordering language.
  - Add/confirm transaction pseudo-steps in implementation notes (read highest bid, validate, write bid, update derived view, audit, totals).
    - Note server-generated timestamps and bid_id in the steps.
    - Clarify derived view update location (read model or computed response).

- ✓ Lock bid ordering & server time source
  - Specify server time source (e.g., Firestore server timestamp) for `placed_at`.
    - Pick the concrete source and document it once.
  - Define `placed_at` precision requirement (milliseconds vs microseconds).
    - Ensure chosen precision matches Firestore and client display needs.
  - Confirm tie-breaker order: amount desc, placed_at asc, bid_id asc.
    - Add ordering rule to bidding engine notes.
  - Update API error codes to include `outbid` vs `bid_too_low` based on ordering logic.
    - Map each reason to a specific HTTP status.
  - Ensure ordering rules are referenced in bidding engine implementation notes.
    - Add to bidding engine section in notes or inline comment.

- ✓ Define auction phase timing enforcement contract
  - Confirm `phase_schedule` schema in `agents/notes/api_spec.md` and `agents/notes/data_model.md`.
    - Ensure fields are consistent across both files.
  - Document inclusive start / exclusive end enforcement rule.
    - Add example with boundary timestamps.
  - Define time zone handling (auction time zone for display, UTC storage).
    - Document conversion responsibility (client vs server).
  - Clarify auto-advance behavior vs L1 manual override in `agents/notes/sequence_flows.md`.
    - Define which action wins on conflict.
  - Add audit logging requirement for manual phase changes.
    - Add to AuditLog action list if missing.

- ✓ Confirm HTTP status conventions and error codes
  - Define status codes for bid failures and authorization (400 vs 403 vs 409).
    - Create a small status matrix for common failure cases.
  - Ensure standard error format is consistent in `agents/notes/api_spec.md`.
    - Add a canonical example response.
  - Add examples for common errors (phase_closed, bid_too_low, outbid).
    - Include error code + message for each.
  - Verify UI handling expectations align with API error codes.
    - Ensure UI notes reference the same error codes.

- ✓ Define request/response schemas for key endpoints
  - Enumerate required vs optional fields for auctions, items, bids, notifications.
    - Add a required/optional table per entity.
  - Specify request payloads for create/update endpoints and response shapes for list/detail.
    - Document POST/PUT/PATCH payloads per endpoint.
    - Document list response envelopes and paging fields.
  - Document pagination and sort fields per list endpoint.
    - Add default page_size and max page_size.
  - Align schemas with Firestore field types in `agents/notes/data_model.md`.
    - Resolve any field name mismatches.

- ✓ Enforce auction code uniqueness at DB level
  - Specify unique index/constraint for auction_code in data model notes.
    - Add a note on how uniqueness is enforced in Firestore.
  - Document collision handling in auction create/update flows.
    - Define error code and message for duplicates.
  - Update join flow to return clear error when auction_code is invalid or duplicate.
    - Add join response examples for invalid code.

- ✓ Define "most recent auction" storage
  - Confirm `user.last_auction_id` field usage in `agents/notes/data_model.md`.
    - Ensure field is present in user schema.
  - Document update trigger (on join and on active auction switch).
    - Note update points in sequence flows.
  - Specify behavior when last auction is closed or user removed.
    - Define fallback UI behavior.

## P1 Items
- ✓ Role & membership enforcement rules
  - Define auction membership check middleware/guard for all endpoints.
    - Create shared auth/role guard helper.
    - Apply guard to each endpoint group.
  - Implement role resolution logic with AuctionMembership.role_override.
    - Define resolution order (global role vs override).
    - Add unit tests for override cases.
  - Document per-endpoint role requirements in `agents/notes/api_spec.md`.
    - Add a role matrix per endpoint group.
  - Add audit logging requirements for role changes and membership updates.
    - Add AuditLog action names and when they fire.

- ✓ Auth + Auction join flow end-to-end
  - Configure Firebase Auth email verification and resend limits.
    - Configure Firebase email templates and verification link.
    - Add resend throttle in client and/or backend.
  - Implement bidder registration UI and verification flow.
    - Build registration screen with email/phone fields.
    - Wire Firebase Auth create user and error handling.
    - Add verification pending state and resend CTA.
  - Build join-by-auction-code endpoint and client flow.
    - Add endpoint validation for auction code and membership.
    - Implement client join screen and error states.
  - Implement bidder number allocation (auto-increment per auction, non-reused).
    - Define allocation strategy (transaction or counter doc).
    - Ensure uniqueness under concurrency.
  - Persist `user.last_auction_id` on join and switch.
    - Update user doc on join success.
    - Update on auction switch action.

- ✓ Auction lifecycle & admin controls
  - Implement create auction endpoint and admin UI.
    - Add API for create with validation.
    - Build admin create form and submit handling.
  - Implement update auction (name, time zone, payment URL).
    - Add PATCH endpoint with role checks.
    - Update admin UI to edit fields.
  - Implement phase schedule update and manual override (L1 only).
    - Add PATCH endpoint for schedule and phase.
    - Add UI controls for L1 override.
  - Implement scheduled phase auto-advance with DB guard.
    - Add scheduled function trigger and guard doc.
    - Ensure idempotent updates and logging.
  - Add audit logging for phase and auction code changes.
    - Add AuditLog entries with actor and target.

- ✓ Items & media pipeline
  - Implement item CRUD endpoints with role checks.
    - Add create, update, delete endpoints.
    - Add list and detail endpoints for admins/bidders.
  - Build image upload endpoint (multipart) and storage path conventions.
    - Define storage paths by auction/item.
    - Validate file type and size.
  - Generate scaled variants (320/640/1024) and store variant metadata.
    - Add image processing function and metadata write.
    - Ensure variant URLs are stored with dimensions.
  - Enforce image size/type constraints and error handling.
    - Define limits and error codes.

- ✓ Bidding engine (silent items)
  - Implement transaction: read highest bid, validate amount, write bid, update derived view.
    - Use a Firestore transaction or equivalent.
    - Store server timestamp and bid_id.
  - Enforce phase open and membership checks.
    - Reject bids outside Open phase.
    - Reject users without membership.
  - Write audit log entry and update totals/invoice.
    - Create AuditLog entry with action bid_placed.
    - Update invoice totals atomically.
  - Return reason codes for bid rejection (phase_closed, bid_too_low, outbid).
    - Map rejection to HTTP status and error code.

- ✓ Notifications (in-app)
  - Create outbid notification on successful higher bid.
    - Determine displaced bidder and avoid notifying the same user.
    - Write notification record with ref_type/ref_id.
  - Implement list notifications endpoint with pagination.
    - Add paging params and default sort order.
  - Implement mark-read and mark-all-read endpoints.
    - Update read_at and return updated record(s).
  - Add client deep-link behavior to item detail.
    - Map ref_type/ref_id to route and refresh item view.

- ✓ Totals & statuses (admin + bidder)
  - Implement totals calculation and storage (invoice strategy).
    - Define invoice schema and update triggers.
    - Add recompute path for reconciliation.
  - Implement bidder totals endpoint and admin totals endpoint.
    - Add role checks and response shapes.
  - Implement payment status and pickup status update endpoints (L3).
    - Add PATCH endpoints with role checks.
  - Add audit logging for payment and pickup changes.
    - Add AuditLog actions and metadata fields.

- ✓ AuditLog coverage checklist
  - Enumerate all state-changing actions in `agents/notes/data_model.md`.
    - Ensure each action has a clear trigger.
  - Implement audit logging helper and enforce use across endpoints.
    - Add shared helper and integrate into handlers.
  - Add validation to ensure audit entries include actor, target, action.
    - Validate required fields before write.

- ✓ CSV export permission check and scope
  - Enforce L1/L2 role check on report export endpoint.
    - Add auth guard and role validation.
  - Confirm export scope is limited to auction data.
    - Validate auction_id and membership.
  - Add error response for unauthorized access.
    - Return 403 with standard error format.

## P2 Items
- Reports & CSV export implementation
  - Define report fields and data sources.
    - List fields for bidder totals and item results.
  - Implement report aggregation queries for summary.
    - Define Firestore queries and indexes.
  - Build CSV export generator with proper headers and encoding.
    - Add stable column ordering and CSV escaping.
  - Add pagination/streaming for large exports if needed.
    - Decide sync vs async export based on size.
  - Add basic validation for auction scope and input params.
    - Validate auction_id and format query param.

- QR & PDF generation
  - Implement QR code generation for item deep links.
    - Define URL format and routing.
  - Implement QR endpoint returning image content.
    - Set content-type and cache headers.
  - Build PDF generator with one item per page layout.
    - Define page template and item fields shown.
  - Add access control for admin-only QR/PDF generation.
    - Enforce L1/L2 role checks.

- QA test plan for high-risk paths
  - Define bid race condition test scenarios and expected outcomes.
    - Include tie bid and late bid cases.
  - Define phase auto-advance tests (schedule + manual override).
    - Cover conflict and idempotency cases.
  - Define session expiry and recovery tests.
    - Cover re-login and last auction restore.
  - Define QR/PDF generation validation checks.
    - Verify one item per page and QR deep link.
  - Capture smoke test checklist for each phase.
    - List bidder and admin checks per phase.

- Email verification resend limits
  - Implement client-side throttle (UI disable + messaging).
    - Add timer and disable resend button.
  - Add backend guard to enforce 5 per hour per email (if needed).
    - Implement rate limit check in function.
  - Add error handling and messaging on limit exceeded.
    - Display user-friendly error text.

- UX confirmation & notification behaviors
  - Define bid confirmation copy and interaction timing.
    - Include confirmation prompt text and button labels.
  - Define error presentation for bid failure reasons.
    - Map each reason to toast or dialog.
  - Specify notification deep-link flow and refresh behavior.
    - Define when to refresh item detail.
  - Validate mobile behavior for toasts/alerts and navigation.
    - Ensure back navigation works after deep link.

## P3 Items
- Security & compliance details
  - Define PII retention policy and deletion workflow.
    - Document retention period and deletion triggers.
  - Specify encryption at rest requirements for Firestore/Storage.
    - Note default Firebase encryption and any extra requirements.
  - Ensure admin actions are captured in AuditLog.
    - Validate audit coverage for all admin endpoints.
  - Document least-privilege rules and admin access boundaries.
    - Add role matrix and data access rules.

- Accessibility & device support matrix
  - Define target WCAG level and accessibility expectations.
    - Document contrast and focus indicator requirements.
  - List supported device classes and minimum OS/browser versions.
    - Include iOS/Android/browser baselines.
  - Document keyboard and screen reader support requirements.
    - Note critical flows to test with screen readers.

- Live auction winner assignment
  - Implement admin endpoint to assign live winner and final price.
    - Add endpoint payload schema and validation.
  - Enforce phase and role checks (Pending+; L2+).
    - Reject invalid phase transitions.
  - Update totals and audit log on assignment.
    - Update invoice totals and AuditLog action.
  - Define UI flow for selecting winner and entering final price.
    - Add admin screen and confirmation step.

- Session return behavior
  - Confirm last auction selection logic on login.
    - Document rule when last_auction_id is null.
  - Implement fallback when last auction is closed or revoked.
    - Route user to join/switch screen.
  - Add UI handling for rejoin or choose another auction.
    - Add empty state messaging and CTA.
