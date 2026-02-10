# Requirement Recommendations (Personas)

## Architect Persona
- Define system boundaries and integrations (external payment URL only vs. payment status callbacks), and document the data flow between bidder UI, admin UI, and backend.
- Clarify deployment model (single-school instance vs. multi-tenant) and expected scale beyond 100 concurrent users to guide hosting and data partitioning decisions.
- Specify time handling (time zones, clock source, drift tolerance) for phase transitions and bid cutoffs.
- Add availability, backup, and disaster recovery expectations (e.g., recovery time objectives for auction night).

## Developer Persona
- Clarify authentication and account lifecycle: password policy for auction join, account verification, password reset, and bidder number generation rules.
- Define bid validation details: tie-breaking rules, maximum bid limits, and whether admins can override bid history in later phases.
- Specify item image limits and size constraints to guide upload handling and storage choices.
- Detail notification delivery expectations (in-app only vs. email/SMS), including timing and retry behavior.

## Reviewer Persona
- Expand security requirements around PII (email/phone): data retention, encryption at rest, audit logs for admin actions, and least-privilege controls.
- Add explicit role boundaries for L1/L2/L3 actions during each phase to reduce ambiguity in permissions.
- Define reporting requirements precisely (fields, export formats, and access scope) to prevent inconsistent implementations.
- Include requirements for bid history integrity (immutable log or audit trail) to protect against disputes.

## Quality Assurance Persona
- Add acceptance criteria for each phase transition, including edge cases (late bids, clock skew, network delays).
- Define expected behavior for concurrent bidding on the same item (transactional bid writes with deterministic ordering).
- Specify testable scenarios for QR code generation and PDF export (one item per page, scan target links).
- Clarify accessibility expectations (e.g., WCAG level) and mobile device support matrix for bidders.
