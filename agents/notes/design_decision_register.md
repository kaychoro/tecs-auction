# Design Decision Register

## Purpose
This file captures unresolved architecture and contract decisions that must be finalized before remediation work continues.  
Status values: `Proposed`, `Accepted`, `Rejected`.

## Decision DD-001: Report/QR Access Roles
- Status: `Accepted`
- Conflict:
  - `Auction_System_Requirements.md` and `Auction_System_User_Stories.md` imply `AdminL3+` can view reports and generate QR PDFs.
  - `agents/notes/api_spec.md` currently restricts report/QR endpoints to `AdminL1/L2`.
- Options:
  1. `AdminL3+` access for report viewing and QR/PDF generation.
  2. `AdminL1/L2` only.
- Persona recommendation:
  - Use option 1 (`AdminL3+`) to align with approved requirements and stories.
- Decision:
  - Accepted option 2: `AdminL1/L2` only.
- Decision date:
  - 2026-02-13
- Affected artifacts:
  - `agents/notes/api_spec.md`
  - `agents/notes/sequence_flows.md`
  - `api/src/api.ts`
  - related tests

## Decision DD-002: API Field Naming Convention
- Status: `Accepted`
- Conflict:
  - Some specs/data model sections use snake_case.
  - implementation uses camelCase payloads.
- Options:
  1. Standardize on camelCase for API request/response payloads.
  2. Standardize on snake_case for API request/response payloads.
- Persona recommendation:
  - Use option 1 (camelCase) to match current implementation and reduce migration churn.
- Decision:
  - Accepted option 1: camelCase for canonical API request/response payloads.
- Decision date:
  - 2026-02-13
- Affected artifacts:
  - `agents/notes/api_spec.md`
  - `agents/notes/data_model.md`
  - all endpoint tests
  - frontend API client contracts

## Decision DD-003: Firestore Layout Strategy
- Status: `Accepted`
- Conflict:
  - `agents/notes/data_model.md` recommends nested auction subcollections.
  - implementation uses flat top-level collections with `auctionId` fields.
- Options:
  1. Keep flat top-level collections (with consistent `auctionId` indexing).
  2. Migrate to nested per-auction subcollections.
- Persona recommendation:
  - Use option 1 now (flat) for lower migration risk during remediation.
  - Revisit nested layout as a future schema evolution item if needed.
- Decision:
  - Accepted option 1: keep flat top-level collections with consistent `auctionId` indexing.
- Decision date:
  - 2026-02-13
- Affected artifacts:
  - `agents/notes/data_model.md`
  - `agents/notes/api_spec.md`
  - repositories and Firestore indexes

## Decision DD-004: Backend Codebase Source of Truth
- Status: `Accepted`
- Conflict:
  - both `api/` (active) and `functions/` (legacy) exist.
- Options:
  1. Single active backend in `api/`; remove `functions/`.
  2. Keep both codebases.
- Persona recommendation:
  - Use option 1; remove `functions/` after verification.
- Decision:
  - Accepted option 1: single active backend in `api/`; remove legacy `functions/`.
- Decision date:
  - 2026-02-13
- Affected artifacts:
  - repository tree
  - README/runbooks
  - Firebase scripts/config references

## Decision DD-005: Legacy Artifact Policy
- Status: `Accepted`
- Need:
  - Decide how to handle legacy references after cleanup.
- Options:
  1. Keep no legacy runtime code in-tree; rely on git history.
  2. Keep an archived snapshot folder (non-executable).
- Persona recommendation:
  - Use option 1 for simplicity unless regulatory/compliance retention requires in-repo archive.
- Decision:
  - Accepted option 1: keep no legacy runtime code in-tree; rely on git history.
- Decision date:
  - 2026-02-13
- Affected artifacts:
  - repository structure
  - docs referencing retired components

## Resolution Workflow
1. Confirm one decision at a time (DD-001 -> DD-005).
2. Mark accepted option and date.
3. Update all affected artifacts before starting implementation fixes tied to that decision.
